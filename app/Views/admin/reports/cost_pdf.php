<?php

use App\Libraries\Pdf;

// ตัวย่อสำหรับครอบตัวเลข - ต้องใช้ทุกค่าที่มีจุดทศนิยม ไม่งั้นจุดจะกลายเป็นกล่องว่าง
$n = static fn (string $v): string => Pdf::num($v);
?>
<style>
  body {
    font-family: sarabun;
    font-size: 8pt;
    color: #243039;
  }

  /* ตัวเลขและวันที่ - ปิด OTL ไว้ที่ฟอนต์นี้ */
  .num {
    font-family: sarabunnum;
  }

  /* หัวรายงาน */
  .hd {
    border-bottom: 1.2pt solid #e7ebee;
  }

  .hd td {
    padding-bottom: 10pt;
    vertical-align: middle;
  }

  .hd-name {
    font-size: 14pt;
    font-weight: bold;
    color: #21215c;
    letter-spacing: 1pt;
  }

  .hd-sub {
    font-size: 6.5pt;
    font-weight: bold;
    color: #0c8b87;
    letter-spacing: 2pt;
  }

  .hd-th {
    font-size: 16pt;
    font-weight: bold;
  }

  .hd-en {
    font-size: 7.5pt;
    color: #6b7884;
    letter-spacing: 1pt;
  }

  .chip {
    background-color: #0a5f5c;
    color: #ffffff;
    padding: 6pt 10pt 7pt;
    text-align: left;
  }

  .chip-label {
    font-size: 6.5pt;
    color: #cfe6e3;
  }

  .chip-val {
    font-size: 8.5pt;
    font-weight: bold;
  }

  /* การ์ดตัวเลข */
  .kpis {
    border: 0.6pt solid #e7ebee;
  }

  .kpi {
    border-right: 0.6pt solid #f0f3f5;
    padding: 8pt 4pt 10pt;
    text-align: center;
  }

  .kpi-last {
    border-right: none;
  }

  .kpi-label {
    font-size: 6.5pt;
    font-weight: bold;
    color: #54616c;
  }

  .kpi-val {
    font-size: 15pt;
    font-weight: bold;
    color: #0a716e;
  }

  .kpi-unit {
    font-size: 6pt;
    color: #7a8794;
  }

  /* กล่องจัดกราฟให้อยู่กึ่งกลางการ์ด - mPDF ทำตาม align ของ td เท่านั้น */
  .chart-mid {
    padding: 0;
    border: none;
  }

  /* การ์ดกราฟ */
  .card {
    border: 0.6pt solid #e7ebee;
    padding: 6pt 7pt;
    vertical-align: top;
  }

  .card-title {
    font-size: 8pt;
    font-weight: bold;
    color: #0a716e;
    padding-bottom: 3pt;
  }

  /* ตัวหนังสือชิดซ้ายเสมอ - ช่องที่ครอบตั้ง align=center ไว้เพื่อดันทั้งตาราง ไม่ใช่ข้อความ */
  .lg td {
    font-size: 6.5pt;
    color: #54616c;
    padding: 2pt 6pt 2pt 0;
    vertical-align: top;
    text-align: left;
  }

  .lg-dot {
    width: 9pt;
    padding-right: 2pt;
  }

  .lg-name {
    font-size: 7pt;
    color: #1f2a33;
    font-weight: bold;
  }

  .lg-val {
    white-space: nowrap;
  }

  /* ตารางรายละเอียด */
  .sec-title {
    font-size: 10pt;
    font-weight: bold;
    color: #0a716e;
    padding: 12pt 0 5pt;
  }

  .tbl {
    border: 0.6pt solid #e7ebee;
  }

  .tbl th {
    background-color: #0a5f5c;
    color: #ffffff;
    font-size: 7pt;
    font-weight: bold;
    padding: 6pt 5pt;
    text-align: left;
  }

  .tbl td {
    font-size: 7.5pt;
    padding: 5pt;
    border-bottom: 0.4pt solid #f0f3f5;
    vertical-align: top;
  }

  .tbl tr.alt td {
    background-color: #fafbfc;
  }

  .tbl .sub {
    font-size: 6pt;
    color: #7a8794;
  }

  .tbl .time {
    font-size: 7pt;
    color: #54616c;
  }

  .tbl .cost {
    text-align: right;
    font-size: 8.5pt;
    font-weight: bold;
    color: #0a716e;
  }

  .tbl tfoot td {
    background-color: #f6f8f9;
    font-weight: bold;
    font-size: 8pt;
    border-bottom: none;
  }

  .r {
    text-align: right;
  }

  /* กล่องข้อสังเกต */
  .notes {
    border: 0.6pt solid #cfe6e3;
    background-color: #f4faf9;
    padding: 8pt 10pt;
  }

  .notes-title {
    font-size: 8.5pt;
    font-weight: bold;
    color: #0a716e;
    padding-bottom: 3pt;
  }

  .notes-bullet {
    font-size: 7.5pt;
    color: #0a716e;
  }

  .notes-text {
    font-size: 7.5pt;
    line-height: 1.5;
    color: #37434d;
    padding-bottom: 2pt;
  }

  .empty {
    border: 0.6pt solid #e7ebee;
    padding: 24pt;
    text-align: center;
    color: #7a8794;
  }
</style>

