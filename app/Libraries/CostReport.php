<?php

namespace App\Libraries;


/**
 * เตรียมข้อมูลรายงานค่าใช้จ่ายคนขับภายนอกให้พร้อมวาดลง PDF
 * แยกออกจาก controller เพราะเป็นการปั้นข้อมูลเพื่อแสดงผล ไม่ใช่การรับ request
 */
class CostReport
{
    // จำนวนหมวดสูงสุดในกราฟ ที่เหลือยุบเป็น "อื่น ๆ"
    private const TOP_N = 6;

    // จุดสูงสุดบนกราฟแบบรายวัน เกินกว่านี้เปลี่ยนไปรวมยอดรายเดือน
    private const MAX_DAY_POINTS = 24;

    // แท่งสูงสุดบนกราฟรายเดือน - เกินกว่านี้แสดงเฉพาะเดือนล่าสุด ตัวเลขบนแท่งจึงยังอ่านออก
    private const MAX_MONTH_POINTS = 12;

    /**
     * ปั้นข้อมูลทั้งหมดที่หน้ารายงานต้องใช้
     * $rows = แถวจาก BookingModel::externalCostRows() · $summary = ['total','jobs','avg']
     */
    public static function build(array $rows, array $summary): array
    {
        $total    = (float) ($summary['total'] ?? 0);
        $byDept   = self::groupSum($rows, static fn ($b) => $b['requester_name'] ?? '');
        $byDriver = self::groupSum($rows, static fn ($b) => $b['ext_driver_name'] ?? '');
        $byDay    = self::byDay($rows);

        $deptTop   = self::topN($byDept);
        $driverTop = self::topN($byDriver);

        $top    = self::maxRow($rows);
        $topDay = self::maxItem($byDay);

        // ช่วงยาว ๆ แท่งรายวันจะเบียดกันจนอ่านไม่ออก - รวมเป็นรายเดือน และตัดเหลือเดือนล่าสุด
        $daily   = count($byDay) <= self::MAX_DAY_POINTS;
        $months  = $daily ? [] : self::byMonth($rows);
        $series  = $daily ? $byDay : array_slice($months, -self::MAX_MONTH_POINTS);
        $trimmed = ! $daily && count($series) < count($months);

        return [
            'total'  => $total,
            'kpis'   => self::kpis($rows, $summary, $total, $top, count($byDay)),
            'donut'  => ReportChart::donut($deptTop, $total, lang('Report.center_total'), lang('Report.baht')),
            'legend' => self::legend($deptTop, $total),
            'bars'   => ReportChart::bars($driverTop, $total, lang('Report.baht')),
            'timeChart' => ReportChart::columns($series, lang('Report.baht'), lang('Report.chart_avg')),
            'timeTitle' => self::timeTitle($daily, $trimmed, count($series)),
            'notes'     => self::notes($byDept, $byDay, $total, $top, $topDay),
        ];
    }

    /** รวมยอดตาม key แล้วเรียงมากไปน้อย */
    private static function groupSum(array $rows, callable $keyOf): array
    {
        $map = [];

        foreach ($rows as $b) {
            $k = $keyOf($b) ?: '-';
            $map[$k] = ($map[$k] ?? 0) + (float) ($b['ext_driver_cost'] ?? 0);
        }

        $items = [];
        foreach ($map as $label => $value) {
            $items[] = ['label' => (string) $label, 'value' => $value];
        }
        usort($items, static fn ($a, $b) => $b['value'] <=> $a['value']);

        return $items;
    }

    /** รวมยอดรายวัน เรียงตามวัน ป้ายเป็นรูปแบบ DD-MM-YYYY */
    private static function byDay(array $rows): array
    {
        $map = [];

        foreach ($rows as $b) {
            $d = substr((string) ($b['start_at'] ?? ''), 0, 10);
            $map[$d] = ($map[$d] ?? 0) + (float) ($b['ext_driver_cost'] ?? 0);
        }

        ksort($map);

        $items = [];
        foreach ($map as $day => $value) {
            $items[] = ['label' => thai_date($day), 'value' => $value];
        }

        return $items;
    }

    /** หัวกราฟช่วงเวลา - บอกให้ชัดถ้าแสดงไม่ครบทุกเดือนในช่วงที่เลือก */
    private static function timeTitle(bool $daily, bool $trimmed, int $shown): string
    {
        if ($daily) {
            return lang('Report.chart_by_day');
        }

        return $trimmed
            ? lang('Report.chart_by_month_recent', ['n' => $shown])
            : lang('Report.chart_by_month');
    }

