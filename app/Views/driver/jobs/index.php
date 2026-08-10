<?= $this->extend('layouts/driver') ?>

<?= $this->section('content') ?>

<div id="driver-jobs" data-props='<?= esc(json_encode(['jobs' => $jobs]), 'attr') ?>'></div>
<?= vite_asset('resources/js/entries/driver-jobs.jsx') ?>

<?= $this->endSection() ?>
