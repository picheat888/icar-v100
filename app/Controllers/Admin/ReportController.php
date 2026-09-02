<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\BookingModel;

/**
 * รายงาน (Admin) - ค่าใช้จ่ายคนขับภายนอก + สรุปการใช้งานรถ
 */
class ReportController extends BaseController
{
    // ขอบเขตที่นับเข้ารายงานค่าใช้จ่าย - map ค่าจาก UI เป็นสถานะจริงในฐานข้อมูล
    private const COST_SCOPES = [
        'both'     => ['approved', 'completed'],
        'approved' => ['approved'],
        'done'     => ['completed'],
    ];

    // หน้ารายงาน (island)
    public function index()
    {
        return view('admin/reports/index', [
            'active'       => 'reports',
            'pageTitle'    => lang('Page.reports'),
            'pageSubtitle' => lang('Page.reports_sub'),
        ]);
    }

    // JSON: ข้อมูลรายงานตามชนิดที่ขอ (cost | usage) + ช่วงวันที่
    public function data()
    {
        // กันเปิดตรงจาก browser -> เด้งกลับหน้าหลัก (กันโชว์ JSON ดิบ)
        if ($r = $this->blockDirectAccess()) {
            return $r;
        }

        $from     = $this->date('from');
        $to       = $this->date('to');
        $bookings = new BookingModel();

        if ((string) $this->request->getGet('kind') === 'usage') {
            return $this->response->setJSON([
                'kind'    => 'usage',
                'rows'    => $bookings->usageRows($from, $to),
                'summary' => $bookings->usageSummary($from, $to),
            ]);
        }

        $scope    = $this->scope();
        $statuses = self::COST_SCOPES[$scope];

        return $this->response->setJSON([
            'kind'    => 'cost',
            'scope'   => $scope,
            'rows'    => $bookings->externalCostRows($from, $to, $statuses),
            'summary' => $bookings->externalCostSummary($from, $to, $statuses),
        ]);
    }

    // วันที่จาก query ('YYYY-MM-DD') - รูปแบบผิดหรือไม่ส่งมา = ไม่จำกัดด้านนั้น
    private function date(string $key): string
    {
        $v = (string) $this->request->getGet($key);

        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) === 1 ? $v : '';
    }

    // ขอบเขตที่นับ - ค่าที่ไม่รู้จักตกไปที่ 'both'
    private function scope(): string
    {
        $s = (string) $this->request->getGet('scope');

        return isset(self::COST_SCOPES[$s]) ? $s : 'both';
    }
}
