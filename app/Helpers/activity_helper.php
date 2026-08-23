<?php

use App\Models\ActivityLogModel;
use App\Models\UserProfileModel;

if (! function_exists('log_activity')) {
    /**
     * บันทึกกิจกรรมลง activity_logs - เรียกบรรทัดเดียวจากที่ไหนก็ได้
     *
     * @param string $key    คีย์ข้อความใน app/Language/{th,en}/Log.php (ห้ามส่งประโยคสำเร็จรูป)
     * @param array  $params ค่าที่แทนใน placeholder เช่น ['code' => 'BK-0007'] · 'role' ส่งเป็นคีย์บทบาท (admin/user/driver)
     * @param array  $actor  override: ['user_id'=>, 'actor_name'=>, 'role'=>] (ใช้ตอนไม่มี auth เช่น register)
     *
     * ปกติดึงผู้ใช้ปัจจุบันจาก auth ให้อัตโนมัติ (id/ชื่อ/บทบาท)
     */
    function log_activity(string $key, array $params = [], array $actor = []): void
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
            $json = $params === [] ? null : json_encode($params, JSON_UNESCAPED_UNICODE);
            // เก็บข้อความอังกฤษไว้ในคอลัมน์ action ด้วย - log ต้องอ่านออกแม้คีย์ภาษาถูกเปลี่ยนภายหลัง
            $action = ActivityLogModel::renderMessage(['msg_key' => $key, 'params' => $json], 'en');

            (new ActivityLogModel())->insert([
                'user_id'    => $userId,
                'actor_name' => $name,
                'role'       => $role,
                'msg_key'    => $key,
                'params'     => $json,
                'action'     => mb_substr($action, 0, 255),
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'log_activity failed: ' . $e->getMessage());
        }
    }
}
