<?php
/**
 * Shell - โครง app shell ใช้ร่วมกันทุก role (sidebar + header + เนื้อหา + footer)
 * ถูก include โดย layouts/{admin,user,driver}.php ซึ่งส่ง $role มาให้
 * รับ: $role, $active, $pageTitle, $pageSubtitle
 */
helper('vite');
$role         = $role ?? 'user';
$active       = $active ?? '';
$pageTitle    = $pageTitle ?? '';
$pageSubtitle = $pageSubtitle ?? '';
?>
<!DOCTYPE html>
<html lang="<?= esc(service('request')->getLocale()) ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- CSRF ให้ React island อ่านไปแนบตอน POST/PUT -->
  <meta name="csrf" content="<?= csrf_hash() ?>" data-name="<?= csrf_token() ?>">
  <meta name="locale" content="<?= esc(service('request')->getLocale()) ?>">
  <title><?= esc($pageTitle !== '' ? $pageTitle : 'iCar Booking') ?> - iCar Booking</title>
  <?= vite_css() ?>
</head>
<body>
  <div class="app-root">

    <?= $this->include('templates/sidebar', ['role' => $role, 'active' => $active]) ?>

    <div class="app-main">
      <?= $this->include('templates/header', ['role' => $role, 'pageTitle' => $pageTitle, 'pageSubtitle' => $pageSubtitle]) ?>

      <main class="app-body">
        <div class="app-content">
          <?= $this->renderSection('content') ?>
        </div>
        <?= $this->include('templates/footer') ?>
      </main>
    </div>
  </div>

  <?= $this->include('templates/scripts') ?>
</body>
</html>
