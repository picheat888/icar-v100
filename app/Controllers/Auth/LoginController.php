<?php

namespace App\Controllers\Auth;

use App\Models\UserProfileModel;
use CodeIgniter\Shield\Authentication\Authenticators\Session;
use CodeIgniter\Shield\Controllers\LoginController as ShieldLoginController;
use CodeIgniter\HTTP\RedirectResponse;

/**
 * Login (custom) - ต่อยอด Shield โดยเพิ่มด่านตรวจสถานะอนุมัติสมาชิก
 * อนุญาตเฉพาะ status = approved; pending/rejected จะถูกปฏิเสธพร้อมข้อความ
 */
class LoginController extends ShieldLoginController
{
    public function loginAction(): RedirectResponse
    {
        // ล็อกอินอยู่แล้ว -> ไม่ต้องล็อกอินซ้ำ (กัน LogicException ของ Shield) เด้งไปหน้าหลักตาม role
        if (auth()->loggedIn()) {
            return redirect()->to('/');
        }

        // validate ตามกฎ (username/password) - ใช้ของ Shield
        $rules = $this->getValidationRules();
        if (! $this->validateData($this->request->getPost(), $rules, [], config('Auth')->DBGroup)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        /** @var array $credentials */
        $credentials             = $this->request->getPost(setting('Auth.validFields')) ?? [];
        $credentials             = array_filter($credentials);
        $credentials['password'] = $this->request->getPost('password');
        $remember                = (bool) $this->request->getPost('remember');

        /** @var Session $authenticator */
        $authenticator = auth('session')->getAuthenticator();

        // ตรวจ credential - ข้อความเดียวทุกกรณี ไม่บอกว่า username นั้นมีอยู่จริงหรือไม่
        $result = $authenticator->remember($remember)->attempt($credentials);
        if (! $result->isOK()) {
            return redirect()->route('login')->withInput()->with('error', lang('Auth.badAttempt'));
        }

        // ด่านสถานะอนุมัติ: ต้อง approved เท่านั้น (ไม่มีโปรไฟล์ = ยังไม่อนุมัติ ให้สอดคล้องกับ AccountStatusFilter)
        $profile = (new UserProfileModel())->findByUserId((int) $authenticator->getUser()->id);
        if (! $profile || $profile['status'] !== 'approved') {
            $message = ($profile && $profile['status'] === 'rejected')
                ? lang('Account.status_rejected')
                : lang('Account.status_pending');

            auth()->logout();

            return redirect()->route('login')->withInput()->with('error', $message);
        }

        // บันทึกกิจกรรม "เข้าสู่ระบบ" (LoginController ไม่ได้ extend BaseController จึงต้องโหลด helper เอง)
        helper('activity');
        log_activity('signed_in');

        // มี action ต่อ (เช่น 2FA) ของ Shield
        if ($authenticator->hasAction()) {
            return redirect()->route('auth-action-show')->withCookies();
        }

        // ไปหน้าหลักตาม role เสมอ (Home::index จัดตาม role) - ไม่ใช้ beforeLoginUrl ของ Shield
        // กันเด้งไป endpoint JSON (เช่น notifications/data) ที่ background fetch เผลอ set ค้างไว้
        return redirect()->to('/')->withCookies();
    }
}
