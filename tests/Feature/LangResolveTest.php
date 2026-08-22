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
        $this->assertSame('Dashboard', lang('Nav.dashboard'));
        $this->assertSame('จัดการรถ', lang('Nav.cars'));
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
        $this->assertSame('Sign in', lang('Account.login_title'));
    }

    public function testBookPageTitleResolvesBothLocales(): void
    {
        service('language')->setLocale('th');
        $this->assertSame('จองรถ', lang('Page.book'));
        $this->assertSame('เลือกประเภทการจองและกรอกรายละเอียด', lang('Page.book_sub'));
        service('language')->setLocale('en');
        $this->assertSame('Book a Vehicle', lang('Page.book'));
        $this->assertSame('Choose a booking type and fill in the details', lang('Page.book_sub'));
    }
}
