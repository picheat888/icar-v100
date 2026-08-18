<?php

use App\Models\BookingModel;
use App\Models\UserProfileModel;

if (! function_exists('admin_nav_badges')) {
    /**
     * นับงานค้างสำหรับ badge บน sidebar (เฉพาะ admin)
     * คืน ['requests' => คำขอจองรถ pending, 'members' => สมาชิก pending]
     */
    function admin_nav_badges(): array
    {
        return [
            'requests' => (new BookingModel())->whereIn('status', ['pending', 'cancel_requested'])->where('deleted_at', null)->countAllResults(),
            'members'  => (new UserProfileModel())->where('status', 'pending')->countAllResults(),
        ];
    }
}

if (! function_exists('current_full_name')) {
    /**
     * ชื่อ - นามสกุล ของผู้ใช้ที่ล็อกอินอยู่ (จาก user_profiles)
     * ไม่มีโปรไฟล์หรือชื่อว่าง คืน username แทน · ยังไม่ล็อกอิน คืนคำกลาง ๆ
     * ผลถูกจำไว้ต่อ 1 request กันยิง query ซ้ำเมื่อถูกเรียกหลายที่
     */
    function current_full_name(): string
    {
        static $name;

        if ($name !== null) {
            return $name;
        }

        $user = function_exists('auth') ? auth()->user() : null;

        if (! $user) {
            return $name = lang('Nav.guest_name');
        }

        $profile  = (new UserProfileModel())->findByUserId((int) $user->id);
        $fullName = trim((string) ($profile['full_name'] ?? ''));

        return $name = $fullName !== '' ? $fullName : (string) $user->username;
    }
}
