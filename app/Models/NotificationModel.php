<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Model ตาราง notifications - แจ้งเตือนรายผู้ใช้ (read_at = ยังไม่อ่าน คุม badge + ไฮไลต์แถว)
 */
class NotificationModel extends Model
{
    protected $table         = 'notifications';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = true;
    protected $allowedFields = ['user_id', 'type', 'msg_key', 'params', 'link', 'read_at'];

    // สร้างแจ้งเตือน 1 แถวให้ผู้ใช้คนหนึ่ง - เก็บ key + params ไว้ประกอบข้อความตอนอ่าน
    public function push(int $userId, string $type, string $msgKey, array $params = [], ?string $link = null): void
    {
        $this->insert([
            'user_id' => $userId,
            'type'    => $type,
            'msg_key' => $msgKey,
            'params'  => $params === [] ? null : json_encode($params, JSON_UNESCAPED_UNICODE),
            'link'    => $link,
        ]);
    }

    // สร้างแจ้งเตือนให้ admin ทุกคน (ข้าม excludeUserId ถ้ากำหนด - กันแจ้งตัวเอง)
    public function pushToAdmins(string $type, string $msgKey, array $params = [], ?string $link = null, ?int $excludeUserId = null): void
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
            $this->push($uid, $type, $msgKey, $params, $link);
        }
    }

    // ข้อความของแถวหนึ่งตามภาษาผู้อ่าน - static เพราะเป็นฟังก์ชันบริสุทธิ์ ไม่แตะฐานข้อมูล
    public static function renderMessage(array $row): string
    {
        helper('format');
        $key = (string) ($row['msg_key'] ?? '');
        if ($key === '') {
            return '';
        }

        $params = json_decode((string) ($row['params'] ?? ''), true) ?: [];
        // params 'role' เก็บเป็นคีย์บทบาท (admin/user/driver) แปลตอนอ่าน
        if (isset($params['role'])) {
            $params['role'] = role_labels()[$params['role']] ?? $params['role'];
        }

        return lang("Notification.{$key}", $params);
    }

    // รายการแจ้งเตือนของผู้ใช้ (ใหม่ก่อน) แบ่งหน้า - island จัดกลุ่มตามวันโดยอาศัยลำดับนี้
    public function listFor(int $userId, int $limit, int $offset): array
    {
        return $this->where('user_id', $userId)
            ->orderBy('created_at', 'DESC')
            ->orderBy('id', 'DESC')
            ->findAll($limit, $offset);
    }

    // จำนวนแจ้งเตือนทั้งหมดของผู้ใช้ (ไว้คำนวณ hasMore)
    public function totalFor(int $userId): int
    {
        return $this->where('user_id', $userId)->countAllResults();
    }

    // จำนวนที่ยังไม่อ่าน (คุม badge - ลดลงเมื่อกดรายการ ไม่ใช่เมื่อเปิดกล่อง)
    public function unreadCount(int $userId): int
    {
        return $this->where('user_id', $userId)->where('read_at', null)->countAllResults();
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
