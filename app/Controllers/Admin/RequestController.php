<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\BookingModel;
use App\Models\CarModel;
use App\Models\NotificationModel;

/**
 * จัดการคำขอจองรถ (Admin) - อนุมัติ/ปฏิเสธ + มอบหมายคนขับ (ขับเอง/บริษัท/ภายนอก)
 */
class RequestController extends BaseController
{
    // หน้า "จัดการคำขอจองรถ" (island)
    public function index()
    {
        return view('admin/requests/index', [
            'active'       => 'requests',
            'pageTitle'    => lang('Page.bookings'),
            'pageSubtitle' => lang('Page.bookings_sub'),
        ]);
    }

    // JSON: คำขอทั้งหมด + รายชื่อคนขับบริษัท (users กลุ่ม driver) + รถขับเอง (ไว้เปลี่ยนรถตอนแก้ไข)
    public function data()
    {
        // กันเปิดตรงจาก browser -> เด้งกลับหน้าหลัก (กันโชว์ JSON ดิบ)
        if ($r = $this->blockDirectAccess()) {
            return $r;
        }

        return $this->response->setJSON([
            'bookings' => (new BookingModel())->listAll(),
            'drivers'  => $this->companyDrivers(),
            'cars'     => $this->selfCars(),
        ]);
    }

    // รายการรถขับเอง (id/รุ่น/ทะเบียน/ที่นั่ง/สถานะ) สำหรับ dropdown เปลี่ยนรถตอน Admin แก้ไขคำขอ
    private function selfCars(): array
    {
        return (new CarModel())
            ->select('id, model, plate, seats, status')
            ->where('car_type', 'self')
            ->orderBy('model')
            ->findAll();
    }

    // รายชื่อคนขับบริษัท (ชื่อ/เบอร์โทรจาก UserProfileModel) + แนบรถประจำ
    private function companyDrivers(): array
    {
        $drivers = (new \App\Models\UserProfileModel())->drivers();

        // แนบรถประจำ + ตารางงาน active ของคนขับ ถ้ามี
        if ($drivers) {
            $db  = db_connect();
            $ids = array_column($drivers, 'id');

            $cars = $db->table('cars')
                ->select('default_driver_id, model, plate, seats')
                ->whereIn('default_driver_id', $ids)
                ->where('deleted_at', null)
                ->get()->getResultArray();
            $carBy = [];
            foreach ($cars as $c) {
                $carBy[$c['default_driver_id']] ??= $c;   // คนขับ 1 คนใช้รถประจำคันแรกที่พบ
            }

            // ตารางงานที่ยัง active ของคนขับ (approved/cancel_requested) - ให้ island เตือน "คนขับซ้อนเวลา" ตอนเลือก
            $jobs = $db->table('bookings')
                ->select('id, booking_code, driver_id, start_at, end_at')
                ->whereIn('driver_id', $ids)
                ->where('driver_type', 'company')
                ->whereIn('status', ['approved', 'cancel_requested'])
                ->where('deleted_at', null)
                ->get()->getResultArray();
            $jobsBy = [];
            foreach ($jobs as $j) {
                $jobsBy[$j['driver_id']][] = [
                    'id'       => (int) $j['id'],
                    'code'     => $j['booking_code'],
                    'start_at' => $j['start_at'],
                    'end_at'   => $j['end_at'],
                ];
            }

            foreach ($drivers as &$d) {
                $car            = $carBy[$d['id']] ?? null;
                $d['car_model'] = $car['model'] ?? null;
                $d['car_plate'] = $car['plate'] ?? null;
                $d['car_seats'] = $car ? (int) $car['seats'] : null;
                $d['jobs']      = $jobsBy[$d['id']] ?? [];
            }
            unset($d);
        }

        return $drivers;
    }

