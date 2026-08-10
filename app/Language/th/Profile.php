<?php

return [
    // หน้าข้อมูลส่วนตัว (profile/index.php + ProfileController::index)
    'title'                 => 'ข้อมูลส่วนตัว',
    'subtitle'               => 'รายละเอียดบัญชีและข้อมูลพนักงาน',
    'member_since'           => 'สมาชิกเมื่อ',
    'section_personal'       => 'ข้อมูลส่วนตัว',
    'section_personal_sub'   => 'ข้อมูลที่แสดงในระบบ (จัดการโดยผู้ดูแล)',
    'admin_managed_note'     => 'ข้อมูลนี้ผู้ดูแลระบบเป็นผู้กำหนด',

    // สถานะบัญชี (คำนวณไว้ในวิว — ปัจจุบันยังไม่ได้แสดงผล)
    'status_approved'        => 'อนุมัติแล้ว',
    'status_pending'         => 'รออนุมัติ',
    'status_rejected'        => 'ถูกปฏิเสธ',

    // ฟอร์มเปลี่ยนรหัสผ่าน (ใช้ร่วม profile/index.php + profile/change_password.php + ProfileController::changePassword)
    'change_password_title'      => 'เปลี่ยนรหัสผ่าน',
    'change_password_subtitle'   => 'ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ',
    'change_password_sub_index'  => 'กรอกรหัสผ่านเดิมก่อนตั้งรหัสใหม่',
    'change_password_modal_sub'  => 'กรอกรหัสผ่านเดิม แล้วตั้งรหัสผ่านใหม่',
    'cur_password_label'         => 'รหัสผ่านเดิม',
    'cur_password_ph'            => 'กรอกรหัสผ่านเดิม',
    'new_password_label'         => 'รหัสผ่านใหม่',
    'new_password_ph'            => 'อย่างน้อย 8 ตัวอักษร',
    'confirm_password_label'     => 'ยืนยันรหัสผ่านใหม่',
    'confirm_password_ph_short'  => 'กรอกอีกครั้ง',
    'confirm_password_ph_full'   => 'กรอกรหัสผ่านใหม่อีกครั้ง',
    'change_password_btn'        => 'เปลี่ยนรหัสผ่าน',
    'save_new_password_btn'      => 'บันทึกรหัสผ่านใหม่',

    // หน้าแจ้งผลสมัครสำเร็จ (auth/register_success.php)
    'reg_success_title'          => 'ส่งคำขอสมัครเรียบร้อย',
    'reg_success_line1'          => 'กรุณารอ Admin อนุมัติบัญชีของคุณ',
    'reg_success_line2'          => 'คุณจะสามารถเข้าใช้งานได้เมื่อบัญชีได้รับการอนุมัติแล้ว',
    'reg_success_status'         => 'สถานะบัญชี: รออนุมัติ',
    'reg_success_back_login'     => 'กลับหน้าเข้าสู่ระบบ',
];
