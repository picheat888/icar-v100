<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\DepartmentModel;
use App\Models\NotificationModel;
use App\Models\PositionModel;
use App\Models\UserProfileModel;
use CodeIgniter\Shield\Entities\User;
use CodeIgniter\Shield\Models\UserModel;

/**
 * จัดการสมาชิก (Admin) - หน้า + JSON endpoint ให้ React island
 * อนุมัติ/ปฏิเสธ/แก้ไขข้อมูล+สิทธิ์ของสมาชิก
 */
class MemberController extends BaseController
{
    // หน้า "จัดการสมาชิก" (เรนเดอร์ island)
    public function index()
    {
        return view('admin/members/index', [
            'active'       => 'members',
            'pageTitle'    => lang('Page.users'),
            'pageSubtitle' => lang('Page.users_sub'),
            'departments'  => (new DepartmentModel())->orderBy('name')->findAll(),
            'positions'    => (new PositionModel())->orderBy('name')->findAll(),
            'currentUserId' => (int) auth()->id(),
        ]);
    }

    // JSON: รายชื่อสมาชิกทั้งหมด
    public function data()
    {
        // กันเปิดตรงจาก browser -> เด้งกลับหน้าหลัก (กันโชว์ JSON ดิบ)
        if ($r = $this->blockDirectAccess()) {
            return $r;
        }

        $rows = (new UserProfileModel())->listMembers();
        foreach ($rows as &$r) {
            $r['role_label']  = role_labels()[$r['role']] ?? '-';
            $r['force_reset'] = (int) ($r['force_reset'] ?? 0);   // สถานะบังคับเปลี่ยนรหัส (0/1)
        }

        return $this->response->setJSON(['members' => $rows]);
    }

    // POST: Admin เพิ่มสมาชิกเอง - สร้างบัญชี + โปรไฟล์สถานะ approved ในขั้นตอนเดียว
    public function create()
    {
        $rules = [
            'empId'    => 'required|alpha_numeric|max_length[8]|is_unique[user_profiles.emp_id]',
            'name'     => 'required|max_length[150]|regex_match[/^[\p{L}\p{M}\s]+$/u]',
            'username' => 'required|min_length[3]|max_length[30]|regex_match[/\A[a-zA-Z0-9._]+\z/]|is_unique[users.username]',
            'password' => 'required|min_length[8]|max_length[72]|strong_password[]',
            'dept'     => 'required|is_not_unique[departments.id]',
            'position' => 'required|is_not_unique[positions.id]',
            'phone'    => 'required|thai_phone',
        ];

        $messages = [
            'empId'    => ['required' => lang('Account.err_required'), 'alpha_numeric' => lang('Account.srv_empId_alnum'), 'max_length' => lang('Account.srv_empId_max'), 'is_unique' => lang('Account.err_uniq_emp')],
            'name'     => ['required' => lang('Account.err_required'), 'max_length' => lang('Account.srv_name_max'), 'regex_match' => lang('Account.srv_name_regex')],
            'username' => ['required' => lang('Account.err_required'), 'is_unique' => lang('Account.srv_username_uniq')],
            'password' => ['required' => lang('Account.err_required'), 'min_length' => lang('Account.srv_password_min')],
            'dept'     => ['required' => lang('Account.srv_dept_req'), 'is_not_unique' => lang('Account.srv_dept_invalid')],
            'position' => ['required' => lang('Account.srv_pos_req'), 'is_not_unique' => lang('Account.srv_pos_invalid')],
            'phone'    => ['required' => lang('Account.srv_phone_req'), 'thai_phone' => lang('Account.srv_phone_format')],
        ];

        $level = (string) $this->request->getPost('level');
        if (! in_array($level, ['user', 'driver', 'admin'], true)) {
            return $this->fail(lang('Member.err_bad_role'));
        }

        // กฎ strong_password ของ Shield อ่าน username + email ไปเทียบความใกล้เคียง
        $data          = $this->request->getPost();
        $data['email'] = ((string) ($data['username'] ?? '')) . '@icar.local';

        if (! $this->validateData($data, $rules, $messages)) {
            return $this->fail(implode(' ', $this->validator->getErrors()));
        }

        $req   = $this->request;
        $users = new UserModel();
        $users->save(new User([
            'username' => $req->getPost('username'),
            'email'    => $data['email'],
            'password' => $req->getPost('password'),
        ]));

        $user = $users->findById($users->getInsertID());
        $user->addGroup($level);
        $user->activate();

        // ติ๊ก "บังคับเปลี่ยนรหัสผ่าน" -> เด้ง ForcePasswordResetModal ตอนล็อกอินครั้งแรก
        if ($req->getPost('force_reset')) {
            $user->forcePasswordReset();
        }

        (new UserProfileModel())->insert([
            'user_id'       => $user->id,
            'emp_id'        => $req->getPost('empId'),
            'full_name'     => $req->getPost('name'),
            'department_id' => $req->getPost('dept') ?: null,
            'position_id'   => $req->getPost('position') ?: null,
            'phone'         => $req->getPost('phone') ?: null,
            'status'        => 'approved',
        ]);

        log_activity('เพิ่มสมาชิก: ' . $req->getPost('name') . ' (สิทธิ์: ' . (role_labels('th')[$level] ?? $level) . ')');

        return $this->ok(lang('Member.added'));
    }

