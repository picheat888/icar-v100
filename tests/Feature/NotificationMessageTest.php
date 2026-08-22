<?php

namespace Tests\Feature;

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
}
