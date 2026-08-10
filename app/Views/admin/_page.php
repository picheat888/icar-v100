<?= $this->extend('layouts/admin') ?>

<?= $this->section('content') ?>
<?= $this->include('templates/_coming_soon', ['pageTitle' => $pageTitle ?? '']) ?>
<?= $this->endSection() ?>
