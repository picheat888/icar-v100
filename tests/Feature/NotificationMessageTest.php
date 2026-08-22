<?php

namespace Tests\Feature;

use App\Models\NotificationModel;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * แจ้งเตือน - เก็บ key + params แล้วประกอบข้อความตอนอ่าน
 * @internal
 */
final class NotificationMessageTest extends CIUnitTestCase
{
    // อ่านจากไฟล์ migration ไม่ต่อฐานข้อมูล (เครื่องนี้ไม่ได้เปิด extension sqlite3)
    public function testMigrationStoresKeyNotRenderedMessage(): void
    {
        $src = file_get_contents(APPPATH . 'Database/Migrations/2026-07-14-000001_CreateNotifications.php');

        $this->assertStringContainsString("'msg_key'", $src, 'ยังไม่มีคอลัมน์ msg_key ใน migration');
        $this->assertStringContainsString("'params'", $src, 'ยังไม่มีคอลัมน์ params ใน migration');
        $this->assertStringNotContainsString("'message'", $src, 'คอลัมน์ message ต้องถูกตัดออกจาก migration');
    }
}
