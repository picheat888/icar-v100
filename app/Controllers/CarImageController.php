<?php

namespace App\Controllers;

use App\Models\CarModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * เสิร์ฟรูปรถ - ไฟล์อยู่ใน writable/uploads/cars (นอก webroot) จึงเข้าถึงตรงจาก URL ไม่ได้
 * ใช้ร่วมทุก role ที่ล็อกอิน (ใต้ filter session)
 */
class CarImageController extends BaseController
{
    // ชื่อไฟล์ที่ CarController สร้าง: timestamp _ hex 20 ตัว + นามสกุลรูป
    private const NAME_PATTERN = '/^\d+_[0-9a-f]{20}\.(jpg|jpeg|png|webp|gif)$/';

    private const MIME = [
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'webp' => 'image/webp',
        'gif'  => 'image/gif',
    ];

    // GET: รูปของรถคันหนึ่ง (รวมรถที่ถูก soft delete - รายการเก่ายังอ้างรูปได้)
    public function show(int $id): ResponseInterface
    {
        $car = (new CarModel())->withDeleted()->find($id);
        $name = $car['image'] ?? '';

        // basename กัน path traversal ซ้อนกับ whitelist ชื่อไฟล์ (defense-in-depth)
        $name = basename((string) $name);
        if ($name === '' || preg_match(self::NAME_PATTERN, $name) !== 1) {
            return $this->response->setStatusCode(404);
        }

        $path = WRITEPATH . 'uploads/cars/' . $name;
        if (! is_file($path)) {
            return $this->response->setStatusCode(404);
        }

        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));

        return $this->response
            ->setHeader('Content-Type', self::MIME[$ext])
            ->setHeader('Content-Length', (string) filesize($path))
            // private = เบราว์เซอร์ของคนที่ล็อกอินอยู่ cache ได้ แต่ proxy/CDN ห้ามเก็บ
            ->setHeader('Cache-Control', 'private, max-age=600')
            ->setHeader('X-Content-Type-Options', 'nosniff')
            ->setBody(file_get_contents($path));
    }
}
