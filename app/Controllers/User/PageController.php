<?php

namespace App\Controllers\User;

use App\Controllers\BaseController;
use App\Models\BookingModel;
use App\Models\CarModel;

/**
 * หน้าตารางการใช้รถ (timeline) ของ user + endpoint JSON ที่ island ใช้ดึงข้อมูล
 */
class PageController extends BaseController
{
    // ตารางการใช้รถ - หน้า island
    public function timeline()
    {
        return view('user/timeline/index', [
            'active'       => 'timeline',
            'pageTitle'    => lang('Page.calendar'),
            'pageSubtitle' => lang('Page.calendar_sub'),
        ]);
    }

    // JSON: การจองรถขับเอง (ทุกคน) + คำขอของตัวเอง ในช่วงเดือนที่ดู + รถขับเอง
    public function timelineData()
    {
        // กันเปิดตรงจาก browser -> เด้งกลับหน้าหลัก (กันโชว์ JSON ดิบ)
        if ($r = $this->blockDirectAccess()) {
            return $r;
        }

        helper('timeline');
        [$from, $to] = timeline_range($this->request->getGet('from'), $this->request->getGet('to'));

        $bookings = (new BookingModel())->listForTimeline('user', (int) auth()->id(), $from, $to);
        $cars     = (new CarModel())->where('car_type', 'self')->orderBy('model')->findAll();

        return $this->response->setJSON(['bookings' => $bookings, 'cars' => $cars]);
    }
}
