<?php

namespace App\Controllers\User;

use App\Controllers\BaseController;
use App\Models\BookingModel;
use App\Models\CarModel;

/**
 * จองรถ (User) - สร้างคำขอ + ดูคำขอของฉัน + ยกเลิก
 */
class BookingController extends BaseController
{
    // สถานะที่ยัง "จองที่/กันเวลารถ" อยู่ (ยังไม่ปล่อยคืน)
    private const ACTIVE = ['pending', 'approved', 'cancel_requested'];

    // แปลงค่าจาก datetime-local (YYYY-MM-DDTHH:MM) -> DATETIME ของ DB
    private function toDateTime(?string $v): ?string
    {
        $v = trim((string) $v);
        if ($v === '') {
            return null;
        }
        $v = str_replace('T', ' ', $v);

        return strlen($v) === 16 ? $v . ':00' : $v;
    }

    // หา role ปัจจุบัน (จองรถได้ทุก role ที่ล็อกอิน)
    private function role(): string
    {
        $u = auth()->user();
        return $u->inGroup('admin') ? 'admin' : ($u->inGroup('driver') ? 'driver' : 'user');
    }

    // ปลายทางหลังจองเสร็จ - หน้า "การจองรถ" ของ role นั้น
    private function afterBookUrl(): string
    {
        $role = $this->role();
        if ($role === 'admin') {
            return site_url('admin/timeline');
        }
        if ($role === 'driver') {
            return site_url('driver/timeline');
        }

        return site_url('timeline');
    }

    // หน้า "จองรถ" (island: grid การ์ดรถ self + ฟอร์ม other)
    public function index()
    {
        // รถขับเองทั้งหมด (โชว์รวมที่ซ่อมบำรุงด้วย แต่กดจองไม่ได้)
        $cars     = CarModel::withExistingImage((new CarModel())->where('car_type', 'self')->orderBy('model')->findAll());
        $bookings = new BookingModel();

        $now  = date('Y-m-d H:i:s');
        $list = [];
        foreach ($cars as $c) {
            // ไม่ว่าง = มีคำขอ active (pending/approved) ที่ "เวลาปัจจุบัน" อยู่ในช่วงจอง
            // (จองไว้ล่วงหน้าแต่ยังไม่ถึงเวลา -> ยังถือว่าพร้อมใช้งาน)
            $busy = $bookings->where('car_id', $c['id'])
                ->whereIn('status', self::ACTIVE)
                ->where('start_at <=', $now)
                ->where('end_at >', $now)
                ->countAllResults();
            $list[] = [
                'id'     => $c['id'],
                'model'  => $c['model'],
                'plate'  => $c['plate'],
                'seats'  => $c['seats'],
                'status' => $c['status'],
                'image'  => $c['image'],
                'busy'   => $busy > 0,
            ];
        }

        $role = $this->role();

        return view('user/book/index', [
            'layout'       => 'layouts/' . $role,
            'active'       => 'timeline',   // เข้าหน้าจองรถจากหน้าตารางการใช้รถ -> ไฮไลต์เมนูนั้น
            'pageTitle'    => lang('Page.book'),
            'pageSubtitle' => lang('Page.book_sub'),
            'cars'         => $list,
            // ปุ่มย้อนกลับ -> หน้าตารางการใช้รถ (เมนูก่อนหน้า) ตาม role
            'backUrl'      => $role === 'admin' ? site_url('admin/timeline') : site_url('timeline'),
        ]);
    }

    // JSON: คำขอที่ยัง active ของรถคันหนึ่ง (ไว้แสดงปฏิทินว่างตอนจอง)
    public function availability()
    {
        // กันเปิดตรงจาก browser -> เด้งกลับหน้าหลัก (กันโชว์ JSON ดิบ)
        if ($r = $this->blockDirectAccess()) {
            return $r;
        }

        $carId = (int) $this->request->getGet('car_id');
        $rows  = (new BookingModel())
            ->select('start_at, end_at, status')
            ->where('car_id', $carId)
            ->whereIn('status', self::ACTIVE)
            ->findAll();

        return $this->response->setJSON(['bookings' => $rows]);
    }

