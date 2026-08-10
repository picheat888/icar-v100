<?php
/**
 * Layout: Driver — โครงหน้าคนขับ (role = driver)
 * หน้า view ใช้: <?= $this->extend('layouts/driver') ?> + section('content')
 */
$this->setData(['role' => 'driver'], 'raw');
?>
<?= $this->include('templates/shell') ?>
