<?php

namespace App\Filters;

use CodeIgniter\Filters\CSRF;
use CodeIgniter\HTTP\RedirectResponse;
use CodeIgniter\HTTP\RequestInterface;

/**
 * CSRF ของ CI4 + เก็บค่าที่ผู้ใช้พิมพ์ไว้ตอนตีกลับ
 * parent คืน redirect เปล่า ค่าที่กรอกไว้จึงต้องแนบกลับไปเอง
 */
class CsrfKeepInput extends CSRF
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $result = parent::before($request, $arguments);

        return $result instanceof RedirectResponse ? $result->withInput() : $result;
    }
}
