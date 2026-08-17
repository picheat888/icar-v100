<?= $this->extend($layout ?? 'layouts/user') ?>

<?= $this->section('content') ?>
<?php
// backUrl = หน้าปฏิทินการจองรถของ role นั้น — ใช้ทั้งปุ่มย้อนกลับ และเป็นปลายทางสำรองของ island
$backUrl = $backUrl ?? site_url('timeline');
$props   = [
    'endpoints' => ['store' => site_url('book'), 'availability' => site_url('book/availability')],
    'csrf'      => csrf_hash(),
    'baseUrl'   => rtrim(base_url(), '/') . '/',
    'cars'      => $cars,
    'backUrl'   => $backUrl,
];
?>
<!-- ปุ่มย้อนกลับไปหน้าปฏิทินการจองรถ -->
<a href="<?= esc($backUrl, 'attr') ?>" class="btn-ghost book-back">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
  <?= lang('Common.back') ?>
</a>
<div id="booking-form" data-props='<?= esc(json_encode($props), 'attr') ?>'></div>
<?= vite_asset('resources/js/entries/booking-form.jsx') ?>
<?= $this->endSection() ?>
