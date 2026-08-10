<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * อ่านภาษาจาก cookie 'lang' แล้วตั้ง locale ให้ทั้ง request
 * ไม่มี cookie / ค่าไม่รองรับ -> ใช้ 'en' (ค่าเริ่มต้นของระบบ)
 */
class LocaleFilter implements FilterInterface
{
    private const SUPPORTED = ['th', 'en'];

    public function before(RequestInterface $request, $arguments = null)
    {
        $lang = (string) ($_COOKIE['lang'] ?? 'en');
        if (! in_array($lang, self::SUPPORTED, true)) {
            $lang = 'en';
        }
        $request->setLocale($lang);

        // sync locale ให้ Language service ด้วย เพื่อให้ lang() ใช้ภาษาถูกต้องแน่นอน
        service('language')->setLocale($lang);
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }
}
