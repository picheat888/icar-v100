<?php
/**
 * หน้าแจ้งผลสมัครสำเร็จ (รอ Admin อนุมัติ) - ตามดีไซน์ §5.3
 */
helper('vite');
?>
<!DOCTYPE html>
<html lang="<?= esc(service('request')->getLocale()) ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= lang('Profile.reg_success_title') ?> - iCar Booking</title>
  <?= vite_css() ?>
</head>
<body class="rs-body">
  <div class="rs-wrap">
    <div class="card rs-card">
      <div class="icon-box icon-box--round rs-icon">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#16855a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 class="title title--md"><?= lang('Profile.reg_success_title') ?></h2>
      <p class="subtext rs-text"><?= lang('Profile.reg_success_line1') ?><br><?= lang('Profile.reg_success_line2') ?></p>
      <div class="pill pill--gray rs-badge"><?= lang('Profile.reg_success_status') ?></div>
      <a href="<?= url_to('login') ?>" class="btn-primary btn-block rs-back"><?= lang('Profile.reg_success_back_login') ?></a>
    </div>
  </div>
</body>
</html>
