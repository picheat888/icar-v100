<?php
/**
 * หน้า Login - ตรงตามดีไซน์ docs/mockuo-master (hero teal ซ้าย + ฟอร์มขวา)
 * เรนเดอร์โดย Shield (Config\Auth::$views['login']) โพสต์กลับ route login ของ Shield
 * field: login / password (ตาม Shield) + CSRF
 */
helper(['vite', 'setting', 'icon']);

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
      <!-- แบรนด์สำหรับจอแคบ (hero ถูกซ่อน) -->
      <div class="brand login-brand-narrow">
        <img src="<?= base_url('logo-1.png') ?>" alt="" class="brand-logo">
        <div class="brand-text">
          <div class="brand-name">iCar</div>
          <div class="brand-sub">BOOKING</div>
        </div>
      </div>

      <h2 class="title title--xl"><?= lang('Account.login_title') ?></h2>
      <p class="subtext subtext--lg login-sub"><?= lang('Account.login_subtitle') ?></p>

      <?php if (! empty($error)): ?>
        <div class="alert-error" role="alert"><?= esc($error) ?></div>
      <?php endif; ?>

      <form action="<?= url_to('login') ?>" method="post" id="login-form" novalidate>
        <?= csrf_field() ?>

        <div class="login-row">
          <label class="form-label" for="login"><?= lang('Account.username_label') ?></label>
          <input id="login" name="username" value="<?= esc(old('username')) ?>" placeholder="<?= esc(lang('Account.username_ph'), 'attr') ?>" autocomplete="username"
                 required<?= empty($error) ? ' autofocus' : '' ?>
                 class="form-input">
          <div id="err-login" class="form-err" aria-live="polite"></div>
        </div>

        <div class="login-row login-row--last">
          <label class="form-label" for="password"><?= lang('Account.password_label') ?></label>
          <div class="field login-field">
            <input id="password" name="password" type="password" placeholder="<?= esc(lang('Account.password_ph'), 'attr') ?>" autocomplete="current-password"
                   required<?= empty($error) ? '' : ' autofocus' ?>
                   class="form-input">
            <button type="button" id="pw-toggle" class="field-eye login-eye" tabindex="-1"
                    aria-label="<?= esc(lang('Account.show_password'), 'attr') ?>" aria-pressed="false">
              <span class="login-eye-on"><?= icon('eye', 19) ?></span>
              <span class="login-eye-off"><?= icon('eye-off', 19) ?></span>
            </button>
          </div>
          <div id="err-password" class="form-err" aria-live="polite"></div>
        </div>

        <button type="submit" id="login-submit" class="btn-primary btn-block login-submit"><?= lang('Account.login_btn') ?></button>
      </form>

      <p class="login-foot"><?= lang('Account.no_account') ?>
        <a href="<?= url_to('register') ?>" class="login-link"><?= lang('Account.register_link') ?></a>
      </p>
    </div>
  </div>

  <script>
  (function () {
    // ปุ่มลูกตา: สลับ type ของช่องรหัสผ่าน + สลับไอคอน/aria
    var pw     = document.getElementById('password');
    var toggle = document.getElementById('pw-toggle');
    var LABEL  = <?= json_encode(['show' => lang('Account.show_password'), 'hide' => lang('Account.hide_password')]) ?>;
    toggle.addEventListener('click', function () {
      var show = pw.type === 'password';
      pw.type = show ? 'text' : 'password';
      toggle.classList.toggle('is-shown', show);
      toggle.setAttribute('aria-pressed', show ? 'true' : 'false');
      toggle.setAttribute('aria-label', show ? LABEL.hide : LABEL.show);
      pw.focus();
    });

    var form   = document.getElementById('login-form');
    var submit = document.getElementById('login-submit');
    var user   = document.getElementById('login');
    var MSG    = <?= json_encode(['user' => lang('Account.err_username_req'), 'pass' => lang('Account.err_password_req')], JSON_UNESCAPED_UNICODE) ?>;

    // แสดง/ซ่อนข้อความเตือนใต้ช่อง + ขอบแดง
    function mark(input, box, msg) {
      box.textContent = msg;
      box.classList.toggle('is-shown', !!msg);
      input.classList.toggle('is-invalid', !!msg);
      if (msg) { input.setAttribute('aria-invalid', 'true'); } else { input.removeAttribute('aria-invalid'); }
    }

    var fields = [
      { input: user, box: document.getElementById('err-login'), msg: MSG.user },
      { input: pw,   box: document.getElementById('err-password'), msg: MSG.pass },
    ];

    // พิมพ์แล้วเคลียร์ข้อความของช่องนั้น
    fields.forEach(function (f) {
      f.input.addEventListener('input', function () {
        if (f.input.value.trim() !== '') mark(f.input, f.box, '');
      });
    });

    // ช่องว่าง = ไม่ส่ง + โฟกัสช่องแรกที่ขาด · ผ่านแล้วค่อยล็อกปุ่ม (ยิงซ้ำจะไปกิน throttle ของตัวเอง)
    form.addEventListener('submit', function (e) {
      var first = null;
      fields.forEach(function (f) {
        var bad = f.input.value.trim() === '';
        mark(f.input, f.box, bad ? f.msg : '');
        if (bad && ! first) first = f.input;
      });
      if (first) {
        e.preventDefault();
        first.focus();

        return;
      }
      submit.disabled    = true;
      submit.textContent = <?= json_encode(lang('Account.login_btn_loading')) ?>;
    });
  })();
  </script>
</body>
</html>
