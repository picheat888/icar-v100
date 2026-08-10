<?= $this->extend($layout ?? 'layouts/user') ?>

<?= $this->section('content') ?>
<?php
$props = [
    'endpoints' => ['store' => site_url('book'), 'availability' => site_url('book/availability')],
    'csrf'      => csrf_hash(),
    'baseUrl'   => rtrim(base_url(), '/') . '/',
    'cars'      => $cars,
];
?>
<!-- ปุ่มย้อนกลับไปหน้าตารางการใช้รถ -->
<a href="<?= esc($backUrl ?? site_url('timeline'), 'attr') ?>" class="btn-ghost book-back">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
  <?= lang('Common.back') ?>
</a>
<div id="booking-form" data-props='<?= esc(json_encode($props), 'attr') ?>'></div>
<?= vite_asset('resources/js/entries/booking-form.jsx') ?>
<?= $this->endSection() ?>
