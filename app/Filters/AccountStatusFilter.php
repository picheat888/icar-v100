<?php

namespace App\Filters;

use App\Models\UserProfileModel;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * ด่านเช็คสถานะบัญชีทุก request — กันคนที่ถูกปิดใช้งาน/ปฏิเสธ "ระหว่าง" ที่ล็อกอินอยู่
 * ถ้าโปรไฟล์ไม่ใช่ approved (โดน Admin ปิด/ปฏิเสธ) → เตะออกจากระบบทันที
 */
class AccountStatusFilter implements FilterInterface
{
    // ก่อนเข้า controller: เช็คว่าบัญชีที่ล็อกอินอยู่ยัง approved ไหม
    public function before(RequestInterface $request, $arguments = null)
    {
        // ยังไม่ล็อกอิน → ปล่อยให้ Shield (session/group filter) จัดการเอง
        if (! auth()->loggedIn()) {
            return;
        }

        $profile = (new UserProfileModel())->findByUserId((int) auth()->id());

        // ไม่มีโปรไฟล์ หรือสถานะไม่ใช่ approved → ออกจากระบบ + แจ้งเตือน
        if (! $profile || $profile['status'] !== 'approved') {
            auth()->logout();

            $message = 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ';

            // island (AJAX) → ตอบ JSON 401 ให้ front จัดการ (ไม่ให้ตาม redirect ไปได้ HTML)
            if ($request->isAJAX()) {
                return service('response')
                    ->setStatusCode(401)
                    ->setJSON(['ok' => false, 'message' => $message]);
            }

            // หน้าปกติ → เด้งไปหน้า login พร้อมข้อความ
            return redirect()->to('/login')->with('error', $message);
        }
    }

    // ไม่ใช้ after
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }
}
