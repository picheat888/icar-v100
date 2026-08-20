<?php
/**
 * โครงร่างกันจอขาวก่อน React mount - วางเป็นลูกของ <div id="..."> ของ island
 * createRoot().render() จะล้างของพวกนี้ทิ้งเองตอน mount
 *
 * variant: table (การ์ดขาว + แถวบาร์) | cards (grid การ์ด) | lines (แถวบาร์ไม่มีกรอบ) | box (กล่องผืนเดียว)
 * rows: จำนวนแถว/การ์ด
 */
$variant = $variant ?? 'table';
$rows    = (int) ($rows ?? 5);
$widths  = [60, 80, 40, 100, 60];
$loading = lang('Common.loading');
?>
<?php if ($variant === 'box'): ?>
  <div class="sk-box" role="status" aria-busy="true" aria-label="<?= esc($loading) ?>"></div>
<?php elseif ($variant === 'cards'): ?>
  <div class="sk-grid" role="status" aria-busy="true" aria-label="<?= esc($loading) ?>">
    <?php for ($i = 0; $i < $rows; $i++): ?>
      <div class="sk-card">
        <span class="sk-bar sk-bar--title sk-bar--w60"></span>
        <span class="sk-bar sk-bar--w100"></span>
        <span class="sk-bar sk-bar--w80"></span>
        <span class="sk-bar sk-bar--w60"></span>
      </div>
    <?php endfor ?>
  </div>
<?php else: ?>
  <div class="<?= $variant === 'lines' ? 'sk-list' : 'sk-panel sk-list' ?>" role="status" aria-busy="true" aria-label="<?= esc($loading) ?>">
    <?php for ($i = 0; $i < $rows; $i++): ?>
      <div class="sk-row">
        <span class="sk-bar sk-bar--title sk-bar--w40"></span>
        <span class="sk-bar sk-bar--w<?= $widths[$i % count($widths)] ?>"></span>
      </div>
    <?php endfor ?>
  </div>
<?php endif ?>