    // POST: อนุมัติคำขอ (+ มอบหมายคนขับสำหรับรถอื่นๆ)
    public function approve()
    {
        $id       = (int) $this->request->getPost('id');
        $bookings = new BookingModel();
        $b        = $bookings->find($id);
        if (! $b) {
            return $this->fail(lang('Common.err_request_not_found'), true);
        }
        if ($b['status'] !== 'pending') {
            return $this->fail(lang('Request.err_already_handled'), true);
        }

        $data = [
            'status'      => 'approved',
            'admin_note'  => trim((string) $this->request->getPost('admin_note')) ?: null,
            'approved_by' => (int) auth()->id(),
            'approved_at' => date('Y-m-d H:i:s'),
        ];

        $lock = null;
        if ($b['booking_type'] === 'self') {
            // re-check ณ เวลาอนุมัติ: รถอาจเข้าซ่อม/ลดจำนวนที่นั่งหลังผู้ใช้จอง
            $car = (new CarModel())->find((int) $b['car_id']);
            if (! $car || $car['car_type'] !== 'self') {
                return $this->fail(lang('Request.err_car_missing'), true);
            }
            if ($car['status'] !== 'available') {
                return $this->fail(lang('Request.err_car_maint_approve'));
            }
            if ((int) $car['seats'] > 0 && (int) $b['people'] > (int) $car['seats']) {
                return $this->fail(lang('Request.err_seats_approve', [(int) $car['seats']]));
            }
            $data['driver_type'] = 'none';   // รถขับเอง ไม่ต้องมีคนขับ
        } else {
            // รถอื่นๆ: อ่านการมอบหมายคนขับจาก POST (มี guard คนขับซ้อนเวลาในตัว)
            // กัน race: ล็อกการมอบหมายคนขับคนเดียวกันก่อนเช็คชนเวลา (2 admin กดพร้อมกันจะไม่ double-book)
            $lock   = $this->lockDriver();
            $assign = $this->driverAssignment($b);
            if (isset($assign['__error'])) {
                $this->unlockDriver($lock);
                return $this->fail($assign['__error']);
            }
            $data = array_merge($data, $assign);
        }

        // อัปเดตแบบมีเงื่อนไขสถานะ (atomic) - กัน race approve/reject ชนกัน
        // ต้องอ่าน affectedRows ก่อนปลด lock
        $bookings->where('id', $id)->where('status', 'pending')->set($data)->update();
        $affected = db_connect()->affectedRows();
        $this->unlockDriver($lock);
        if ($affected < 1) {
            return $this->fail(lang('Request.err_already_handled'), true);
        }

        $this->notifyRequester($b, 'booking_approved', 'booking_approved', ['code' => $b['booking_code']]);
        if (($data['driver_type'] ?? '') === 'company' && ! empty($data['driver_id'])) {
            $this->notifyDriver((int) $data['driver_id'], 'job_new', 'job_new', ['code' => $b['booking_code']]);
        }

        log_activity('booking_approved', ['code' => $b['booking_code']]);

        return $this->ok(lang('Request.approved'));
    }

    // POST: มอบหมาย/เปลี่ยนคนขับ ให้คำขอที่อนุมัติแล้ว (เฉพาะรถอื่น ๆ)
    public function assignDriver()
    {
        $id       = (int) $this->request->getPost('id');
        $bookings = new BookingModel();
        $b        = $bookings->find($id);
        if (! $b) {
            return $this->fail(lang('Common.err_request_not_found'), true);
        }
        if ($b['status'] !== 'approved' || $b['booking_type'] !== 'other') {
            return $this->fail(lang('Request.err_assign_blocked'), true);
        }

        // กัน race: ล็อกการมอบหมายคนขับคนเดียวกันก่อนเช็คชนเวลา
        $lock   = $this->lockDriver();
        $assign = $this->driverAssignment($b);
        if (isset($assign['__error'])) {
            $this->unlockDriver($lock);
            return $this->fail($assign['__error']);
        }

        // อัปเดตแบบมีเงื่อนไขสถานะ (atomic) - กัน race กับ sweepExpired/cancel
        $bookings->where('id', $id)->where('status', 'approved')->where('booking_type', 'other')->set($assign)->update();
        $affected = db_connect()->affectedRows();
        $this->unlockDriver($lock);
        if ($affected < 1) {
            // 0 rows: อาจเพราะค่าคนขับไม่เปลี่ยน หรือสถานะเปลี่ยนไปแล้ว - เช็คสถานะปัจจุบันเพื่อแยกแยะ
            $cur = $bookings->find($id);
            if (! $cur || $cur['status'] !== 'approved' || $cur['booking_type'] !== 'other') {
                return $this->fail(lang('Request.err_assign_changed'), true);
            }
        }

        $this->notifyRequester($b, 'driver_assigned', 'driver_assigned', ['code' => $b['booking_code']]);
        // แจ้งคนขับเฉพาะเมื่อเป็นคนขับใหม่ (ต่างจากเดิม) - กันแจ้งซ้ำ
        $driverChanged = ($b['driver_type'] ?? '') !== 'company' || (int) ($b['driver_id'] ?? 0) !== (int) ($assign['driver_id'] ?? 0);
        if (($assign['driver_type'] ?? '') === 'company' && ! empty($assign['driver_id']) && $driverChanged) {
            $this->notifyDriver((int) $assign['driver_id'], 'job_new', 'job_new', ['code' => $b['booking_code']]);
        }

        log_activity('booking_driver_assigned', ['code' => $b['booking_code']]);

        return $this->ok(lang('Request.driver_assigned'));
    }

