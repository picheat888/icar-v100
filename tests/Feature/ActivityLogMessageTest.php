<?php

namespace Tests\Feature;

use App\Models\ActivityLogModel;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * บันทึกกิจกรรม - เก็บ key + params แล้วประกอบข้อความตอนอ่าน
 * @internal
 */
final class ActivityLogMessageTest extends CIUnitTestCase
{
    public function testRenderMessageUsesReaderLocale(): void
    {
        $row = ['msg_key' => 'booking_approved', 'params' => json_encode(['code' => 'BK-0001'])];

        service('language')->setLocale('th');
        $this->assertSame('อนุมัติคำขอ BK-0001', ActivityLogModel::renderMessage($row));

        service('language')->setLocale('en');
        $this->assertSame('Approved request BK-0001', ActivityLogModel::renderMessage($row));
    }

    // ชื่อบทบาทเก็บเป็นคีย์ (admin/user/driver) แปลตอนอ่าน ไม่ใช่ตอนเขียน
    public function testRoleParamIsTranslatedAtReadTime(): void
    {
        $row = ['msg_key' => 'member_approved', 'params' => json_encode(['name' => 'somchai', 'role' => 'driver'])];

        service('language')->setLocale('en');
        $this->assertStringContainsString('Driver', ActivityLogModel::renderMessage($row));

        service('language')->setLocale('th');
        $this->assertStringContainsString('คนขับ', ActivityLogModel::renderMessage($row));
    }

    // แถวที่บันทึกไว้ก่อนมีระบบคีย์ - ยังอ่านออกจากคอลัมน์ action เดิม
    public function testRowWithoutKeyFallsBackToActionColumn(): void
    {
        $row = ['msg_key' => null, 'params' => null, 'action' => 'Signed in'];
        $this->assertSame('Signed in', ActivityLogModel::renderMessage($row));
    }

    // บังคับภาษาได้ - log_activity ใช้ตอนเขียนข้อความอังกฤษลงคอลัมน์ action
    public function testLocaleCanBeForced(): void
    {
        service('language')->setLocale('th');
        $row = ['msg_key' => 'signed_in', 'params' => null];
        $this->assertSame('Signed in', ActivityLogModel::renderMessage($row, 'en'));
    }

    /**
     * ทุกคีย์ที่ log_activity() เรียกใช้ ต้องมีอยู่จริงในไฟล์ภาษาทั้งสองภาษา
     * พิมพ์คีย์ผิดจะได้เห็นตอนรันเทสต์ ไม่ใช่ตอนเปิดหน้าประวัติแล้วเจอ 'Log.xxx'
     */
    public function testEveryKeyUsedInCodeExists(): void
    {
        $th = include APPPATH . 'Language/th/Log.php';
        $en = include APPPATH . 'Language/en/Log.php';
        $this->assertSame(array_keys($th), array_keys($en));

        $used = [];
        foreach ($this->controllerSources() as $path) {
            preg_match_all("/log_activity\(\s*'([a-z0-9_]+)'/", file_get_contents($path), $m);
            $used = array_merge($used, $m[1]);
        }

        $this->assertNotEmpty($used, 'หา log_activity() ในโค้ดไม่เจอเลย - เทสต์นี้อาจไม่ได้ตรวจอะไรจริง');
        $this->assertSame([], array_values(array_diff(array_unique($used), array_keys($th))), 'คีย์ที่โค้ดเรียกแต่ไม่มีในไฟล์ภาษา');
    }

    // ไฟล์ controller ทั้งหมด (log_activity ถูกเรียกจากที่นี่)
    private function controllerSources(): array
    {
        return array_merge(
            glob(APPPATH . 'Controllers/*.php'),
            glob(APPPATH . 'Controllers/*/*.php'),
        );
    }
}
