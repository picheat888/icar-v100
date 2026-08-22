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

    // คีย์ที่รับพารามิเตอร์ - ต้องแทนค่าได้จริง ไม่ใช่โผล่ {0} ดิบ
    public function testParamKeysResolveBothLocales(): void
    {
        service('language')->setLocale('th');
        $this->assertSame('จำนวนที่นั่งต้องเป็นจำนวนเต็ม 0-999', lang('Request.err_ext_seats', [0, 999]));
        $this->assertSame('ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 จุด และขีดล่าง', lang('Account.err_username_format'));
        $this->assertSame('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', lang('Common.err_signed_out'));
        $this->assertSame('เซสชันหมดอายุ กรุณาลองส่งอีกครั้ง', lang('Security.disallowedAction'));

        service('language')->setLocale('en');
        $this->assertSame('The number of seats must be a whole number from 0 to 999', lang('Request.err_ext_seats', [0, 999]));
        $this->assertSame('Usernames can only contain letters, numbers, dots and underscores', lang('Account.err_username_format'));
        $this->assertSame('Your session expired. Please sign in again.', lang('Common.err_signed_out'));
        $this->assertSame('Your session expired. Please submit the form again.', lang('Security.disallowedAction'));
    }
}