    // เพดานจำนวนที่นั่งของรถที่ Admin กรอกเอง (คอลัมน์ ext_driver_seats เป็น SMALLINT)
    private const MAX_EXT_SEATS = 999;

    // อ่านข้อมูลคนขับจาก POST → คืน array ฟิลด์สำหรับ update (หรือ ['__error'=>ข้อความ] ถ้าไม่ผ่าน)
    // driver = '' (ยังไม่มอบหมาย) | user_id (คนขับบริษัท) | 'external' (กรอกเอง)
    // $requireDriver = true → รถอื่นๆ ต้องมีคนขับ (บริษัท/ภายนอก) ห้ามปล่อยว่าง (ใช้ตอนอนุมัติ/มอบหมาย/แก้คำขอที่อนุมัติแล้ว)
    private function driverAssignment(array $b, bool $requireDriver = true): array
    {
        $driver = (string) $this->request->getPost('driver');
        $phone  = trim((string) $this->request->getPost('ext_phone')) ?: null;
        $seatsRaw = trim((string) $this->request->getPost('ext_seats'));
        // เว้นว่าง = ไม่ระบุ · ที่กรอกต้องเป็นจำนวนเต็ม 0-MAX_EXT_SEATS ('4.5' หรือ '4คน' จะถูก cast เป็น 4 เงียบ ๆ ถ้าไม่ดักที่ค่าดิบ)
        if ($seatsRaw !== '' && preg_match('/^\d+$/', $seatsRaw) !== 1) {
            return ['__error' => lang('Request.err_ext_seats', [0, self::MAX_EXT_SEATS])];
        }
        $seats = $seatsRaw === '' ? null : (int) $seatsRaw;
        if ($seats !== null && $seats > self::MAX_EXT_SEATS) {
            return ['__error' => lang('Request.err_ext_seats', [0, self::MAX_EXT_SEATS])];
        }
        $veh    = trim((string) $this->request->getPost('ext_vehicle')) ?: null;

        // คนขับภายนอก - กรอกชื่อเอง
        if ($driver === 'external') {
            $name = trim((string) $this->request->getPost('ext_name'));
            if ($name === '') {
                return ['__error' => lang('Request.err_ext_name_req')];
            }
            // เบอร์โทร: เว้นว่างได้ แต่ถ้ากรอกต้องเป็นตัวเลข 10 หลักพอดี
            if ($phone !== null && preg_match('/^[0-9]{10}$/', $phone) !== 1) {
                return ['__error' => lang('Request.err_ext_phone_format')];
            }

            return [
                'driver_type'        => 'external',
                'driver_id'          => null,
                'ext_driver_name'    => $name,
                'ext_driver_phone'   => $phone,
                'ext_driver_seats'   => $seats,
                'ext_driver_vehicle' => $veh,
            ];
        }

        // คนขับบริษัท - กัน "คนขับซ้อนเวลา" (มีงานช่วงเวลาทับกันอยู่แล้ว)
        if ($driver !== '') {
            $driverId = (int) $driver;
            // ต้องเป็นผู้ใช้กลุ่ม driver จริง
            if (! $this->isCompanyDriver($driverId)) {
                return ['__error' => lang('Request.err_not_a_driver')];
            }
            if ((new BookingModel())->driverHasClash($driverId, $b['start_at'], $b['end_at'], (int) $b['id'])) {
                return ['__error' => lang('Request.err_driver_busy')];
            }

            return [
                'driver_type'        => 'company',
                'driver_id'          => $driverId,
                'ext_driver_name'    => null,
                'ext_driver_phone'   => $phone,
                'ext_driver_seats'   => $seats,
                'ext_driver_vehicle' => $veh,
            ];
        }

        // ยังไม่มอบหมาย - รถอื่นๆ อนุมัติ/บันทึกไม่ได้จนกว่าจะมีคนขับ
        if ($requireDriver) {
            return ['__error' => lang('Request.err_driver_req')];
        }

        return ['driver_type' => 'none', 'driver_id' => null];
    }

