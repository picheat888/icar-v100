<?php

namespace App\Libraries;

/**
 * กราฟ SVG สำหรับรายงาน PDF - เขียนเป็นสตริงให้ mPDF วาด (mPDF อ่าน SVG ได้ตรง ๆ)
 * ข้อความที่เป็นตัวเลขต้องใช้ฟอนต์ Pdf::FONT_NUM ไม่งั้นจุดทศนิยมจะกลายเป็นกล่องว่าง
 */
class ReportChart
{
    /**
     * ความกว้างสูงสุดของกล่องกราฟ (px) ในการ์ดแต่ละขนาดบนหน้า A4 แนวตั้ง
     * ห้ามเกินค่านี้ - mPDF จะไปดันคอลัมน์ตารางให้กว้างตาม สัดส่วนการ์ดจะเพี้ยน
     * การจัดกึ่งกลางต้องใช้ align="center" บน td เท่านั้น (div align / text-align ไม่มีผล)
     */
    public const BOX_HALF = 320;  // การ์ดครึ่งหน้า (49% ของ 190mm)
    public const BOX_FULL = 688;  // การ์ดเต็มความกว้าง

    /** จานสีหมวดหมู่ - แยกด้วยเฉดสี ไม่ใช่ความเข้ม */
    public const COLORS = ['#0f8a86', '#2b4a9b', '#e8721f', '#f0bf27', '#8b5fbf', '#4a8fd4', '#c2537a', '#5aa668'];

    public static function color(int $i): string
    {
        return self::COLORS[$i % count(self::COLORS)];
    }

    /** ตัวเลขเงิน 2 ตำแหน่ง คั่นหลักพัน */
    private static function money(float $n): string
    {
        return number_format($n, 2);
    }

    /** ตัวเลขจำนวนเต็มสำหรับแกน */
    private static function axisNum(float $n): string
    {
        return number_format(round($n));
    }

