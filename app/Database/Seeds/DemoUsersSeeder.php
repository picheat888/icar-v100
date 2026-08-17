<?php

namespace App\Database\Seeds;

use App\Models\UserProfileModel;
use CodeIgniter\Database\Seeder;
use CodeIgniter\Shield\Entities\User;
use CodeIgniter\Shield\Models\UserModel;

/**
 * สร้างบัญชีทดลอง 3 role (admin / user / driver) ไว้ทดสอบระบบ
 * รหัสผ่านทั้งหมด: 123 (เฉพาะ dev — ห้ามใช้ใน production)
 * พร้อมโปรไฟล์สถานะ approved เพื่อให้ผ่านด่านตรวจสถานะตอนล็อกอิน
 * รัน: php spark db:seed DemoUsersSeeder
 */
class DemoUsersSeeder extends Seeder
{
    public function run()
    {
        // กันรันบน production — บัญชีทดลองรหัส 123 ห้ามหลุดขึ้นระบบจริง
        if (ENVIRONMENT === 'production') {
            echo "DemoUsersSeeder ถูกข้าม: ห้ามสร้างบัญชีทดลอง (รหัส 123) บน production\n";

            return;
        }

        $users    = new UserModel();
        $profiles = new UserProfileModel();

        // [username, group, emp_id, full_name, status]
        $demo = [
            ['admin',   'admin',  'EMP-0001', 'ผู้ดูแลระบบ',        'approved'],
        ];

        foreach ($demo as [$username, $group, $empId, $fullName, $status]) {
            // สร้าง user ถ้ายังไม่มี
            $user = $users->findByCredentials(['username' => $username]);
            if (! $user) {
                $newUser = new User([
                    'username' => $username,
                    'email'    => $username . '@icar.local',
                    'password' => '123',  // รหัสผ่านสำหรับ dev เท่านั้น
                ]);
                $users->save($newUser);
                $user = $users->findById($users->getInsertID());
                $user->addGroup($group);
                $user->activate();
            }

            // สร้างโปรไฟล์ถ้ายังไม่มี (status ตามที่กำหนด)
            if (! $profiles->findByUserId($user->id)) {
                $profiles->insert([
                    'user_id'   => $user->id,
                    'emp_id'    => $empId,
                    'full_name' => $fullName,
                    'status'    => $status,
                ]);
            }
        }
    }
}
