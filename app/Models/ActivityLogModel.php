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

    /**
     * ดึง log ตามช่วงวันที่ [$from 00:00:00, $to 23:59:59] เรียงใหม่สุดก่อน
     * $from/$to รูปแบบ 'YYYY-MM-DD' · $limit > 0 = จำกัดจำนวน (0 = ทั้งหมด สำหรับ export)
     * $offset = ข้ามกี่แถว ใช้คู่กับ $limit ตอนแบ่งหน้า
     */
    public function inRange(string $from, string $to, int $limit = 0, int $offset = 0): array
    {
        $builder = $this->where('created_at >=', $from . ' 00:00:00')
            ->where('created_at <=', $to . ' 23:59:59')
            ->orderBy('created_at', 'DESC')
            ->orderBy('id', 'DESC');

        return $limit > 0 ? $builder->findAll($limit, $offset) : $builder->findAll();
    }

    /**
     * อ่าน log ตามช่วงวันที่ทีละชุด (chunk) แล้วส่งเข้า callback - ใช้ตอน export CSV
     * ไม่ดึงทั้งช่วงมาไว้ในหน่วยความจำ จึงส่งออกได้แม้มีข้อมูลหลักแสนแถว
     */
    public function chunkInRange(string $from, string $to, int $size, callable $callback): void
    {
        $this->where('created_at >=', $from . ' 00:00:00')
            ->where('created_at <=', $to . ' 23:59:59')
            ->orderBy('created_at', 'DESC')
            ->orderBy('id', 'DESC')
            ->chunk($size, $callback);
    }

    // นับจำนวน log ทั้งหมดในช่วงวันที่ (ไว้บอก "แสดง N จากทั้งหมด M")
    public function countInRange(string $from, string $to): int
    {
        return $this->where('created_at >=', $from . ' 00:00:00')
            ->where('created_at <=', $to . ' 23:59:59')
            ->countAllResults();
    }
}
