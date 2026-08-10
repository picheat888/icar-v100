<?php
/**
 * Layout: User — โครงหน้าผู้ใช้ทั่วไป (role = user)
 * หน้า view ใช้: <?= $this->extend('layouts/user') ?> + section('content')
 */
$this->setData(['role' => 'user'], 'raw');
?>
<?= $this->include('templates/shell') ?>
