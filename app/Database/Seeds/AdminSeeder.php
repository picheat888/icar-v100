<?php

namespace App\Database\Seeds;

use App\Models\UserProfileModel;
use CodeIgniter\CLI\CLI;
use CodeIgniter\Database\Seeder;
use CodeIgniter\Shield\Entities\User;
use CodeIgniter\Shield\Models\UserModel;

/**
 * สร้างบัญชี Admin คนแรกสำหรับระบบที่เพิ่งติดตั้ง (ใช้บน production ได้)
 *
 * ทำครบในคำสั่งเดียว: user ของ Shield + กลุ่ม admin + โปรไฟล์สถานะ approved
 * จำเป็นเพราะสมัครผ่านหน้าเว็บจะได้ status=pending ซึ่งต้องมี admin มาอนุมัติ
 * ระบบที่ยังไม่มี admin จึงเข้าใช้งานไม่ได้เลย
 *
 * ถามค่าทีละช่องทาง CLI ไม่มีรหัสผ่าน default ฝังไว้ในโค้ด
 * รันซ้ำได้ ถ้ามีบัญชีอยู่แล้วจะเติมเฉพาะส่วนที่ขาด (กลุ่ม / โปรไฟล์)
 *
 * รัน: php spark db:seed AdminSeeder
 */
class AdminSeeder extends Seeder
{
    // สร้าง/ซ่อมบัญชี admin คนแรก
    public function run()
    {
        $users    = new UserModel();
        $profiles = new UserProfileModel();

        $username = CLI::prompt('Username', 'admin', 'required|min_length[3]');

        $user = $users->findByCredentials(['username' => $username]);

        if ($user) {
            CLI::write("พบบัญชี \"{$username}\" อยู่แล้ว (id {$user->id}) จะเติมเฉพาะส่วนที่ขาด", 'yellow');
        } else {
            $user = $this->createUser($users, $username);
        }

        $this->ensureAdminGroup($user);
        $this->ensureApprovedProfile($profiles, $user, $username);

        CLI::write('');
        CLI::write("เสร็จแล้ว - ล็อกอินด้วย username \"{$username}\" ได้เลย", 'green');
    }

    // สร้าง user ใน Shield พร้อมตั้งรหัสผ่าน (ถามซ้ำ 2 ครั้งให้ตรงกัน)
    private function createUser(UserModel $users, string $username): User
    {
        $email = CLI::prompt('Email', null, 'required|valid_email');

        // ใช้ความยาวขั้นต่ำตาม Config\Auth - ไม่ใส่ strong_password เพราะกฎนั้นออกแบบมาสำหรับ
        // ตรวจรหัสผ่านของผู้ใช้ที่ล็อกอินอยู่ (Shield เองก็ถอดออกตอนสร้าง user ผ่าน CLI)
        $minLength = config('Auth')->minimumPasswordLength;
        $rule      = "required|min_length[{$minLength}]";

        $password = CLI::prompt('รหัสผ่าน', null, $rule);
        $confirm  = CLI::prompt('ยืนยันรหัสผ่าน', null, $rule);

        if ($password !== $confirm) {
            CLI::error('รหัสผ่านทั้งสองช่องไม่ตรงกัน ยกเลิกการสร้างบัญชี');
            exit(1);
        }

        $users->save(new User([
            'username' => $username,
            'email'    => $email,
            'password' => $password,
        ]));

        $user = $users->findById($users->getInsertID());
        $user->activate();

        CLI::write("สร้าง user \"{$username}\" (id {$user->id}) แล้ว", 'green');

        return $user;
    }

    // ใส่กลุ่ม admin ถ้ายังไม่มี
    private function ensureAdminGroup(User $user): void
    {
        if ($user->inGroup('admin')) {
            CLI::write('อยู่ในกลุ่ม admin อยู่แล้ว ข้าม');

            return;
        }

        $user->addGroup('admin');
        CLI::write('ใส่กลุ่ม admin แล้ว', 'green');
    }

    // สร้างโปรไฟล์สถานะ approved ถ้ายังไม่มี - ถ้ามีแล้วแต่ยังไม่ approved ให้อัปเดตสถานะ
    private function ensureApprovedProfile(UserProfileModel $profiles, User $user, string $username): void
    {
        $profile = $profiles->findByUserId($user->id);

        if ($profile) {
            if ($profile['status'] === 'approved') {
                CLI::write('มีโปรไฟล์สถานะ approved อยู่แล้ว ข้าม');

                return;
            }

            $profiles->update($profile['id'], ['status' => 'approved']);
            CLI::write("เปลี่ยนสถานะโปรไฟล์จาก {$profile['status']} เป็น approved แล้ว", 'green');

            return;
        }

        $empId    = CLI::prompt('รหัสพนักงาน (emp_id)', 'EMP-0001', 'required');
        $fullName = CLI::prompt('ชื่อ - นามสกุล', 'ผู้ดูแลระบบ', 'required');

        $profiles->insert([
            'user_id'   => $user->id,
            'emp_id'    => $empId,
            'full_name' => $fullName,
            'status'    => 'approved',
        ]);

        CLI::write("สร้างโปรไฟล์ให้ \"{$username}\" สถานะ approved แล้ว", 'green');
    }
}
