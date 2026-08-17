<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * ข้อมูลตั้งต้น แผนก/ตำแหน่ง (master data) - ใช้ในฟอร์มสมัครสมาชิก
 * รัน: php spark db:seed MasterDataSeeder
 */
class MasterDataSeeder extends Seeder
{
    public function run()
    {
        $now = date('Y-m-d H:i:s');

        $departments = ['ฝ่ายผลิต', 'ฝ่ายขนส่ง', 'ฝ่ายบุคคล', 'ฝ่ายจัดซื้อ', 'ฝ่ายบัญชี', 'ฝ่ายเทคโนโลยีสารสนเทศ'];
        $positions   = ['หัวหน้ากะ', 'พนักงานขับรถ', 'เจ้าหน้าที่ฝ่ายบุคคล', 'เจ้าหน้าที่จัดซื้อ', 'นักบัญชี', 'ผู้ดูแลระบบ'];

        // เพิ่มเฉพาะที่ยังไม่มี (กันซ้ำเมื่อ seed หลายครั้ง)
        foreach ($departments as $name) {
            if (! $this->db->table('departments')->where('name', $name)->get()->getRow()) {
                $this->db->table('departments')->insert(['name' => $name, 'created_at' => $now, 'updated_at' => $now]);
            }
        }
        foreach ($positions as $name) {
            if (! $this->db->table('positions')->where('name', $name)->get()->getRow()) {
                $this->db->table('positions')->insert(['name' => $name, 'created_at' => $now, 'updated_at' => $now]);
            }
        }
    }
}
