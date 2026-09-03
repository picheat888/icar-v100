<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Libraries\CostReport;
use App\Libraries\Pdf;
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

    // PDF: รายงานค่าใช้จ่ายคนขับภายนอก - เปิดในแท็บใหม่ ผู้ใช้กดบันทึกเองได้
    public function costPdf()
    {
        $from     = $this->date('from');
        $to       = $this->date('to');
        $scope    = $this->scope();
        $bookings = new BookingModel();

        $rows    = $bookings->externalCostRows($from, $to, self::COST_SCOPES[$scope]);
        $summary = $bookings->externalCostSummary($from, $to, self::COST_SCOPES[$scope]);

        $scopeText = lang('Report.scope_' . $scope);

        $html = view('admin/reports/cost_pdf', [
            'rows'      => $rows,
            'report'    => CostReport::build($rows, $summary),
            'rangeText' => $this->rangeText($from, $to),
        ]);
        $footer = view('admin/reports/_pdf_footer', ['scopeText' => $scopeText]);

        return $this->response
            ->setHeader('Content-Type', 'application/pdf')
            ->setHeader('Content-Disposition', 'inline; filename="' . $this->fileName($from, $to) . '"')
            ->setBody(Pdf::render(Pdf::make(), $html, $footer));
    }

    // ข้อความช่วงวันที่บนหัวรายงาน - ไม่ระบุด้านใดก็ปล่อยว่างด้านนั้น
    private function rangeText(string $from, string $to): string
    {
        if ($from === '' && $to === '') {
            return lang('Report.range_all');
        }

        return trim(thai_date($from) . ' - ' . thai_date($to), ' -') ?: lang('Report.range_all');
    }

    // ชื่อไฟล์ PDF - มีช่วงวันที่ให้รู้ว่าเป็นรายงานของช่วงไหน
    private function fileName(string $from, string $to): string
    {
        $part = $from !== '' || $to !== '' ? $from . '_' . $to : date('Y-m-d');

        return 'external-driver-cost-' . $part . '.pdf';
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
