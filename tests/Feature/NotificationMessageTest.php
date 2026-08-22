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

        // ตรวจนิยามคอลัมน์จริง ไม่ใช่แค่ชื่อโผล่ที่ไหนก็ได้ในไฟล์
        $this->assertMatchesRegularExpression(
            "/'msg_key'\s*=>\s*\['type'\s*=>\s*'VARCHAR',\s*'constraint'\s*=>\s*60\]/",
            $src,
            'msg_key ต้องเป็น VARCHAR(60) และห้ามยอมให้เป็น null'
        );
        $this->assertMatchesRegularExpression(
            "/'params'\s*=>\s*\['type'\s*=>\s*'TEXT',\s*'null'\s*=>\s*true\]/",
            $src,
            'params ต้องเป็น TEXT ที่ null ได้'
        );
        $this->assertStringNotContainsString("'message'", $src, 'คอลัมน์ message ต้องถูกตัดออกจาก migration');
    }

    public function testRenderMessageUsesReaderLocale(): void
    {
        $row = ['msg_key' => 'booking_approved', 'params' => json_encode(['code' => 'BK-0001'])];

        service('language')->setLocale('th');
        $this->assertSame('คำขอ BK-0001 ได้รับการอนุมัติแล้ว', NotificationModel::renderMessage($row));

        service('language')->setLocale('en');
        $this->assertSame('Request BK-0001 has been approved', NotificationModel::renderMessage($row));
    }

    public function testRenderMessageWithoutParams(): void
    {
        $row = ['msg_key' => 'member_rejected', 'params' => null];
        service('language')->setLocale('en');
        $this->assertSame('Your account has been disabled - please contact an administrator', NotificationModel::renderMessage($row));
    }

    public function testEveryMessageKeyExistsInBothLocales(): void
    {
        $th = include APPPATH . 'Language/th/Notification.php';
        $en = include APPPATH . 'Language/en/Notification.php';
        $this->assertSame(array_keys($th), array_keys($en));
        $this->assertNotEmpty($th);
    }
}
