<?php

// helper สำหรับหน้าตารางการใช้รถ (timeline)
if (! function_exists('timeline_range')) {
    /**
     * แปลง from/to (รูปแบบ YYYY-MM-DD) เป็นช่วง datetime [from 00:00:00, to 23:59:59]
     * ถ้าค่าไม่ถูกรูปแบบ → ใช้เดือนปัจจุบันเป็นค่า default
     *
     * @return array{0:string,1:string} [$from, $to]
     */
    function timeline_range(?string $from, ?string $to): array
    {
        $re = '/^\d{4}-\d{2}-\d{2}$/';

        if (! $from || ! preg_match($re, $from)) {
            $from = date('Y-m-01');
        }
        if (! $to || ! preg_match($re, $to)) {
            $to = date('Y-m-t');
        }

        return [$from . ' 00:00:00', $to . ' 23:59:59'];
    }
}
