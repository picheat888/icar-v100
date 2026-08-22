<?php

namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;

/**
 * ยาม: ไฟล์ที่ย้ายข้อความเข้าไฟล์ภาษาแล้ว ต้องไม่มี string ไทยเหลืออยู่
 * @internal
 */
final class NoHardcodedThaiTest extends CIUnitTestCase
{
    // ไฟล์ที่ย้ายข้อความเสร็จแล้ว - เพิ่มชื่อเมื่อย้ายไฟล์นั้นเสร็จ
    private const CLEAN_FILES = [
        'Controllers/Admin/ActivityLogController.php',
        'Controllers/Admin/CarController.php',
        'Controllers/Admin/DashboardController.php',
        'Controllers/Admin/MasterController.php',
        // MemberController ใส่กลับเมื่อ Task 11 ย้ายข้อความแจ้งเตือนเสร็จ
        // BookingController ใส่กลับเมื่อ Task 11 ย้ายข้อความแจ้งเตือนเสร็จ
        'Controllers/User/PageController.php',
        'Controllers/ProfileController.php',
    ];

    // คืนบรรทัดที่มี string literal ภาษาไทย (ข้ามคอมเมนต์ และข้าม log ที่ไม่ใช่ข้อความถึงผู้ใช้)
    private function thaiStringLines(string $relPath): array
    {
        $path = APPPATH . $relPath;
        $this->assertFileExists($path);
        $hits = [];

        foreach (file($path) as $i => $line) {
            if (preg_match('/^\s*(\/\/|\*|\/\*)/', $line)) {
                continue;
            }
            if (preg_match('/log_activity|log_message/', $line)) {
                continue;
            }
            // ตัดคอมเมนต์ท้ายบรรทัดออกก่อนตรวจ
            $code = preg_replace('/\s\/\/.*$/', '', $line);
            if (preg_match('/[\'"][^\'"]*[\x{0E00}-\x{0E7F}]/u', (string) $code)) {
                $hits[] = ($i + 1) . ': ' . trim($line);
            }
        }

        return $hits;
    }

    public function testCleanFilesHaveNoThaiStrings(): void
    {
        foreach (self::CLEAN_FILES as $relPath) {
            $hits = $this->thaiStringLines($relPath);
            $this->assertSame([], $hits, "{$relPath} ยังมีข้อความไทยฮาร์ดโค้ด:\n" . implode("\n", $hits));
        }
    }

    public function testDetectorActuallyFindsThai(): void
    {
        // ไฟล์ที่ยังไม่ย้าย ต้องถูกจับได้ - กันตัวตรวจพังแล้วเทสต์เขียวหลอก
        $this->assertNotSame([], $this->thaiStringLines('Controllers/Admin/RequestController.php'));
    }
}
