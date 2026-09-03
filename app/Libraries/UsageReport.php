<?php

namespace App\Libraries;

/**
 * เตรียมข้อมูลรายงานสรุปการใช้งานระบบจองรถให้พร้อมวาดลง PDF
 * แยกออกจาก controller เพราะเป็นการปั้นข้อมูลเพื่อแสดงผล ไม่ใช่การรับ request
 */
class UsageReport
{
    // จำนวนแถวในตาราง Top - ตามที่ดีไซน์กำหนด
    private const TOP_ROWS = 10;

    // แท่งสูงสุดในกราฟแผนก
    private const MAX_DEPTS = 10;

    // แท่งสูงสุดในกราฟรายเดือน - ช่องของแท่งต้องกว้างพอวางป้ายเดือนได้ทุกแท่ง
    private const MAX_MONTHS = 6;

    // สถานะที่นับเป็น "ปฏิเสธ/ยกเลิก" ในการ์ด KPI และโดนัท
    private const DROPPED = ['rejected', 'cancelled', 'cancel_requested'];

    // สีของกลุ่มสถานะ - ต้องตรงกับสีตัวเลขบนการ์ด KPI (.kpi--* ใน usage_pdf.php)
    private const STATUS_COLORS = [
        'completed' => '#1f9d55',
        'approved'  => '#b98900',
        'pending'   => '#d1680f',
        'dropped'   => '#c2405a',
    ];

    /**
     * ความกว้างกล่องกราฟ (px) ตามสัดส่วนการ์ดในเลย์เอาต์ของหน้านี้
     * หักขอบในของการ์ดออกแล้ว - เกินกว่านี้ mPDF จะดันคอลัมน์ตารางให้กว้างตาม
     */
    private const W_DONUT = 140;
    private const W_CHART = 372;

    // ความสูงกล่องกราฟแท่ง (px) - ทั้งหน้าต้องจบใน A4 หน้าเดียว
    private const H_CHART = 190;

    /**
     * ปั้นข้อมูลทั้งหมดที่หน้ารายงานต้องใช้
     * $rows = แถวจาก BookingModel::usageRows()
     */
    public static function build(array $rows): array
    {
        $total  = count($rows);
        $status = self::byStatus($rows);
        $types  = self::byType($rows);

        $byDept = self::countBy($rows, static fn ($b) => $b['dept_name'] ?: lang('Report.unspecified'));
        $depts  = array_map(
            static fn ($d) => ['label' => self::deptCode((string) $d['label']), 'value' => $d['value']],
            array_slice($byDept, 0, self::MAX_DEPTS)
        );

        $requesters = self::countRequesters($rows);
        $vehicles   = self::countVehicles($rows);

        $allMonths = self::byMonth($rows);
        $months    = array_slice($allMonths, -self::MAX_MONTHS);
        $trimmed   = count($months) < count($allMonths);

        return [
            'count' => $total,
            'kpis'  => self::kpis($status, $total),

            'statusDonut'  => ReportChart::donut($status, $total, lang('Report.center_total'), lang('Report.unit_items'), self::W_DONUT, 0),
            'statusLegend' => ReportChart::legend($status, $total, 0),
            'execNotes'    => self::execNotes($status, $total),

            'deptChart' => ReportChart::columns($depts, lang('Report.unit_items'), '', self::W_CHART, self::H_CHART, [
                'dec' => 0, 'avg' => false, 'wrap' => true, 'thaiLabel' => true,
            ]),
            'deptTitle' => self::deptTitle(count($byDept)),
            'deptNotes' => self::deptNotes($byDept, $total),

            'topRequesters' => self::rank($requesters, self::TOP_ROWS),
            'requesterNote' => self::requesterNote($requesters, $total),

            'topVehicles' => self::rank($vehicles, self::TOP_ROWS),
            'vehicleNote' => self::vehicleNote($vehicles),

            'typeDonut'  => ReportChart::donut($types, $total, lang('Report.center_total'), lang('Report.unit_items'), self::W_DONUT, 0),
            'typeLegend' => ReportChart::legend($types, $total, 0),
            'typeNote'   => self::typeNote($types, $total),

            'monthChart' => ReportChart::columns($months, lang('Report.unit_items'), '', self::W_CHART, self::H_CHART, [
                'dec' => 0, 'avg' => false,
            ]),
            'monthTitle' => self::monthTitle($trimmed, count($months)),
            'monthNote'  => self::monthNote($months),
        ];
    }