    /** รวมยอดรายเดือน เรียงตามเดือน ป้ายเป็นรูปแบบ MM-YYYY - แสดงเฉพาะเดือนที่มีการจ้าง */
    private static function byMonth(array $rows): array
    {
        $map = [];

        foreach ($rows as $b) {
            $m = substr((string) ($b['start_at'] ?? ''), 0, 7);

            if ($m === '') {
                continue;
            }

            $map[$m] = ($map[$m] ?? 0) + (float) ($b['ext_driver_cost'] ?? 0);
        }

        ksort($map);

        $items = [];
        foreach ($map as $month => $value) {
            $items[] = ['label' => thai_month($month), 'value' => $value];
        }

        return $items;
    }

    /** ยุบหมวดที่เกิน TOP_N เป็น "อื่น ๆ" ให้กราฟอ่านออก */
    private static function topN(array $items): array
    {
        if (count($items) <= self::TOP_N) {
            return $items;
        }

        $rest = array_sum(array_column(array_slice($items, self::TOP_N), 'value'));

        return array_merge(
            array_slice($items, 0, self::TOP_N),
            [['label' => lang('Report.others'), 'value' => $rest]]
        );
    }

    /** แถวที่จ่ายแพงที่สุด */
    private static function maxRow(array $rows): array
    {
        $best = $rows[0] ?? [];

        foreach ($rows as $b) {
            if ((float) ($b['ext_driver_cost'] ?? 0) > (float) ($best['ext_driver_cost'] ?? 0)) {
                $best = $b;
            }
        }

        return $best;
    }

    /** รายการที่ยอดสูงสุดในชุด [label, value] */
    private static function maxItem(array $items): array
    {
        $best = $items[0] ?? ['label' => '-', 'value' => 0];

        foreach ($items as $it) {
            if ($it['value'] > $best['value']) {
                $best = $it;
            }
        }

        return $best;
    }

    /** ตัวเลข 5 ช่องบนหัวรายงาน */
    private static function kpis(array $rows, array $summary, float $total, array $top, int $days): array
    {
        $count = (int) ($summary['jobs'] ?? count($rows));
        $avg   = $summary['avg'] ?? ($count > 0 ? $total / $count : 0);

        return [
            ['label' => lang('Report.kpi_total'), 'value' => number_format($total, 2),                       'unit' => lang('Report.baht')],
            ['label' => lang('Report.kpi_count'), 'value' => number_format($count),                          'unit' => lang('Report.unit_items')],
            ['label' => lang('Report.kpi_avg'),   'value' => number_format((float) $avg, 2),                 'unit' => lang('Report.baht')],
            ['label' => lang('Report.kpi_max'),   'value' => number_format((float) ($top['ext_driver_cost'] ?? 0), 2), 'unit' => lang('Report.baht')],
            ['label' => lang('Report.kpi_days'),  'value' => number_format($days),                           'unit' => lang('Report.unit_days')],
        ];
    }

    /** คำอธิบายสีข้างโดนัท */
    private static function legend(array $items, float $total): array
    {
        $out = [];

        foreach ($items as $i => $it) {
            $out[] = [
                'color' => ReportChart::color($i),
                'label' => $it['label'],
                'value' => number_format($it['value'], 2),
                'pct'   => number_format($total > 0 ? $it['value'] / $total * 100 : 0, 1),
            ];
        }

        return $out;
    }

    /**
     * ข้อสังเกต 3 ข้อ ประกอบจากข้อมูลจริง - คืนเป็น HTML เพราะตัวเลขต้องใช้ฟอนต์ Pdf::FONT_NUM
     * ค่าที่มาจากฐานข้อมูลผ่าน esc() แล้ว ตัวประโยคมาจากไฟล์ภาษา
     */
    private static function notes(array $byDept, array $byDay, float $total, array $top, array $topDay): array
    {
        return [
            lang('Report.note_share', [
                'pct'    => Pdf::num(number_format($total > 0 ? ($byDept[0]['value'] ?? 0) / $total * 100 : 0, 1)),
                'who'    => esc($byDept[0]['label'] ?? '-'),
                'code'   => Pdf::num(esc($top['booking_code'] ?? '-')),
                'amount' => Pdf::num(number_format((float) ($top['ext_driver_cost'] ?? 0), 2)),
            ]),
            lang('Report.note_days', [
                'n'    => Pdf::num((string) count($byDay)),
                'date' => Pdf::num(esc($topDay['label'])),
            ]),
            esc(lang('Report.note_advice')),
        ];
    }
}
