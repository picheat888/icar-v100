<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Model ตาราง bookings - คำขอจองรถ
 */
class BookingModel extends Model
{
    protected $table          = 'bookings';
    protected $primaryKey     = 'id';
    protected $returnType     = 'array';
    protected $useSoftDeletes = true;
    protected $useTimestamps  = true;
    protected $allowedFields  = [
        'booking_code', 'requester_id', 'booking_type', 'location',
        'start_at', 'end_at', 'people', 'purpose', 'map_link', 'car_id',
        'status', 'driver_type', 'driver_id',
        'ext_driver_name', 'ext_driver_phone', 'ext_driver_seats', 'ext_driver_vehicle',
        'admin_note', 'approved_by', 'approved_at', 'returned_at',
    ];

    // สร้างรหัสคำขอแสดงผล BK-xxxx จาก id
    public function makeCode(int $id): string
    {
        return 'BK-' . str_pad((string) $id, 4, '0', STR_PAD_LEFT);
    }

    // คีย์ + อายุของตัวกันกวาดซ้ำ (วินาที) - กวาดถี่สุด 1 ครั้งต่อช่วงเวลานี้
    private const SWEEP_KEY = 'booking_sweep_ran';
    private const SWEEP_TTL = 60;

    // ปิดงานอัตโนมัติเมื่อเลยเวลาสิ้นสุด (lazy sweep - ถูกเรียกทุกครั้งที่โหลดลิสต์)
    public function sweepExpired(): void
    {
        $now   = date('Y-m-d H:i:s');
        $cache = cache();

        // เพิ่งกวาดไปไม่ถึง SWEEP_TTL วินาที -> ข้าม (กันหลายคนเปิดหน้าพร้อมกันแล้วกวาดซ้ำซ้อน)
        if ($cache->get(self::SWEEP_KEY)) {
            return;
        }

        // มีงานหมดเวลาจริงไหม - อ่านอย่างเดียว ถ้าไม่มีก็ออกเลย ไม่ต้องเขียน DB และไม่จับ lock
        // (ไม่มีของให้กวาด = ไม่ตั้งตัวกันซ้ำ เพื่อให้รอบถัดไปตรวจได้ทันทีเมื่อมีงานหมดเวลา)
        $expired = $this->whereIn('status', ['approved', 'pending', 'cancel_requested'])
            ->where('end_at <', $now)
            ->where('deleted_at', null)
            ->countAllResults();
        if ($expired === 0) {
            return;
        }

        // เขียน cache ไม่สำเร็จก็ทำงานต่อได้ตามปกติ (แค่ไม่มีตัวกันกวาดซ้ำ)
        $cache->save(self::SWEEP_KEY, 1, self::SWEEP_TTL);

        // อนุมัติแล้ว + เลยเวลา -> เดินทางเสร็จสิ้น (completed) ไม่แตะ returned_at (คง NULL)
        // เพื่อแยก "เดินทางเสร็จสิ้นแล้ว" ออกจาก "คืนรถแล้ว" (กดคืนเอง)
        $this->set('status', 'completed')
            ->set('updated_at', $now)
            ->where('status', 'approved')
            ->where('end_at <', $now)
            ->where('deleted_at', null)
            ->update();

        // ยังไม่จบเรื่อง (รออนุมัติ / รอยืนยันยกเลิก) + เลยเวลา -> ยกเลิกอัตโนมัติ ปล่อยรถคืน
        // นับเฉพาะ 2 สถานะนี้ก่อน (ด่านด้านบนนับรวม approved ด้วย) - ไม่มีก็ไม่ต้องเปิดทรานแซกชัน
        $hasExpiring = $this->whereIn('status', ['pending', 'cancel_requested'])
            ->where('end_at <', $now)
            ->where('deleted_at', null)
            ->countAllResults();
        if ($hasExpiring === 0) {
            return;
        }

        // มีของหมดอายุ -> ล็อกแถว (FOR UPDATE) ในทรานแซกชัน กัน sweep พร้อมกันแจ้งเตือนซ้ำ
        $db = db_connect();
        $db->transBegin();
        $expiring = $db->query(
            'SELECT id, booking_code, requester_id, driver_type, driver_id FROM bookings
             WHERE status IN (?, ?) AND end_at < ? AND deleted_at IS NULL FOR UPDATE',
            ['pending', 'cancel_requested', $now]
        )->getResultArray();

        if (! $expiring) {
            $db->transCommit();   // sweep อื่นชิงไปยกเลิกแล้ว

            return;
        }

        $this->set('status', 'cancelled')
            ->set('updated_at', $now)
            ->whereIn('status', ['pending', 'cancel_requested'])
            ->where('end_at <', $now)
            ->where('deleted_at', null)
            ->update();
        $db->transCommit();

        // แจ้งเตือนว่างานถูกยกเลิกอัตโนมัติ (ผู้ขอ + คนขับบริษัทถ้ามี)
        helper('url');
        $notif = new NotificationModel();
        foreach ($expiring as $r) {
            $notif->push((int) $r['requester_id'], 'booking_expired', 'booking_expired', ['code' => $r['booking_code']], site_url('my-requests'));
            if ($r['driver_type'] === 'company' && ! empty($r['driver_id'])) {
                $notif->push((int) $r['driver_id'], 'job_cancelled', 'job_cancelled', ['code' => $r['booking_code']], site_url('driver'));
            }
        }
    }

