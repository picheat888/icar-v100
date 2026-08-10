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
