<?php
/**
 * Header - แถบบนของ app shell (hamburger + โลโก้ + ชื่อหน้า + เมนูโปรไฟล์)
 * รับ: $role, $pageTitle, $pageSubtitle
 * มี <meta name="csrf"> ให้ React island อ่านไปแนบตอน POST
 */
$role         = $role ?? 'user';
$pageTitle    = $pageTitle ?? '';
$pageSubtitle = $pageSubtitle ?? '';

// ผู้ใช้ปัจจุบันจาก Shield - ใช้เช็ค force_reset ด้านล่าง
$user = function_exists('auth') ? auth()->user() : null;

// ชื่อที่แสดงข้าง avatar - ชื่อ-นามสกุลจาก user_profiles
helper('nav');
$name = current_full_name();

// ป้ายบทบาท - แปลตาม locale ปัจจุบัน
$roleLabels = ['admin' => lang('Nav.role_admin'), 'user' => lang('Nav.role_user'), 'driver' => lang('Nav.role_driver')];
$roleLabel  = $roleLabels[$role] ?? $role;
?>
<header class="app-header">
  <div class="app-header-left">
    <!-- ปุ่มยุบ/เปิด sidebar -->
    <button type="button" id="sidebar-toggle" class="icon-box hdr-burger">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
    <div class="app-pagetitle">
      <h1><?= esc($pageTitle) ?></h1>
      <?php if ($pageSubtitle !== ''): ?>
        <p><?= esc($pageSubtitle) ?></p>
      <?php endif; ?>
    </div>
  </div>

  <!-- ขวา: สลับภาษา + กระดิ่งแจ้งเตือน + โปรไฟล์ -->
  <div class="app-header-right">
    <?php
    // popup บังคับเปลี่ยนรหัส - เรนเดอร์เฉพาะ user ที่ถูกตั้ง force_reset (เด้งครอบทั้งแอปทันทีหลัง login)
    if ($user && $user->requiresPasswordReset()):
        $frProps = ['endpoint' => site_url('force-reset-password'), 'logoutUrl' => url_to('logout')];
    ?>
      <div id="force-reset-modal" data-props='<?= esc(json_encode($frProps), 'attr') ?>'></div>
      <?= vite_asset('resources/js/entries/force-reset-modal.jsx') ?>
    <?php endif; ?>

    <!-- ตัวสลับภาษา TH | EN (บนมือถือย้ายไปในเมนูโปรไฟล์) -->
    <span class="hdr-lang"><?= $this->include('templates/lang_switch') ?></span>

    <?php
    $notiProps = ['endpoints' => [
        'data'    => site_url('notifications/data'),
        'read'    => site_url('notifications/read'),
        'readAll' => site_url('notifications/read-all'),
    ]];
    ?>
    <div id="notification-bell" data-props='<?= esc(json_encode($notiProps), 'attr') ?>'></div>
    <?= vite_asset('resources/js/entries/notification-bell.jsx') ?>

  <!-- โปรไฟล์ -->
  <div class="hdr-profile">
    <button type="button" id="profile-toggle" class="hdr-profile-btn">
      <div class="hdr-profile-meta">
        <div class="hdr-username"><?= esc($name) ?></div>
        <div class="pill pill--teal hdr-role"><?= esc($roleLabel) ?></div>
      </div>
      <div class="icon-box icon-box--round hdr-avatar">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <svg class="hdr-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa7b2" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </button>

    <!-- เมนู dropdown (ซ่อนไว้ก่อน เปิดด้วย .is-open) -->
    <div id="profile-menu" class="hdr-menu">
      <!-- ตัวสลับภาษา (เฉพาะมือถือ - บนคอมอยู่แถบบน) - แถวเมนูเต็ม แตะง่าย -->
      <?php $curLoc = service('request')->getLocale(); ?>
      <a href="<?= esc(site_url('lang/th'), 'attr') ?>" class="hdr-menu-lang<?= $curLoc === 'th' ? ' active' : '' ?>">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>ภาษาไทย
      </a>
      <a href="<?= esc(site_url('lang/en'), 'attr') ?>" class="hdr-menu-lang<?= $curLoc === 'en' ? ' active' : '' ?>">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>English
      </a>
      <div class="hdr-menu-sep hdr-menu-sep--lang"></div>
      <a href="<?= site_url('profile') ?>" class="hdr-menu-item">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b6b7a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><?= lang('Nav.profile') ?>
      </a>
      <div class="hdr-menu-sep"></div>
      <a href="<?= url_to('logout') ?>" class="hdr-menu-logout">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg><?= lang('Nav.logout') ?>
      </a>
    </div>
  </div>
  </div>
</header>