    // POST: สร้างคำขอจอง (status=pending)
    public function store()
    {
        $type     = $this->request->getPost('booking_type') === 'other' ? 'other' : 'self';
        $location = trim((string) $this->request->getPost('location'));
        $start    = $this->toDateTime($this->request->getPost('start_at'));
        $end      = $this->toDateTime($this->request->getPost('end_at'));
        $peopleRaw = trim((string) $this->request->getPost('people'));
        $people   = (int) $peopleRaw;
        $carId    = $type === 'self' ? (int) $this->request->getPost('car_id') : null;
        $mapLink  = trim((string) $this->request->getPost('map_link'));

        if ($location === '') {
            return $this->fail(lang('Booking.err_location_req'));
        }
        // รถอื่น ๆ ต้องระบุวัตถุประสงค์ (รถขับเองไม่บังคับ)
        if ($type === 'other' && trim((string) $this->request->getPost('purpose')) === '') {
            return $this->fail(lang('Booking.err_purpose_req'));
        }
        // ลิงก์แผนที่ (ถ้ากรอก) ต้องขึ้นต้นด้วย http:// หรือ https:// เท่านั้น - กัน javascript: และ protocol อันตราย
        if ($mapLink !== '' && ! is_safe_url($mapLink)) {
            return $this->fail(lang('Booking.err_map_scheme'));
        }
        // ลิงก์แผนที่ยาวได้สูงสุด 500 ตัวอักษร (ตามขนาดคอลัมน์ในฐานข้อมูล)
        if ($mapLink !== '' && mb_strlen($mapLink) > 500) {
            return $this->fail(lang('Booking.err_map_max'));
        }
        if (! $start || ! $end) {
            return $this->fail(lang('Booking.err_time_req'));
        }
        if ($end <= $start) {
            return $this->fail(lang('Booking.err_time_order'));
        }
        // กันจองย้อนหลัง - เวลาเริ่มต้องไม่เป็นอดีต
        if ($start < date('Y-m-d H:i:s')) {
            return $this->fail(lang('Booking.err_time_past'));
        }
        // รับเฉพาะจำนวนเต็มบวก - '3.7' หรือ '3abc' จะถูก cast เป็น 3 เงียบ ๆ ถ้าไม่ดักที่ค่าดิบ
        if (preg_match('/^\d+$/', $peopleRaw) !== 1) {
            return $this->fail(lang('Booking.err_people_int'));
        }
        if ($people < 1) {
            return $this->fail(lang('Booking.err_people_min'));
        }
        $cars = new CarModel();
        if ($type === 'self') {
            $car = $carId ? $cars->find($carId) : null;
            if (! $car || $car['car_type'] !== 'self') {
                return $this->fail(lang('Common.err_car_invalid'));
            }
            if ($car['status'] !== 'available') {
                return $this->fail(lang('Booking.err_car_unavail'));
            }
            // จำนวนผู้โดยสารต้องไม่เกินจำนวนที่นั่งของรถ
            if ((int) $car['seats'] > 0 && $people > (int) $car['seats']) {
                return $this->fail(lang('Common.err_seats', [(int) $car['seats']]));
            }
        }
        // เพดานสุดท้ายเมื่อไม่รู้จำนวนที่นั่ง (รถอื่น ๆ / รถที่ไม่ได้กรอกที่นั่ง) - กัน SMALLINT overflow ในคอลัมน์ people
        if ($people > 999) {
            return $this->fail(lang('Booking.err_people_max'));
        }

        // สร้างคำขอในทรานแซกชัน - ล็อกแถวรถ (FOR UPDATE) กัน race: 2 คนจองรถขับเองคันเดียวกันช่วงเวลาเดียวพร้อมกัน
        $db       = db_connect();
        $bookings = new BookingModel();
        $db->transBegin();

        if ($type === 'self') {
            // ล็อกแถวรถ: คำขอรถคันเดียวกันจะต่อคิวทีละคำขอ ทำให้เช็คชนเวลาแม่นยำ ไม่หลุดพร้อมกัน
            $db->query('SELECT id FROM cars WHERE id = ? FOR UPDATE', [$carId]);
            // กันจองชนเวลา: รถคันเดียวกัน สถานะที่ยังกันที่อยู่ ช่วงเวลาทับกัน
            $clash = $bookings
                ->where('car_id', $carId)
                ->whereIn('status', self::ACTIVE)
                ->where('start_at <', $end)
                ->where('end_at >', $start)
                ->countAllResults();
            if ($clash > 0) {
                $db->transRollback();

                return $this->fail(lang('Common.err_car_clash'));
            }
        }

        $id = $bookings->insert([
            'booking_code' => 'TEMP',
            'requester_id' => (int) auth()->id(),
            'booking_type' => $type,
            'location'     => $location,
            'start_at'     => $start,
            'end_at'       => $end,
            'people'       => $people,
            'purpose'      => trim((string) $this->request->getPost('purpose')) ?: null,
            'map_link'     => $mapLink ?: null,
            'car_id'       => $carId,
            'status'       => 'pending',
            'driver_type'  => 'none',
        ]);
        $bookings->update($id, ['booking_code' => $bookings->makeCode($id)]);
        $db->transCommit();

        // ยืนยันทรานแซกชันสำเร็จจริงก่อนรายงานผล - กันแจ้งสำเร็จทั้งที่ DB error แล้ว rollback (ไม่มีแถวจริง)
        if (! $id || $db->transStatus() === false) {
            return $this->fail(lang('Booking.err_save'));
        }

        // แจ้ง Admin ทุกคน (ข้ามผู้ก่อถ้าเป็น admin จองเอง)
        $me   = (int) auth()->id();
        $name = (new \App\Models\UserProfileModel())->findByUserId($me)['full_name'] ?? auth()->user()->username;
        (new \App\Models\NotificationModel())->pushToAdmins('booking_new', 'booking_new', ['name' => $name], site_url('admin/requests'), $me);

        log_activity('ส่งคำขอจองรถ ' . $bookings->makeCode($id) . ' (' . ($type === 'other' ? 'รถจัดหาโดย Admin' : 'รถขับเอง') . ')');

        return $this->ok(lang('Booking.sent'), $this->afterBookUrl());
    }

