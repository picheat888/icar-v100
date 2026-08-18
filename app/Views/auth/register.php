<?php
/**
 * หน้าสมัครสมาชิก
 * select แผนก/ตำแหน่ง ใช้ id เป็น value (map ตรงกับ FK), โพสต์ไป Auth\RegisterController::attempt
 * รับ: $departments, $positions (array จาก DB)
 */
helper(['vite', 'form', 'icon']);

// error ราย field จาก validate (key = ชื่อ field) · flash 'error' เดี่ยวคือข้อความรวม เช่นจาก filter throttle
$errors   = session('errors');
$fieldErr = is_array($errors) ? $errors : [];
$flashErr = (string) (session('error') ?? (is_string($errors) ? $errors : ''));

// ข้อความ error ของ field หนึ่ง ('' = ไม่มี)
$errFor = static fn (string $f): string => (string) ($fieldErr[$f] ?? '');

// attribute ของช่องที่ผิด: คลาสขอบแดง + aria-invalid
$invalid = static fn (string $f): string => $errFor($f) !== '' ? ' is-invalid" aria-invalid="true' : '';
?>
<!DOCTYPE html>
<html lang="<?= esc(service('request')->getLocale()) ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= lang('Account.register_title') ?> - iCar Booking</title>
  <?= vite_css() ?>
