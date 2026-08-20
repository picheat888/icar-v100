<?= $this->extend($layout ?? 'layouts/user') ?>

<?= $this->section('content') ?>
<?php
$props = [
    'endpoints' => [
        'data'   => site_url('my-requests/data'),
        'cancel' => site_url('my-requests/cancel'),
        'return' => site_url('my-requests/return'),
        'update' => site_url('my-requests/update'),
    ],
    'csrf' => csrf_hash(),
];
?>
<div id="my-requests" data-props='<?= esc(json_encode($props), 'attr') ?>'>
  <?= view('templates/skeleton', ['variant' => 'table', 'rows' => 5]) ?>
</div>
<?= vite_asset('resources/js/entries/my-requests.jsx') ?>
<?= $this->endSection() ?>
