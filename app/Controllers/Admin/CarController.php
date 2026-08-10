<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\CarModel;

/**
 * จัดการรถ (Admin) — รถบริษัท (self) + รถจัดหาโดย Admin (other) + JSON endpoint ให้ island
 */
class CarController extends BaseController
{
    // หน้า "จัดการรถ" (เรนเดอร์ island)
    public function index()
    {
        return view('admin/vehicles/index', [
            'active'       => 'vehicles',
            'pageTitle'    => lang('Page.cars'),
            'pageSubtitle' => lang('Page.cars_sub'),
        ]);
    }

    // JSON: รถทั้ง 2 ประเภท
    public function data()
    {
        // กันเปิดตรงจาก browser -> เด้งกลับหน้าหลัก (กันโชว์ JSON ดิบ)
        if ($r = $this->blockDirectAccess()) {
            return $r;
        }

        $cars = new CarModel();

        return $this->response->setJSON([
            'self'    => $cars->byType('self'),
            'other'   => $cars->byType('other'),
            'drivers' => $this->companyDrivers(),
        ]);
    }

    // รายชื่อคนขับ (ใช้ตัวเลือกคนขับประจำ) — ดึงจาก UserProfileModel::drivers()
    private function companyDrivers(): array
    {
        return (new \App\Models\UserProfileModel())->drivers();
    }

    // POST: เพิ่ม/แก้ไขรถ (multipart — รองรับอัปโหลดรูป)
    public function save()
    {
        $id    = (int) $this->request->getPost('id');
        $type  = $this->request->getPost('car_type') === 'other' ? 'other' : 'self';
        $model = trim((string) $this->request->getPost('model'));
        $plate = trim((string) $this->request->getPost('plate'));

        $seats = (int) $this->request->getPost('seats');

        if ($model === '') {
            return $this->fail('กรุณากรอกรุ่นรถ');
        }
        // ทะเบียนบังคับเฉพาะรถบริษัท (self) — รถจัดหาโดย Admin (other) เว้นว่างได้
        if ($type === 'self' && $plate === '') {
            return $this->fail('กรุณากรอกทะเบียนรถ');
        }
        // จำนวนที่นั่งติดลบไม่ได้
        if ($seats < 0) {
            return $this->fail('จำนวนที่นั่งต้องไม่ติดลบ');
        }

        $data = [
            'car_type' => $type,
            'model'    => $model,
            'plate'    => $plate,
            'seats'    => $seats,
            'status'   => $this->request->getPost('status') === 'maintenance' ? 'maintenance' : 'available',
        ];
        // เฉพาะรถจัดหาโดย Admin: คนขับประจำ (เลือก user กลุ่ม driver) + หมายเหตุ
        if ($type === 'other') {
            $driverId = (int) $this->request->getPost('driver_id');
            if ($driverId > 0) {
                // คนขับประจำเป็นแบบ 1:1 — กันคนขับคนเดียวถูกผูกเป็นคนขับประจำของรถมากกว่า 1 คัน
                // (ไม่นับคันที่กำลังแก้ไข + ไม่นับรถที่ถูกลบ)
                $clash = db_connect()->table('cars')
                    ->select('model, plate')
                    ->where('default_driver_id', $driverId)
                    ->where('deleted_at', null)
                    ->where('id !=', $id ?: 0)
                    ->get()->getRowArray();
                if ($clash) {
                    return $this->fail('คนขับคนนี้เป็นคนขับประจำของรถ "' . $clash['model'] . ($clash['plate'] ? ' (' . $clash['plate'] . ')' : '') . '" อยู่แล้ว (1 คนขับผูกได้ 1 คัน)');
                }
                // ดึงชื่อคนขับจากโปรไฟล์ไว้แสดงคู่กับ id
                $prof                        = db_connect()->table('user_profiles')->select('full_name')->where('user_id', $driverId)->get()->getRowArray();
                $data['default_driver_id']   = $driverId;
                $data['default_driver_name'] = $prof['full_name'] ?? null;
            } else {
                $data['default_driver_id']   = null;
                $data['default_driver_name'] = null;
            }
            $data['note'] = trim((string) $this->request->getPost('note')) ?: null;
        } else {
            // รถบริษัท (self) ไม่มีคนขับประจำ/หมายเหตุ — ล้างค่าเดิมกันข้อมูลคนขับค้างเมื่อเปลี่ยนประเภทจาก other
            $data['default_driver_id']   = null;
            $data['default_driver_name'] = null;
            $data['note']                = null;
        }

        $cars     = new CarModel();
        $oldImage = null;

        // กันแก้ไข id ที่ไม่มีจริง/ถูกลบไปแล้ว (client ค้าง) — เช็คก่อนอัปโหลดไฟล์ กันไฟล์กำพร้า
        if ($id && ! $cars->find($id)) {
            return $this->fail('ไม่พบรถที่ต้องการแก้ไข (อาจถูกลบไปแล้ว)');
        }

        // อัปโหลดรูป — เฉพาะไฟล์รูปภาพ ขนาดไม่เกิน 2 MB
        $file = $this->request->getFile('image');
        if ($file && $file->getError() !== UPLOAD_ERR_NO_FILE) {
            if (! $this->validate([
                'image' => 'uploaded[image]|is_image[image]|mime_in[image,image/jpg,image/jpeg,image/png,image/webp,image/gif]|max_size[image,2048]',
            ])) {
                return $this->fail('อัปโหลดได้เฉพาะไฟล์รูปภาพ (jpg/png/webp/gif) ขนาดไม่เกิน 2 MB');
            }
            // เก็บ path รูปเก่าไว้ลบหลังบันทึกรูปใหม่ (กรณีแก้ไข)
            if ($id) {
                $oldImage = $cars->find($id)['image'] ?? null;
            }
            $newName = $file->getRandomName();
            $file->move(FCPATH . 'uploads/cars', $newName);
            $data['image'] = 'uploads/cars/' . $newName;
        }

        if ($id) {
            $cars->update($id, $data);   // ไม่ส่ง image ถ้าไม่ได้อัปใหม่ -> รูปเดิมคงอยู่
            $msg = 'บันทึกข้อมูลรถแล้ว';
            log_activity('แก้ไขข้อมูลรถ ' . $model . ($plate !== '' ? ' (' . $plate . ')' : ''));
        } else {
            $cars->insert($data);
            $msg = 'เพิ่มรถเรียบร้อย';
            log_activity('เพิ่มรถ ' . $model . ($plate !== '' ? ' (' . $plate . ')' : ''));
        }

        // เปลี่ยนรูปสำเร็จ -> ลบไฟล์รูปเก่าทิ้ง
        if ($oldImage && isset($data['image']) && $oldImage !== $data['image'] && is_file(FCPATH . $oldImage)) {
            @unlink(FCPATH . $oldImage);
        }

        return $this->ok($msg);
    }