    // เช็คว่าคนขับบริษัทคนนี้มีงานช่วงเวลาทับซ้อนอยู่แล้วไหม (นับเฉพาะที่ยังกันเวลาอยู่: approved/cancel_requested)
    // $excludeId = ข้ามคำขอ id นี้ (ตอนแก้ไข/มอบหมายซ้ำในคำขอเดิม)
    public function driverHasClash(int $driverId, string $start, string $end, int $excludeId = 0): bool
    {
        $builder = $this->where('driver_type', 'company')
            ->where('driver_id', $driverId)
            ->whereIn('status', ['approved', 'cancel_requested'])
            ->where('start_at <', $end)
            ->where('end_at >', $start)
            ->where('deleted_at', null);

        if ($excludeId > 0) {
            $builder->where('id !=', $excludeId);
        }

        return $builder->countAllResults() > 0;
    }

    // คำขอของผู้ใช้คนหนึ่ง (พร้อมชื่อรุ่นรถ) เรียงใหม่สุดก่อน
    public function listForUser(int $userId): array
    {
        $this->sweepExpired();

        return $this->select('bookings.*, c.model AS car_model, c.plate AS car_plate, dp.full_name AS driver_name')
            ->join('cars c', 'c.id = bookings.car_id', 'left')
            ->join('user_profiles dp', 'dp.user_id = bookings.driver_id', 'left')
            ->where('bookings.requester_id', $userId)
            ->orderBy('bookings.start_at', 'DESC')
            ->findAll();
    }

    // งานของคนขับ - คำขอที่อนุมัติแล้ว + มอบหมายให้คนขับคนนี้ (driver_type=company)
    public function listForDriver(int $driverUserId): array
    {
        $this->sweepExpired();

        return $this->select('bookings.*, p.full_name AS requester_name, d.name AS dept_name')
            ->join('user_profiles p', 'p.user_id = bookings.requester_id', 'left')
            ->join('departments d', 'd.id = p.department_id', 'left')
            ->where('bookings.status', 'approved')
            ->where('bookings.driver_type', 'company')
            ->where('bookings.driver_id', $driverUserId)
            ->orderBy('bookings.start_at', 'DESC')
            ->findAll();
    }

