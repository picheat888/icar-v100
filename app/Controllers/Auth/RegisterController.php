<?php

namespace App\Controllers\Auth;

use App\Controllers\BaseController;
use App\Models\DepartmentModel;
use App\Models\PositionModel;
use App\Models\UserProfileModel;
use CodeIgniter\Shield\Entities\User;
use CodeIgniter\Shield\Models\UserModel;

/**
 * สมัครสมาชิก (custom) — สร้างบัญชี + โปรไฟล์สถานะ pending รอ Admin อนุมัติ
 * ไม่ auto-login (ต่างจาก Shield default) แล้วพาไปหน้าแจ้งผลสำเร็จ
 */
class RegisterController extends BaseController
{
    // แสดงฟอร์มสมัครสมาชิก
    public function index()
    {
        // ล็อกอินอยู่แล้วไม่ต้องสมัคร
        if (auth()->loggedIn()) {
            return redirect()->to('/');
        }

        return view('auth/register', [
            'departments' => (new DepartmentModel())->orderBy('name')->findAll(),
            'positions'   => (new PositionModel())->orderBy('name')->findAll(),
        ]);
    }

    // รับข้อมูลสมัคร -> สร้าง user + profile (pending)
    public function attempt()
    {
        // ไม่แยกข้อความ "ถูกปฏิเสธ" ออกจาก "ถูกใช้งานแล้ว" — กันเปิดเผยสถานะบัญชีให้คนภายนอกเดา (privacy)
        // บัญชีที่ถูก reject ก็ยังมี username/emp_id อยู่ในระบบ จึงถูก is_unique ด้านล่างจับด้วยข้อความเดียวกันกับบัญชีทั่วไป
        $rules = [
            'empId'    => 'required|alpha_numeric|max_length[8]|is_unique[user_profiles.emp_id]',
            'name'     => 'required|max_length[150]|regex_match[/^[\p{L}\p{M}\s]+$/u]',
            'username' => 'required|min_length[3]|max_length[30]|regex_match[/\A[a-zA-Z0-9._]+\z/]|is_unique[users.username]',
            'password' => 'required|min_length[8]|max_length[72]|strong_password[]',
            'confirm'  => 'required|matches[password]',
            'dept'     => 'required|is_not_unique[departments.id]',
            'position' => 'required|is_not_unique[positions.id]',
            'phone'    => 'required|regex_match[/^[0-9]+$/]|max_length[10]',
            'terms'    => 'required',
        ];

        $messages = [
            'empId'    => ['required' => lang('Account.err_required'), 'alpha_numeric' => lang('Account.srv_empId_alnum'), 'max_length' => lang('Account.srv_empId_max'), 'is_unique' => lang('Account.err_uniq_emp')],
            'name'     => ['required' => lang('Account.err_required'), 'regex_match' => lang('Account.srv_name_regex')],
            'username' => ['required' => lang('Account.err_required'), 'is_unique' => lang('Account.srv_username_uniq')],
            // strong_password ไม่ต้องกำหนดข้อความ — กฎส่งเหตุผลเจาะจงของตัวเองมา (แปลไทยที่ Language/th/Auth.php)
            'password' => ['required' => lang('Account.err_required'), 'min_length' => lang('Account.srv_password_min')],
            'confirm'  => ['matches' => lang('Account.srv_confirm_match')],
            'dept'     => ['required' => lang('Account.srv_dept_req'), 'is_not_unique' => lang('Account.srv_dept_invalid')],
            'position' => ['required' => lang('Account.srv_pos_req'), 'is_not_unique' => lang('Account.srv_pos_invalid')],
            'phone'    => ['required' => lang('Account.srv_phone_req'), 'regex_match' => lang('Account.srv_phone_regex'), 'max_length' => lang('Account.srv_phone_max')],
            'terms'    => ['required' => lang('Account.err_terms')],
        ];

        // ใส่ email สังเคราะห์ (username@icar.local — ค่าเดียวกับที่จะบันทึกจริง) ลงในชุดข้อมูลที่ validate
        // เพราะกฎ strong_password ของ Shield อ่านทั้ง username + email ไปเทียบความใกล้เคียงของรหัสผ่าน
        $data          = $this->request->getPost();
        $data['email'] = ((string) ($data['username'] ?? '')) . '@icar.local';

        if (! $this->validateData($data, $rules, $messages)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $req = $this->request;

        // สร้างบัญชี Shield (email สังเคราะห์จาก username เพื่อให้ identity ไม่ชน)
        $users = new UserModel();
        $user  = new User([
            'username' => $req->getPost('username'),
            'email'    => $req->getPost('username') . '@icar.local',
            'password' => $req->getPost('password'),
        ]);
        $users->save($user);

        $user = $users->findById($users->getInsertID());
        $user->addGroup('user');   // role เริ่มต้น = user
        $user->activate();         // เปิดบัญชี (Shield) — การอนุมัติคุมด้วย status ใน profile

        // สร้างโปรไฟล์พนักงาน สถานะรออนุมัติ (ฟิลด์ที่ไม่บังคับใช้ getPost คืน null ถ้าไม่ส่งมา)
        (new UserProfileModel())->insert([
            'user_id'       => $user->id,
            'emp_id'        => $req->getPost('empId'),
            'full_name'     => $req->getPost('name'),
            'department_id' => $req->getPost('dept') ?: null,
            'position_id'   => $req->getPost('position') ?: null,
            'phone'         => $req->getPost('phone') ?: null,
            'status'        => 'pending',
        ]);

        // แจ้ง Admin ทุกคนว่ามีสมาชิกลงทะเบียนใหม่
        (new \App\Models\NotificationModel())->pushToAdmins(
            'member_new',
            'มีสมาชิกลงทะเบียนใหม่: ' . $req->getPost('name'),
            site_url('admin/members')
        );

        // ยังไม่ login จึงระบุ actor เอง (ผู้สมัครใหม่)
        log_activity('สมัครสมาชิก: ' . $req->getPost('name'), [
            'user_id'    => (int) $user->id,
            'actor_name' => $req->getPost('name'),
            'role'       => 'user',
        ]);

        // ไม่ login — ไปหน้าแจ้งผลรออนุมัติ
        return redirect()->to('register/success');
    }

    // หน้าแจ้งผลสมัครสำเร็จ (รออนุมัติ)
    public function success()
    {
        return view('auth/register_success');
    }
}
