<?= $this->extend('layouts/user') ?>

<?= $this->section('content') ?>
<?php
$props = [
    'role'     => 'user',
    'endpoint' => site_url('timeline/data'),
    'book'     => site_url('book'),   // URL หน้าจองรถ - ปุ่ม "จองรถ" มุมบนขวา
];
?>
<div id="timeline" data-props='<?= esc(json_encode($props), 'attr') ?>'></div>
<?= vite_asset('resources/js/entries/timeline.jsx') ?>
<?= $this->endSection() ?>
