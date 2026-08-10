<?= $this->extend('layouts/admin') ?>

<?= $this->section('content') ?>
<?php
$props = [
    'endpoints' => [
        'data'    => site_url('admin/requests/data'),
        'approve' => site_url('admin/requests/approve'),
        'reject'  => site_url('admin/requests/reject'),
        'confirmCancel' => site_url('admin/requests/confirm-cancel'),
        'assign'  => site_url('admin/requests/assign-driver'),
        'cancel'  => site_url('admin/requests/cancel'),
        'update'  => site_url('admin/requests/update'),
    ],
    'csrf' => csrf_hash(),
];
?>
<div id="requests-manager" data-props='<?= esc(json_encode($props), 'attr') ?>'></div>
<?= vite_asset('resources/js/entries/requests-manager.jsx') ?>
<?= $this->endSection() ?>