    // หน้า "คำขอของฉัน" (island) - ใช้ร่วม admin/user, เรนเดอร์ layout ตาม role
    public function myRequests()
    {
        return view('user/requests/index', [
            'layout'       => 'layouts/' . $this->role(),
            'active'       => 'myRequests',
            'pageTitle'    => lang('Page.myRequests'),
            'pageSubtitle' => lang('Page.myRequests_sub'),
        ]);
    }

    // JSON: คำขอของผู้ใช้ปัจจุบัน
    public function myData()
    {
        // กันเปิดตรงจาก browser -> เด้งกลับหน้าหลัก (กันโชว์ JSON ดิบ)
        if ($r = $this->blockDirectAccess()) {
            return $r;
        }

        return $this->response->setJSON([
            'bookings' => (new BookingModel())->listForUser((int) auth()->id()),
        ]);
    }

    /**
     * POST: แก้ไขคำขอของตัวเอง - เฉพาะที่ยัง "รออนุมัติ" เท่านั้น
     * แก้ได้เฉพาะข้อมูลที่ผู้ขอกรอกมาเอง · รถ/คนขับเป็นของ Admin จัดสรร ไม่แตะที่นี่
     */
    public function update()
    {
        $id       = (int) $this->request->getPost('id');
        $bookings = new BookingModel();
        $b        = $bookings->find($id);

        // ต้องเป็นคำขอของตัวเอง (ตอบข้อความเดียวกับกรณีไม่พบ - ไม่บอกว่ามี id นี้อยู่จริง)
        if (! $b || (int) $b['requester_id'] !== (int) auth()->id()) {
            return $this->fail(lang('Common.err_request_not_found'));
        }
        if ($b['status'] !== 'pending') {
            return $this->fail(lang('Booking.err_edit_pending'));
        }

        $location = trim((string) $this->request->getPost('location'));
        $start    = $this->toDateTime($this->request->getPost('start_at'));
        $end      = $this->toDateTime($this->request->getPost('end_at'));
        $peopleRaw = trim((string) $this->request->getPost('people'));
        $people   = (int) $peopleRaw;
        $purpose  = trim((string) $this->request->getPost('purpose'));
        $mapLink  = trim((string) $this->request->getPost('map_link'));

        if ($location === '') {
            return $this->fail(lang('Booking.err_location_req'));
        }
        if ($b['booking_type'] === 'other' && $purpose === '') {
            return $this->fail(lang('Booking.err_purpose_req'));
        }
        if (! $start || ! $end) {
            return $this->fail(lang('Booking.err_time_req'));
        }
        if ($end <= $start) {
            return $this->fail(lang('Booking.err_time_order'));
        }
        // เปลี่ยนเวลาเริ่มเป็นอดีตไม่ได้ (คงเวลาเดิมไว้ยังแก้ฟิลด์อื่นได้)
        if ($start < date('Y-m-d H:i:s') && $start !== $b['start_at']) {
            return $this->fail(lang('Booking.err_time_past'));
        }
        // รับเฉพาะจำนวนเต็มบวก - '3.7' หรือ '3abc' จะถูก cast เป็น 3 เงียบ ๆ ถ้าไม่ดักที่ค่าดิบ
        if (preg_match('/^\d+$/', $peopleRaw) !== 1) {
            return $this->fail(lang('Booking.err_people_int'));
        }
        if ($people < 1) {
            return $this->fail(lang('Booking.err_people_min'));
        }
        if ($mapLink !== '' && ! is_safe_url($mapLink)) {
            return $this->fail(lang('Booking.err_map_scheme'));
        }
        if ($mapLink !== '' && mb_strlen($mapLink) > 500) {
            return $this->fail(lang('Booking.err_map_max'));
        }

        // รถขับเอง: รถยังเป็นคันเดิม แต่เวลาเปลี่ยนได้ ต้องเช็คที่นั่ง + ชนเวลาใหม่
        $isSelfCar = $b['booking_type'] === 'self' && $b['car_id'];
        if ($isSelfCar) {
            $car = (new CarModel())->find((int) $b['car_id']);
            if ($car && (int) $car['seats'] > 0 && $people > (int) $car['seats']) {
                return $this->fail(lang('Common.err_seats', [(int) $car['seats']]));
            }
        }
        // เพดานสุดท้ายเมื่อไม่รู้จำนวนที่นั่ง (รถอื่น ๆ / รถที่ไม่ได้กรอกที่นั่ง) - กัน SMALLINT overflow ในคอลัมน์ people
        if ($people > 999) {
            return $this->fail(lang('Booking.err_people_max'));
        }

        // ชนเวลา: รถขับเองคันเดิม ช่วงเวลาใหม่ต้องไม่ทับคำขออื่น
        if ($isSelfCar) {
            $clash = $bookings
                ->where('car_id', (int) $b['car_id'])
                ->whereIn('status', self::ACTIVE)
                ->where('id !=', $id)
                ->where('start_at <', $end)
                ->where('end_at >', $start)
                ->countAllResults();
            if ($clash > 0) {
                return $this->fail(lang('Common.err_car_clash'));
            }
        }

        // อัปเดตแบบมีเงื่อนไขสถานะ - กัน race กับ Admin ที่กำลังอนุมัติอยู่พอดี
        $bookings->where('id', $id)->where('status', 'pending')->set([
            'location' => $location,
            'start_at' => $start,
            'end_at'   => $end,
            'people'   => $people,
            'purpose'  => $purpose ?: null,
            'map_link' => $mapLink ?: null,
        ])->update();
        if (db_connect()->affectedRows() < 1) {
            $cur = $bookings->find($id);
            if (! $cur || $cur['status'] !== 'pending') {
                return $this->fail(lang('Booking.err_edit_done'));
            }
        }

        // แจ้ง Admin ว่าข้อมูลที่กำลังจะอนุมัติเปลี่ยนไปแล้ว
        $me   = (int) auth()->id();
        $name = (new \App\Models\UserProfileModel())->findByUserId($me)['full_name'] ?? auth()->user()->username;
        (new \App\Models\NotificationModel())->pushToAdmins('booking_edited', 'booking_edited_user', ['name' => $name, 'code' => $b['booking_code']], site_url('admin/requests'), $me);

        log_activity('แก้ไขคำขอ ' . $b['booking_code']);

        return $this->ok(lang('Booking.saved'));
    }

