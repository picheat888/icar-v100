<?= $this->extend('layouts/admin') ?>

<?= $this->section('content') ?>
<?php
// props ให้ island: endpoint ดึงข้อมูล + export CSV + ตัวเลือกของตัวกรอง
// ตัวเลือกมาจาก server เพื่อให้ป้ายบทบาทตรงกับคอลัมน์บทบาทในตารางเป๊ะ ๆ
$props = [
    'endpoints' => [
        'data'   => site_url('admin/activity-log/data'),
        'export' => site_url('admin/activity-log/export'),
    ],
    'roleOptions' => $roleOptions,
    'typeOptions' => $typeOptions,
];
?>
<div id="activity-log" data-props='<?= esc(json_encode($props), 'attr') ?>'>
  <?= view('templates/skeleton', ['variant' => 'table', 'rows' => 6]) ?>
</div>
<?= vite_asset('resources/js/entries/activity-log.jsx') ?>
<?= $this->endSection() ?>
