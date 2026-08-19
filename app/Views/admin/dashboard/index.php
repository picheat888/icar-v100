<?= $this->extend('layouts/admin') ?>

<?= $this->section('content') ?>
<?php
// props ให้ island: endpoint สรุป + endpoint อนุมัติ/ปฏิเสธสมาชิก (inline) + ลิงก์ไปหน้าจัดการ
// คำขอจองรถไม่มี endpoint ที่นี่ - ทุกงานพาไปทำที่หน้าจัดการคำขอ
$props = [
    'endpoints' => [
        'data'           => site_url('admin/dashboard/data'),
        'memberApprove'  => site_url('admin/members/approve'),
        'memberReject'   => site_url('admin/members/reject'),
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