    // เป็นผู้ใช้กลุ่ม driver จริงไหม (ใช้ตรวจก่อนมอบหมายงาน)
    private function isCompanyDriver(int $userId): bool
    {
        return db_connect()->table('auth_groups_users')
            ->where('group', 'driver')
            ->where('user_id', $userId)
            ->countAllResults() > 0;
    }

    // POST: ปฏิเสธคำขอ
    public function reject()
    {
        $id       = (int) $this->request->getPost('id');
        $bookings = new BookingModel();
        $b        = $bookings->find($id);
        if (! $b) {
            return $this->fail(lang('Common.err_request_not_found'), true);
        }
        if ($b['status'] !== 'pending') {
            return $this->fail(lang('Request.err_already_handled'), true);
        }

        // บังคับกรอกเหตุผลการปฏิเสธ (ห้ามเว้นว่าง) - ผู้ขอจะเห็นเหตุผลนี้
        $note = trim((string) $this->request->getPost('admin_note'));
        if ($note === '') {
            return $this->fail(lang('Request.err_reject_reason_req'));
        }

        // อัปเดตแบบมีเงื่อนไขสถานะ (atomic) - กัน race approve/reject ชนกันแล้วผ่าน guard ทั้งคู่
        $bookings->where('id', $id)->where('status', 'pending')->set([
            'status'      => 'rejected',
            'admin_note'  => $note,
            'approved_by' => (int) auth()->id(),
            'approved_at' => date('Y-m-d H:i:s'),
        ])->update();
        if (db_connect()->affectedRows() < 1) {
            return $this->fail(lang('Request.err_already_handled'), true);
        }

        $this->notifyRequester($b, 'booking_rejected', 'booking_rejected', ['code' => $b['booking_code']]);

        log_activity('booking_rejected', ['code' => $b['booking_code']]);

        return $this->ok(lang('Request.rejected'));
    }

    // POST: ยืนยันการยกเลิก (คำขอที่ User ขอยกเลิก) -> cancelled + ปล่อยรถคืน
    public function confirmCancel()
    {
        $id       = (int) $this->request->getPost('id');
        $bookings = new BookingModel();
        $b        = $bookings->find($id);
        if (! $b) {
            return $this->fail(lang('Common.err_request_not_found'), true);
        }
        if ($b['status'] !== 'cancel_requested') {
            return $this->fail(lang('Request.err_not_cancel_req'), true);
        }

        // อัปเดตแบบมีเงื่อนไขสถานะ (atomic)
        $bookings->where('id', $id)->where('status', 'cancel_requested')->set([
            'status'      => 'cancelled',
            'approved_by' => (int) auth()->id(),
            'approved_at' => date('Y-m-d H:i:s'),
        ])->update();
        if (db_connect()->affectedRows() < 1) {
            return $this->fail(lang('Request.err_not_cancel_req'), true);
        }

        $this->notifyRequester($b, 'cancel_confirmed', 'cancel_confirmed', ['code' => $b['booking_code']]);
        if ($b['driver_type'] === 'company') {
            $this->notifyDriver($b['driver_id'] ? (int) $b['driver_id'] : null, 'job_cancelled', 'job_cancelled', ['code' => $b['booking_code']]);
        }

        log_activity('booking_cancel_confirmed', ['code' => $b['booking_code']]);

        return $this->ok(lang('Request.cancel_confirmed'));
    }

    // POST: Admin ยกเลิกคำขอใดก็ได้ในระบบ (เฉพาะที่ยัง active) → cancelled + ปล่อยรถคืน
    public function cancel()
    {
        $id       = (int) $this->request->getPost('id');
        $bookings = new BookingModel();
        $b        = $bookings->find($id);
        if (! $b) {
            return $this->fail(lang('Common.err_request_not_found'), true);
        }
        if (! in_array($b['status'], ['pending', 'approved', 'cancel_requested'], true)) {
            return $this->fail(lang('Request.err_cancel_blocked'), true);
        }

        // เหตุผลบังคับ - ผู้ขอจะเห็นว่าถูกยกเลิกเพราะอะไร (เหมือน reject)
        $note = trim((string) $this->request->getPost('admin_note'));
        if ($note === '') {
            return $this->fail(lang('Request.err_cancel_reason_req'));
        }

        // อัปเดตแบบมีเงื่อนไขสถานะ (atomic) - เฉพาะที่ยัง active
        $bookings->where('id', $id)->whereIn('status', ['pending', 'approved', 'cancel_requested'])->set([
            'status'      => 'cancelled',
            'admin_note'  => $note,
            'approved_by' => (int) auth()->id(),
            'approved_at' => date('Y-m-d H:i:s'),
        ])->update();
        if (db_connect()->affectedRows() < 1) {
            return $this->fail(lang('Request.err_cancel_blocked'), true);
        }

        $this->notifyRequester($b, 'booking_cancelled', 'booking_cancelled', ['code' => $b['booking_code']]);
        if ($b['driver_type'] === 'company') {
            $this->notifyDriver($b['driver_id'] ? (int) $b['driver_id'] : null, 'job_cancelled', 'job_cancelled', ['code' => $b['booking_code']]);
        }

        log_activity('booking_cancelled_by_admin', ['code' => $b['booking_code']]);

        return $this->ok(lang('Common.request_cancelled'));
    }

