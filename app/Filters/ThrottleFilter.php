<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * จำกัดจำนวนครั้งของฟอร์มสาธารณะต่อ 1 IP (bucket ต่อนาที) - กัน brute force รหัสผ่าน + สแปมสมัครสมาชิก
 * ใช้เป็น route filter: ['filter' => 'throttle:login'] / ['filter' => 'throttle:register']
 * นับเฉพาะ POST (เปิดหน้าฟอร์มด้วย GET ไม่ถูกจำกัด)
 */
class ThrottleFilter implements FilterInterface
{
    // จำนวนครั้งที่ยอมให้ต่อ 1 นาที ต่อ 1 IP แยกตามชนิดฟอร์ม
    private const LIMITS = [
        'login'    => 10,
        'register' => 5,
    ];

    // เช็คโควตาก่อนเข้า controller - เกินโควตาให้ตอบกลับทันที
    public function before(RequestInterface $request, $arguments = null)
    {
        if (strtoupper($request->getMethod()) !== 'POST') {
            return;
        }

        $key      = $arguments[0] ?? 'login';
        $capacity = self::LIMITS[$key] ?? 10;

        $throttler = service('throttler');
        if ($throttler->check(md5($request->getIPAddress()) . '_' . $key, $capacity, MINUTE) !== false) {
            return;
        }

        // เกินโควตา - บอกจำนวนวินาทีที่ต้องรอ
        $wait    = max(1, (int) $throttler->getTokenTime());
        $message = lang('Account.err_throttle', [$wait]);

        if ($request->isAJAX()) {
            return service('response')->setStatusCode(429)
                ->setJSON(['ok' => false, 'message' => $message]);
        }

        return redirect()->back()->withInput()->with('error', $message);
    }

    // ไม่ใช้ after
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null): void
    {
    }
}