</head>
<body>
  <div class="reg-wrap">

    <!-- ===== แผงซ้าย: hero teal ===== -->
    <aside class="reg-hero">
      <!-- โลโก้ -->
      <div class="brand brand--on-teal reg-brand">
        <img src="<?= base_url('logo-1.png') ?>" alt="" class="brand-logo">
        <div class="brand-text">
          <div class="brand-name">iCar</div>
          <div class="brand-sub">BOOKING</div>
        </div>
      </div>

      <!-- หัวข้อ + คำอธิบาย -->
      <h1 class="reg-hero-title"><?= lang('Account.reg_hero_title_1') ?><br><?= lang('Account.reg_hero_title_2') ?></h1>
      <p class="reg-hero-sub"><?= lang('Account.reg_hero_sub') ?></p>

      <!-- จุดเด่น 3 ข้อ -->
      <?php
        $features = [
            ['<rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>', lang('Account.feat_1_title'), lang('Account.feat_1_sub')],
            ['<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>', lang('Account.feat_2_title'), lang('Account.feat_2_sub')],
            ['<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>', lang('Account.feat_3_title'), lang('Account.feat_3_sub')],
        ];
      ?>
      <div class="reg-feats">
        <?php foreach ($features as [$icon, $title, $sub]): ?>
          <div class="reg-feat">
            <div class="icon-box reg-feat-icon">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><?= $icon ?></svg>
            </div>
            <div>
              <div class="reg-feat-title"><?= esc($title) ?></div>
              <div class="reg-feat-sub"><?= esc($sub) ?></div>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    </aside>

    <!-- ===== แผงขวา: ฟอร์ม ===== -->
    <main class="reg-main">
      <div class="reg-container">

        <!-- แบรนด์สำหรับจอแคบ (hero ถูกซ่อน) -->
        <div class="brand reg-brand-narrow">
          <img src="<?= base_url('logo-1.png') ?>" alt="" class="brand-logo">
          <div class="brand-text">
            <div class="brand-name">iCar</div>
            <div class="brand-sub">BOOKING</div>
          </div>
        </div>

        <!-- หัวเรื่อง + ปุ่มสลับภาษา -->
        <div class="reg-head">
          <div>
            <h2 class="title title--xl"><?= lang('Account.register_title') ?></h2>
          </div>
          <div class="reg-head-right">
            <?= view('templates/lang_switch') ?>
          </div>
        </div>

        <?php if ($flashErr !== ''): ?>
          <div class="alert-error" role="alert"><?= esc($flashErr) ?></div>
        <?php elseif ($fieldErr): ?>
          <div class="alert-error" role="alert"><?= lang('Account.fix_errors') ?></div>
        <?php endif; ?>

        <form action="<?= url_to('register') ?>" method="post" novalidate>
          <?= csrf_field() ?>
          <div class="card reg-card">
            <div class="title title--sm reg-cardhead"><?= lang('Account.emp_header') ?></div>
            <div class="reg-cardbody">

              <!-- ส่วนที่ 1: ข้อมูลพนักงาน -->
              <div class="reg-sechead">
                <span class="icon-box icon-box--teal reg-secicon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <span class="title title--sm reg-sectitle"><?= lang('Account.emp_info') ?></span>
                <span class="reg-secrule"></span>
              </div>

              <div class="reg-grid">
                <div>
                  <label class="form-label reg-label" for="empId"><?= lang('Account.emp_id') ?> <span class="form-req">*</span></label>
                  <input id="empId" class="form-input reg-input<?= $invalid('empId') ?>" name="empId" value="<?= esc(old('empId')) ?>" placeholder="<?= esc(lang('Account.emp_id_ph'), 'attr') ?>" maxlength="8" autocomplete="off" required>
                  <div id="err-empId" class="form-err<?= $errFor('empId') ? ' is-shown' : '' ?>" aria-live="polite"<?= $errFor('empId') ? ' data-server="1"' : '' ?>><?= esc($errFor('empId')) ?></div>
                </div>
                <div>
                  <label class="form-label reg-label" for="name"><?= lang('Account.full_name') ?> <span class="form-req">*</span></label>
                  <input id="name" class="form-input reg-input<?= $invalid('name') ?>" name="name" value="<?= esc(old('name')) ?>" placeholder="<?= esc(lang('Account.full_name_ph'), 'attr') ?>" maxlength="150" autocomplete="name" required>
                  <div id="err-name" class="form-err<?= $errFor('name') ? ' is-shown' : '' ?>" aria-live="polite"<?= $errFor('name') ? ' data-server="1"' : '' ?>><?= esc($errFor('name')) ?></div>
                </div>

                <div>
                  <label class="form-label reg-label" for="dept"><?= lang('Account.department') ?> <span class="form-req">*</span></label>
                  <select id="dept" class="form-input form-select reg-input reg-select<?= $invalid('dept') ?>" name="dept" required>
                    <option value=""><?= lang('Account.choose_dept') ?></option>
                    <?php foreach ($departments as $d): ?>
                      <option value="<?= esc($d['id'], 'attr') ?>" <?= old('dept') == $d['id'] ? 'selected' : '' ?>><?= esc($d['name']) ?></option>
                    <?php endforeach; ?>
                  </select>
                  <div id="err-dept" class="form-err<?= $errFor('dept') ? ' is-shown' : '' ?>" aria-live="polite"<?= $errFor('dept') ? ' data-server="1"' : '' ?>><?= esc($errFor('dept')) ?></div>
                </div>
                <div>
                  <label class="form-label reg-label" for="position"><?= lang('Account.position') ?> <span class="form-req">*</span></label>
                  <select id="position" class="form-input form-select reg-input reg-select<?= $invalid('position') ?>" name="position" required>
                    <option value=""><?= lang('Account.choose_pos') ?></option>
                    <?php foreach ($positions as $p): ?>
                      <option value="<?= esc($p['id'], 'attr') ?>" <?= old('position') == $p['id'] ? 'selected' : '' ?>><?= esc($p['name']) ?></option>
                    <?php endforeach; ?>
                  </select>
                  <div id="err-position" class="form-err<?= $errFor('position') ? ' is-shown' : '' ?>" aria-live="polite"<?= $errFor('position') ? ' data-server="1"' : '' ?>><?= esc($errFor('position')) ?></div>
                </div>

                <div>
                  <label class="form-label reg-label" for="phone"><?= lang('Account.phone') ?> <span class="form-req">*</span></label>
                  <input id="phone" class="form-input reg-input<?= $invalid('phone') ?>" name="phone" value="<?= esc(old('phone')) ?>" placeholder="<?= esc(lang('Account.phone_ph'), 'attr') ?>" maxlength="10" inputmode="numeric" autocomplete="tel" required>
                  <div id="err-phone" class="form-err<?= $errFor('phone') ? ' is-shown' : '' ?>" aria-live="polite"<?= $errFor('phone') ? ' data-server="1"' : '' ?>><?= esc($errFor('phone')) ?></div>
                </div>
              </div>

              <!-- ส่วนที่ 2: ข้อมูลเข้าสู่ระบบ -->
              <div class="reg-sechead reg-sechead--mt">
                <span class="icon-box icon-box--teal reg-secicon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <span class="title title--sm reg-sectitle"><?= lang('Account.login_info') ?></span>
                <span class="reg-secrule"></span>
              </div>

              <div class="reg-mb">
                <label class="form-label reg-label" for="username"><?= lang('Account.username_label') ?> <span class="form-req">*</span></label>
                <input id="username" class="form-input reg-input<?= $invalid('username') ?>" name="username" value="<?= esc(old('username')) ?>" placeholder="<?= esc(lang('Account.username_ph_reg'), 'attr') ?>" autocomplete="username" aria-describedby="username-hint" required>
                <div id="err-username" class="form-err<?= $errFor('username') ? ' is-shown' : '' ?>" aria-live="polite"<?= $errFor('username') ? ' data-server="1"' : '' ?>><?= esc($errFor('username')) ?></div>
                <div id="username-hint" class="subtext subtext--faint reg-hint"><?= lang('Account.username_hint') ?></div>
              </div>

              <div class="reg-grid">
                <div>
                  <label class="form-label reg-label" for="password"><?= lang('Account.password') ?> <span class="form-req">*</span></label>
                  <div class="field reg-field">
                    <input id="password" class="form-input reg-input<?= $invalid('password') ?>" name="password" type="password" placeholder="<?= esc(lang('Account.password_ph_reg'), 'attr') ?>" autocomplete="new-password" minlength="8" required>
                    <button type="button" class="field-eye reg-eye" data-pw="password" tabindex="-1"
                            aria-label="<?= esc(lang('Account.show_password'), 'attr') ?>" aria-pressed="false">
                      <span class="reg-eye-on"><?= icon('eye', 18) ?></span>
                      <span class="reg-eye-off"><?= icon('eye-off', 18) ?></span>
                    </button>
                  </div>
                  <div id="err-password" class="form-err<?= $errFor('password') ? ' is-shown' : '' ?>" aria-live="polite"<?= $errFor('password') ? ' data-server="1"' : '' ?>><?= esc($errFor('password')) ?></div>
                </div>
                <div>
                  <label class="form-label reg-label" for="confirm"><?= lang('Account.confirm_pass') ?> <span class="form-req">*</span></label>
                  <div class="field reg-field">
                    <input id="confirm" class="form-input reg-input<?= $invalid('confirm') ?>" name="confirm" type="password" placeholder="<?= esc(lang('Account.confirm_ph'), 'attr') ?>" autocomplete="new-password" required>
                    <button type="button" class="field-eye reg-eye" data-pw="confirm" tabindex="-1"
                            aria-label="<?= esc(lang('Account.show_password'), 'attr') ?>" aria-pressed="false">
                      <span class="reg-eye-on"><?= icon('eye', 18) ?></span>
                      <span class="reg-eye-off"><?= icon('eye-off', 18) ?></span>
                    </button>
                  </div>
                  <div id="err-confirm" class="form-err<?= $errFor('confirm') ? ' is-shown' : '' ?>" aria-live="polite"<?= $errFor('confirm') ? ' data-server="1"' : '' ?>><?= esc($errFor('confirm')) ?></div>
                </div>
              </div>

              <!-- ยินยอมให้จัดเก็บข้อมูล -->
              <label class="reg-terms">
                <input type="checkbox" id="agree" name="terms" value="1" required <?= old('terms') ? 'checked' : '' ?> class="reg-checkbox">
                <span><?= lang('Account.terms_text') ?></span>
              </label>

              <!-- ปุ่ม -->
              <div class="reg-actions">
                <div class="reg-actions-left">
                  <button type="submit" id="regSubmit" class="btn-primary reg-submit">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <?= lang('Account.submit_reg') ?>
                  </button>
                  <a href="<?= url_to('login') ?>" class="btn-ghost"><?= lang('Common.cancel') ?></a>
                </div>
                <p class="subtext"><?= lang('Account.have_account') ?>
                  <a href="<?= url_to('login') ?>" class="reg-link"><?= lang('Account.login_link') ?></a>
                </p>
              </div>

            </div>
          </div>
        </form>
      </div>
    </main>
  </div>

  <script>
  var I18N_ERR = <?= json_encode([
      'emp'      => lang('Account.err_empId'),
      'name'     => lang('Account.err_name'),
      'nameMax'  => lang('Account.srv_name_max'),
      'phone'    => lang('Account.err_phone'),
      'passMin'  => lang('Account.srv_password_min'),
      'confirm'  => lang('Account.srv_confirm_match'),
      'needTerms' => lang('Account.need_terms'),
      'fieldReq'  => lang('Account.err_field_req'),
      'deptReq'   => lang('Account.srv_dept_req'),
      'posReq'    => lang('Account.srv_pos_req'),
      'fixErrors' => lang('Account.fix_errors'),
      'showPass' => lang('Account.show_password'),
      'hidePass' => lang('Account.hide_password'),
  ], JSON_UNESCAPED_UNICODE) ?>;

    // ปุ่มลูกตาของช่องรหัสผ่าน (ทั้ง 2 ช่อง)
    (function () {
      document.querySelectorAll('[data-pw]').forEach(function (btn) {
        var input = document.getElementById(btn.dataset.pw);
        btn.addEventListener('click', function () {
          var show = input.type === 'password';
          input.type = show ? 'text' : 'password';
          btn.classList.toggle('is-shown', show);
          btn.setAttribute('aria-pressed', show ? 'true' : 'false');
          btn.setAttribute('aria-label', show ? I18N_ERR.hidePass : I18N_ERR.showPass);
          input.focus();
        });
      });
    })();

    // ตรวจกติกาในหน้า (รหัสพนักงาน/ชื่อ/เบอร์/ความยาวรหัส/ยืนยันตรงกัน) + ผูกปุ่มส่งกับ checkbox
    (function () {
      var cb  = document.getElementById('agree');
      var btn = document.getElementById('regSubmit');
      if (!cb || !btn) return;

      var RE_EMP   = /^[a-zA-Z0-9]{1,8}$/;   // อังกฤษ+ตัวเลข ≤ 8
      var RE_NAME  = /^[\p{L}\p{M}\s]+$/u;   // ตัวอักษร (ไทย/อังกฤษ) + สระ/วรรณยุกต์ (\p{M}) + เว้นวรรค · ห้ามเลข/สัญลักษณ์
      var RE_PHONE = /^0(?:[689]\d{8}|[2-7]\d{7})$/;   // มือถือ 10 หลัก (06/08/09) หรือเบอร์บ้าน 9 หลัก (02-07)

      // ช่องที่ตรวจสด: [input, กล่อง error, ฟังก์ชันตรวจ -> '' = ผ่าน]
      var checks = [
        ['empId',    function (v) { return RE_EMP.test(v)   ? '' : I18N_ERR.emp; }],
        ['name',     function (v) { return v.length > 150 ? I18N_ERR.nameMax : (RE_NAME.test(v) ? '' : I18N_ERR.name); }],
        ['phone',    function (v) { return RE_PHONE.test(v) ? '' : I18N_ERR.phone; }],
        ['password', function (v) { return v.length >= 8    ? '' : I18N_ERR.passMin; }],
        ['confirm',  function (v) { return v === document.getElementById('password').value ? '' : I18N_ERR.confirm; }],
      ].map(function (c) {
        return { input: document.getElementById(c[0]), box: document.getElementById('err-' + c[0]), test: c[1] };
      });

      function sync() {
        var bad = 0;
        checks.forEach(function (c) {
          // error จาก server ยังคาอยู่จนกว่าผู้ใช้จะแก้ช่องนั้น - นับรวมด้านล่าง
          if (c.box.dataset.server) return;
          var v   = c.input.value;
          var msg = v.trim() === '' ? '' : c.test(v);   // ว่างไม่เตือน - ปล่อย required จับตอนกดส่ง
          c.box.textContent = msg;
          c.box.classList.toggle('is-shown', !!msg);
          c.input.classList.toggle('is-invalid', !!msg);
          if (msg) { c.input.setAttribute('aria-invalid', 'true'); bad++; } else { c.input.removeAttribute('aria-invalid'); }
        });
        // error จาก server ที่ยังไม่ได้แก้ - รวมช่องที่ไม่ได้ตรวจสด (แผนก/ตำแหน่ง/username)
        if (document.querySelector('.form-err[data-server]')) bad++;
        btn.disabled = !cb.checked || bad > 0;
        btn.title    = !cb.checked ? I18N_ERR.needTerms : (bad > 0 ? I18N_ERR.fixErrors : '');
      }

      checks.forEach(function (c) {
        c.input.addEventListener('input', function () { delete c.box.dataset.server; sync(); });
        c.input.addEventListener('change', sync);
      });
      // แก้รหัสผ่านแล้วต้องตรวจช่องยืนยันใหม่ด้วย
      document.getElementById('password').addEventListener('input', function () {
        delete document.getElementById('err-confirm').dataset.server;
      });
      cb.addEventListener('change', sync);

      // เคลียร์ error จาก server ของช่องที่ไม่ได้ตรวจสด (select/username) เมื่อผู้ใช้แก้
      ['dept', 'position', 'username'].forEach(function (n) {
        var el = document.getElementById(n), box = document.getElementById('err-' + n);
        if (!el || !box) return;
        var clear = function () {
          delete box.dataset.server;
          box.textContent = '';
          box.classList.remove('is-shown');
          el.classList.remove('is-invalid');
          el.removeAttribute('aria-invalid');
          sync();
        };
        el.addEventListener('input', clear);
        el.addEventListener('change', clear);
      });

      // ช่องบังคับกรอกทั้งหมด: [id, ข้อความตอนว่าง]
      var reqFields = [
        ['empId', I18N_ERR.fieldReq], ['name', I18N_ERR.fieldReq], ['dept', I18N_ERR.deptReq],
        ['position', I18N_ERR.posReq], ['phone', I18N_ERR.fieldReq], ['username', I18N_ERR.fieldReq],
        ['password', I18N_ERR.fieldReq], ['confirm', I18N_ERR.fieldReq],
      ];

      btn.form.addEventListener('submit', function (e) {
        var first = null;
        reqFields.forEach(function (r) {
          var el = document.getElementById(r[0]), box = document.getElementById('err-' + r[0]);
          if (el.value.trim() !== '') return;
          box.textContent = r[1];
          box.classList.add('is-shown');
          el.classList.add('is-invalid');
          el.setAttribute('aria-invalid', 'true');
          if (! first) first = el;
        });
        if (first) { e.preventDefault(); first.focus(); }
      });

      sync();   // ตั้งค่าเริ่มต้น (รวมกรณี old() ค้างหลัง error)

      // มี error จาก server -> โฟกัสช่องแรกที่ผิด · ไม่มี -> โฟกัสช่องแรกของฟอร์ม
      var firstBad = document.querySelector('.form-err.is-shown');
      if (firstBad) {
        var f = firstBad.parentElement.querySelector('.form-input') || firstBad.previousElementSibling;
        if (f && f.focus) f.focus();
      } else {
        document.getElementById('empId').focus();
      }
    })();
  </script>
</body>
</html>
