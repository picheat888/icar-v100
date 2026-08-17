<?php
/**
 * Layout: Admin - โครงหน้าหลังบ้าน (role = admin)
 * หน้า view ใช้: <?= $this->extend('layouts/admin') ?> + section('content')
 *
 * หมายเหตุ: CI4 $this->include() อาร์กิวเมนต์ที่ 2 เป็น "options" ไม่ใช่ data
 * จึงต้องตั้ง role ผ่าน setData ให้เป็น shared data เพื่อให้ shell/sidebar/header อ่านได้
 */
helper('nav');
$this->setData(['role' => 'admin', 'badges' => admin_nav_badges()], 'raw');
?>
<?= $this->include('templates/shell') ?>
