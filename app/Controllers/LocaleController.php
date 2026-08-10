<?php

namespace App\Controllers;

/**
 * สลับภาษา — ตั้ง cookie 'lang' แล้วเด้งกลับหน้าเดิม (ใช้ได้ทั้ง guest/ล็อกอิน)
 */
class LocaleController extends BaseController
{
    private const SUPPORTED = ['th', 'en'];

    public function set(string $lang = 'en')
    {
        if (! in_array($lang, self::SUPPORTED, true)) {
            $lang = 'en';
        }

        // ตั้ง cookie อายุ 1 ปี · HttpOnly (JS ไม่อ่าน cookie ตรง อ่านจาก meta แทน)
        $response = service('response');
        $response->setCookie([
            'name'     => 'lang',
            'value'    => $lang,
            'expire'   => 31536000,
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);

        // กลับหน้าเดิม เฉพาะ URL ภายในไซต์ (กัน open-redirect)
        $back = (string) (previous_url() ?: base_url());
        if (strpos($back, (string) base_url()) !== 0) {
            $back = base_url();
        }

        return redirect()->to($back)->withCookies();
    }
}
