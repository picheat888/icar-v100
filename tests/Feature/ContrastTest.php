<?php

namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;

/**
 * ยาม: คู่ "ตัวอักษรบนพื้นอ่อน" ทุกคู่ที่ระบบใช้ ต้องผ่าน WCAG 1.4.3 (AA) ที่ 4.5:1
 * @internal
 */
final class ContrastTest extends CIUnitTestCase
{
    // คู่ที่ต้องผ่าน: [token ตัวอักษร, token พื้น]
    private const PAIRS = [
        ['--success-text', '--success-soft'],
        ['--danger-text',  '--danger-soft'],
        ['--warn',         '--warn-soft'],
        ['--teal-dark',    '--teal-soft'],
    ];

    private const MIN_RATIO = 4.5;

    // อ่านค่า token ทั้งหมดจาก :root ของ app.css -> ['--name' => '#rrggbb']
    private function tokens(): array
    {
        $css = (string) file_get_contents(ROOTPATH . 'resources/css/app.css');
        preg_match('/:root\s*\{(.+?)\}/s', $css, $m);
        $this->assertNotEmpty($m[1] ?? '', 'อ่าน :root จาก app.css ไม่ได้');

        preg_match_all('/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/', $m[1], $all, PREG_SET_ORDER);
        $out = [];
        foreach ($all as $row) {
            $out[$row[1]] = strtolower($row[2]);
        }

        return $out;
    }

    // ความสว่างสัมพัทธ์ตามสูตร WCAG
    private function luminance(string $hex): float
    {
        $ch = [];
        foreach ([1, 3, 5] as $i) {
            $c    = hexdec(substr($hex, $i, 2)) / 255;
            $ch[] = $c <= 0.03928 ? $c / 12.92 : (($c + 0.055) / 1.055) ** 2.4;
        }

        return 0.2126 * $ch[0] + 0.7152 * $ch[1] + 0.0722 * $ch[2];
    }

    private function ratio(string $fg, string $bg): float
    {
        $a = $this->luminance($fg);
        $b = $this->luminance($bg);
        [$hi, $lo] = $a >= $b ? [$a, $b] : [$b, $a];

        return ($hi + 0.05) / ($lo + 0.05);
    }

    public function testTextOnSoftBackgroundsMeetAA(): void
    {
        $tokens = $this->tokens();

        foreach (self::PAIRS as [$fgName, $bgName]) {
            $this->assertArrayHasKey($fgName, $tokens, "ไม่มี token {$fgName} ใน :root");
            $this->assertArrayHasKey($bgName, $tokens, "ไม่มี token {$bgName} ใน :root");

            $r = $this->ratio($tokens[$fgName], $tokens[$bgName]);
            $this->assertGreaterThanOrEqual(
                self::MIN_RATIO,
                round($r, 2),
                sprintf('%s บน %s ได้ %.2f:1 ต้องได้ %.1f:1', $fgName, $bgName, $r, self::MIN_RATIO),
            );
        }
    }

    // ยาม: ตัวคำนวณเองต้องยังทำงาน - คู่ที่รู้ว่าตกต้องถูกตัดสินว่าตก
    public function testRatioCalculatorItself(): void
    {
        $this->assertSame(21.0, round($this->ratio('#000000', '#ffffff'), 2));
        $this->assertSame(1.0, round($this->ratio('#123456', '#123456'), 2));
        $this->assertSame(4.09, round($this->ratio('#16855a', '#e7f4ee'), 2));
        $this->assertSame(5.39, round($this->ratio('#11704b', '#e7f4ee'), 2));
    }
}
