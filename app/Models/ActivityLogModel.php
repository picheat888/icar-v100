<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Model ตาราง activity_logs - บันทึกกิจกรรมการใช้งานระบบ
 */
class ActivityLogModel extends Model
{
    protected $table         = 'activity_logs';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = true;
    protected $allowedFields = ['user_id', 'actor_name', 'role', 'msg_key', 'params', 'action'];

    /**
     * ประกอบข้อความของ log หนึ่งแถวตามภาษาที่ต้องการ ($locale = null คือภาษาผู้อ่านปัจจุบัน)
     * แถวที่ไม่มี msg_key (บันทึกไว้ก่อนระบบคีย์) คืนข้อความอังกฤษในคอลัมน์ action ตามเดิม
     */
    public static function renderMessage(array $row, ?string $locale = null): string
    {
        helper('format');
        $key = (string) ($row['msg_key'] ?? '');

        if ($key === '') {
            return (string) ($row['action'] ?? '');
        }

        $params = json_decode((string) ($row['params'] ?? ''), true) ?: [];
        // params 'role' เก็บเป็นคีย์บทบาท (admin/user/driver) แปลตอนอ่าน
        if (isset($params['role'])) {
            $params['role'] = role_labels($locale)[$params['role']] ?? $params['role'];
        }

        return lang("Log.{$key}", $params, $locale);
    }

    // ประเภทการกระทำที่กรองได้ - จับคู่กับคำนำหน้าของ msg_key
    public const ACTION_TYPES = ['auth', 'member', 'car', 'master', 'booking'];

    // msg_key ของประเภท auth (ไม่ได้ใช้คำนำหน้าเหมือนประเภทอื่น)
    private const AUTH_KEYS = ['signed_in', 'registered'];

    /**
     * builder ที่จำกัดช่วงวันที่ [$from 00:00:00, $to 23:59:59] แล้วใส่ตัวกรองที่เลือก
     * $filters: ['q' => ชื่อผู้ใช้บางส่วน, 'role' => admin|user|driver, 'type' => หนึ่งใน ACTION_TYPES]
     * ค่าว่างของแต่ละตัว = ไม่กรองด้วยตัวนั้น · แถวเก่าที่ไม่มี msg_key จะไม่เข้าเงื่อนไข type
     */
    private function scoped(string $from, string $to, array $filters = []): self
    {
        $this->where('created_at >=', $from . ' 00:00:00')
            ->where('created_at <=', $to . ' 23:59:59');

        if (($filters['q'] ?? '') !== '') {
            $this->like('actor_name', $filters['q']);
        }
        if (($filters['role'] ?? '') !== '') {
            $this->where('role', $filters['role']);
        }

        $type = $filters['type'] ?? '';
        if ($type === 'auth') {
            $this->whereIn('msg_key', self::AUTH_KEYS);
        } elseif ($type === 'master') {
            $this->groupStart()->like('msg_key', 'dept_', 'after')->orLike('msg_key', 'position_', 'after')->groupEnd();
        } elseif ($type !== '') {
            $this->like('msg_key', $type . '_', 'after');
        }

        return $this;
    }

    /**
     * ดึง log ตามช่วงวันที่ + ตัวกรอง เรียงใหม่สุดก่อน
     * $from/$to รูปแบบ 'YYYY-MM-DD' · $limit > 0 = จำกัดจำนวน (0 = ทั้งหมด สำหรับ export)
     * $offset = ข้ามกี่แถว ใช้คู่กับ $limit ตอนแบ่งหน้า
     */
    public function inRange(string $from, string $to, int $limit = 0, int $offset = 0, array $filters = []): array
    {
        $builder = $this->scoped($from, $to, $filters)
            ->orderBy('created_at', 'DESC')
            ->orderBy('id', 'DESC');

        return $limit > 0 ? $builder->findAll($limit, $offset) : $builder->findAll();
    }

    /**
     * อ่าน log ตามช่วงวันที่ + ตัวกรองทีละชุด (chunk) แล้วส่งเข้า callback - ใช้ตอน export CSV
     * ไม่ดึงทั้งช่วงมาไว้ในหน่วยความจำ จึงส่งออกได้แม้มีข้อมูลหลักแสนแถว
     */
    public function chunkInRange(string $from, string $to, int $size, callable $callback, array $filters = []): void
    {
        $this->scoped($from, $to, $filters)
            ->orderBy('created_at', 'DESC')
            ->orderBy('id', 'DESC')
            ->chunk($size, $callback);
    }

    // นับจำนวน log ทั้งหมดในช่วงวันที่ + ตัวกรอง (ไว้บอก "แสดง N จากทั้งหมด M")
    public function countInRange(string $from, string $to, array $filters = []): int
    {
        return $this->scoped($from, $to, $filters)->countAllResults();
    }
}
