<?= $this->extend('layouts/admin') ?>

<?= $this->section('content') ?>
<?php
// props ให้ island: endpoint + csrf + ชนิดที่จะแสดง (dept/position)
$props = [
    'endpoints' => [
        'data'   => site_url('admin/master/data'),
        'add'    => site_url('admin/master/add'),
        'update' => site_url('admin/master/update'),
        'delete' => site_url('admin/master/delete'),
    ],
    'csrf' => csrf_hash(),
    'only' => $only,
];
?>
<div id="master-data" data-props='<?= esc(json_encode($props), 'attr') ?>'></div>
<?= vite_asset('resources/js/entries/master-data.jsx') ?>
<?= $this->endSection() ?>
