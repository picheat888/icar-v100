<?php

namespace App\Libraries;

use Mpdf\Config\ConfigVariables;
use Mpdf\Config\FontVariables;
use Mpdf\Mpdf;

/**
 * ตัวสร้าง mPDF ที่ตั้งค่าฟอนต์ไทยไว้แล้ว - ใช้ร่วมกันทุกรายงาน
 */
class Pdf
{
    // ฟอนต์ไทยของแบรนด์ - ใช้ชื่อนี้ใน CSS ของ view
    public const FONT = 'sarabun';

    // ฟอนต์ตัวเลข/ละติน - ไฟล์เดียวกับ FONT แต่ปิด OTL
    // mPDF แทรก U+200B หลังจุดทศนิยมทุกครั้งที่ใช้ shaper ไทย ซึ่ง Sarabun ไม่มี glyph
    public const FONT_NUM = 'sarabunnum';

    /**
     * ครอบตัวเลข/วันที่ด้วยฟอนต์ที่ปิด OTL - ใช้กับทุกค่าที่มีจุดทศนิยม
     */
    public static function num(string $v): string
    {
        return '<span class="num">' . $v . '</span>';
    }

    /**
     * สร้าง mPDF พร้อมฟอนต์ Sarabun
     * $opts ทับค่าเริ่มต้นได้ (เช่น format, margin)
     */
    public static function make(array $opts = []): Mpdf
    {
        $fontDir = FCPATH . 'assets/fonts';
        $tempDir = WRITEPATH . 'cache/mpdf';

        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0777, true);
        }

        return new Mpdf(array_merge([
            'mode'             => 'utf-8',
            'format'           => 'A4',
            'margin_left'      => 10,
            'margin_right'     => 10,
            'margin_top'       => 10,
            'margin_bottom'    => 17,
            'margin_footer'    => 8,
            'tempDir'          => $tempDir,
            'fontDir'          => array_merge((new ConfigVariables())->getDefaults()['fontDir'], [$fontDir]),
            'fontdata'         => (new FontVariables())->getDefaults()['fontdata'] + [
                self::FONT => [
                    'R'      => 'Sarabun-Regular.ttf',
                    'B'      => 'Sarabun-Bold.ttf',
                    'useOTL' => 0xFF,
                ],
                self::FONT_NUM => [
                    'R'      => 'Sarabun-Regular.ttf',
                    'B'      => 'Sarabun-Bold.ttf',
                    'useOTL' => 0x00,
                ],
            ],
            'default_font'      => self::FONT,
            'default_font_size' => 9,
            // ปิดการตัดคำไทยด้วยพจนานุกรม - ตัวคั่นที่แทรกไม่มี glyph ใน Sarabun
            'useDictionaryLBR'  => false,
        ], $opts));
    }

    /**
     * เขียนเนื้อหาลง PDF แล้วคืนสตริงไบนารี ให้ controller เอาไปใส่ response
     * $footer = HTML ท้ายทุกหน้า (ต้องตั้งก่อนเขียนเนื้อหา)
     */
    public static function render(Mpdf $mpdf, string $html, string $footer = ''): string
    {
        if ($footer !== '') {
            $mpdf->SetHTMLFooter($footer);
        }

        $mpdf->WriteHTML($html);

        return $mpdf->Output('', \Mpdf\Output\Destination::STRING_RETURN);
    }
}