    /**
     * นับคำขอแยกตามสถานะ เรียงตามลำดับที่ดีไซน์วางไว้ (เสร็จสิ้น > อนุมัติ > รออนุมัติ > ปฏิเสธ)
     * ยอดทั้ง 4 ช่องบวกกันได้เท่าจำนวนคำขอทั้งหมด
     */
    private static function byStatus(array $rows): array
    {
        $c = ['completed' => 0, 'approved' => 0, 'pending' => 0, 'dropped' => 0];

        foreach ($rows as $b) {
            $s = (string) ($b['status'] ?? '');

            if (in_array($s, self::DROPPED, true)) {
                $c['dropped']++;
            } elseif (isset($c[$s])) {
                $c[$s]++;
            }
        }

        $out = [];

        foreach (['completed', 'approved', 'pending', 'dropped'] as $key) {
            $out[] = [
                'key'   => $key,
                'label' => lang('Report.ust_' . $key),
                'value' => $c[$key],
                'color' => self::STATUS_COLORS[$key],
            ];
        }

        return $out;
    }

    /** นับคำขอแยกตามประเภทรถ (ขับเอง / อื่น ๆ) */
    private static function byType(array $rows): array
    {
        $self = 0;

        foreach ($rows as $b) {
            if ((string) ($b['booking_type'] ?? '') === 'self') {
                $self++;
            }
        }

        return [
            ['label' => lang('Report.utype_self'),  'value' => $self],
            ['label' => lang('Report.utype_other'), 'value' => count($rows) - $self],
        ];
    }

    /** นับตาม key แล้วเรียงมากไปน้อย */
    private static function countBy(array $rows, callable $keyOf): array
    {
        $map = [];

        foreach ($rows as $b) {
            $k       = (string) ($keyOf($b) ?: '-');
            $map[$k] = ($map[$k] ?? 0) + 1;
        }

        $items = [];
        foreach ($map as $label => $value) {
            $items[] = ['label' => $label, 'value' => $value];
        }
        usort($items, static fn ($a, $b) => $b['value'] <=> $a['value']);

        return $items;
    }

    /**
     * ป้ายแกนของกราฟแผนก - ใช้รหัสย่อในวงเล็บท้ายชื่อ ชื่อเต็มลงไม่พอใน 10 ช่อง
     * ชื่อเต็มยังอยู่ในข้อสังเกตและคอลัมน์แผนกของตารางผู้ใช้งาน
     */
    private static function deptCode(string $name): string
    {
        return preg_match('/\(([^()]+)\)\s*$/u', $name, $m) === 1 ? $m[1] : $name;
    }

    /** นับตามผู้ขอ พร้อมชื่อแผนกของคนนั้น เรียงมากไปน้อย */
    private static function countRequesters(array $rows): array
    {
        $map = [];

        foreach ($rows as $b) {
            $k = (string) ($b['requester_name'] ?? '') ?: '-';

            $map[$k] = [
                'label' => $k,
                'dept'  => (string) ($b['dept_name'] ?? ''),
                'value' => ($map[$k]['value'] ?? 0) + 1,
            ];
        }

        $items = array_values($map);
        usort($items, static fn ($a, $b) => $b['value'] <=> $a['value']);

        return $items;
    }