    // POST: ลบรถ (soft delete) + ลบไฟล์รูปทิ้งทันที
    public function delete()
    {
        $id   = (int) $this->request->getPost('id');
        $cars = new CarModel();
        $car  = $cars->find($id);
        if (! $car) {
            return $this->fail('ไม่พบรถ');
        }

        // กันลบรถที่ยังมีการจอง active อยู่ (pending/approved/cancel_requested) -> คำขอจะค้างแก้ไม่ได้
        $active = db_connect()->table('bookings')
            ->where('car_id', $id)
            ->whereIn('status', ['pending', 'approved', 'cancel_requested'])
            ->where('deleted_at', null)
            ->countAllResults();
        if ($active > 0) {
            return $this->fail('ลบไม่ได้ รถคันนี้มีการจองที่ยังไม่สิ้นสุด ' . $active . ' รายการ — ยกเลิก/จบงานก่อนจึงจะลบได้');
        }

        $cars->delete($id);

        // ลบไฟล์รูปในโฟลเดอร์ทิ้งทันที (ไม่เก็บไฟล์กำพร้าไว้)
        $image = $car['image'] ?? null;
        if ($image && is_file(FCPATH . $image)) {
            @unlink(FCPATH . $image);
        }

        log_activity('ลบรถ ' . ($car['model'] ?? '') . (! empty($car['plate']) ? ' (' . $car['plate'] . ')' : ''));

        return $this->ok('ลบรถแล้ว');
    }

    // ===== helper ตอบ JSON พร้อม csrf ใหม่ =====
    private function ok(string $message)
    {
        return $this->response->setJSON(['ok' => true, 'message' => $message, 'csrf' => csrf_hash()]);
    }

    private function fail(string $message)
    {
        return $this->response->setStatusCode(422)->setJSON(['ok' => false, 'message' => $message, 'csrf' => csrf_hash()]);
    }
}