    // POST: อนุมัติสมาชิก + กำหนด role
    public function approve()
    {
        $userId = (int) $this->request->getPost('user_id');
        $level  = (string) $this->request->getPost('level');
        if (! in_array($level, ['user', 'driver', 'admin'], true)) {
            return $this->fail(lang('Member.err_bad_role'));
        }

        $user = (new UserModel())->findById($userId);
        if (! $user) {
            return $this->fail(lang('Member.err_not_found'), true);
        }
        // ต้องมีโปรไฟล์ (1:1) ก่อน - กันเปลี่ยน role ทั้งที่ profile ไม่มี/อัปเดตไม่ลง
        $profiles = new UserProfileModel();
        $profile  = $profiles->findByUserId($userId);
        if (! $profile) {
            return $this->fail(lang('Member.err_profile_missing'), true);
        }

        // guard เปลี่ยนสิทธิ์ (ชุดเดียวกับ update) - บัญชีตัวเอง / คนขับมีงานค้าง
        if ($err = $this->roleChangeError($userId, $user, $level)) {
            return $this->fail($err);
        }

        // กันถอด Admin คนสุดท้ายพร้อมกัน (TOCTOU) - ล็อกช่วงนับ+เขียน
        db_connect()->query('SELECT GET_LOCK(?, 5)', ['member_admin_guard']);
        if ($this->isLastAdminDemotion($user, $level, $profile)) {
            db_connect()->query('SELECT RELEASE_LOCK(?)', ['member_admin_guard']);
            return $this->fail(lang('Member.err_last_admin_demote'));
        }
        $user->syncGroups($level);                                  // ตั้ง role เป็นกลุ่มเดียว
        $profiles->where('user_id', $userId)->set(['status' => 'approved'])->update();
        db_connect()->query('SELECT RELEASE_LOCK(?)', ['member_admin_guard']);

        (new NotificationModel())->push(
            $userId,
            'member_approved',
            'member_approved',
            ['role' => $level],
            site_url('profile'),
        );

        log_activity('อนุมัติสมาชิก ' . $user->username . ' (สิทธิ์: ' . (role_labels('th')[$level] ?? $level) . ')');

        return $this->ok(lang('Member.approved'));
    }