    /**
     * นับตามรถที่ใช้ - รถของบริษัทนับเป็นทะเบียน คนขับภายนอกนับเป็นชื่อผู้ให้บริการ
     * รวมประเภทไว้ในคีย์ด้วย รถคันเดียวที่ถูกจองทั้ง 2 ประเภทจึงไม่ปนกันในแถวเดียว
     */
    private static function countVehicles(array $rows): array
    {
        $map = [];

        foreach ($rows as $b) {
            $type  = (string) ($b['booking_type'] ?? '') === 'self' ? 'self' : 'other';
            $plate = (string) ($b['car_plate'] ?? '');
            $model = (string) ($b['car_model'] ?? '');

            if ($plate !== '' || $model !== '') {
                $name = $plate !== '' ? trim($model . ' (' . $plate . ')') : $model;
            } else {
                $name = (string) ($b['ext_driver_name'] ?? '') ?: '-';
            }

            $k = $type . '|' . $name;

            $map[$k] = [
                'label' => $name,
                'type'  => $type === 'self' ? lang('Report.utype_self') : lang('Report.utype_other'),
                'value' => ($map[$k]['value'] ?? 0) + 1,
            ];
        }

        $items = array_values($map);
        usort($items, static fn ($a, $b) => $b['value'] <=> $a['value']);

        return $items;
    }

    /** นับคำขอรายเดือน เรียงตามเดือน + อัตราเปลี่ยนแปลงเทียบเดือนก่อน */
    private static function byMonth(array $rows): array
    {
        $map = [];

        foreach ($rows as $b) {
            $m = substr((string) ($b['start_at'] ?? ''), 0, 7);

            if ($m === '') {
                continue;
            }

            $map[$m] = ($map[$m] ?? 0) + 1;
        }

        ksort($map);

        $items = [];
        $prev  = null;

        foreach ($map as $month => $value) {
            $items[] = [
                'label' => thai_month($month),
                'value' => $value,
                'pct'   => self::changeLabel($prev, $value),
            ];
            $prev = $value;
        }

        return $items;
    }

    /** ป้ายอัตราเปลี่ยนแปลง - เดือนแรกไม่มีฐานเทียบ คืนขีด */
    private static function changeLabel(?int $prev, int $now): string
    {
        if ($prev === null) {
            return '-';
        }

        if ($prev === 0) {
            return $now > 0 ? '+100.0%' : '0.0%';
        }

        $diff = ($now - $prev) / $prev * 100;

        return ($diff > 0 ? '+' : '') . number_format($diff, 1) . '%';
    }

    /** ตัดเหลือ N อันดับแรกพร้อมเลขอันดับ */
    private static function rank(array $items, int $n): array
    {
        $out = [];

        foreach (array_slice($items, 0, $n) as $i => $it) {
            $out[] = $it + ['rank' => $i + 1];
        }

        return $out;
    }

    /** การ์ดตัวเลข 5 ช่องบนหัวรายงาน - ช่องแรกเป็นยอดรวม ที่เหลือมีสัดส่วนกำกับ */
    private static function kpis(array $status, int $total): array
    {
        $cards = [[
            'label' => lang('Report.ukpi_total'),
            'value' => number_format($total),
            'pct'   => '',
            'tone'  => 'ink',
        ]];

        $tones = ['completed' => 'green', 'approved' => 'amber', 'pending' => 'orange', 'dropped' => 'red'];

        foreach ($status as $s) {
            $cards[] = [
                'label' => $s['label'],
                'value' => number_format($s['value']),
                'pct'   => number_format($total > 0 ? $s['value'] / $total * 100 : 0, 1),
                'tone'  => $tones[$s['key']],
            ];
        }

        return $cards;
    }

    /** หัวกราฟแผนก - บอกให้ชัดถ้าแสดงไม่ครบทุกแผนก */
    private static function deptTitle(int $all): string
    {
        return $all > self::MAX_DEPTS
            ? lang('Report.uchart_dept_top', ['n' => self::MAX_DEPTS])
            : lang('Report.uchart_dept');
    }

    /** หัวกราฟรายเดือน - บอกให้ชัดถ้าแสดงไม่ครบทุกเดือนในช่วงที่เลือก */
    private static function monthTitle(bool $trimmed, int $shown): string
    {
        return $trimmed
            ? lang('Report.uchart_month_recent', ['n' => $shown])
            : lang('Report.uchart_month');
    }

