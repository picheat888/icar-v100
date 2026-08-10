<?php

namespace App\Controllers;

class Home extends BaseController
{
    /**
     * จัดเส้นทางหน้าแรกตาม role: ยังไม่ล็อกอิน -> login,
     * admin -> /admin, driver -> /driver, ที่เหลือ (user) -> /timeline
     */
    public function index()
    {
        if (! auth()->loggedIn()) {
            return redirect()->to('login');
        }

        $user = auth()->user();

        if ($user->inGroup('admin')) {
            return redirect()->to('admin');
        }
        if ($user->inGroup('driver')) {
            return redirect()->to('driver');
        }

        return redirect()->to('timeline');
    }
}
