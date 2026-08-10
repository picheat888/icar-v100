<?php

// ตัวช่วยจัดรูปแบบวันที่ไทยเดือนย่อฝั่ง server ให้ตรงกับ resources/js/lib/date.js

if (! function_exists('thai_date')) {
    // "2026-06-22 ..." -> "22-06-2026" (รูปแบบ DD-MM-YYYY)
    function thai_date(?string $s): string
    {
        $d = substr((string) $s, 0, 10);
        $p = explode('-', $d);

        return (count($p) === 3 && $p[0] !== '') ? "{$p[2]}-{$p[1]}-{$p[0]}" : $d;
    }
}

if (! function_exists('thai_datetime')) {
    // "2026-06-22 08:00:00" -> "22-06-2026 08:00"
    function thai_datetime(?string $s): string
    {
        if (! $s) {
            return '';
        }

        return trim(thai_date($s) . ' ' . substr($s, 11, 5));
    }
}

if (! function_exists('is_safe_url')) {
    // ตรวจว่าลิงก์ขึ้นต้นด้วย http:// หรือ https:// เท่านั้น (กัน javascript: และ protocol อันตรายอื่น)
    function is_safe_url(?string $url): bool
    {
        return (bool) preg_match('#^https?://#i', trim((string) $url));
    }
}
