<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\IncomingRequest;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Shield\Authentication\Authenticators\Session;

/**
 * กันคนที่ถูกบังคับเปลี่ยนรหัส (force_reset=1) ทำรายการก่อนเปลี่ยนรหัส (backstop ฝั่ง server ของ popup)
 * - GET/HEAD/OPTIONS: ปล่อยผ่าน (ให้หน้าโหลด + popup โผล่)
 * - POST/PUT/DELETE: บล็อกจนกว่าจะเปลี่ยนรหัส (AJAX -> 403 JSON, ปกติ -> เด้งกลับหน้าแรก)
 * endpoint เปลี่ยนรหัส + หน้า auth ถูก except ใน Config\Filters
 */
class ForcePasswordResetGuard implements FilterInterface
{
    // เช็คก่อนเข้า controller
    public function before(RequestInterface $request, $arguments = null)
    {
        if (! $request instanceof IncomingRequest) {
            return;
        }

        /** @var Session $auth */
        $auth = auth('session')->getAuthenticator();
        if (! $auth->loggedIn() || ! $auth->getUser()->requiresPasswordReset()) {
            return;
        }

        // อ่านอย่างเดียวปล่อยผ่าน - หน้าเว็บ/โหลดข้อมูลของ popup ยังต้องทำงานได้
        if (in_array(strtoupper($request->getMethod()), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }

        // เปลี่ยนแปลงข้อมูล -> บล็อกจนกว่าจะเปลี่ยนรหัสผ่าน
        if ($request->isAJAX()) {
            return service('response')->setStatusCode(403)
                ->setJSON(['ok' => false, 'message' => 'กรุณาเปลี่ยนรหัสผ่านก่อนใช้งานระบบ']);
        }

        return redirect()->to('/');
    }

    // ไม่มีอะไรทำหลัง response
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null): void
    {
    }
}
