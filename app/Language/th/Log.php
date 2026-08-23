<?php

return [
    // หัวคอลัมน์ไฟล์ CSV ที่ export ออกไป
    'csv_time'   => 'เวลา',
    'csv_user'   => 'ผู้ใช้',
    'csv_role'   => 'บทบาท',
    'csv_action' => 'การกระทำ',

    // ตัวกรองประเภทการกระทำ
    'type_auth'    => 'เข้าใช้ระบบ',
    'type_member'  => 'สมาชิก',
    'type_car'     => 'รถ',
    'type_master'  => 'แผนก/ตำแหน่ง',
    'type_booking' => 'การจอง',

    // {code} = รหัสคำขอ · {name} = ชื่อคนหรือชื่อรายการ · {role} = ชื่อบทบาท · {car} = รุ่น (ทะเบียน)
    // เข้าสู่ระบบ / สมัครสมาชิก
    'signed_in'  => 'เข้าสู่ระบบ',
    'registered' => 'สมัครสมาชิก: {name}',

    // สมาชิก
    'member_added'    => 'เพิ่มสมาชิก {name} (บทบาท: {role})',
    'member_approved' => 'อนุมัติสมาชิก {name} (บทบาท: {role})',
    'member_rejected' => 'ปฏิเสธ/ปิดใช้งานสมาชิก {name}',
    'member_updated'  => 'แก้ไขสมาชิก {name}',

    // รถ
    'car_added'   => 'เพิ่มรถ {car}',
    'car_updated' => 'แก้ไขรถ {car}',
    'car_deleted' => 'ลบรถ {car}',

    // แผนก
    'dept_added'   => 'เพิ่มแผนก {name}',
    'dept_renamed' => 'เปลี่ยนชื่อแผนก {name} เป็น {to}',
    'dept_deleted' => 'ลบแผนก {name}',

    // ตำแหน่ง
    'position_added'   => 'เพิ่มตำแหน่ง {name}',
    'position_renamed' => 'เปลี่ยนชื่อตำแหน่ง {name} เป็น {to}',
    'position_deleted' => 'ลบตำแหน่ง {name}',

    // การจอง - ผู้ขอใช้รถ
    'booking_submitted_self'   => 'ส่งคำขอจองรถ {code} (รถขับเอง)',
    'booking_submitted_other'  => 'ส่งคำขอจองรถ {code} (รถที่ผู้ดูแลระบบจัดให้)',
    'booking_updated'          => 'แก้ไขคำขอ {code}',
    'booking_cancelled'        => 'ยกเลิกคำขอ {code}',
    'booking_cancel_requested' => 'ขอยกเลิกคำขอ {code}',
    'booking_returned'         => 'คืนรถของคำขอ {code}',

    // การจอง - ผู้ดูแลระบบ
    'booking_approved'           => 'อนุมัติคำขอ {code}',
    'booking_driver_assigned'    => 'มอบหมายคนขับให้คำขอ {code}',
    'booking_rejected'           => 'ปฏิเสธคำขอ {code}',
    'booking_cancel_confirmed'   => 'ยืนยันการยกเลิกคำขอ {code}',
    'booking_cancelled_by_admin' => 'ยกเลิกคำขอ {code} (โดยผู้ดูแลระบบ)',
    'booking_vehicle_changed'    => 'เปลี่ยนรถ/คนขับของคำขอ {code}',
];
