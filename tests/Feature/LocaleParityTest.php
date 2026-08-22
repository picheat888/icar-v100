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
    // namespace ที่โปรเจกต์เป็นเจ้าของ - เพิ่มชื่อทุกครั้งที่สร้างไฟล์ภาษาใหม่
    private const PROJECT_NAMESPACES = [
        'Account', 'Car', 'Common', 'Log', 'Member', 'Nav', 'Page', 'Profile', 'Request',
    ];

    // โหลด key ทั้งหมดของ namespace หนึ่งในภาษาหนึ่ง -> ['key' => 'value']
    private function keysOf(string $locale, string $ns): array
    {
        $path = APPPATH . "Language/{$locale}/{$ns}.php";
        $this->assertFileExists($path, "ไม่มีไฟล์ภาษา {$locale}/{$ns}.php");

        return include $path;
    }

    public function testEveryNamespaceHasBothLocales(): void
    {
        foreach (self::PROJECT_NAMESPACES as $ns) {
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
        foreach (self::PROJECT_NAMESPACES as $ns) {
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
}
