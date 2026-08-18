<?php

namespace App\Validation;

/**
 * กฎ validate เบอร์โทรศัพท์ไทย - ใช้ร่วมทุกที่ที่รับเบอร์ (สมัครสมาชิก / admin เพิ่ม-แก้สมาชิก)
 */
class PhoneRules
{
    // มือถือ 10 หลัก ขึ้นต้น 06/08/09 · เบอร์บ้าน-สำนักงาน 9 หลัก ขึ้นต้น 02-07 · ตัวเลขล้วน ไม่มีขีดหรือเว้นวรรค
    public const PATTERN = '/^0(?:[689]\d{8}|[2-7]\d{7})$/';

    // เบอร์โทรไทยถูกรูปแบบไหม
    public function thai_phone(?string $str = null): bool
    {
        return $str !== null && preg_match(self::PATTERN, $str) === 1;
    }
}
