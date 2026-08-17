<?php
// ตัวสลับภาษา TH | EN - ตัวที่ตรง locale ปัจจุบัน = active (teal)
$cur = service('request')->getLocale();
$item = fn (string $code, string $label) =>
    '<a href="' . esc(site_url('lang/' . $code), 'attr') . '" '
    . 'class="lang-btn' . ($cur === $code ? ' active' : '') . '">' . esc($label) . '</a>';
?>
<div class="lang-switch">
  <?= $item('th', 'TH') ?><?= $item('en', 'EN') ?>
</div>
