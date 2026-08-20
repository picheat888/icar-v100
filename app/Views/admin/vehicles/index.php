<?= $this->extend('layouts/admin') ?>

<?= $this->section('content') ?>
<?php
// props ให้ island: endpoint + csrf + baseUrl (ไว้ประกอบ path รูปรถ)
$props = [
    'endpoints' => [
        'data'   => site_url('admin/vehicles/data'),
        'save'   => site_url('admin/vehicles/save'),
        'delete' => site_url('admin/vehicles/delete'),
    ],
    'csrf'    => csrf_hash(),
    'baseUrl' => rtrim(base_url(), '/') . '/',
];
?>
<div id="cars-manager" data-props='<?= esc(json_encode($props), 'attr') ?>'>
  <?= view('templates/skeleton', ['variant' => 'cards', 'rows' => 6]) ?>
</div>
<?= vite_asset('resources/js/entries/cars-manager.jsx') ?>
<?= $this->endSection() ?>
