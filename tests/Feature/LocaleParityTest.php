<?php

namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;

/**
 * ยาม: ไฟล์ภาษาที่โปรเจกต์เป็นเจ้าของต้องมี key ครบเท่ากันทั้ง th/en
 * (ไม่รวม Auth/Validation เพราะ en ใช้ไฟล์ของ CI4 core + Shield)
 * @internal
 */
final class LocaleParityTest extends CIUnitTestCase
{
    // namespace ที่ th-only เพราะ en มาจากไฟล์ core ของ CI4 + Shield
    private const SKIP_NAMESPACES = ['Auth', 'Validation'];

    // ไล่ชื่อ namespace จากไฟล์ในโฟลเดอร์ th จริง - ไฟล์ใหม่ถูกตรวจอัตโนมัติ
    private function projectNamespaces(): array
    {
        $files = glob(APPPATH . 'Language/th/*.php');
        $names = array_map(fn (string $f) => pathinfo($f, PATHINFO_FILENAME), $files);

        return array_values(array_diff($names, self::SKIP_NAMESPACES));
    }

    // โหลด key ทั้งหมดของ namespace หนึ่งในภาษาหนึ่ง -> ['key' => 'value']
    private function keysOf(string $locale, string $ns): array
    {
        $path = APPPATH . "Language/{$locale}/{$ns}.php";
        $this->assertFileExists($path, "ไม่มีไฟล์ภาษา {$locale}/{$ns}.php");

        return include $path;
    }

    public function testEveryNamespaceHasBothLocales(): void
    {
        $namespaces = $this->projectNamespaces();
        $this->assertNotEmpty($namespaces, 'glob หา namespace ไม่เจอเลย - เทสต์นี้อาจไม่ได้ตรวจอะไรจริง');

        foreach ($namespaces as $ns) {
            $th = $this->keysOf('th', $ns);
            $en = $this->keysOf('en', $ns);

            $missingEn = array_diff(array_keys($th), array_keys($en));
            $missingTh = array_diff(array_keys($en), array_keys($th));

            $this->assertSame([], array_values($missingEn), "{$ns}: key ที่ขาดใน en -> " . implode(', ', $missingEn));
            $this->assertSame([], array_values($missingTh), "{$ns}: key ที่ขาดใน th -> " . implode(', ', $missingTh));
        }
    }

    public function testEnglishValuesHaveNoThaiCharacters(): void
    {
        foreach ($this->projectNamespaces() as $ns) {
            foreach ($this->keysOf('en', $ns) as $key => $value) {
                if (! is_string($value)) {
                    continue;
                }
                $this->assertDoesNotMatchRegularExpression(
                    '/[\x{0E00}-\x{0E7F}]/u',
                    $value,
                    "{$ns}.{$key} ในไฟล์ en ยังมีอักษรไทย: {$value}"
                );
            }
        }
    }

    public function testFrameworkBackedNamespacesResolveInEnglish(): void
    {
        service('language')->setLocale('en');
        $this->assertSame('Password', lang('Auth.password'));
        $this->assertStringContainsString('required', lang('Validation.required'));
    }

    // โหลด key/value ของไฟล์ภาษาฝั่ง React (resources/js/locales)
    private function jsLocale(string $locale): array
    {
        $path = ROOTPATH . "resources/js/locales/{$locale}.json";
        $this->assertFileExists($path, "ไม่มีไฟล์ภาษา JS {$locale}.json");

        return json_decode(file_get_contents($path), true);
    }

    public function testJsLocalesHaveTheSameKeys(): void
    {
        $th = $this->jsLocale('th');
        $en = $this->jsLocale('en');

        $missingEn = array_diff(array_keys($th), array_keys($en));
        $missingTh = array_diff(array_keys($en), array_keys($th));

        $this->assertSame([], array_values($missingEn), 'th.json มี key ที่ขาดใน en.json -> ' . implode(', ', $missingEn));
        $this->assertSame([], array_values($missingTh), 'en.json มี key ที่ขาดใน th.json -> ' . implode(', ', $missingTh));
    }

    public function testJsEnglishLocaleHasNoThaiCharacters(): void
    {
        foreach ($this->jsLocale('en') as $key => $value) {
            if (! is_string($value)) {
                continue;
            }
            $this->assertDoesNotMatchRegularExpression(
                '/[\x{0E00}-\x{0E7F}]/u',
                $value,
                "en.json.{$key} ยังมีอักษรไทย: {$value}"
            );
        }
    }
}