<table class="hd" width="100%">
  <tr>
    <td width="26%">
      <table><tr>
        <td width="34"><img src="<?= FCPATH . 'logo-1.png' ?>" width="30"></td>
        <td>
          <div class="hd-name">iCar</div>
          <div class="hd-sub">BOOKING</div>
        </td>
      </tr></table>
    </td>
    <td width="4%"></td>
    <td width="40%" align="center">
      <div class="hd-th"><?= esc(lang('Report.cost_title')) ?></div>
      <?php if ($subTitle = lang('Report.cost_title_en')) : ?>
        <div class="hd-en"><?= esc($subTitle) ?></div>
      <?php endif ?>
    </td>
    <td width="4%"></td>
    <td width="26%" align="right">
      <table><tr><td class="chip">
        <div class="chip-label"><?= esc(lang('Report.range_label')) ?></div>
        <div class="chip-val"><?= $n(esc($rangeText)) ?></div>
      </td></tr></table>
    </td>
  </tr>
</table>

<?php if ($rows === []) : ?>
  <br>
  <div class="empty"><?= esc(lang('Report.empty')) ?></div>
<?php else : ?>

  <br>
  <table class="kpis" width="100%">
    <tr>
      <?php foreach ($report['kpis'] as $i => $k) : ?>
        <td class="kpi<?= $i === count($report['kpis']) - 1 ? ' kpi-last' : '' ?>" width="20%">
          <div class="kpi-label"><?= esc($k['label']) ?></div>
          <div class="kpi-val"><?= $n(esc($k['value'])) ?></div>
          <div class="kpi-unit"><?= esc($k['unit']) ?></div>
        </td>
      <?php endforeach ?>
    </tr>
  </table>

  <br>
  <table width="100%">
    <tr>
      <td class="card" width="49%">
        <div class="card-title"><?= esc(lang('Report.chart_by_requester')) ?></div>
        <table width="100%"><tr><td class="chart-mid" align="center"><?= $report['donut'] ?></td></tr></table>
        <?php
          // คำอธิบายสีเรียงแถวละ 2 - แถวเต็มอยู่ตารางเดียวกัน แถวเศษแยกตารางเพื่อให้กึ่งกลางเอง
          $full = intdiv(count($report['legend']), 2) * 2;
          $legendRows = array_chunk(array_slice($report['legend'], 0, $full), 2);
          $legendRest = array_slice($report['legend'], $full);
        ?>
        <table width="100%"><tr><td class="chart-mid" align="center">
          <?php if ($legendRows !== []) : ?>
            <table class="lg">
              <?php foreach ($legendRows as $group) : ?>
                <tr><?= view('admin/reports/_legend_cells', ['group' => $group]) ?></tr>
              <?php endforeach ?>
            </table>
          <?php endif ?>
          <?php if ($legendRest !== []) : ?>
            <table class="lg">
              <tr><?= view('admin/reports/_legend_cells', ['group' => $legendRest]) ?></tr>
            </table>
          <?php endif ?>
        </td></tr></table>
      </td>
      <td width="2%"></td>
      <td class="card" width="49%" valign="top">
        <div class="card-title"><?= esc(lang('Report.chart_by_driver')) ?></div>
        <table width="100%"><tr><td class="chart-mid" align="center"><?= $report['bars'] ?></td></tr></table>
      </td>
    </tr>
  </table>

  <br>
  <table width="100%">
    <tr>
      <td class="card">
        <div class="card-title"><?= esc($report['timeTitle']) ?></div>
        <table width="100%"><tr><td class="chart-mid" align="center"><?= $report['timeChart'] ?></td></tr></table>
      </td>
    </tr>
  </table>

  <pagebreak />

  <div class="sec-title"><?= esc(lang('Report.table_title')) ?></div>
  <table class="tbl" width="100%">
    <thead>
      <tr>
        <th width="11%"><?= esc(lang('Report.col_code')) ?></th>
        <th width="19%"><?= esc(lang('Report.col_requester')) ?></th>
        <th width="16%"><?= esc(lang('Report.col_ext_driver')) ?></th>
        <th width="16%"><?= esc(lang('Report.col_vehicle')) ?></th>
        <th width="13%"><?= esc(lang('Report.col_start')) ?></th>
        <th width="13%"><?= esc(lang('Report.col_end')) ?></th>
        <th width="12%" class="r"><?= esc(lang('Report.col_paid')) ?></th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($rows as $i => $b) : ?>
        <tr class="<?= $i % 2 === 1 ? 'alt' : '' ?>">
          <td><?= $n(esc($b['booking_code'])) ?></td>
          <td>
            <?= esc($b['requester_name'] ?: '-') ?>
            <?php if ($b['dept_name']) : ?>
              <div class="sub"><?= esc($b['dept_name']) ?></div>
            <?php endif ?>
          </td>
          <td><?= esc($b['ext_driver_name'] ?: '-') ?></td>
          <td><?= esc($b['ext_driver_vehicle'] ?: '-') ?></td>
          <td class="time"><?= $n(esc(thai_datetime($b['start_at']))) ?></td>
          <td class="time"><?= $n(esc(thai_datetime($b['end_at']))) ?></td>
          <td class="cost"><?= $n(esc(number_format((float) $b['ext_driver_cost'], 2))) ?></td>
        </tr>
      <?php endforeach ?>
    </tbody>
    <tfoot>
      <tr>
        <td colspan="6" class="r"><?= esc(lang('Report.foot_total', ['n' => count($rows)])) ?></td>
        <td class="cost"><?= $n(esc(number_format($report['total'], 2))) ?></td>
      </tr>
    </tfoot>
  </table>

  <br>
  <table class="notes" width="100%">
    <tr><td>
      <div class="notes-title"><?= esc(lang('Report.notes_title')) ?></div>
      <table width="100%">
        <?php foreach ($report['notes'] as $note) : ?>
          <tr>
            <td width="10" valign="top" class="notes-bullet">&bull;</td>
            <td class="notes-text"><?= $note ?></td>
          </tr>
        <?php endforeach ?>
      </table>
    </td></tr>
  </table>
<?php endif ?>
