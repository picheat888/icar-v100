<?php
// ท้ายทุกหน้าของ PDF - {PAGENO}/{nbpg} mPDF แทนค่าให้เอง
// ตัวเลขต้องระบุฟอนต์ตรงนี้เอง เพราะ footer ถูกประกอบก่อน CSS ของตัวรายงาน
$num = static fn (string $v): string => '<span style="font-family: sarabunnum">' . $v . '</span>';
?>
<table width="100%" style="border-top: 0.6pt solid #e7ebee; font-family: sarabun; font-size: 6.5pt; color: #7a8794">
  <tr>
    <td width="30%"><?= $num(esc(lang('Report.printed_on', ['date' => thai_date(date('Y-m-d'))]))) ?></td>
    <td width="40%" align="center"><?= esc(lang('Report.scope_label')) ?> <?= esc($scopeText) ?></td>
    <td width="30%" align="right"><?= $num(lang('Report.page_no')) ?></td>
  </tr>
</table>
