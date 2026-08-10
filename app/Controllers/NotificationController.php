<?php

namespace App\Controllers;

use App\Models\NotificationModel;

/**
 * แจ้งเตือน (กระดิ่ง) — ใช้ร่วมทุก role ที่ล็อกอิน (ใต้ filter session)
 */
class NotificationController extends BaseController
{
    private const PAGE = 10;   // จำนวนต่อหน้า

    // JSON: รายการล่าสุด + จำนวนยังไม่เห็น + มีเก่ากว่านี้ไหม
    public function data()
    {
        // กันเปิดตรงจาก browser -> เด้งกลับหน้าหลัก (กันโชว์ JSON ดิบ)
        if ($r = $this->blockDirectAccess()) {
            return $r;
        }

        $userId = (int) auth()->id();
        $offset = max(0, (int) $this->request->getGet('offset'));
        $m      = new NotificationModel();

        $items = array_map(static fn ($n) => [
            'id'         => (int) $n['id'],
            'type'       => $n['type'],
            'message'    => $n['message'],
            'link'       => $n['link'],
            'isRead'     => $n['read_at'] !== null,
            'created_at' => $n['created_at'],
        ], $m->listFor($userId, self::PAGE, $offset));

        return $this->response->setJSON([
            'items'       => $items,
            'unseenCount' => $m->unseenCount($userId),
            'hasMore'     => ($offset + self::PAGE) < $m->totalFor($userId),
        ]);
    }

    // เปิด dropdown -> เห็นแล้วทั้งหมด (เคลียร์ badge)
    public function seen()
    {
        (new NotificationModel())->markAllSeen((int) auth()->id());

        return $this->response->setJSON(['ok' => true, 'csrf' => csrf_hash()]);
    }

    // กดรายการ -> อ่านแล้ว 1 อัน
    public function read()
    {
        (new NotificationModel())->markRead((int) auth()->id(), (int) $this->request->getPost('id'));

        return $this->response->setJSON(['ok' => true, 'csrf' => csrf_hash()]);
    }

    // อ่านทั้งหมด
    public function readAll()
    {
        (new NotificationModel())->markAllRead((int) auth()->id());

        return $this->response->setJSON(['ok' => true, 'csrf' => csrf_hash()]);
    }
}
