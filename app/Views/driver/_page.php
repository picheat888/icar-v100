<?= $this->extend('layouts/driver') ?>

<?= $this->section('content') ?>
<?= $this->include('templates/_coming_soon', ['pageTitle' => $pageTitle ?? '']) ?>
<?= $this->endSection() ?>
