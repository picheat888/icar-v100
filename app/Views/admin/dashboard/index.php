<?= $this->extend('layouts/admin') ?>

<?= $this->section('content') ?>
<?php
// props ให้ island: endpoint สรุป + ลิงก์ไปหน้าจัดการ
// dashboard อ่านอย่างเดียว - ทุกงานพาไปทำที่หน้าจัดการคำขอ/จัดการผู้ใช้งาน
$props = [
    'endpoints' => [
        'data' => site_url('admin/dashboard/data'),
    ],
    'links' => [
        'requests' => site_url('admin/requests'),
        'members'  => site_url('admin/members'),
    ],
    'csrf' => csrf_hash(),
];
?>
<div id="dashboard" data-props='<?= esc(json_encode($props), 'attr') ?>'></div>
<?= vite_asset('resources/js/entries/dashboard.jsx') ?>
<?= $this->endSection() ?>
