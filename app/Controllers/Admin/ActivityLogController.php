<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\ActivityLogModel;

/**
 * ประวัติการใช้งาน (Admin) — หน้า + JSON + Export CSV
 */
class ActivityLogController extends BaseController
{
    private array $roleLabels = ['admin' => 'Admin', 'user' => 'User ทั่วไป', 'driver' => 'คนขับรถ'];

    // หน้า "ประวัติการใช้งาน" (island)
    public function index()
    {
        return view('admin/activity_log/index', [
            'active'       => 'log',
            'pageTitle'    => lang('Page.log'),
            'pageSubtitle' => lang('Page.log_sub'),
        ]);
    }

    // จำนวนแถวสูงสุดที่แสดงบนหน้าเว็บ (เกินกว่านี้ให้ Export CSV ดูครบ)
    private const PAGE_LIMIT = 15;

    // JSON: log ตามช่วงวันที่ (สูงสุด 15 แถวล่าสุด + จำนวนรวมทั้งหมด)
    public function data()
    {
        // กันเปิดตรงจาก browser -> เด้งกลับหน้าหลัก (กันโชว์ JSON ดิบ)
        if ($r = $this->blockDirectAccess()) {
            return $r;
        }

        [$from, $to] = $this->range();
        $model = new ActivityLogModel();
        $total = $model->countInRange($from, $to);
        $rows  = $model->inRange($from, $to, self::PAGE_LIMIT);
        foreach ($rows as &$r) {
            $r['role_label'] = $this->roleLabels[$r['role']] ?? '-';
        }

        return $this->response->setJSON([
            'logs'  => $rows,
            'total' => $total,
            'limit' => self::PAGE_LIMIT,
            'from'  => $from,
            'to'    => $to,
        ]);
    }

    // Export CSV (UTF-8 + BOM ให้ Excel อ่านไทยได้) ตามช่วงวันที่
    public function export()
    {
        [$from, $to] = $this->range();
        $rows = (new ActivityLogModel())->inRange($from, $to);

        $fh = fopen('php://temp', 'r+');
        fputcsv($fh, ['เวลา', 'ผู้ใช้', 'บทบาท', 'การกระทำ']);
        foreach ($rows as $r) {
            fputcsv($fh, [
                $r['created_at'],
                $r['actor_name'] ?? '-',
                $this->roleLabels[$r['role']] ?? '-',
                $r['action'],
            ]);
        }
        rewind($fh);
        $csv = "\xEF\xBB\xBF" . stream_get_contents($fh);   // BOM นำหน้า
        fclose($fh);

        return $this->response
            ->setHeader('Content-Type', 'text/csv; charset=UTF-8')
            ->setHeader('Content-Disposition', 'attachment; filename="activity-log_' . $from . '_' . $to . '.csv"')
            ->setBody($csv);
    }

    // อ่าน from/to จาก query (default 7 วันล่าสุด) + sanitize รูปแบบ YYYY-MM-DD
    private function range(): array
    {
        $valid = static fn ($d) => is_string($d) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $d);
        $to    = $this->request->getGet('to');
        $from  = $this->request->getGet('from');
        $to    = $valid($to) ? $to : date('Y-m-d');
        $from  = $valid($from) ? $from : date('Y-m-d', strtotime('-6 days'));

        return [$from, $to];
    }
}
