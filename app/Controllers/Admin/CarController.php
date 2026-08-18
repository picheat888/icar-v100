<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\CarModel;

/**
 * จัดการรถ (Admin) - รถบริษัท (self) + รถจัดหาโดย Admin (other) + JSON endpoint ให้ island
 */
class CarController extends BaseController
{
    // ความยาวสูงสุด - ตรงกับคอลัมน์ในตาราง cars
    private const MAX_MODEL = 100;   // คอลัมน์เป็น varchar(150) - จำกัดที่ 100
    private const MAX_PLATE = 30;    // varchar(30)
    private const MAX_NOTE  = 255;   // varchar(255)
    private const MIN_SEATS = 1;     // ต้องมีที่นั่งอย่างน้อย 1 (0 ไม่ได้)
    private const MAX_SEATS = 40;

    // ย่อรูปที่อัปโหลดให้ด้านยาวสุดไม่เกินค่านี้ (px) แล้วบันทึกที่คุณภาพ IMG_QUALITY
    private const IMG_MAX     = 1600;
    private const IMG_QUALITY = 82;

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

    // รายชื่อคนขับ (ใช้ตัวเลือกคนขับประจำ) - ดึงจาก UserProfileModel::drivers()
    private function companyDrivers(): array
    {
        return (new \App\Models\UserProfileModel())->drivers();
    }

