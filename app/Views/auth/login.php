<?php
/**
 * หน้า Login — ตรงตามดีไซน์ docs/mockuo-master (hero teal ซ้าย + ฟอร์มขวา)
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
  <title><?= lang('Account.login_title') ?> — iCar Booking</title>
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
          <div class="icon-box brand-icon">
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l1.6-4.7A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.3L21 13v5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H6.5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><circle cx="7" cy="16" r="1"/><circle cx="17" cy="16" r="1"/></svg>
          </div>
          <div class="brand-text">
            <div class="brand-name">iCar</div>
            <div class="brand-sub">BOOKING</div>
          </div>
        </div>
      </div>

      <div class="login-hero-layer">
        <h1 class="login-hero-title"><?= lang('Account.hero_title_1') ?><br><?= lang('Account.hero_title_2') ?></h1>
        <p class="login-hero-sub">FACTORY VEHICLE BOOKING SYSTEM</p>
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
      <div class="brand brand--lg login-brand">
        <div class="icon-box brand-icon">
          <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l1.6-4.7A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.3L21 13v5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H6.5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><circle cx="7" cy="16" r="1"/><circle cx="17" cy="16" r="1"/></svg>
        </div>
        <div class="brand-text">
          <div class="brand-name">iCar</div>
          <div class="brand-sub">BOOKING</div>
        </div>
      </div>

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

      <!-- บัญชีทดลอง: คลิกเพื่อเติมฟอร์ม (ต้อง seed บัญชีจริงก่อน) — ควรปิดใน production -->
      <div class="login-demo">
        <p class="subtext subtext--faint login-demo-title"><?= lang('Account.demo_title') ?></p>
        <div class="login-demo-row">
          <?php foreach ([
              ['somchai', lang('Account.demo_user')],
              ['prasert', lang('Account.demo_driver')],
              ['admin',   'Admin'],
          ] as [$u, $label]): ?>
            <button type="button" data-user="<?= esc($u, 'attr') ?>" class="quick-login"><?= esc($label) ?></button>
          <?php endforeach; ?>
        </div>
      </div>

      <p class="login-foot"><?= lang('Account.no_account') ?>
        <a href="<?= url_to('register') ?>" class="login-link"><?= lang('Account.register_link') ?></a>
      </p>
    </div>
  </div>

  <script>
    // ปุ่มบัญชีทดลอง: เติม username + password ตั้งต้น (123) แล้วให้ผู้ใช้กดเข้าสู่ระบบเอง
    document.querySelectorAll('.quick-login').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.getElementById('login').value = btn.dataset.user;
        document.getElementById('password').value = '123';
        document.getElementById('password').focus();
      });
    });
  </script>
</body>
</html>
