<?php

namespace App\Controllers\User;

use App\Controllers\BaseController;
use App\Models\BookingModel;
use App\Models\CarModel;

/**
 * หน้าผู้ใช้ทั่วไป - placeholder เพื่อทดสอบ shell
 */
class PageController extends BaseController
{
    // เรนเดอร์หน้า placeholder ภายใต้ layout user
    private function page(string $active, string $title, string $subtitle = '')
    {
        return view('user/_page', [
            'active'       => $active,
            'pageTitle'    => $title,
            'pageSubtitle' => $subtitle,
        ]);
    }

    // จองรถ
    public function book()
    {
        return $this->page('book', lang('Page.book'), lang('Page.book_sub'));
    }

    // คำขอของฉัน
    public function myRequests()
    {
        return $this->page('myRequests', lang('Page.myRequests'), lang('Page.myRequests_sub'));
    }

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