    // query ตั้งต้นของลิสต์ฝั่ง Admin - join ชื่อผู้ขอ/แผนก/รถ/ชื่อคนขับบริษัท
    private function adminListQuery(): self
    {
        return $this->select('bookings.*, p.full_name AS requester_name, d.name AS dept_name,
                c.model AS car_model, c.plate AS car_plate, dp.full_name AS driver_name')
            ->join('user_profiles p', 'p.user_id = bookings.requester_id', 'left')
            ->join('departments d', 'd.id = p.department_id', 'left')
            ->join('cars c', 'c.id = bookings.car_id', 'left')
            ->join('user_profiles dp', 'dp.user_id = bookings.driver_id', 'left');
    }

    // คำขอทั้งหมด (สำหรับ Admin) พร้อมชื่อผู้ขอ/แผนก/รถ/ชื่อคนขับบริษัท
    public function listAll(): array
    {
        $this->sweepExpired();

        return $this->adminListQuery()
            ->orderBy('bookings.start_at', 'DESC')
            ->findAll();
    }

    // คำขอที่วันเดินทางยังไม่ผ่าน (ตั้งแต่ต้นวัน $fromDate) เรียงใกล้ถึงก่อน · $fromDate = 'YYYY-MM-DD'
    public function listUpcoming(string $fromDate): array
    {
        $this->sweepExpired();

        return $this->adminListQuery()
            ->where('bookings.start_at >=', $fromDate . ' 00:00:00')
            ->orderBy('bookings.start_at', 'ASC')
            ->findAll();
    }

    // คำขอสำหรับหน้า "ตารางการใช้รถ" ตาม role + ช่วงวันที่ที่คาบเกี่ยว [$from, $to]
    // $role: 'admin'|'user'|'driver' · $userId: id ผู้ใช้ปัจจุบัน (ใช้กรอง user/driver)
    // join ผู้ขอ/แผนก/ตำแหน่ง/รถ/คนขับ ครบชุดสำหรับ modal รายละเอียด
    public function listForTimeline(string $role, int $userId, string $from, string $to): array
    {
        $this->sweepExpired();

        $this->select('bookings.*, p.full_name AS requester_name,
                d.name AS dept_name, pos.name AS position_name,
                c.model AS car_model, c.plate AS car_plate, dp.full_name AS driver_name')
            ->join('user_profiles p', 'p.user_id = bookings.requester_id', 'left')
            ->join('departments d', 'd.id = p.department_id', 'left')
            ->join('positions pos', 'pos.id = p.position_id', 'left')
            ->join('cars c', 'c.id = bookings.car_id', 'left')
            ->join('user_profiles dp', 'dp.user_id = bookings.driver_id', 'left')
            // แสดงเฉพาะสถานะที่ยังเห็นในตาราง (ตัด rejected/cancelled ทิ้ง)
            ->whereIn('bookings.status', ['pending', 'approved', 'cancel_requested', 'completed'])
            // คาบเกี่ยวช่วงที่กำลังดู
            ->where('bookings.start_at <', $to)
            ->where('bookings.end_at >', $from);

        // กรองตาม role
        if ($role === 'user') {
            // รถขับเองของทุกคน (ดูคิว/ว่าง) OR คำขอของตัวเอง (รวมรถอื่นๆ ของตัวเอง)
            $this->groupStart()
                ->where('bookings.booking_type', 'self')
                ->orWhere('bookings.requester_id', $userId)
                ->groupEnd();
        } elseif ($role === 'driver') {
            // เฉพาะงานที่มอบหมายให้คนขับคนนี้
            $this->where('bookings.driver_type', 'company')
                ->where('bookings.driver_id', $userId);
        }
        // admin: ไม่กรองเพิ่ม เห็นทั้งหมด

        $rows = $this->orderBy('bookings.start_at', 'ASC')->findAll();

        // กันข้อมูลรั่วฝั่ง server (privacy): ตัดฟิลด์ที่ UI ของ role นั้นไม่แสดง
        // user เห็นคิวรถของคนอื่นได้ แต่ต้องไม่เห็นสถานที่/วัตถุประสงค์/หมายเหตุภายใน
        if ($role === 'user') {
            foreach ($rows as &$r) {
                // ตัดรายละเอียดเฉพาะคำขอของ "คนอื่น" - คำขอของตัวเองต้องเห็นครบ (สถานที่/วัตถุประสงค์/หมายเหตุ)
                if ((int) $r['requester_id'] !== $userId) {
                    unset($r['admin_note'], $r['purpose'], $r['location'], $r['map_link']);
                }
            }
            unset($r);
        } elseif ($role === 'driver') {
            // คนขับไม่ต้องเห็นหมายเหตุภายในของ Admin
            foreach ($rows as &$r) {
                unset($r['admin_note']);
            }
            unset($r);
        }

        return $rows;
    }
}