    // POST: ปฏิเสธ / ปิดการใช้งานสมาชิก (ตั้ง status=rejected)
    public function reject()
    {
        $userId   = (int) $this->request->getPost('user_id');
        $profiles = new UserProfileModel();

        $profile = $profiles->findByUserId($userId);
        if (! $profile) {
            return $this->fail(lang('Member.err_not_found'), true);
        }

        // กันปิดบัญชีตัวเอง
        if ($userId === (int) auth()->id()) {
            return $this->fail(lang('Member.err_self_off'));
        }

        $target = (new UserModel())->findById($userId);

        // กันปิด driver ที่ยังมีงานที่ได้รับมอบหมายค้างอยู่ (งานจะกำพร้า คนขับเข้าดูไม่ได้)
        if ($target && $target->inGroup('driver') && $this->driverActiveJobs($userId) > 0) {
            return $this->fail(lang('Member.err_driver_jobs_off'));
        }

        // กันถอด Admin คนสุดท้ายพร้อมกัน (TOCTOU) - ล็อกช่วงนับ+เขียน
        db_connect()->query('SELECT GET_LOCK(?, 5)', ['member_admin_guard']);
        if ($target && $target->inGroup('admin') && $profile['status'] === 'approved'
            && $this->countActiveAdmins() <= 1) {
            db_connect()->query('SELECT RELEASE_LOCK(?)', ['member_admin_guard']);
            return $this->fail(lang('Member.err_last_admin_off'));
        }
        $profiles->where('user_id', $userId)->set(['status' => 'rejected'])->update();
        db_connect()->query('SELECT RELEASE_LOCK(?)', ['member_admin_guard']);

        (new NotificationModel())->push($userId, 'member_rejected', 'member_rejected');

        log_activity('ปฏิเสธ/ปิดการใช้งานสมาชิก ' . ($target->username ?? ('id ' . $userId)));

        return $this->ok(lang('Member.rejected'));
    }

    // นับ admin ที่ใช้งานอยู่ (group=admin + status=approved)
    private function countActiveAdmins(): int
    {
        return db_connect()->table('auth_groups_users g')
            ->join('user_profiles p', 'p.user_id = g.user_id')
            ->where('g.group', 'admin')
            ->where('p.status', 'approved')
            ->countAllResults();
    }

    // นับงานที่ยัง active ของคนขับคนนี้ (approved/cancel_requested + มอบหมายจริง)
    private function driverActiveJobs(int $userId): int
    {
        return db_connect()->table('bookings')
            ->where('driver_id', $userId)
            ->where('driver_type', 'company')
            ->whereIn('status', ['approved', 'cancel_requested'])
            ->where('deleted_at', null)
            ->countAllResults();
    }

    // ===== guard การเปลี่ยนสิทธิ์ (ใช้ร่วม approve() + update()) =====

    // guard ที่ไม่ต้องล็อก (บัญชีตัวเอง / คนขับมีงานค้าง) - คืน error ตัวแรก หรือ null ถ้าผ่าน
    private function roleChangeError(int $userId, $user, string $level): ?string
    {
        // เปลี่ยนสิทธิ์บัญชีตัวเองไม่ได้
        if ($userId === (int) auth()->id() && ! $user->inGroup($level)) {
            return lang('Member.err_self_role');
        }
        // ถอด driver ที่มีงานค้าง -> งานจะกำพร้า
        if ($user->inGroup('driver') && $level !== 'driver' && $this->driverActiveJobs($userId) > 0) {
            return lang('Member.err_driver_jobs_role');
        }

        return null;
    }

    // เป็นการถอด "Admin คนสุดท้าย" หรือไม่ - ต้องเรียกภายใต้ GET_LOCK เท่านั้น (กัน TOCTOU)
    private function isLastAdminDemotion($user, string $level, ?array $profile): bool
    {
        return $user->inGroup('admin') && $level !== 'admin'
            && ($profile['status'] ?? '') === 'approved'
            && $this->countActiveAdmins() <= 1;
    }

