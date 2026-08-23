<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\ActivityLogModel;

/**
 * ประวัติการใช้งาน (Admin) - หน้า + JSON + Export CSV
 */
class ActivityLogController extends BaseController
{
    // หน้า "ประวัติการใช้งาน" (island)
    public function index()
    {
        return view('admin/activity_log/index', [
            'active'       => 'log',
            'roleOptions'  => $this->roleOptions(),
            'typeOptions'  => $this->typeOptions(),
            'pageTitle'    => lang('Page.log'),
            'pageSubtitle' => lang('Page.log_sub'),
        ]);
    }

    // จำนวนแถวต่อหน้าที่เลือกได้ - รับเฉพาะค่าในลิสต์นี้ ค่าอื่นตกไปใช้ค่าแรก
    private const PER_PAGE_OPTIONS = [10, 25, 50, 100];

    // จำนวนแถวต่อชุดตอน export CSV - ยิ่งเล็กยิ่งใช้หน่วยความจำน้อย
    private const EXPORT_CHUNK = 500;

    // JSON: log ตามช่วงวันที่ แบ่งหน้าตาม page/perPage
    public function data()
    {
        // กันเปิดตรงจาก browser -> เด้งกลับหน้าหลัก (กันโชว์ JSON ดิบ)
        if ($r = $this->blockDirectAccess()) {
            return $r;
        }

        [$from, $to] = $this->range();

        // perPage ต้องอยู่ในลิสต์ที่อนุญาต
        $perPage = (int) $this->request->getGet('perPage');
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = self::PER_PAGE_OPTIONS[0];
        }

        $filters = $this->filters();
        $model   = new ActivityLogModel();
        $total   = $model->countInRange($from, $to, $filters);

        // หน้าต้องอยู่ในช่วงที่มีจริง
        $totalPages = max(1, (int) ceil($total / $perPage));
        $page       = max(1, (int) $this->request->getGet('page'));
        $page       = min($page, $totalPages);

        $rows = $model->inRange($from, $to, $perPage, ($page - 1) * $perPage, $filters);
        foreach ($rows as &$r) {
            $r['role_label'] = role_labels()[$r['role']] ?? '-';
            $r['message']    = ActivityLogModel::renderMessage($r);
        }

        return $this->response->setJSON([
            'logs'    => $rows,
            'total'   => $total,
            'page'    => $page,
            'perPage' => $perPage,
            'from'    => $from,
            'to'      => $to,
            'filters' => $filters,
        ]);
    }

    // Export CSV (UTF-8 + BOM ให้ Excel อ่านไทยได้) ตามช่วงวันที่
    public function export()
    {
        [$from, $to] = $this->range();

        // ส่งหัว response ก่อน แล้วทยอยเขียน CSV ลง output ทีละชุด
        // ไม่สร้างไฟล์ทั้งก้อนไว้ในหน่วยความจำ -> ส่งออกได้แม้ log มีหลักแสนแถว
        $this->response
            ->setHeader('Content-Type', 'text/csv; charset=UTF-8')
            ->setHeader('Content-Disposition', 'attachment; filename="activity-log_' . $from . '_' . $to . '.csv"')
            ->setHeader('Cache-Control', 'no-store')
            ->sendHeaders();

        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF");   // BOM นำหน้า ให้ Excel อ่านภาษาไทยได้
        fputcsv($out, [lang('Log.csv_time'), lang('Log.csv_user'), lang('Log.csv_role'), lang('Log.csv_action')]);

        (new ActivityLogModel())->chunkInRange($from, $to, self::EXPORT_CHUNK, function ($r) use ($out) {
            fputcsv($out, [
                $r['created_at'],
                $this->csvSafe($r['actor_name'] ?? '-'),
                role_labels()[$r['role']] ?? '-',
                $this->csvSafe(ActivityLogModel::renderMessage($r)),
            ]);
        }, $this->filters());

        fclose($out);
        exit;   // จบ response ตรงนี้ ไม่ให้อะไรมาต่อท้ายไฟล์ CSV
    }

    // กัน formula injection ใน Excel/Sheets - ค่าที่ขึ้นต้นด้วย = + - @ tab CR ให้นำหน้าด้วย '
    private function csvSafe(?string $value): string
    {
        $value = (string) $value;

        return preg_match('/^[=+\-@\t\r]/', $value) ? "'" . $value : $value;
    }

    /**
     * อ่านตัวกรองจาก query แล้วตรวจให้อยู่ในค่าที่อนุญาต
     * q = ชื่อผู้ใช้บางส่วน (ยาวสุด 150 เท่าคอลัมน์ actor_name) · role/type นอกลิสต์ถือว่าไม่กรอง
     */
    private function filters(): array
    {
        $role = (string) $this->request->getGet('role');
        $type = (string) $this->request->getGet('type');

        return [
            'q'    => mb_substr(trim((string) $this->request->getGet('q')), 0, 150),
            'role' => isset(role_labels()[$role]) ? $role : '',
            'type' => in_array($type, ActivityLogModel::ACTION_TYPES, true) ? $type : '',
        ];
    }

    // ตัวเลือกบทบาทของตัวกรอง - ป้ายชุดเดียวกับคอลัมน์บทบาทในตาราง
    private function roleOptions(): array
    {
        $out = [];
        foreach (role_labels() as $value => $label) {
            $out[] = ['value' => $value, 'label' => $label];
        }

        return $out;
    }

    // ตัวเลือกประเภทการกระทำของตัวกรอง
    private function typeOptions(): array
    {
        return array_map(
            static fn (string $t) => ['value' => $t, 'label' => lang("Log.type_{$t}")],
            ActivityLogModel::ACTION_TYPES
        );
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
