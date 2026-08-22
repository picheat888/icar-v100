<?php

namespace App\Filters;

use CodeIgniter\Filters\CSRF;
use CodeIgniter\HTTP\RedirectResponse;
use CodeIgniter\HTTP\RequestInterface;

/**
 * CSRF ของ CI4 + เก็บค่าที่ผู้ใช้พิมพ์ไว้ตอนตีกลับ
 * ตัวเดิมเรียกแค่ redirect()->back() ฟอร์มจึงว่างเปล่าทุกช่องหลังโดนตีกลับ
 */
class CsrfKeepInput extends CSRF
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $result = parent::before($request, $arguments);

        return $result instanceof RedirectResponse ? $result->withInput() : $result;
    }
}
