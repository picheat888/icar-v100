<?php
/**
 * หน้าสมัครสมาชิก — ดีไซน์ 2 แผง (hero teal ซ้าย + ฟอร์มขวา) ตาม docs/mockuo-master
 * select แผนก/ตำแหน่ง ใช้ id เป็น value (map ตรงกับ FK), โพสต์ไป Auth\RegisterController::attempt
 * รับ: $departments, $positions (array จาก DB)
 */
helper(['vite', 'form']);
$errors    = session('errors') ?? [];
$firstErr  = is_array($errors) && $errors ? reset($errors) : '';
?>
<!DOCTYPE html>
<html lang="<?= esc(service('request')->getLocale()) ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= lang('Account.register_title') ?> — iCar Booking</title>
  <?= vite_css() ?>
</head>
<body>
  <div class="reg-wrap">

    <!-- ===== แผงซ้าย: hero teal ===== -->
    <aside class="reg-hero">
      <!-- โลโก้ -->
      <div class="brand brand--on-teal reg-brand">
        <div class="icon-box brand-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l1.6-4.7A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.3L21 13v5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H6.5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><circle cx="7" cy="16" r="1"/><circle cx="17" cy="16" r="1"/></svg>
        </div>
        <div class="brand-text">
          <div class="brand-name">INABA</div>
          <div class="brand-sub">FLEET BOOKING</div>
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

        <!-- หัวเรื่อง + ลิงก์เข้าสู่ระบบ -->
        <div class="reg-head">
          <div>
            <h2 class="title title--xl"><?= lang('Account.register_title') ?></h2>
            <p class="subtext"><?= lang('Account.reg_hint_pre') ?><span class="reg-req">*</span><?= lang('Account.reg_hint_post') ?></p>
          </div>
          <div class="reg-head-right">
            <?= view('templates/lang_switch') ?>
            <p class="subtext"><?= lang('Account.have_account') ?>
              <a href="<?= url_to('login') ?>" class="reg-link"><?= lang('Account.login_link') ?></a>
            </p>
          </div>
        </div>

        <?php if ($firstErr): ?>
          <div class="alert-error"><?= esc($firstErr) ?></div>
        <?php endif; ?>

        <form action="<?= url_to('register') ?>" method="post">
          <?= csrf_field() ?>
          <div class="card reg-card">
            <div class="title title--sm reg-cardhead"><?= lang('Account.emp_info') ?></div>
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
                  <label class="form-label reg-label"><?= lang('Account.emp_id') ?> <span class="reg-req">*</span></label>
                  <input class="form-input reg-input" name="empId" value="<?= esc(old('empId')) ?>" placeholder="<?= esc(lang('Account.emp_id_ph'), 'attr') ?>" maxlength="8" required>
                  <div id="err-empId" class="reg-err"></div>
                </div>
                <div>
                  <label class="form-label reg-label"><?= lang('Account.full_name') ?> <span class="reg-req">*</span></label>
                  <input class="form-input reg-input" name="name" value="<?= esc(old('name')) ?>" placeholder="<?= esc(lang('Account.full_name_ph'), 'attr') ?>" required>
                  <div id="err-name" class="reg-err"></div>
                </div>

                <div>
                  <label class="form-label reg-label"><?= lang('Account.department') ?> <span class="reg-req">*</span></label>
                  <select class="form-input reg-input reg-select" name="dept" required>
                    <option value=""><?= lang('Account.choose_dept') ?></option>
                    <?php foreach ($departments as $d): ?>
                      <option value="<?= esc($d['id'], 'attr') ?>" <?= old('dept') == $d['id'] ? 'selected' : '' ?>><?= esc($d['name']) ?></option>
                    <?php endforeach; ?>
                  </select>
                </div>
                <div>
                  <label class="form-label reg-label"><?= lang('Account.position') ?> <span class="reg-req">*</span></label>
                  <select class="form-input reg-input reg-select" name="position" required>
                    <option value=""><?= lang('Account.choose_pos') ?></option>
                    <?php foreach ($positions as $p): ?>
                      <option value="<?= esc($p['id'], 'attr') ?>" <?= old('position') == $p['id'] ? 'selected' : '' ?>><?= esc($p['name']) ?></option>
                    <?php endforeach; ?>
                  </select>
                </div>

                <div>
                  <label class="form-label reg-label"><?= lang('Account.phone') ?> <span class="reg-req">*</span></label>
                  <input class="form-input reg-input" name="phone" value="<?= esc(old('phone')) ?>" placeholder="<?= esc(lang('Account.phone_ph'), 'attr') ?>" maxlength="10" inputmode="numeric" required>
                  <div id="err-phone" class="reg-err"></div>
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
                <label class="form-label reg-label">Username <span class="reg-req">*</span></label>
                <input class="form-input reg-input" name="username" value="<?= esc(old('username')) ?>" placeholder="<?= esc(lang('Account.username_ph_reg'), 'attr') ?>" autocomplete="username" required>
                <div class="subtext subtext--faint reg-hint"><?= lang('Account.username_hint') ?></div>
              </div>

              <div class="reg-grid">
                <div>
                  <label class="form-label reg-label"><?= lang('Account.password') ?> <span class="reg-req">*</span></label>
                  <input class="form-input reg-input" name="password" type="password" placeholder="<?= esc(lang('Account.password_ph_reg'), 'attr') ?>" autocomplete="new-password" required>
                </div>
                <div>
                  <label class="form-label reg-label"><?= lang('Account.confirm_pass') ?> <span class="reg-req">*</span></label>
                  <input class="form-input reg-input" name="confirm" type="password" placeholder="<?= esc(lang('Account.confirm_ph'), 'attr') ?>" autocomplete="new-password" required>
                </div>
              </div>

              <!-- ยอมรับข้อกำหนด -->
              <label class="reg-terms">
                <input type="checkbox" id="agree" name="terms" value="1" required <?= old('terms') ? 'checked' : '' ?> class="reg-checkbox">
                <span><?= lang('Account.terms_pre') ?><a href="#" class="reg-termslink"><?= lang('Account.terms_link') ?></a><?= lang('Account.terms_post') ?></span>
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
                <div class="subtext subtext--faint"><?= lang('Account.approve_note') ?></div>
              </div>

            </div>
          </div>
        </form>
      </div>
    </main>
  </div>

  <script>
  var I18N_ERR = <?= json_encode([
      'emp'   => lang('Account.err_empId'),
      'name'  => lang('Account.err_name'),
      'phone' => lang('Account.err_phone'),
  ], JSON_UNESCAPED_UNICODE) ?>;
    // ตรวจกติกา 3 ช่อง (รหัสพนักงาน/ชื่อ/เบอร์) + ผูกปุ่มส่งกับ checkbox ยอมรับข้อกำหนด
    (function () {
      var cb    = document.getElementById('agree');
      var btn   = document.getElementById('regSubmit');
      var empId = document.querySelector('[name="empId"]');
      var name  = document.querySelector('[name="name"]');
      var phone = document.querySelector('[name="phone"]');
      var errEmp = document.getElementById('err-empId');
      var errName = document.getElementById('err-name');
      var errPhone = document.getElementById('err-phone');
      if (!cb || !btn) return;

      var RE_EMP   = /^[a-zA-Z0-9]{1,8}$/;                  // อังกฤษ+ตัวเลข ≤ 8
      var RE_NAME  = /^[\p{L}\p{M}\s]+$/u;   // ตัวอักษร (ไทย/อังกฤษ) + สระ/วรรณยุกต์ (\p{M}) + เว้นวรรค · ห้ามเลข/สัญลักษณ์
      var RE_PHONE = /^[0-9]{1,10}$/;                        // ตัวเลข ≤ 10

      // ตรวจ 1 ช่อง: คืน '' ถ้าผ่าน หรือข้อความเตือน (ว่างไม่เตือน — ปล่อย required จับตอนกดส่ง)
      function chk(el, re, msg) {
        var v = el.value;
        if (v.trim() === '') return '';
        return re.test(v) ? '' : msg;
      }
      // แสดง/ซ่อนข้อความเตือน + ขอบแดงของช่อง
      function apply(input, box, msg) {
        box.textContent = msg;
        box.classList.toggle('is-shown', !!msg);
        input.classList.toggle('is-invalid', !!msg);
      }

      function sync() {
        var e1 = chk(empId, RE_EMP,  I18N_ERR.emp);
        var e2 = chk(name,  RE_NAME, I18N_ERR.name);
        var e3 = chk(phone, RE_PHONE, I18N_ERR.phone);
        apply(empId, errEmp, e1);
        apply(name, errName, e2);
        apply(phone, errPhone, e3);
        // ปุ่มกดได้เมื่อ: ติ๊กข้อกำหนด + ไม่มีข้อผิดพลาดรูปแบบทั้ง 3 ช่อง
        btn.disabled = !(cb.checked && !e1 && !e2 && !e3);
      }

      [cb, empId, name, phone].forEach(function (el) {
        if (!el) return;
        el.addEventListener('input', sync);
        el.addEventListener('change', sync);
      });
      sync();   // ตั้งค่าเริ่มต้น (รวมกรณี old() ค้างหลัง error)
    })();
  </script>
</body>
</html>
