<?php

namespace App\Controllers\Driver;

use App\Controllers\BaseController;
use App\Models\BookingModel;

/**
 * หน้างานของฉัน + ตารางการใช้รถของคนขับ + endpoint JSON ที่ island ใช้ดึงข้อมูล
 */
class PageController extends BaseController
{
    // งานของฉัน - งานที่ได้รับมอบหมาย (คำขออนุมัติแล้ว + เป็นคนขับที่ถูกมอบหมาย)
    public function index()
    {
        $jobs = (new BookingModel())->listForDriver((int) auth()->id());

        return view('driver/jobs/index', [
            'active'       => 'myJobs',
            'pageTitle'    => lang('Page.myJobs'),
            'pageSubtitle' => lang('Page.myJobs_sub'),
            'jobs'         => $jobs,
        ]);
    }

    // ตารางการใช้รถ - หน้า island (เฉพาะงานของคนขับคนนี้)
    public function timeline()
    {
        return view('driver/timeline/index', [
            'active'       => 'timeline',
            'pageTitle'    => lang('Page.calendar'),
            'pageSubtitle' => lang('Page.calendar_sub_driver'),
        ]);
    }

    // JSON: เฉพาะงานที่มอบหมายให้คนขับคนนี้ ในช่วงเดือนที่ดู
    public function timelineData()
    {
        // กันเปิดตรงจาก browser -> เด้งกลับหน้าหลัก (กันโชว์ JSON ดิบ)
        if ($r = $this->blockDirectAccess()) {
            return $r;
        }

        helper('timeline');
        [$from, $to] = timeline_range($this->request->getGet('from'), $this->request->getGet('to'));

        $bookings = (new BookingModel())->listForTimeline('driver', (int) auth()->id(), $from, $to);

        return $this->response->setJSON(['bookings' => $bookings, 'cars' => []]);
    }
}
