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
    protected $allowedFields = ['user_id', 'actor_name', 'role', 'action'];

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
