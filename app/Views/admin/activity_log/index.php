<?= $this->extend('layouts/admin') ?>

<?= $this->section('content') ?>
<?php
// props ให้ island: endpoint ดึงข้อมูล + export CSV
$props = [
    'endpoints' => [
        'data'   => site_url('admin/activity-log/data'),
        'export' => site_url('admin/activity-log/export'),
    ],
];
?>
<div id="activity-log" data-props='<?= esc(json_encode($props), 'attr') ?>'></div>
<?= vite_asset('resources/js/entries/activity-log.jsx') ?>
<?= $this->endSection() ?>
