<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Model ตาราง notifications - แจ้งเตือนรายผู้ใช้
 */
class NotificationModel extends Model
{
    protected $table         = 'notifications';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = true;
    protected $allowedFields = ['user_id', 'type', 'message', 'link', 'seen_at', 'read_at'];

    // สร้างแจ้งเตือน 1 แถวให้ผู้ใช้คนหนึ่ง
    public function push(int $userId, string $type, string $message, ?string $link = null): void
    {
        $this->insert([
            'user_id' => $userId,
            'type'    => $type,
            'message' => $message,
            'link'    => $link,
        ]);
    }

    // สร้างแจ้งเตือนให้ admin ทุกคน (ข้าม excludeUserId ถ้ากำหนด - กันแจ้งตัวเอง)
    public function pushToAdmins(string $type, string $message, ?string $link = null, ?int $excludeUserId = null): void
    {
        $rows = $this->db->table('auth_groups_users')
            ->select('user_id')
            ->where('group', 'admin')
            ->get()->getResultArray();

        foreach ($rows as $row) {
            $uid = (int) $row['user_id'];
            if ($excludeUserId !== null && $uid === $excludeUserId) {
                continue;
            }
            $this->push($uid, $type, $message, $link);
        }
    }

    // รายการแจ้งเตือนของผู้ใช้ (ใหม่ก่อน) แบ่งหน้า
    public function listFor(int $userId, int $limit, int $offset): array
    {
        return $this->where('user_id', $userId)
            ->orderBy('id', 'DESC')
            ->findAll($limit, $offset);
    }

    // จำนวนแจ้งเตือนทั้งหมดของผู้ใช้ (ไว้คำนวณ hasMore)
    public function totalFor(int $userId): int
    {
        return $this->where('user_id', $userId)->countAllResults();
    }

    // จำนวนที่ยังไม่เห็น (คุม badge)
    public function unseenCount(int $userId): int
    {
        return $this->where('user_id', $userId)->where('seen_at', null)->countAllResults();
    }

    // ทำเครื่องหมาย "เห็นแล้ว" ทั้งหมด (ตอนเปิด dropdown)
    public function markAllSeen(int $userId): void
    {
        $this->set('seen_at', date('Y-m-d H:i:s'))
            ->where('user_id', $userId)
            ->where('seen_at', null)
            ->update();
    }

    // ทำเครื่องหมาย "อ่านแล้ว" 1 รายการ (เฉพาะของผู้ใช้นั้น)
    public function markRead(int $userId, int $id): void
    {
        $this->set('read_at', date('Y-m-d H:i:s'))
            ->where('user_id', $userId)
            ->where('id', $id)
            ->where('read_at', null)
            ->update();
    }

    // ทำเครื่องหมาย "อ่านแล้ว" ทั้งหมด
    public function markAllRead(int $userId): void
    {
        $this->set('read_at', date('Y-m-d H:i:s'))
            ->where('user_id', $userId)
            ->where('read_at', null)
            ->update();
    }
}
