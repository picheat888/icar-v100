<?php
/**
 * การ์ด "กำลังพัฒนา" - เนื้อหา placeholder ใช้ร่วมกันทุก role
 * รับ: $pageTitle
 */
$pageTitle = $pageTitle ?? lang('Page.coming_soon_default_title');
?>
<div class="empty-card">
  <div class="icon-box empty-icon">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
  </div>
  <h2 class="title"><?= esc($pageTitle) ?></h2>
  <p class="subtext"><?= lang('Page.coming_soon_sub') ?></p>
</div>