    // POST: Admin ปรับรถ (self) / คนขับ (other) ของคำขอที่ยัง active
    // รายละเอียดการเดินทางเป็นของผู้ขอ - แก้ที่ User\BookingController::update
    public function update()
    {
        $id       = (int) $this->request->getPost('id');
        $bookings = new BookingModel();
        $b        = $bookings->find($id);
        if (! $b) {
            return $this->fail(lang('Common.err_request_not_found'), true);
        }
        if (! in_array($b['status'], ['pending', 'approved', 'cancel_requested'], true)) {
            return $this->fail(lang('Request.err_edit_blocked'), true);
        }

        // Admin จัดสรรทรัพยากรเท่านั้น - รายละเอียดการเดินทางเป็นของผู้ขอ แก้เองที่ "คำขอของฉัน"
        $start  = $b['start_at'];
        $end    = $b['end_at'];
        $people = (int) $b['people'];
        $data   = [];

        $lock = null;
        if ($b['booking_type'] === 'self') {
            // เปลี่ยนรถได้ (รถขับเอง) + re-validate ที่นั่ง/ชนเวลา (ยกเว้นคำขอนี้เอง)
            $carId = (int) $this->request->getPost('car_id') ?: (int) $b['car_id'];
            $car   = (new CarModel())->find($carId);
            if (! $car || $car['car_type'] !== 'self') {
                return $this->fail(lang('Common.err_car_invalid'));
            }
            // กันย้ายไปรถที่ซ่อมบำรุงเฉพาะเมื่อ "เปลี่ยนคัน" - คงรถเดิมที่เพิ่งเข้าซ่อมยังแก้ฟิลด์อื่นได้
            if ($car['status'] !== 'available' && $carId !== (int) $b['car_id']) {
                return $this->fail(lang('Request.err_car_maint'));
            }
            if ((int) $car['seats'] > 0 && $people > (int) $car['seats']) {
                return $this->fail(lang('Common.err_seats', [(int) $car['seats']]));
            }
            $clash = $bookings
                ->where('car_id', $carId)
                ->whereIn('status', ['pending', 'approved', 'cancel_requested'])
                ->where('id !=', $id)
                ->where('start_at <', $end)
                ->where('end_at >', $start)
                ->countAllResults();
            if ($clash > 0) {
                return $this->fail(lang('Common.err_car_clash'));
            }
            $data['car_id'] = $carId;
        } else {
            // รถอื่น ๆ: มอบหมาย/เปลี่ยนคนขับ (ใช้ start/end ใหม่ในการเช็คคนขับซ้อนเวลา)
            // กัน race: ล็อกการมอบหมายคนขับคนเดียวกันก่อนเช็คชนเวลา
            // คำขอที่อนุมัติแล้ว (ไม่ใช่ pending) ห้ามถอดคนขับออก - ต้องเลือกคนขับเสมอ
            $lock   = $this->lockDriver();
            $assign = $this->driverAssignment(array_merge($b, ['start_at' => $start, 'end_at' => $end]), $b['status'] !== 'pending');
            if (isset($assign['__error'])) {
                $this->unlockDriver($lock);
                return $this->fail($assign['__error']);
            }
            $data = array_merge($data, $assign);
            // จำนวนผู้โดยสารต้องไม่เกินที่นั่งของรถที่ระบุ (ถ้ากรอกจำนวนที่นั่งไว้)
            $seatCap = $assign['ext_driver_seats'] ?? null;
            if ($seatCap !== null && (int) $seatCap > 0 && $people > (int) $seatCap) {
                $this->unlockDriver($lock);
                return $this->fail(lang('Request.err_seats_given', [(int) $seatCap]));
            }
        }

        // อัปเดตแบบมีเงื่อนไขสถานะ (atomic) - กัน race กับ sweepExpired/cancelแก้ไข
        $bookings->where('id', $id)->whereIn('status', ['pending', 'approved', 'cancel_requested'])->set($data)->update();
        $affected = db_connect()->affectedRows();
        $this->unlockDriver($lock);
        if ($affected < 1) {
            // 0 rows: อาจเพราะค่าไม่เปลี่ยน หรือสถานะจบไปแล้ว - เช็คสถานะปัจจุบันเพื่อแยกแยะ
            $cur = $bookings->find($id);
            if (! $cur || ! in_array($cur['status'], ['pending', 'approved', 'cancel_requested'], true)) {
                return $this->fail(lang('Request.err_edit_changed'), true);
            }
        }

        $this->notifyRequester($b, 'booking_edited', 'booking_edited_admin', ['code' => $b['booking_code']]);
        // แจ้งคนขับเฉพาะเมื่อ "มอบคนขับใหม่" (ต่างจากคนขับเดิมของคำขอนี้) - กันแจ้งซ้ำตอนแก้ข้อมูลอื่น
        $driverChanged = ($b['driver_type'] ?? '') !== 'company' || (int) ($b['driver_id'] ?? 0) !== (int) ($data['driver_id'] ?? 0);
        if (($data['driver_type'] ?? '') === 'company' && ! empty($data['driver_id']) && $driverChanged) {
            $this->notifyDriver((int) $data['driver_id'], 'job_new', 'job_new', ['code' => $b['booking_code']]);
        }

        log_activity('booking_vehicle_changed', ['code' => $b['booking_code']]);

        return $this->ok(lang('Request.saved'));
    }

