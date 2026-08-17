<?php
/**
 * หน้า Login - ตรงตามดีไซน์ docs/mockuo-master (hero teal ซ้าย + ฟอร์มขวา)
 * เรนเดอร์โดย Shield (Config\Auth::$views['login']) โพสต์กลับ route login ของ Shield
 * field: login / password (ตาม Shield) + CSRF
 */
helper(['vite', 'setting']);

// อ่าน error จาก Shield (credential ผิด / ยังไม่อนุมัติ ฯลฯ)
$errors = session('errors') ?? [];
$error  = session('error') ?? (is_array($errors) ? implode(' ', $errors) : '');
?>
<!DOCTYPE html>
<html lang="<?= esc(service('request')->getLocale()) ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= lang('Account.login_title') ?> - iCar Booking</title>
  <?= vite_css() ?>
</head>
<body class="login-body">
  <div class="login-wrap">

    <!-- ตัวสลับภาษา TH | EN -->
    <div class="login-lang"><?= view('templates/lang_switch') ?></div>

    <!-- ===== Hero (teal) ===== -->
    <div class="login-hero">
      <div class="login-blob login-blob--1"></div>
      <div class="login-blob login-blob--2"></div>

      <div class="login-hero-layer">
        <div class="brand login-brandpill">
          <img src="<?= base_url('logo-1.png') ?>" alt="" class="brand-logo">
          <div class="brand-text">
            <div class="brand-name">iCar</div>
            <div class="brand-sub">BOOKING</div>
          </div>
        </div>
      </div>

      <div class="login-hero-layer">
        <h1 class="login-hero-title"><?= lang('Account.hero_title') ?></h1>
        <div class="login-bullets">
          <?php foreach ([
              lang('Account.hero_bullet_1'),
              lang('Account.hero_bullet_2'),
              lang('Account.hero_bullet_3'),
          ] as $bullet): ?>
            <div class="login-bullet">
              <span class="icon-box icon-box--round login-bullet-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              <span class="login-bullet-text"><?= esc($bullet) ?></span>
            </div>
          <?php endforeach; ?>
        </div>
      </div>

      <div class="login-hero-layer login-copyright"><?= lang('Account.hero_copyright') ?></div>
    </div>

    <!-- ===== Form ===== -->
    <div class="login-form">
      <h2 class="title title--xl"><?= lang('Account.login_title') ?></h2>
      <p class="subtext subtext--lg login-sub"><?= lang('Account.login_subtitle') ?></p>

      <?php if (! empty($error)): ?>
        <div class="alert-error"><?= esc($error) ?></div>
      <?php endif; ?>

      <form action="<?= url_to('login') ?>" method="post">
        <?= csrf_field() ?>

        <label class="form-label"><?= lang('Account.username_label') ?></label>
        <input id="login" name="username" value="<?= esc(old('username')) ?>" placeholder="<?= esc(lang('Account.username_ph'), 'attr') ?>" autocomplete="username"
               class="form-input login-input">

        <label class="form-label"><?= lang('Account.password_label') ?></label>
        <input id="password" name="password" type="password" placeholder="<?= esc(lang('Account.password_ph'), 'attr') ?>" autocomplete="current-password"
               class="form-input login-input login-input--last">

        <button type="submit" class="btn-primary btn-block login-submit"><?= lang('Account.login_btn') ?></button>
      </form>

      <p class="login-foot"><?= lang('Account.no_account') ?>
        <a href="<?= url_to('register') ?>" class="login-link"><?= lang('Account.register_link') ?></a>
      </p>
    </div>
  </div>

</body>
</html>
