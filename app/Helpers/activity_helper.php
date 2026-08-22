<?php

use App\Models\ActivityLogModel;
use App\Models\UserProfileModel;

if (! function_exists('log_activity')) {
    /**
     * บันทึกกิจกรรมลง activity_logs - เรียกบรรทัดเดียวจากที่ไหนก็ได้
     *
     * @param string $action ข้อความอธิบายการกระทำ - เขียนเป็นภาษาอังกฤษเสมอ (log ไม่แปลตามภาษาผู้อ่าน)
     * @param array  $actor  override: ['user_id'=>, 'actor_name'=>, 'role'=>] (ใช้ตอนไม่มี auth เช่น register)
     *
     * ปกติดึงผู้ใช้ปัจจุบันจาก auth ให้อัตโนมัติ (id/ชื่อ/บทบาท)
     */
    function log_activity(string $action, array $actor = []): void
    {
        $user   = function_exists('auth') ? auth()->user() : null;
        $userId = $actor['user_id']    ?? ($user && $user->id ? (int) $user->id : null);
        $name   = $actor['actor_name'] ?? null;
        $role   = $actor['role']       ?? null;

        // ชื่อ: ดึงจากโปรไฟล์ ถ้าไม่ระบุมา
        if ($name === null && $userId) {
            $prof = (new UserProfileModel())->findByUserId($userId);
            $name = $prof['full_name'] ?? ($user->username ?? null);
        }
        // บทบาท: อิงกลุ่มของผู้ใช้ปัจจุบัน ถ้าไม่ระบุมา
        if ($role === null && $user) {
            $role = $user->inGroup('admin') ? 'admin' : ($user->inGroup('driver') ? 'driver' : 'user');
        }

        // logging เป็น best-effort - ถ้าบันทึก log ล้มเหลว ต้องไม่ทำ action หลักพัง (แค่ log error ไว้)
        try {
            (new ActivityLogModel())->insert([
                'user_id'    => $userId,
                'actor_name' => $name,
                'role'       => $role,
                'action'     => mb_substr($action, 0, 255),
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'log_activity failed: ' . $e->getMessage());
        }
    }
}