    // แปลง 'YYYY-MM-DDTHH:MM' (จาก input) → 'YYYY-MM-DD HH:MM:SS'
    private function toDateTime(?string $v): ?string
    {
        $v = trim((string) $v);
        if ($v === '') {
            return null;
        }
        $v = str_replace('T', ' ', $v);

        return strlen($v) === 16 ? $v . ':00' : $v;
    }

    // แจ้งผู้ขอ (ข้ามถ้าผู้ขอ = admin คนที่กำลังทำรายการ - กันแจ้งตัวเอง)
    private function notifyRequester(array $b, string $type, string $msgKey, array $params = []): void
    {
        if ((int) $b['requester_id'] === (int) auth()->id()) {
            return;
        }
        (new NotificationModel())->push((int) $b['requester_id'], $type, $msgKey, $params, site_url('my-requests'));
    }

    // แจ้งคนขับบริษัท (ถ้ามี driver_id)
    private function notifyDriver(?int $driverId, string $type, string $msgKey, array $params = []): void
    {
        if (! $driverId) {
            return;
        }
        (new NotificationModel())->push($driverId, $type, $msgKey, $params, site_url('driver'));
    }

    // ล็อกกันมอบหมายคนขับคนเดียวกันซ้อน (MySQL named lock ต่อ driver) - คืนชื่อ lock หรือ null
    // เฉพาะกรณีเลือกคนขับบริษัท (POST driver = user_id); '' หรือ 'external' ไม่ต้องล็อก
    private function lockDriver(): ?string
    {
        $driverPost = (string) $this->request->getPost('driver');
        if ($driverPost === '' || $driverPost === 'external') {
            return null;
        }
        $lock = 'drv_' . (int) $driverPost;
        db_connect()->query('SELECT GET_LOCK(?, 5)', [$lock]);

        return $lock;
    }

    // ปลด named lock ของคนขับ
    private function unlockDriver(?string $lock): void
    {
        if ($lock !== null) {
            db_connect()->query('SELECT RELEASE_LOCK(?)', [$lock]);
        }
    }

    // ===== helper ตอบ JSON พร้อม csrf ใหม่ =====
    private function ok(string $message)
    {
        return $this->response->setJSON(['ok' => true, 'message' => $message, 'csrf' => csrf_hash()]);
    }

    // $conflict = true -> ข้อมูลนี้เพิ่งถูกคนอื่นเปลี่ยนสถานะไปแล้ว (ให้ฝั่งหน้าจอดึงข้อมูลใหม่)
    private function fail(string $message, bool $conflict = false)
    {
        $out = ['ok' => false, 'message' => $message, 'csrf' => csrf_hash()];
        if ($conflict) {
            $out['conflict'] = true;
        }

        return $this->response->setStatusCode(422)->setJSON($out);
    }
}
