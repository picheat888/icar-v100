<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\BookingModel;
use App\Models\CarModel;
use App\Models\UserProfileModel;

/**
 * หน้าหลังบ้าน (admin) — ตอนนี้เป็น placeholder เพื่อทดสอบ shell
 * แต่ละ method ส่งชื่อหน้า/คีย์เมนูที่ active ให้ layout
 */
class DashboardController extends BaseController
{
    // เรนเดอร์หน้า placeholder ภายใต้ layout admin
    private function page(string $active, string $title, string $subtitle = '')
    {
        return view('admin/_page', [
            'active'       => $active,
            'pageTitle'    => $title,
            'pageSubtitle' => $subtitle,
        ]);
    }

    // ภาพรวมระบบ (island: การ์ดสรุป + คำขอล่าสุด + สมาชิกรออนุมัติ)
    public function index()
    {
        return view('admin/dashboard/index', [
            'active'       => 'dashboard',
            'pageTitle'    => lang('Page.dashboard'),
            'pageSubtitle' => lang('Page.dashboard_sub'),
        ]);
    }

    // JSON: ข้อมูลสรุปสำหรับ dashboard (การ์ดตัวเลข + คำขอล่าสุด + สมาชิกรออนุมัติ)
    public function data()
    {
        // กันเปิดตรงจาก browser -> เด้งกลับหน้าหลัก (กันโชว์ JSON ดิบ)
        if ($r = $this->blockDirectAccess()) {
            return $r;
        }

        $bookings = new BookingModel();
        $bookings->sweepExpired();   // ปิดงานหมดเวลาก่อนนับ ให้ตัวเลขตรงเวลาจริง

        // การ์ดตัวเลข 4 ใบ
        $counts = [
            'pendingBookings' => (new BookingModel())->whereIn('status', ['pending', 'cancel_requested'])->where('deleted_at', null)->countAllResults(),
            'pendingMembers'  => (new UserProfileModel())->where('status', 'pending')->countAllResults(),
            'availableCars'   => (new CarModel())->where('status', 'available')->where('deleted_at', null)->countAllResults(),
            'totalBookings'   => (new BookingModel())->where('deleted_at', null)->countAllResults(),
        ];

        // คำขอล่าสุด — เอา "N วันล่าสุด" แบบครบทั้งวัน (ไม่ตัดคำขอกลางวันเดียวกัน) ที่เหลือกด "ดูทั้งหมด"
        // listAll เรียง start_at DESC อยู่แล้ว คำขอวันเดียวกันจึงเรียงติดกัน → เก็บจนครบ N วันแล้วหยุด
        $maxDays = 3;
        $recent  = [];
        $seenDates = [];
        foreach ((new BookingModel())->listAll() as $b) {
            $d = substr((string) $b['start_at'], 0, 10);   // 'YYYY-MM-DD'
            if (! isset($seenDates[$d])) {
                if (count($seenDates) >= $maxDays) {
                    break;   // ครบจำนวนวันที่กำหนดแล้ว
                }
                $seenDates[$d] = true;
            }
            $recent[] = $b;
        }

        // สมาชิกที่รอการอนุมัติ — เอา 6 รายชื่อ
        $pendingMembers = array_values(array_filter(
            (new UserProfileModel())->listMembers(),
            static fn ($m) => $m['status'] === 'pending'
        ));
        $pendingMembers = array_slice($pendingMembers, 0, 6);

        return $this->response->setJSON([
            'counts'         => $counts,
            'recentBookings' => $recent,
            'pendingMembers' => $pendingMembers,
        ]);
    }

    // ตารางการใช้รถ — หน้า island
    public function timeline()
    {
        return view('admin/timeline/index', [
            'active'       => 'timeline',
            'pageTitle'    => lang('Page.calendar'),
            'pageSubtitle' => lang('Page.calendar_sub'),
        ]);
    }

    // JSON: การจองทั้งหมดในช่วงเดือนที่ดู + รถขับเอง (สำหรับแถวมุมมองรายวัน)
    public function timelineData()
    {
        // กันเปิดตรงจาก browser -> เด้งกลับหน้าหลัก (กันโชว์ JSON ดิบ)
        if ($r = $this->blockDirectAccess()) {
            return $r;
        }

        helper('timeline');
        [$from, $to] = timeline_range($this->request->getGet('from'), $this->request->getGet('to'));

        $bookings = (new BookingModel())->listForTimeline('admin', (int) auth()->id(), $from, $to);
        $cars     = (new CarModel())->where('car_type', 'self')->orderBy('model')->findAll();

        return $this->response->setJSON(['bookings' => $bookings, 'cars' => $cars]);
    }

    // จัดการสมาชิก
    public function members()
    {
        return $this->page('members', 'จัดการผู้ใช้งาน', 'อนุมัติ/แก้ไขสมาชิกและกำหนดสิทธิ์');
    }

    // จัดการคำขอจองรถ
    public function requests()
    {
        return $this->page('requests', 'จัดการการจองรถ', 'อนุมัติ/ปฏิเสธและมอบหมายรถ');
    }

    // จัดการรถ
    public function vehicles()
    {
        return $this->page('vehicles', 'จัดการรถ', 'รถของบริษัทและรถจัดหาโดย Admin');
    }

    // ข้อมูลหลัก (แผนก / ตำแหน่ง)
    public function master()
    {
        return $this->page('master', 'ข้อมูลหลัก (แผนก / ตำแหน่ง)', 'จัดการข้อมูลตั้งต้นและประวัติการใช้งาน');
    }
}
