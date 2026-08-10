<?php

namespace App\Controllers;

use App\Models\DepartmentModel;
use App\Models\PositionModel;
use App\Models\UserProfileModel;
use CodeIgniter\Shield\Models\UserModel;

/**
 * โปรไฟล์ส่วนตัว + เปลี่ยนรหัสผ่าน — ใช้ร่วมทุก role (เลือก layout ตามกลุ่มผู้ใช้)
 */
class ProfileController extends BaseController
{
    // หา role ปัจจุบันจากกลุ่ม Shield (เพื่อเลือก layout/sidebar)
    private function role(): string
    {
        $user = auth()->user();
        if ($user->inGroup('admin')) {
            return 'admin';
        }
        if ($user->inGroup('driver')) {
            return 'driver';
        }

        return 'user';
    }

    // หน้าข้อมูลส่วนตัว
    public function index()
    {
        $user    = auth()->user();
        $profile = (new UserProfileModel())->findByUserId((int) $user->id);

        // แปลง id -> ชื่อ แผนก/ตำแหน่ง
        $deptName = $posName = '-';
        if ($profile) {
            if ($profile['department_id']) {
                $d = (new DepartmentModel())->find($profile['department_id']);
                $deptName = $d['name'] ?? '-';
            }
            if ($profile['position_id']) {
                $p = (new PositionModel())->find($profile['position_id']);
                $posName = $p['name'] ?? '-';
            }
        }

        $role = $this->role();

        return view('profile/index', [
            'layout'       => 'layouts/' . $role,
            'role'         => $role,
            'active'       => '',
            'pageTitle'    => lang('Profile.title'),
            'pageSubtitle' => lang('Profile.subtitle'),
            'user'         => $user,
            'profile'      => $profile,
            'deptName'     => $deptName,
            'posName'      => $posName,
        ]);
    }

    // ฟอร์มเปลี่ยนรหัสผ่าน
    public function changePassword()
    {
        $role = $this->role();

        return view('profile/change_password', [
            'layout'       => 'layouts/' . $role,
            'role'         => $role,
            'active'       => '',
            'pageTitle'    => lang('Profile.change_password_title'),
            'pageSubtitle' => lang('Profile.change_password_subtitle'),
        ]);
    }

    // บันทึกรหัสผ่านใหม่
    public function updatePassword()
    {
        $rules = [
            'curPass'     => 'required',
            'newPass'     => 'required|min_length[8]|max_length[72]',
            'confirmPass' => 'required|matches[newPass]',
        ];
        $messages = [
            'newPass'     => ['min_length' => 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร'],
            'confirmPass' => ['matches' => 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน'],
        ];

        if (! $this->validate($rules, $messages)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $user = auth()->user();

        // ตรวจรหัสผ่านเดิม
        $check = auth()->check([
            'username' => $user->username,
            'password' => $this->request->getPost('curPass'),
        ]);
        if (! $check->isOK()) {
            return redirect()->back()->with('error', 'รหัสผ่านเดิมไม่ถูกต้อง');
        }

        // บันทึกรหัสผ่านใหม่
        $user->password = $this->request->getPost('newPass');
        (new UserModel())->save($user);

        // เคลียร์ flag บังคับเปลี่ยนรหัส (ถ้ามี) — ไม่งั้นจะถูกเด้งกลับมาหน้านี้วนไม่จบ
        $user->undoForcePasswordReset();

        return redirect()->to('profile')->with('message', 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
    }

    // POST (JSON): บันทึกรหัสใหม่จาก popup บังคับเปลี่ยนรหัส — 2 ช่อง (ใหม่+ยืนยัน) ไม่ถามรหัสเดิม
    public function forceReset()
    {
        $user = auth()->user();
        // เฉพาะคนที่ถูกบังคับจริง — กันคนอื่นยิง endpoint ตั้งรหัสโดยไม่ต้องรู้รหัสเดิม
        if (! $user || ! $user->requiresPasswordReset()) {
            return $this->failJson('ไม่มีสิทธิ์ดำเนินการ', 403);
        }

        $newPass = (string) $this->request->getPost('newPass');
        $confirm = (string) $this->request->getPost('confirmPass');

        if (mb_strlen($newPass) < 8) {
            return $this->failJson('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
        }
        if (mb_strlen($newPass) > 72) {
            return $this->failJson('รหัสผ่านยาวเกินไป (สูงสุด 72 ตัวอักษร)');
        }
        if ($newPass !== $confirm) {
            return $this->failJson('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน');
        }

        // ตั้งรหัสใหม่ + ล้าง flag บังคับ (จะได้ไม่เด้ง popup ซ้ำ)
        $user->password = $newPass;
        (new UserModel())->save($user);
        $user->undoForcePasswordReset();

        return $this->response->setJSON(['ok' => true, 'message' => 'เปลี่ยนรหัสผ่านเรียบร้อย', 'csrf' => csrf_hash()]);
    }

    // helper ตอบ error JSON พร้อม csrf ใหม่
    private function failJson(string $message, int $code = 422)
    {
        return $this->response->setStatusCode($code)->setJSON(['ok' => false, 'message' => $message, 'csrf' => csrf_hash()]);
    }
}