    // POST: แก้ไขข้อมูล + สิทธิ์ + (ถ้ามี) รหัสผ่านใหม่
    public function update()
    {
        $userId = (int) $this->request->getPost('user_id');
        $users  = new UserModel();
        $user   = $users->findById($userId);
        if (! $user) {
            return $this->fail(lang('Member.err_not_found'), true);
        }

        $level = (string) $this->request->getPost('level');
        if (! in_array($level, ['user', 'driver', 'admin'], true)) {
            return $this->fail(lang('Member.err_bad_role'));
        }

        // guard เปลี่ยนสิทธิ์ (ชุดเดียวกับ approve) - บัญชีตัวเอง / คนขับมีงานค้าง
        if ($err = $this->roleChangeError($userId, $user, $level)) {
            return $this->fail($err);
        }

        // ตรวจให้ครบก่อนเขียนข้อมูล (กันอัปเดตค้างครึ่งทาง)
        $profile = (new UserProfileModel())->findByUserId($userId);
        $newPass = (string) $this->request->getPost('newPass');

        // [validate] ข้อมูลก่อนเขียน (กัน 500 จาก FK/ความยาว แล้วคืน 422 แทน)
        $name     = trim((string) $this->request->getPost('name'));
        $dept     = $this->request->getPost('dept') ?: null;
        $position = $this->request->getPost('position') ?: null;
        $phone    = trim((string) $this->request->getPost('phone'));
        if ($name === '') {
            return $this->fail(lang('Member.err_name_req'));
        }
        if (mb_strlen($name) > 150) {
            return $this->fail(lang('Account.srv_name_max'));
        }
        if ($phone !== '' && ! preg_match(\App\Validation\PhoneRules::PATTERN, $phone)) {
            return $this->fail(lang('Account.srv_phone_format'));
        }
        if ($dept !== null && ! (new DepartmentModel())->find((int) $dept)) {
            return $this->fail(lang('Member.err_dept_bad'));
        }
        if ($position !== null && ! (new PositionModel())->find((int) $position)) {
            return $this->fail(lang('Member.err_pos_bad'));
        }

        // [validate] รหัสผ่านใหม่ (ถ้ากรอก) ต้องยาวอย่างน้อย 8 ตัว + ไม่คาดเดาง่าย (เทียบกับข้อมูลของเจ้าของบัญชี)
        if ($newPass !== '' && mb_strlen($newPass) < 8) {
            return $this->fail(lang('Profile.pw_min'));
        }
        if ($newPass !== '') {
            $strength = service('passwords')->check($newPass, $user);
            if (! $strength->isOK()) {
                return $this->fail($strength->reason());
            }
        }

        // กันถอดสิทธิ์ Admin คนสุดท้ายพร้อมกัน (TOCTOU) - ล็อกช่วงนับ+เขียน role
        db_connect()->query('SELECT GET_LOCK(?, 5)', ['member_admin_guard']);
        if ($this->isLastAdminDemotion($user, $level, $profile)) {
            db_connect()->query('SELECT RELEASE_LOCK(?)', ['member_admin_guard']);
            return $this->fail(lang('Member.err_last_admin_demote'));
        }

        // อัปเดตโปรไฟล์
        (new UserProfileModel())->where('user_id', $userId)->set([
            'full_name'     => $name,
            'department_id' => $dept,
            'position_id'   => $position,
            'phone'         => $phone ?: null,
        ])->update();

        // อัปเดต role
        $user->syncGroups($level);
        db_connect()->query('SELECT RELEASE_LOCK(?)', ['member_admin_guard']);

        // เปลี่ยนรหัสผ่าน (ถ้ากรอก - ผ่านการ validate ความยาวด้านบนแล้ว)
        if ($newPass !== '') {
            $user->password = $newPass;
            $users->save($user);
        }

        // บังคับเปลี่ยนรหัสตอนล็อกอินครั้งถัดไป - แยกจากการตั้งรหัสใหม่ (ติ๊ก=ตั้ง, ไม่ติ๊ก=ยกเลิก)
        // บันทึกตามค่า checkbox ที่ส่งมา (เมธอด Shield idempotent)
        // กันบังคับ "บัญชีตัวเอง" - จะโดน popup ล็อกหน้าจอตัวเองทันที (footgun)
        if ($userId !== (int) auth()->id()) {
            if ($this->request->getPost('forceReset')) {
                $user->forcePasswordReset();
            } else {
                $user->undoForcePasswordReset();
            }
        }

        log_activity('แก้ไขข้อมูลสมาชิก ' . $user->username);

        return $this->ok(lang('Member.saved'));
    }

    // ===== helper ตอบ JSON พร้อมแนบ csrf ใหม่ (regenerate=true) =====
    private function ok(string $message)
    {
        return $this->response->setJSON(['ok' => true, 'message' => $message, 'csrf' => csrf_hash()]);
    }

    // $conflict = true -> ข้อมูลนี้เพิ่งถูกคนอื่นเปลี่ยนสถานะไปแล้ว (ให้ฝั่งหน้าจอดึงข้อมูลใหม่)
    private function fail(string $message, bool $conflict = false)
    {
        $out = ['ok' => false, 'message' => $message, 'csrf' => csrf_hash()];
        if ($conflict) {
            $out['conflict'] = true;
        }

        return $this->response->setStatusCode(422)->setJSON($out);
    }
}
