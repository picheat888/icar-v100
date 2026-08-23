<?php

namespace App\Validation;

/**
 * กฎ validate ลิงก์ - ใช้ร่วมทุกที่ที่รับ URL จากผู้ใช้ (ลิงก์แผนที่ในคำขอจองรถ)
 */
class UrlRules
{
    // ยอมเฉพาะ http:// และ https:// - กัน javascript: และ protocol อันตรายอื่น
    public const PATTERN = '#^https?://#i';

    // ลิงก์ใช้ protocol ที่ปลอดภัยไหม
    public function safe_url(?string $str = null): bool
    {
        return $str !== null && preg_match(self::PATTERN, trim($str)) === 1;
    }
}