    // POST: ยกเลิกคำขอของตัวเอง - pending ยกเลิกทันที · approved(ก่อนเวลาเริ่ม) ขอยกเลิกรอ Admin ยืนยัน
    public function cancel()
    {
        $id       = (int) $this->request->getPost('id');
        $bookings = new BookingModel();
        $booking  = $bookings->find($id);

        if (! $booking || (int) $booking['requester_id'] !== (int) auth()->id()) {
            return $this->fail(lang('Common.err_request_not_found'));
        }

        // รออนุมัติ -> ยกเลิกได้ทันที (ยังไม่จัดรถ/คนขับ)
        if ($booking['status'] === 'pending') {
            $bookings->update($id, ['status' => 'cancelled']);
            log_activity('ยกเลิกคำขอ ' . $booking['booking_code']);

            return $this->ok(lang('Common.request_cancelled'));
        }

        // อนุมัติแล้ว + ยังไม่ถึงเวลาเริ่ม -> ส่งคำขอยกเลิก รอ Admin ยืนยัน
        if ($booking['status'] === 'approved') {
            if ($booking['start_at'] <= date('Y-m-d H:i:s')) {
                return $this->fail(lang('Booking.err_cancel_late'));
            }
            $bookings->update($id, ['status' => 'cancel_requested']);

            // แจ้ง Admin ว่ามีคำขอยกเลิก
            $me   = (int) auth()->id();
            $name = (new \App\Models\UserProfileModel())->findByUserId($me)['full_name'] ?? auth()->user()->username;
            (new \App\Models\NotificationModel())->pushToAdmins('cancel_requested', 'cancel_requested', ['name' => $name, 'code' => $booking['booking_code']], site_url('admin/requests'), $me);
            log_activity('ขอยกเลิกคำขอ ' . $booking['booking_code']);

            return $this->ok(lang('Booking.cancel_sent'));
        }

        return $this->fail(lang('Booking.err_cancel_no'));
    }

