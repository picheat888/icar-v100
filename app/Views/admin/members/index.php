<?= $this->extend('layouts/admin') ?>

<?= $this->section('content') ?>
<?php
// props ให้ React island: endpoint + csrf + ตัวเลือกแผนก/ตำแหน่ง
$props = [
    'endpoints' => [
        'data'    => site_url('admin/members/data'),
        'approve' => site_url('admin/members/approve'),
        'reject'  => site_url('admin/members/reject'),
        'update'  => site_url('admin/members/update'),
    ],
    'csrf'          => csrf_hash(),
    'currentUserId' => $currentUserId,
    'departments'   => array_map(static fn ($d) => ['id' => $d['id'], 'name' => $d['name']], $departments),
    'positions'     => array_map(static fn ($p) => ['id' => $p['id'], 'name' => $p['name']], $positions),
];
?>
<div id="members-manager" data-props='<?= esc(json_encode($props), 'attr') ?>'></div>
<?= vite_asset('resources/js/entries/members-manager.jsx') ?>
<?= $this->endSection() ?>
