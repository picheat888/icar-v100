<?= $this->extend($layout) ?>

<?= $this->section('content') ?>
<?php
$roleLabels = ['admin' => 'Admin', 'user' => lang('Nav.role_user'), 'driver' => lang('Nav.role_driver')];
$statusMap  = [
    'approved' => [lang('Profile.status_approved'), '#e7f4ee', '#16855a'],
    'pending'  => [lang('Profile.status_pending'), '#fdf0e0', '#9a5a12'],
    'rejected' => [lang('Profile.status_rejected'), '#fbecea', '#c0392b'],
];
$st       = $statusMap[$profile['status'] ?? 'approved'] ?? $statusMap['approved'];
$since    = $profile['created_at'] ?? null;
$sinceTxt = $since ? date('d/m/Y', strtotime($since)) : '-';

// error/success ของฟอร์มเปลี่ยนรหัสผ่าน
$errors = session('errors') ?? [];
$pwErr  = session('error') ?? (is_array($errors) && $errors ? reset($errors) : '');

// ช่องอ่านอย่างเดียว (label + กล่องเทา)
$ro = static function (string $label, ?string $value): void {
    $v = ($value !== null && $value !== '') ? $value : '-';
    echo '<div><label class="form-label">' . esc($label) . '</label><div class="pf-ro">' . esc($v) . '</div></div>';
};
?>

<h1 class="title title--lg"><?= esc($pageTitle ?? lang('Profile.title')) ?></h1>

<?php if (session('message')): ?>
  <div class="alert-success"><?= esc(session('message')) ?></div>
<?php endif; ?>

<div class="card">

  <!-- หัวการ์ด -->
  <div class="pf-header">
    <div class="icon-box icon-box--round pf-avatar"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
    <div class="pf-hmeta">
      <div class="pf-name"><?= esc($profile['full_name'] ?? $user->username) ?></div>
      <div class="pf-since">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <?= lang('Profile.member_since') ?> <?= esc($sinceTxt) ?>
      </div>
    </div>
    <span class="pill pill--teal pf-role">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <?= esc($roleLabels[$role] ?? $role) ?>
    </span>
  </div>

  <div class="pf-cols">

    <!-- ซ้าย: ข้อมูลส่วนตัว (อ่านอย่างเดียว) -->
    <div class="pf-left">
      <div class="pf-sechead">
        <div class="icon-box icon-box--teal"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M7 16a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2"/><line x1="14" y1="9" x2="18" y2="9"/><line x1="14" y1="13" x2="18" y2="13"/></svg></div>
        <div>
          <div class="title title--sm"><?= lang('Profile.section_personal') ?></div>
          <div class="subtext subtext--faint pf-secsub"><?= lang('Profile.section_personal_sub') ?></div>
        </div>
      </div>

      <div class="pf-mb"><?php $ro(lang('Account.full_name'), $profile['full_name'] ?? null); ?></div>
      <div class="pf-pair pf-mb">
        <?php $ro(lang('Account.emp_id'), $profile['emp_id'] ?? null); ?>
        <?php $ro(lang('Account.phone'), $profile['phone'] ?? null); ?>
      </div>
      <div class="pf-pair">
        <?php $ro(lang('Account.department'), $deptName); ?>
        <?php $ro(lang('Account.position'), $posName); ?>
      </div>
      <div class="pf-note">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <?= lang('Profile.admin_managed_note') ?>
      </div>
    </div>

    <!-- ขวา: เปลี่ยนรหัสผ่าน -->
    <div class="pf-right">
      <div class="pf-sechead">
        <div class="icon-box icon-box--teal"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
        <div>
          <div class="title title--sm"><?= lang('Profile.change_password_title') ?></div>
          <div class="subtext subtext--faint pf-secsub"><?= lang('Profile.change_password_sub_index') ?></div>
        </div>
      </div>

      <?php if ($pwErr): ?><div class="alert-error pf-err"><?= esc($pwErr) ?></div><?php endif; ?>

      <label class="form-label">Username</label>
      <div class="field"><input type="text" value="<?= esc($user->username) ?>" class="form-input" readonly></div>

      <form action="<?= site_url('change-password') ?>" method="post">
        <?= csrf_field() ?>

        <label class="form-label"><?= lang('Profile.cur_password_label') ?></label>
        <div class="field">
          <input name="curPass" type="password" placeholder="<?= esc(lang('Profile.cur_password_ph'), 'attr') ?>" autocomplete="current-password" class="form-input">
          <button type="button" class="field-eye" tabindex="-1"></button>
        </div>

        <div class="pf-pair">
          <div>
            <label class="form-label"><?= lang('Profile.new_password_label') ?></label>
            <div class="field">
              <input name="newPass" type="password" placeholder="<?= esc(lang('Profile.new_password_ph'), 'attr') ?>" autocomplete="new-password" class="form-input">
              <button type="button" class="field-eye" tabindex="-1"></button>
            </div>
          </div>
          <div>
            <label class="form-label"><?= lang('Profile.confirm_password_label') ?></label>
            <div class="field">
              <input name="confirmPass" type="password" placeholder="<?= esc(lang('Profile.confirm_password_ph_short'), 'attr') ?>" autocomplete="new-password" class="form-input">
              <button type="button" class="field-eye" tabindex="-1"></button>
            </div>
          </div>
        </div>

        <button type="submit" class="btn-primary pf-btn"><?= lang('Profile.change_password_btn') ?></button>
      </form>
    </div>

  </div>
</div>

<script>
  // ปุ่มลูกตา: สลับซ่อน/แสดงรหัสผ่านของช่องในกล่องเดียวกัน
  (function () {
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
  })();
</script>
<?= $this->endSection() ?>
