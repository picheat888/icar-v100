<?php
// เนื้อหาในแถบหมายเหตุของการ์ด - $title = หัวแถบ · $notes = ข้อความ (เป็น HTML แล้ว)
// กรอบและพื้นสีอยู่บนเซลล์ .card-bot ที่ครอบอยู่ ไม่ใช่ที่นี่
?>
<div class="ins-title"><?= esc($title) ?></div>
<table width="100%">
  <?php foreach ($notes as $note) : ?>
    <tr>
      <td width="9" valign="top" class="ins-bullet">&bull;</td>
      <td class="ins-text"><?= $note ?></td>
    </tr>
  <?php endforeach ?>
</table>
