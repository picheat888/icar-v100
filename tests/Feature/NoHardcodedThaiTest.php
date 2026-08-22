<?php

namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;

/**
 * ยาม: ไฟล์ที่ย้ายข้อความเข้าไฟล์ภาษาแล้ว ต้องไม่มี string ไทยเหลืออยู่
 * @internal
 */
final class NoHardcodedThaiTest extends CIUnitTestCase
{
    // ไล่ทุก controller และ model - ไม่ใช้รายชื่อ เพื่อให้ไฟล์ใหม่ถูกตรวจอัตโนมัติ
    private function phpSources(): array
    {
        return array_merge(
            glob(APPPATH . 'Controllers/*.php'),
            glob(APPPATH . 'Controllers/*/*.php'),
            glob(APPPATH . 'Models/*.php'),
        );
    }

    // บรรทัดนี้มี string ไทยที่ผู้ใช้จะเห็นไหม (ข้ามคอมเมนต์ และข้าม log)
    private function isThaiStringLine(string $line): bool
    {
        if (preg_match('/^\s*(\/\/|\*|\/\*)/', $line)) {
            return false;
        }
        if (preg_match('/log_activity|log_message/', $line)) {
            return false;
        }
        $code = preg_replace('/\s\/\/.*$/', '', $line);

        return (bool) preg_match('/[\'"][^\'"]*[\x{0E00}-\x{0E7F}]/u', (string) $code);
    }

    // คืนบรรทัดที่มี string literal ภาษาไทย (ข้ามคอมเมนต์ และข้าม log ที่ไม่ใช่ข้อความถึงผู้ใช้)
    private function thaiStringLines(string $path): array
    {
        $this->assertFileExists($path);
        $hits = [];

        foreach (file($path) as $i => $line) {
            if ($this->isThaiStringLine($line)) {
                $hits[] = ($i + 1) . ': ' . trim($line);
            }
        }

        return $hits;
    }

    public function testNoControllerOrModelHasThaiStrings(): void
    {
        $sources = $this->phpSources();
        $this->assertNotEmpty($sources, 'glob หาไฟล์ไม่เจอเลย - เทสต์นี้อาจไม่ได้ตรวจอะไรจริง');

        foreach ($sources as $path) {
            $hits = $this->thaiStringLines($path);
            $this->assertSame([], $hits, basename($path) . " ยังมีข้อความไทยฮาร์ดโค้ด:\n" . implode("\n", $hits));
        }
    }

    // ยาม: ตัวตรวจต้องจับ string ไทยได้จริง และต้องไม่จับสิ่งที่ยกเว้นไว้
    public function testDetectorMatchesThaiStringLiteralsOnly(): void
    {
        $this->assertTrue($this->isThaiStringLine("        return \$this->fail('ไม่พบสมาชิก');"));
        $this->assertTrue($this->isThaiStringLine('        $label = "แผนก";'));

        $this->assertFalse($this->isThaiStringLine('        // คอมเมนต์ไทยไม่นับ'));
        $this->assertFalse($this->isThaiStringLine('         * คอมเมนต์บล็อกไทยไม่นับ'));
        $this->assertFalse($this->isThaiStringLine("        log_activity('ลบรถ');"));
        $this->assertFalse($this->isThaiStringLine("        return \$this->fail(lang('Member.err_not_found'));"));
        $this->assertFalse($this->isThaiStringLine("        \$x = 'plain english';"));
    }
}