    // POST: คืนรถ (เฉพาะรถขับเองที่อนุมัติแล้วและถึงเวลาเริ่มแล้ว) -> บันทึกเวลาคืน + ปล่อยรถคืน
    public function returnCar()
    {
        $id       = (int) $this->request->getPost('id');
        $bookings = new BookingModel();
        $booking  = $bookings->find($id);

        if (! $booking || (int) $booking['requester_id'] !== (int) auth()->id()) {
            return $this->fail(lang('Common.err_request_not_found'));
        }
        if ($booking['booking_type'] !== 'self' || $booking['status'] !== 'approved') {
            return $this->fail(lang('Booking.err_return_no'));
        }
        if ($booking['start_at'] > date('Y-m-d H:i:s')) {
            return $this->fail(lang('Booking.err_return_early'));
        }
        // เลยเวลาสิ้นสุดแล้ว -> ถือว่าเดินทางเสร็จสิ้น คืนรถไม่ได้ (ระบบปิดงานให้อัตโนมัติ)
        if ($booking['end_at'] <= date('Y-m-d H:i:s')) {
            return $this->fail(lang('Booking.err_return_ended'));
        }

        // บันทึกเวลาคืนจริง + ปิดงาน -> รถกลับมาจองได้ตามปกติ
        $bookings->update($id, ['status' => 'completed', 'returned_at' => date('Y-m-d H:i:s')]);

        // แจ้ง Admin ว่ามีคนคืนรถ
        $me   = (int) auth()->id();
        $name = (new \App\Models\UserProfileModel())->findByUserId($me)['full_name'] ?? auth()->user()->username;
        (new \App\Models\NotificationModel())->pushToAdmins('car_returned', 'car_returned', ['name' => $name, 'code' => $booking['booking_code']], site_url('admin/requests'), $me);
        log_activity('คืนรถ ' . $booking['booking_code']);

        return $this->ok(lang('Booking.returned'));
    }

    // ===== helper ตอบ JSON พร้อม csrf ใหม่ =====
    private function ok(string $message, ?string $redirect = null)
    {
        $out = ['ok' => true, 'message' => $message, 'csrf' => csrf_hash()];
        if ($redirect) {
            $out['redirect'] = $redirect;
        }

        return $this->response->setJSON($out);
    }

    private function fail(string $message)
    {
        return $this->response->setStatusCode(422)->setJSON(['ok' => false, 'message' => $message, 'csrf' => csrf_hash()]);
    }
}