    private static function esc(string $v): string
    {
        return htmlspecialchars($v, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    /**
     * ขั้นแกนที่อ่านง่าย - เป็น 1/2/5 คูณเลขยกกำลังสิบเท่านั้น
     * เลือกตัวที่ใกล้ค่าที่ต้องการที่สุด โดยวัดระยะในสเกล log (จุดตัดคือ sqrt(2), sqrt(10), sqrt(50))
     * ถ้าปัดขึ้นเสมอ ค่าที่เกิน 1 มานิดเดียวจะกระโดดเป็น 2 ทำให้เส้นแกนห่างเกินจริงเท่าตัว
     */
    private static function niceStep(float $max, int $ticks = 3): float
    {
        $raw  = max($max, 1) / $ticks;
        $mag  = pow(10, floor(log10($raw)));
        $norm = $raw / $mag;

        $mult = $norm >= sqrt(50) ? 10 : ($norm >= sqrt(10) ? 5 : ($norm >= sqrt(2) ? 2 : 1));

        return $mult * $mag;
    }

    /** จุดบนวงกลมที่สัดส่วน $f ของรอบ - 0 คือ 12 นาฬิกา เดินตามเข็ม */
    private static function onArc(float $f, float $cx, float $cy, float $r): array
    {
        $a = $f * 2 * M_PI - M_PI / 2;

        return [$cx + cos($a) * $r, $cy + sin($a) * $r];
    }

    /** จำนวนอักขระที่กินความกว้างจริง - สระบน/ล่างและวรรณยุกต์ไทยไม่นับ */
    private static function advChars(string $text): int
    {
        return mb_strlen((string) preg_replace('/[\x{0E31}\x{0E34}-\x{0E3A}\x{0E47}-\x{0E4E}]/u', '', $text));
    }

    /** ความกว้างข้อความโดยประมาณ (px) */
    private static function textWidth(string $text, float $fontSize): float
    {
        return self::advChars($text) * $fontSize * 0.55;
    }

    /**
     * ความกว้างคอลัมน์ชื่อโดยประมาณ - สระบน/ล่างและวรรณยุกต์ไทยไม่กินความกว้าง ตัดออกก่อนนับ
     * ตั้งตายตัวเป็น % ของกราฟไม่ได้ ชื่อสั้นจะเหลือที่ว่างด้านซ้ายจนกราฟดูเบี้ยว
     */
    private static function labelGutter(array $items, float $fontSize): float
    {
        $chars = 0;

        foreach ($items as $it) {
            $chars = max($chars, self::advChars((string) $it['label']));
        }

        return $chars * $fontSize * 0.47 + 24;
    }

    /** เปิด/ปิดแท็ก svg */
    private static function wrap(int $w, int $h, string $body): string
    {
        return '<svg width="' . $w . '" height="' . $h . '" viewBox="0 0 ' . $w . ' ' . $h
            . '" xmlns="http://www.w3.org/2000/svg">' . $body . '</svg>';
    }

    /**
     * โดนัท - คืนแต่ห่วงและยอดกลาง (คำอธิบายสีทำเป็น HTML ในหน้ารายงาน)
     * $items = [['label' => .., 'value' => ..], ...] เรียงมากไปน้อยแล้ว
     */
    public static function donut(array $items, float $total, string $centerLabel, string $unit, int $w = 276): string
    {
        $cx = $w / 2;
        $cy = $w / 2;
        $r  = $w * 0.33;
        $sw = $w * 0.16;
        $fs = $w * 0.038;

        // วาดห่วงให้ครบก่อน แล้วค่อยวาดป้าย - ห่วงชิ้นถัดไปทับป้ายของชิ้นก่อนหน้า
        $arcs   = '';
        $labels = '';
        $offset = 0.0;

        foreach ($items as $i => $it) {
            $frac = $total > 0 ? $it['value'] / $total : 0;
            $end  = $offset + $frac;

            if ($frac >= 0.9999) {
                // ชิ้นเดียวเต็มวง - เส้นโค้งหัวจรดท้ายวาดไม่ได้ ใช้วงกลมแทน
                $arcs .= sprintf(
                    '<circle cx="%.2f" cy="%.2f" r="%.2f" fill="none" stroke="%s" stroke-width="%.1f"/>',
                    $cx, $cy, $r, self::color($i), $sw
                );
            } elseif ($frac > 0) {
                [$x0, $y0] = self::onArc($offset, $cx, $cy, $r);
                [$x1, $y1] = self::onArc($end, $cx, $cy, $r);

                $arcs .= sprintf(
                    '<path d="M %.2f %.2f A %.2f %.2f 0 %d 1 %.2f %.2f" fill="none" stroke="%s" stroke-width="%.1f"/>',
                    $x0, $y0, $r, $r, $frac > 0.5 ? 1 : 0, $x1, $y1, self::color($i), $sw
                );
            }

            // ป้าย % กลางส่วนโค้ง - วางเฉพาะชิ้นที่กว้างพอจะอ่านออก
            if ($frac >= 0.04) {
                [$lx, $ly] = self::onArc($offset + $frac / 2, $cx, $cy, $r);
                $labels .= sprintf(
                    '<text x="%.2f" y="%.2f" text-anchor="middle" font-size="%.1f" font-weight="700"'
                    . ' font-family="%s" fill="#ffffff">%s%%</text>',
                    $lx, $ly + $fs * 0.35, $fs, Pdf::FONT_NUM, number_format($frac * 100, 1)
                );
            }

            $offset = $end;
        }

        $labels .= sprintf(
            '<text x="%.1f" y="%.1f" text-anchor="middle" font-size="%.1f" fill="#7a8794">%s</text>'
            . '<text x="%.1f" y="%.1f" text-anchor="middle" font-size="%.1f" font-weight="700" font-family="%s" fill="#1f2a33">%s</text>'
            . '<text x="%.1f" y="%.1f" text-anchor="middle" font-size="%.1f" fill="#7a8794">%s</text>',
            $cx, $cy - $fs * 1.3, $fs * 0.8, self::esc($centerLabel),
            $cx, $cy + $fs * 0.5, $fs * 1.3, Pdf::FONT_NUM, self::money($total),
            $cx, $cy + $fs * 1.9, $fs * 0.75, self::esc($unit)
        );

        return self::wrap($w, $w, $arcs . $labels);
    }

    /**
     * แท่งแนวนอน + แกนล่าง
     * $items เรียงมากไปน้อยแล้ว
     */
    public static function bars(array $items, float $total, string $unit, int $w = self::BOX_HALF): string
    {
        $n    = max(count($items), 1);
        $left = min($w * 0.42, max(46, self::labelGutter($items, 8.5)));
        // ยืดความสูงแถวให้กราฟสูงราว 355px ไม่ว่าจะมีกี่แท่ง (คุมด้วยเพดาน/พื้น)
        $row  = (int) round(min(96, max(34, 355 / $n)));
        $h    = count($items) * $row + 34;
        $max  = max(array_column($items, 'value') ?: [1]);
        $step = self::niceStep($max, 4);
        $axis = ceil($max / $step) * $step;
        $plot = $w - $left - 42;

        $body = '';

        $marks = [];
        for ($v = 0; $v <= $axis + 0.001; $v += $step) {
            $marks[] = $v;
        }

        // ป้ายกว้างราวจำนวนหลัก x 4.6px - เว้นป้ายตามที่แกนรับไหว นับถอยจากขั้นสุดท้าย
        $labelW = strlen(self::axisNum($axis)) * 4.6 + 10;
        $fits   = max(2, (int) floor($plot / $labelW));
        $every  = max(1, (int) ceil(count($marks) / $fits));

        // เส้นตารางและตัวเลขแกน
        foreach ($marks as $k => $v) {
            $x = $left + ($v / $axis) * $plot;
            $body .= sprintf(
                '<line x1="%.1f" y1="4" x2="%.1f" y2="%.1f" stroke="#eceff1" stroke-width="1"/>',
                $x, $x, count($items) * $row + 4
            );

            if ((count($marks) - 1 - $k) % $every !== 0) {
                continue;
            }

            $body .= sprintf(
                '<text x="%.1f" y="%.1f" text-anchor="middle" font-size="8" font-family="%s" fill="#9aa7b2">%s</text>',
                $x, count($items) * $row + 18, Pdf::FONT_NUM, self::axisNum($v)
            );
        }

        foreach ($items as $i => $it) {
            $y   = $i * $row + 4;
            $bh  = min(46, $row - 16);
            $bw  = max(($it['value'] / $axis) * $plot, 1.5);
            $pct = $total > 0 ? number_format($it['value'] / $total * 100, 1) : '0.0';

            $body .= sprintf(
                '<text x="%.1f" y="%.1f" text-anchor="end" font-size="8.5" fill="#54616c">%s</text>'
                . '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s"/>'
                . '<text x="%.1f" y="%.1f" font-size="8.5" font-weight="700" font-family="%s" fill="#37434d">%s</text>'
                . '<text x="%.1f" y="%.1f" font-size="7.5" font-family="%s" fill="#9aa7b2">(%s%%)</text>',
                $left - 7, $y + $row / 2 + 3, self::esc($it['label']),
                $left, $y + ($row - $bh) / 2 - 2, $bw, $bh, self::color($i),
                $left + $bw + 6, $y + $row / 2 - 2, Pdf::FONT_NUM, self::money($it['value']),
                $left + $bw + 6, $y + $row / 2 + 8, Pdf::FONT_NUM, $pct
            );
        }

        $body .= sprintf(
            '<text x="%.1f" y="%.1f" text-anchor="middle" font-size="7.5" fill="#9aa7b2">%s</text>',
            $left + $plot / 2, $h - 3, self::esc($unit)
        );

        return self::wrap($w, (int) $h, $body);
    }

    /**
     * แท่งตั้งตามช่วงเวลา - ยอดรวมของแต่ละเดือน/วันเป็นก้อนแยกกัน ไม่ได้ไหลต่อเนื่องกัน
     * ใช้แท่งไม่ใช้เส้น เพราะเส้นทำให้เข้าใจผิดว่าค่าระหว่างจุดมีความหมาย
     * $items เรียงตามเวลาแล้ว label = ช่วงเวลาที่จัดรูปแบบพร้อมแสดง
     */
    public static function columns(array $items, string $unit, string $avgLabel, int $w = self::BOX_FULL, int $h = 370): string
    {
        $l  = 52;
        $rr = 14;
        $t  = 26;
        $b  = 34;

        $max  = max(array_column($items, 'value') ?: [1]);
        $step = self::niceStep($max, 4);
        $axis = ceil($max / $step) * $step;
        $pw   = $w - $l - $rr;
        $ph   = $h - $t - $b;
        $n    = max(count($items), 1);

        $slot = $pw / $n;
        $bw   = max(3.0, min(44.0, $slot * 0.6));
        $cx   = static fn (int $i) => $l + $slot * ($i + 0.5);
        $y    = static fn (float $v) => $t + $ph - ($v / $axis) * $ph;

        $body = '';

        // เส้นตารางและตัวเลขแกนตั้ง - ข้ามเส้นที่ระดับ 0 เพราะซ้ำกับเส้นฐานที่วาดทีหลัง
        for ($v = 0; $v <= $axis + 0.001; $v += $step) {
            if ($v > 0) {
                $body .= sprintf(
                    '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#eceff1" stroke-width="1"/>',
                    $l, $y($v), $w - $rr, $y($v)
                );
            }

            $body .= sprintf(
                '<text x="%.1f" y="%.1f" text-anchor="end" font-size="8" font-family="%s" fill="#9aa7b2">%s</text>',
                $l - 6, $y($v) + 3, Pdf::FONT_NUM, self::axisNum($v)
            );
        }

        // เส้นอ้างอิงค่าเฉลี่ย - บอกได้ทันทีว่าช่วงไหนสูง/ต่ำกว่าปกติ (เส้นตารางเปล่า ๆ บอกแค่สเกล)
        // วาดก่อนแท่ง เส้นจึงอยู่ข้างหลัง ไม่พาดทับตัวเลขของแท่งที่สูงใกล้ค่าเฉลี่ย
        $avg = array_sum(array_column($items, 'value')) / $n;
        $ay  = $y($avg);

        if ($avg > 0) {
            $body .= sprintf(
                '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#e8721f" stroke-width="1.2" stroke-dasharray="5 3"/>',
                $l, $ay, $w - $rr, $ay
            );
        }

        // ป้ายช่วงเวลาเว้นระยะเท่ากัน นับถอยจากแท่งสุดท้าย
        // เกณฑ์มาจากความกว้างป้ายจริง - ป้ายรายเดือน (11-2025) แคบกว่ารายวัน (30-06-2026)
        $labelW = 0.0;

        foreach ($items as $it) {
            $labelW = max($labelW, self::textWidth((string) $it['label'], 8));
        }

        $every = max(1, (int) ceil($n / max(2, (int) floor($pw / ($labelW + 8)))));

        // ป้ายจำนวนเงินแคบกว่าป้ายวันที่ ใช้เกณฑ์ของตัวเอง - แคบกว่านี้ค่อยหมุน 90 องศา
        $fs     = 7.5;
        $rotate = $slot < 46;

        foreach ($items as $i => $it) {
            $bh = ($it['value'] / $axis) * $ph;

            if ($it['value'] > 0) {
                $bh = max($bh, 1.0);   // ยอดน้อยมากก็ต้องยังเห็นแท่ง
            }

            $top = $t + $ph - $bh;

            $body .= sprintf(
                '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#0f8a86"/>',
                $cx($i) - $bw / 2, $top, $bw, $bh
            );

            $money = self::money($it['value']);

            if ($rotate) {
                // ป้ายยาวเท่าไรวัดจากจำนวนหลัก - ถ้าเหนือแท่งไม่พอ ย้ายไปไว้ในแท่งเป็นตัวขาว
                $len    = mb_strlen($money) * $fs * 0.58;
                $inside = ($top - 6 - $len) < $t;
                $ly     = $inside ? $t + $ph - 6 : $top - 6;

                $body .= sprintf(
                    '<text x="%1$.1f" y="%2$.1f" text-anchor="start" font-size="%3$.1f" font-weight="700"'
                    . ' font-family="%4$s" fill="%5$s" transform="rotate(-90 %1$.1f %2$.1f)">%6$s</text>',
                    $cx($i) + $fs * 0.35, $ly, $fs, Pdf::FONT_NUM, $inside ? '#ffffff' : '#37434d', $money
                );
            } else {
                $body .= sprintf(
                    '<text x="%.1f" y="%.1f" text-anchor="middle" font-size="%.1f" font-weight="700" font-family="%s" fill="#37434d">%s</text>',
                    $cx($i), $top - 5, $fs, Pdf::FONT_NUM, $money
                );
            }

            if (($n - 1 - $i) % $every === 0) {
                $body .= sprintf(
                    '<text x="%.1f" y="%.1f" text-anchor="middle" font-size="8" font-family="%s" fill="#9aa7b2">%s</text>',
                    $cx($i), $t + $ph + 16, Pdf::FONT_NUM, self::esc($it['label'])
                );
            }
        }

        // ป้ายกำกับเส้นเฉลี่ย - วาดหลังสุดพร้อมรองพื้นขาว จะได้อ่านออกไม่ว่ามีอะไรอยู่ข้างหลัง
        if ($avg > 0) {
            $money = self::money($avg);
            $lw    = self::textWidth($avgLabel, 7.5);

            $body .= sprintf(
                '<rect x="%.1f" y="%.1f" width="%.1f" height="11" fill="#ffffff" fill-opacity="0.88"/>'
                . '<text x="%.1f" y="%.1f" font-size="7.5" font-weight="700" fill="#c2600f">%s</text>'
                . '<text x="%.1f" y="%.1f" font-size="7.5" font-weight="700" font-family="%s" fill="#c2600f">%s</text>',
                $l + 3, $ay - 13, $lw + self::textWidth($money, 7.5) + 14,
                $l + 7, $ay - 4.5, self::esc($avgLabel),
                $l + 7 + $lw + 5, $ay - 4.5, Pdf::FONT_NUM, $money
            );
        }

        $body .= sprintf(
            '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#cfd6db" stroke-width="1"/>'
            . '<text x="2" y="%.1f" font-size="8" fill="#9aa7b2">%s</text>',
            $l, $t + $ph, $w - $rr, $t + $ph,
            $t - 8, self::esc($unit)
        );

        return self::wrap($w, $h, $body);
    }
}
