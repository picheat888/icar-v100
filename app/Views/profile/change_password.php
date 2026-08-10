<?= $this->extend($layout) ?>

<?= $this->section('content') ?>
<?php
$errors   = session('errors') ?? [];
$firstErr = session('error') ?? (is_array($errors) && $errors ? reset($errors) : '');
?>

<div class="cp-overlay" id="cpOverlay">
  <div class="cp-modal">

    <div class="cp-cover"></div>
    <button type="button" class="cp-x" data-cp-close aria-label="<?= esc(lang('Common.close'), 'attr') ?>">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>

    <!-- หัวข้อ (กึ่งกลาง) -->
    <div class="cp-titlewrap">
      <div class="title cp-title"><?= lang('Profile.change_password_title') ?></div>
      <div class="subtext subtext--sm cp-sub"><?= lang('Profile.change_password_modal_sub') ?></div>
    </div>

    <!-- ไอคอนกุญแจ กึ่งกลาง คั่นหัวข้อกับช่องกรอก -->
    <div class="cp-iconwrap">
      <div class="icon-box cp-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
    </div>

    <div class="cp-body">
      <?php if ($firstErr): ?>
        <div class="alert-error cp-err"><?= esc($firstErr) ?></div>
      <?php endif; ?>

      <form action="<?= site_url('change-password') ?>" method="post">
        <?= csrf_field() ?>

        <label class="form-label"><?= lang('Profile.cur_password_label') ?></label>
        <div class="field">
          <input name="curPass" type="password" placeholder="<?= esc(lang('Profile.cur_password_ph'), 'attr') ?>" autocomplete="current-password" class="form-input">
          <button type="button" class="field-eye" tabindex="-1"></button>
        </div>

        <label class="form-label"><?= lang('Profile.new_password_label') ?></label>
        <div class="field">
          <input name="newPass" type="password" placeholder="<?= esc(lang('Profile.new_password_ph'), 'attr') ?>" autocomplete="new-password" class="form-input">
          <button type="button" class="field-eye" tabindex="-1"></button>
        </div>

        <label class="form-label"><?= lang('Profile.confirm_password_label') ?></label>
        <div class="field">
          <input name="confirmPass" type="password" placeholder="<?= esc(lang('Profile.confirm_password_ph_full'), 'attr') ?>" autocomplete="new-password" class="form-input">
          <button type="button" class="field-eye" tabindex="-1"></button>
        </div>

        <div class="cp-foot">
          <a href="#" class="btn-ghost cp-cancel" data-cp-close><?= lang('Common.cancel') ?></a>
          <button type="submit" class="btn-primary cp-save"><?= lang('Profile.save_new_password_btn') ?></button>
        </div>
      </form>
    </div>

  </div>
</div>

<script>
  (function () {
    // ปุ่มลูกตา: สลับซ่อน/แสดงรหัสผ่านของช่องในกล่องเดียวกัน
    var eyeOpen = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9aa7b2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
    var eyeOff = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9aa7b2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.5 0-10-8-10-8a18.4 18.4 0 0 1 5.06-5.94M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/></svg>';
    document.querySelectorAll('.field-eye').forEach(function (btn) {
      btn.innerHTML = eyeOff;
      btn.addEventListener('click', function () {
        var input = btn.parentElement.querySelector('input');
        var reveal = input.type === 'password';
        input.type = reveal ? 'text' : 'password';
        btn.innerHTML = reveal ? eyeOpen : eyeOff;
      });
    });

    // ปิดโมดัล = กลับหน้าก่อนหน้า (ไม่มีประวัติ → ไปหน้าข้อมูลส่วนตัว)
    var ov = document.getElementById('cpOverlay');
    var back = '<?= site_url('profile') ?>';
    function close(e) { if (e) e.preventDefault(); if (window.history.length > 1) { window.history.back(); } else { window.location.href = back; } }
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.querySelectorAll('[data-cp-close]').forEach(function (b) { b.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  })();
</script>
<?= $this->endSection() ?>
