<?php

use App\Libraries\Pdf;

// ช่องคำอธิบายสีของโดนัท 1 แถว - $group = รายการในแถวนี้
?>
<?php foreach ($group as $g) : ?>
  <td class="lg-dot"><svg width="9" height="9" viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><rect width="9" height="9" rx="2" fill="<?= esc($g['color']) ?>"/></svg></td>
  <td>
    <div class="lg-name"><?= esc($g['label']) ?></div>
    <div class="lg-val"><?= Pdf::num(esc($g['value']) . ' (' . esc($g['pct']) . '%)') ?></div>
  </td>
<?php endforeach ?>
