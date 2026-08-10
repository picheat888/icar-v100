<?php

namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class LangResolveTest extends CIUnitTestCase
{
    public function testThaiIsDefault(): void
    {
        service('language')->setLocale('th');
        $this->assertSame('แดชบอร์ด', lang('Nav.dashboard'));
    }

    public function testEnglishResolves(): void
    {
        service('language')->setLocale('en');
        $this->assertSame('Dashboard', lang('Nav.dashboard'));
        $this->assertSame('Save', lang('Common.save'));
        $this->assertSame('User Management', lang('Page.users'));
    }

    public function testAccountKeysResolveBothLocales(): void
    {
        service('language')->setLocale('th');
        $this->assertSame('เข้าสู่ระบบ', lang('Account.login_title'));
        service('language')->setLocale('en');
        $this->assertSame('Log in', lang('Account.login_title'));
    }
}
