<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Model ตาราง user_profiles - ข้อมูลพนักงาน (1:1 กับ users) + สถานะอนุมัติ
 */
class UserProfileModel extends Model
{
    protected $table         = 'user_profiles';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields  = [
        'user_id',
        'emp_id',
        'full_name',
        'department_id',
        'position_id',
        'phone',
        'status',
    ];
    protected $useTimestamps = true;

    // ดึงโปรไฟล์จาก user_id
    public function findByUserId(int $userId): ?array
    {
        return $this->where('user_id', $userId)->first();
    }

    /**
     * รายชื่อคนขับ (users กลุ่ม driver + ชื่อ/เบอร์โทรจากโปรไฟล์)
     * ใช้ร่วมกันทั้งหน้าจัดการรถ (คนขับประจำ) และหน้าจัดการคำขอ (มอบหมายคนขับ)
     */
    public function drivers(): array
    {
        return $this->db->table('auth_groups_users g')
            ->select('g.user_id AS id, p.full_name AS name, p.phone AS phone')
            ->join('user_profiles p', 'p.user_id = g.user_id', 'left')
            ->where('g.group', 'driver')
            ->orderBy('p.full_name')
            ->get()->getResultArray();
    }

    /**
     * รายชื่อสมาชิกทั้งหมด (join users + แผนก + ตำแหน่ง + group/role)
     * คืน array แถวสำหรับหน้า "จัดการสมาชิก"
     */
    public function listMembers(): array
    {
        return $this->select('user_profiles.user_id, user_profiles.emp_id, user_profiles.full_name,
                user_profiles.phone, user_profiles.status,
                user_profiles.department_id, user_profiles.position_id,
                d.name AS dept, p.name AS position,
                g.group AS role, u.username, ai.force_reset')
            ->join('users u', 'u.id = user_profiles.user_id')
            ->join('departments d', 'd.id = user_profiles.department_id', 'left')
            ->join('positions p', 'p.id = user_profiles.position_id', 'left')
            ->join('auth_groups_users g', 'g.user_id = user_profiles.user_id', 'left')
            // identity รหัสผ่าน (เก็บ force_reset) - ไว้โชว์สถานะบังคับเปลี่ยนรหัสในหน้าจัดการสมาชิก
            ->join('auth_identities ai', "ai.user_id = user_profiles.user_id AND ai.type = 'email_password'", 'left')
            ->orderBy('user_profiles.created_at', 'DESC')
            ->findAll();
    }
}
