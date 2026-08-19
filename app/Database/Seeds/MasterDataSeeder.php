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

        $departments = ['Accounting (ACC)',
                        'Forklift (FK)',
                        'Filling (FL)',
                        'General Affair (GA)',
                        'Logistics (LG)',
                        'Maintenance (MN)',
                        'Machine Operations (MO)',
                        'Loading (LD)',
                        'Production (PD)',
                        'Production - Packing (PK)',
                        'Production - Raw Material (RM)',
                        'Production - Stock (ST)',
                        'Production - Warehouse (WH)',
                        'Production - Retort (RT)',
                        'Purchase (PU)',
                        'Quality Control (QC)',
                        'Safety (SE)'];
        $positions   = ['Manager',
                        'Assist manager',
                        'Senior supervisor',
                        'Supervisor',
                        'Assist Supervisor',
                        'Leader',
                        'Sub Leader',
                        'Head of line',
                        'Assist officer',
                        'Staff/officer',
                        'Operator'];

        // เพิ่มเฉพาะที่ยังไม่มี กันซ้ำเมื่อ seed หลายครั้ง
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
