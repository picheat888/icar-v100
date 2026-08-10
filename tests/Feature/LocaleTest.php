<?php

namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * @internal
 */
final class LocaleTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    public function testSwitchToEnglishSetsCookieAndRedirects(): void
    {
        $result = $this->get('lang/en');
        $result->assertStatus(302);
        $result->assertCookie('lang', 'en');
    }

    public function testInvalidLangFallsBackToDefault(): void
    {
        // ค่าไม่รองรับ -> ตกเป็นค่าเริ่มต้นของระบบ (en)
        $result = $this->get('lang/xx');
        $result->assertCookie('lang', 'en');
    }
}
