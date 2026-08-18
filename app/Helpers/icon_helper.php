<?php

/**
 * ไอคอน SVG สำหรับ view ฝั่ง PHP - ใช้ชุดเดียวกับฝั่ง React (<Icon /> ใน resources/js/lib/Icon.jsx)
 *
 * ข้อมูลไอคอนมาจาก app/Helpers/icons_data.php ที่ generate จาก lucide + Font Awesome
 * ด้วย npm run icons (ดูรายชื่อที่ใช้ได้ใน resources/icons.json)
 */

if (! function_exists('icon')) {
    /**
     * คืน <svg> ของไอคอนที่ระบุ
     * เช่น icon('car') · icon('members', 19) · icon('close', 22, 'modal-close-svg') · icon('check', 30, '', 2.8)
     *
     * ไอคอนรับสีจาก currentColor จึงเปลี่ยนสีได้ด้วย CSS ของ element ที่ครอบอยู่
     */
    function icon(string $name, int $size = 20, string $class = '', float $strokeWidth = 2): string
    {
        static $icons = null;

        $icons ??= require __DIR__ . '/icons_data.php';

        // ไม่มีชื่อนี้ในทะเบียน - คืนคอมเมนต์ไว้ให้เห็นตอน view source
        if (! isset($icons[$name])) {
            return '<!-- ไม่พบไอคอน: ' . esc($name) . ' (เพิ่มได้ที่ resources/icons.json) -->';
        }

        $data = $icons[$name];

        // lucide เป็นเส้น Font Awesome เป็นทึบ - attribute คนละชุด
        $paint = $data['kind'] === 'stroke'
            ? 'fill="none" stroke="currentColor" stroke-width="' . $strokeWidth . '" stroke-linecap="round" stroke-linejoin="round"'
            : 'fill="currentColor"';

        $classAttr = $class !== '' ? ' class="' . esc($class, 'attr') . '"' : '';

        return '<svg width="' . $size . '" height="' . $size . '" viewBox="' . $data['vb'] . '" '
            . $paint . $classAttr . ' aria-hidden="true">' . $data['body'] . '</svg>';
    }
}
