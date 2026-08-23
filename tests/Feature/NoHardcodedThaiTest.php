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
            glob(APPPATH . 'Views/*.php'),
            glob(APPPATH . 'Views/*/*.php'),
            glob(APPPATH . 'Views/*/*/*.php'),
        );
    }

    // บรรทัดนี้มี string ไทยไหม (ข้ามคอมเมนต์) - รวมข้อความใน log ด้วย log ต้องเป็นอังกฤษ
    private function isThaiStringLine(string $line): bool
    {
        if (preg_match('/^\s*(\/\/|\*|\/\*)/', $line)) {
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
        $this->assertTrue($this->isThaiStringLine("        log_activity('ลบรถ');"));
        $this->assertTrue($this->isThaiStringLine("        log_message('error', 'พัง');"));
        $this->assertFalse($this->isThaiStringLine("        log_activity('Deleted car');"));
        $this->assertFalse($this->isThaiStringLine("        return \$this->fail(lang('Member.err_not_found'));"));
        $this->assertFalse($this->isThaiStringLine("        \$x = 'plain english';"));
    }

    // ไฟล์ React ทั้งหมดที่เรนเดอร์อะไรให้ผู้ใช้เห็น
    private function jsxSources(): array
    {
        return array_merge(
            glob(ROOTPATH . 'resources/js/islands/*.jsx'),
            glob(ROOTPATH . 'resources/js/lib/*.jsx'),
            glob(ROOTPATH . 'resources/js/entries/*.jsx'),
        );
    }

    /**
     * ข้อความที่ผู้ใช้เห็นแต่ไม่ผ่าน t() - จับ 2 รูปแบบ
     * 1) <tag>ข้อความ</tag> ในบรรทัดเดียว  2) ทั้งบรรทัดเป็นข้อความล้วน (ลูกของแท็กที่ขึ้นบรรทัดใหม่)
     */
    private function bareJsxText(string $line): array
    {
        $trimmed = trim($line);

        if ($trimmed === '' || preg_match('/^(\/\/|\*|\/\*)/', $trimmed) === 1) {
            return [];
        }

        if (preg_match('/>([^<>{}]*[A-Za-z\x{0E00}-\x{0E7F}]{2,}[^<>{}]*)</u', $line, $m) === 1) {
            $text = trim($m[1]);

            if ($text !== '' && ! $this->hasCodePunctuation($text)) {
                return [$text];
            }
        }

        if (! $this->hasCodePunctuation($trimmed) && $this->looksLikeUiText($trimmed)) {
            return [$trimmed];
        }

        return [];
    }

    // อักขระที่บอกว่าเป็นโค้ด JS ไม่ใช่ข้อความที่ผู้ใช้อ่าน
    private function hasCodePunctuation(string $text): bool
    {
        return strpbrk($text, ",:;.[](){}<>=&|?'\"`\/") !== false;
    }

    // ข้อความ UI จริง: มีอักษรไทย หรือ มีเว้นวรรคและขึ้นต้นด้วยตัวพิมพ์ใหญ่ (ตัวแปร JS ไม่เป็นแบบนี้)
    private function looksLikeUiText(string $text): bool
    {
        if (preg_match('/[\x{0E00}-\x{0E7F}]/u', $text) === 1) {
            return true;
        }

        return preg_match('/^[A-Z]\S*\s+\S/u', $text) === 1;
    }

    public function testNoBareTextInJsx(): void
    {
        $sources = $this->jsxSources();
        $this->assertNotEmpty($sources, 'glob หาไฟล์ jsx ไม่เจอเลย - เทสต์นี้อาจไม่ได้ตรวจอะไรจริง');

        foreach ($sources as $path) {
            $hits = [];

            foreach (file($path) as $i => $line) {
                foreach ($this->bareJsxText($line) as $text) {
                    $hits[] = ($i + 1) . ': ' . $text;
                }
            }

            $this->assertSame([], $hits, basename($path) . " มีข้อความที่ไม่ผ่าน t():\n" . implode("\n", $hits));
        }
    }

    // ยาม: ตัวตรวจ JSX ต้องจับข้อความเปล่าได้ และต้องไม่จับนิพจน์ JS
    public function testBareJsxDetectorItself(): void
    {
        $this->assertSame(['Admin'], $this->bareJsxText('        <option value="admin">Admin</option>'));
        $this->assertSame(['ภาษาไทย'], $this->bareJsxText('        <span>ภาษาไทย</span>'));

        $this->assertSame([], $this->bareJsxText("        <option>{t('mem.role_admin')}</option>"));
        $this->assertSame([], $this->bareJsxText('          ) : loadErr ? ('));
        $this->assertSame([], $this->bareJsxText('        {n > win && page < total ? a : b}'));
        $this->assertSame([], $this->bareJsxText('        <span>▲</span>'));
        $this->assertSame([], $this->bareJsxText('        // <div>คอมเมนต์</div>'));

        // ข้อความที่อยู่บรรทัดของตัวเอง (แท็กเปิดอยู่บรรทัดบน แท็กปิดอยู่บรรทัดล่าง)
        $this->assertSame(['Export CSV'], $this->bareJsxText('          Export CSV'));
        $this->assertSame(['ส่งออก ไฟล์'], $this->bareJsxText('          ส่งออก ไฟล์'));

        $this->assertSame([], $this->bareJsxText('          mobile'));
        $this->assertSame([], $this->bareJsxText('          lockBackdrop'));
        $this->assertSame([], $this->bareJsxText('        return narrow'));
        $this->assertSame([], $this->bareJsxText('          empId: f.empId, name: f.name,'));
    }
}