    /** สัดส่วนของสถานะหนึ่งเป็นสตริงพร้อมแสดง */
    private static function pctOf(array $status, string $key, int $total): string
    {
        foreach ($status as $s) {
            if ($s['key'] === $key) {
                return number_format($total > 0 ? $s['value'] / $total * 100 : 0, 1);
            }
        }

        return '0.0';
    }

    /** จำนวนของสถานะหนึ่ง */
    private static function countOf(array $status, string $key): int
    {
        foreach ($status as $s) {
            if ($s['key'] === $key) {
                return (int) $s['value'];
            }
        }

        return 0;
    }

    /**
     * ข้อสังเกตของผู้บริหาร 3 ข้อ - คืนเป็น HTML เพราะตัวเลขต้องใช้ฟอนต์ Pdf::FONT_NUM
     * ค่าที่มาจากฐานข้อมูลผ่าน esc() แล้ว ตัวประโยคมาจากไฟล์ภาษา
     */
    private static function execNotes(array $status, int $total): array
    {
        return [
            lang('Report.unote_done', ['pct' => Pdf::num(self::pctOf($status, 'completed', $total))]),
            lang('Report.unote_dropped', ['pct' => Pdf::num(self::pctOf($status, 'dropped', $total))]),
            lang('Report.unote_pending', ['n' => Pdf::num(number_format(self::countOf($status, 'pending')))]),
        ];
    }

    /** ข้อสังเกตของกราฟแผนก */
    private static function deptNotes(array $byDept, int $total): array
    {
        $top = $byDept[0] ?? ['label' => '-', 'value' => 0];

        return [
            lang('Report.unote_dept_top', [
                'who' => esc((string) $top['label']),
                'pct' => Pdf::num(number_format($total > 0 ? $top['value'] / $total * 100 : 0, 1)),
            ]),
            lang('Report.unote_dept_count', ['n' => Pdf::num(number_format(count($byDept)))]),
        ];
    }

    /** ข้อสังเกตของตารางผู้ใช้งาน - สัดส่วนของ 3 อันดับแรก */
    private static function requesterNote(array $items, int $total): array
    {
        $top3 = array_sum(array_column(array_slice($items, 0, 3), 'value'));

        return [
            lang('Report.unote_req_top3', [
                'pct' => Pdf::num(number_format($total > 0 ? $top3 / $total * 100 : 0, 1)),
            ]),
            esc(lang('Report.unote_req_advice')),
        ];
    }

    /** ข้อสังเกตของตารางรถ */
    private static function vehicleNote(array $items): array
    {
        $top = $items[0] ?? ['label' => '-', 'value' => 0];

        return [
            lang('Report.unote_veh_top', [
                'name' => esc((string) $top['label']),
                'n'    => Pdf::num(number_format($top['value'])),
            ]),
            esc(lang('Report.unote_veh_advice')),
        ];
    }

    /** ข้อสังเกตของโดนัทประเภทการใช้งาน */
    private static function typeNote(array $types, int $total): array
    {
        return [
            lang('Report.unote_type', [
                'self'  => Pdf::num(number_format($total > 0 ? $types[0]['value'] / $total * 100 : 0, 1)),
                'other' => Pdf::num(number_format($total > 0 ? $types[1]['value'] / $total * 100 : 0, 1)),
            ]),
        ];
    }

    /** ข้อสังเกตของกราฟรายเดือน - เดือนที่จองสูงสุดในชุดที่แสดง */
    private static function monthNote(array $months): array
    {
        $best = $months[0] ?? ['label' => '-', 'value' => 0];

        foreach ($months as $m) {
            if ($m['value'] > $best['value']) {
                $best = $m;
            }
        }

        return [
            lang('Report.unote_month_peak', [
                'month' => Pdf::num(esc((string) $best['label'])),
                'n'     => Pdf::num(number_format($best['value'])),
            ]),
            esc(lang('Report.unote_month_advice')),
        ];
    }
}
