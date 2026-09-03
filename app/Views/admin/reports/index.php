<?= $this->extend('layouts/admin') ?>

<?= $this->section('content') ?>
<?php
// props ให้ island: endpoint ข้อมูลรายงาน + ลิงก์เปิดคำขอในหน้าจัดการ + ลิงก์ PDF ฝั่ง server
$props = [
    'endpoint'    => site_url('admin/reports/data'),
    'requestLink' => site_url('admin/requests'),
    'pdfLink'     => site_url('admin/reports/cost-report-pdf'),
];
?>
<div id="reports" data-props='<?= esc(json_encode($props), 'attr') ?>'>
  <?= view('templates/skeleton', ['variant' => 'box']) ?>
</div>
<?= vite_asset('resources/js/entries/reports.jsx') ?>
<?= $this->endSection() ?>