    // POST: เพิ่ม/แก้ไขรถ (multipart - รองรับอัปโหลดรูป)
    public function save()
    {
        $id    = (int) $this->request->getPost('id');
        $type  = $this->request->getPost('car_type') === 'other' ? 'other' : 'self';
        $model = trim((string) $this->request->getPost('model'));
        // ทะเบียน: ยุบช่องว่างซ้อนให้เหลือช่องเดียว + ตัวอังกฤษเป็นพิมพ์ใหญ่ ให้เทียบซ้ำได้ตรง
        $plate = strtoupper(preg_replace('/\s+/u', ' ', trim((string) $this->request->getPost('plate'))));
        $note  = trim((string) $this->request->getPost('note'));

        $seats = (int) $this->request->getPost('seats');

        if ($model === '') {
            return $this->fail('กรุณากรอกรุ่นรถ');
        }
        if (mb_strlen($model) > self::MAX_MODEL) {
            return $this->fail('รุ่นรถยาวไม่เกิน ' . self::MAX_MODEL . ' ตัวอักษร');
        }
        // ทะเบียนบังคับเฉพาะรถบริษัท (self) - รถจัดหาโดย Admin (other) เว้นว่างได้
        if ($type === 'self' && $plate === '') {
            return $this->fail('กรุณากรอกทะเบียนรถ');
        }
        if ($plate !== '') {
            if (mb_strlen($plate) < 2 || mb_strlen($plate) > self::MAX_PLATE) {
                return $this->fail('ทะเบียนต้องยาว 2-' . self::MAX_PLATE . ' ตัวอักษร');
            }
            // อนุญาต: พยัญชนะ/สระไทย, A-Z, 0-9, เว้นวรรค, ขีด - ครอบทุกแบบที่ใช้จริง
            // (กข 1234 · 1กก 1234 · 70-1234 · ทะเบียนที่มีชื่อจังหวัด)
            if (preg_match('/^[\p{Thai}A-Z0-9 \-]+$/u', $plate) !== 1) {
                return $this->fail('ทะเบียนใช้ได้เฉพาะตัวอักษรไทย/อังกฤษ ตัวเลข เว้นวรรค และขีด (-)');
            }
        }
        if ($note !== '' && mb_strlen($note) > self::MAX_NOTE) {
            return $this->fail('หมายเหตุยาวไม่เกิน ' . self::MAX_NOTE . ' ตัวอักษร');
        }
        if ($seats < self::MIN_SEATS || $seats > self::MAX_SEATS) {
            return $this->fail('จำนวนที่นั่งต้องอยู่ระหว่าง ' . self::MIN_SEATS . '-' . self::MAX_SEATS . ' ที่นั่ง');
        }
        // ทะเบียนห้ามซ้ำกับรถที่ยังใช้งานอยู่ (ข้ามคันที่กำลังแก้ไข · รถที่ถูกลบแล้วปล่อยทะเบียนคืน
        // · รถจัดหาโดย Admin ที่เว้นทะเบียนว่างไม่ต้องตรวจ) - ตรวจก่อนอัปโหลดรูป กันไฟล์กำพร้า
        if ($plate !== '') {
            $dupe = db_connect()->table('cars')
                ->select('model')
                ->where('plate', $plate)
                ->where('deleted_at', null)
                ->where('id !=', $id ?: 0)
                ->get()->getRowArray();
            if ($dupe) {
                return $this->fail('ทะเบียน "' . $plate . '" ถูกใช้กับรถ "' . $dupe['model'] . '" อยู่แล้ว');
            }
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
                // คนขับประจำเป็นแบบ 1:1 - กันคนขับคนเดียวถูกผูกเป็นคนขับประจำของรถมากกว่า 1 คัน
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
            $data['note'] = $note ?: null;
        } else {
            // รถบริษัท (self) ไม่มีคนขับประจำ/หมายเหตุ - ล้างค่าเดิมทิ้ง
            $data['default_driver_id']   = null;
            $data['default_driver_name'] = null;
            $data['note']                = null;
        }

        $cars     = new CarModel();
        $oldImage = null;

        // กันแก้ไข id ที่ไม่มีจริง/ถูกลบไปแล้ว (client ค้าง) - เช็คก่อนอัปโหลดไฟล์ กันไฟล์กำพร้า
        if ($id && ! $cars->find($id)) {
            return $this->fail('ไม่พบรถที่ต้องการแก้ไข (อาจถูกลบไปแล้ว)', true);
        }

        // อัปโหลดรูป - เฉพาะไฟล์รูปภาพ ขนาดไม่เกิน 2 MB
        $file = $this->request->getFile('image');
        if ($file && $file->getError() !== UPLOAD_ERR_NO_FILE) {
            if (! $this->validate([
                'image' => 'uploaded[image]|is_image[image]'
                    . '|mime_in[image,image/jpeg,image/pjpeg,image/png,image/webp]'
                    . '|ext_in[image,jpg,jpeg,png,webp]'
                    . '|max_size[image,2048]',
            ])) {
                return $this->fail('อัปโหลดได้เฉพาะไฟล์ jpg, png, webp ขนาดไม่เกิน 2 MB'
                    . ' · ไฟล์ HEIC จาก iPhone ยังไม่รองรับ ตั้งค่า > กล้อง > รูปแบบ เป็น "เข้ากันได้มากที่สุด" หรือแปลงเป็น jpg ก่อน');
            }
            // เก็บ path รูปเก่าไว้ลบหลังบันทึกรูปใหม่ (กรณีแก้ไข)
            if ($id) {
                $oldImage = $cars->find($id)['image'] ?? null;
            }
            $newName = $file->getRandomName();
            $file->move(WRITEPATH . 'uploads/cars', $newName);
            $this->shrinkImage(WRITEPATH . 'uploads/cars/' . $newName);
            $data['image'] = $newName;
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
        if ($oldImage && isset($data['image']) && $oldImage !== $data['image']) {
            $this->deleteImage($oldImage);
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
            return $this->fail('ไม่พบรถ', true);
        }

        // กันลบรถที่ยังมีการจอง active (pending/approved/cancel_requested)
        $active = db_connect()->table('bookings')
            ->where('car_id', $id)
            ->whereIn('status', ['pending', 'approved', 'cancel_requested'])
            ->where('deleted_at', null)
            ->countAllResults();
        if ($active > 0) {
            return $this->fail('ลบไม่ได้ รถคันนี้มีการจองที่ยังไม่สิ้นสุด ' . $active . ' รายการ - ยกเลิก/จบงานก่อนจึงจะลบได้');
        }

        $cars->delete($id);

        // ลบไฟล์รูปในโฟลเดอร์ทิ้งทันที (ไม่เก็บไฟล์กำพร้าไว้)
        $this->deleteImage($car['image'] ?? null);

        log_activity('ลบรถ ' . ($car['model'] ?? '') . (! empty($car['plate']) ? ' (' . $car['plate'] . ')' : ''));

        return $this->ok('ลบรถแล้ว');
    }

    // ย่อรูปให้ด้านยาวสุดไม่เกิน IMG_MAX แล้วบันทึกทับ
    private function shrinkImage(string $path): void
    {
        $info = @getimagesize($path);
        if ($info === false) {
            return;
        }
        [$w, $h] = $info;
        if ($w <= self::IMG_MAX && $h <= self::IMG_MAX) {
            return;
        }

        try {
            service('image')
                ->withFile($path)
                ->resize(self::IMG_MAX, self::IMG_MAX, true, $w >= $h ? 'width' : 'height')
                ->save($path, self::IMG_QUALITY);
        } catch (\Throwable $e) {
            // ย่อไม่ได้ก็ใช้ไฟล์เดิม (ผ่าน validate ขนาด <= 2 MB มาแล้ว)
            log_message('warning', 'ย่อรูปรถไม่สำเร็จ: ' . $e->getMessage());
        }
    }

    // ลบไฟล์รูปใน writable/uploads/cars (basename กัน path traversal)
    private function deleteImage(?string $name): void
    {
        $name = basename((string) $name);
        if ($name === '') {
            return;
        }
        $path = WRITEPATH . 'uploads/cars/' . $name;
        if (is_file($path)) {
            @unlink($path);
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
