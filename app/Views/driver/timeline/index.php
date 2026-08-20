<?= $this->extend('layouts/driver') ?>

<?= $this->section('content') ?>
<?php
$props = [
    'role'     => 'driver',
    'endpoint' => site_url('driver/timeline/data'),
];
?>
<div id="timeline" data-props='<?= esc(json_encode($props), 'attr') ?>'>
  <?= view('templates/skeleton', ['variant' => 'box']) ?>
</div>
<?= vite_asset('resources/js/entries/timeline.jsx') ?>
<?= $this->endSection() ?>
