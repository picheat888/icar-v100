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
    padding-bottom: 6pt;
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
    font-size: 15pt;
    font-weight: bold;
  }

  /* ที่ว่างให้สระล่างของหัวเรื่องไทยห้อยลงมา - mPDF ไม่รับ padding บน div ต้องใช้บรรทัดเปล่า */
  .hd-gap {
    font-size: 5pt;
    line-height: 1;
  }

  .hd-en {
    font-size: 7pt;
    color: #6b7884;
    letter-spacing: 1pt;
  }

  .chip {
    background-color: #0a5f5c;
    color: #ffffff;
    padding: 4pt 8pt 5pt;
    text-align: left;
  }

  .chip-label {
    font-size: 6pt;
    color: #cfe6e3;
  }

  .chip-val {
    font-size: 8pt;
    font-weight: bold;
  }

  /* การ์ดตัวเลข 5 ช่อง - สีของค่าบอกกลุ่มสถานะ */
  .kpi {
    border: 0.6pt solid #e7ebee;
    padding: 4pt 3pt 4pt;
    text-align: center;
  }

  .kpi-label {
    font-size: 6pt;
    font-weight: bold;
    color: #54616c;
  }

  .kpi-val {
    font-size: 13pt;
    font-weight: bold;
  }

  .kpi-pct {
    font-size: 6pt;
  }

  .kpi--ink {
    background-color: #f6f8f9;
  }

  .kpi--ink .kpi-val {
    color: #21215c;
  }

  .kpi--green {
    background-color: #f2fbf6;
  }

  .kpi--green .kpi-val,
  .kpi--green .kpi-pct {
    color: #1f9d55;
  }

  .kpi--amber {
    background-color: #fffbef;
  }

  .kpi--amber .kpi-val,
  .kpi--amber .kpi-pct {
    color: #b98900;
  }

  .kpi--orange {
    background-color: #fff7f0;
  }

  .kpi--orange .kpi-val,
  .kpi--orange .kpi-pct {
    color: #d1680f;
  }

  .kpi--red {
    background-color: #fef4f5;
  }

  .kpi--red .kpi-val,
  .kpi--red .kpi-pct {
    color: #c2405a;
  }

  /*
   * การ์ดแบ่ง 3 ส่วนตามแนวตั้ง - หัวการ์ด / เนื้อหา / หมายเหตุ อยู่คนละแถวของตารางเดียวกัน
   * 1 การ์ด = 1 คอลัมน์ ทุกส่วนของทุกการ์ดในแถวจึงเริ่มและสูงเท่ากันเสมอ
   * เส้นขอบแบ่งเป็น 3 ท่อน ประกอบกันเป็นกรอบการ์ดใบเดียว (ต้องใช้ cellspacing=0 กันรอยต่อ)
   * จัดกึ่งกลางเนื้อหาด้วย align ของ td เท่านั้น - mPDF ไม่รับ text-align บน div
   */
  .c-head {
    border-top: 0.6pt solid #e7ebee;
    border-left: 0.6pt solid #e7ebee;
    border-right: 0.6pt solid #e7ebee;
    padding: 4pt 5pt 3pt;
    vertical-align: top;
  }

  .c-body {
    border-left: 0.6pt solid #e7ebee;
    border-right: 0.6pt solid #e7ebee;
    padding: 0 5pt 4pt;
    vertical-align: top;
  }

  .c-note {
    border: 0.6pt solid #cfe6e3;
    background-color: #f4faf9;
    padding: 3pt 6pt 4pt;
    vertical-align: top;
  }

  .card-title {
    font-size: 8pt;
    font-weight: bold;
    color: #0a716e;
  }

  /* คำอธิบายสีของโดนัท - ตัวหนังสือชิดซ้ายเสมอ */
  .lg td {
    font-size: 6pt;
    color: #54616c;
    padding: 1.5pt 5pt 1.5pt 0;
    vertical-align: top;
    text-align: left;
  }

  .lg-dot {
    width: 9pt;
    padding-right: 2pt;
  }

  .lg-name {
    font-size: 6.5pt;
    color: #1f2a33;
    font-weight: bold;
  }

  .lg-val {
    white-space: nowrap;
  }

  /* ตารางอันดับ */
  .rk {
    border: 0.6pt solid #e7ebee;
  }

  .rk th {
    background-color: #0a5f5c;
    color: #ffffff;
    font-size: 6.5pt;
    font-weight: bold;
    padding: 3pt 4pt;
    text-align: left;
  }

  /* ตัวหนังสือชิดซ้ายเสมอ - เซลล์ที่ครอบตั้ง align=center ไว้เพื่อจัดกราฟ ไม่ใช่ข้อความในตาราง */
  .rk td {
    font-size: 6.8pt;
    padding: 1.7pt 4pt;
    border-bottom: 0.4pt solid #f0f3f5;
    text-align: left;
  }

  .rk tr.alt td {
    background-color: #fafbfc;
  }

  .rk .c {
    text-align: center;
  }

  .rk .r {
    text-align: right;
    font-weight: bold;
    color: #0a716e;
  }

  /* หัวคอลัมน์ตัวเลข - ต้องประกาศหลัง .rk .r ที่จ่ายสี teal ให้ทั้ง th และ td */
  .rk th.r {
    color: #ffffff;
  }

  /* กล่องข้อสังเกตในการ์ด */
  .ins-title {
    font-size: 7pt;
    font-weight: bold;
    color: #0a716e;
    padding-bottom: 1.5pt;
  }

  .ins-bullet {
    font-size: 7pt;
    color: #0a716e;
  }

  .ins-text {
    font-size: 6.2pt;
    line-height: 1.35;
    color: #37434d;
  }

  /* ตัวคั่นระหว่างแถว - บางกว่า <br> ที่กินความสูงเต็มบรรทัด */
  .gap {
    font-size: 3pt;
    line-height: 1;
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
    <td width="24%">
      <table>
        <tr>
          <td width="35"><img src="<?= FCPATH . 'logo-1.png' ?>" width="28"></td>
          <td>
            <div class="hd-name">iCar</div>
            <div class="hd-sub">BOOKING</div>
          </td>
        </tr>
      </table>
    </td>
    <td width="50%" align="center">
      <div class="hd-th"><?= esc(lang('Report.usage_title')) ?></div>
      <div class="hd-gap">&nbsp;</div>
      <?php if ($subTitle = lang('Report.usage_title_en')) : ?>
        <div class="hd-en"><?= esc($subTitle) ?></div>
      <?php endif ?>
    </td>
    <td width="25%" align="right">
      <table>
        <tr>
          <td class="chip">
            <div class="chip-label"><?= esc(lang('Report.range_label')) ?></div>
            <div class="chip-val"><?= $n(esc($rangeText)) ?></div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<?php if ($rows === []) : ?>
  <br>
  <div class="empty"><?= esc(lang('Report.empty')) ?></div>
<?php else : ?>
<!-- Set 1 - KPIs -->
  <div class="gap">&nbsp;</div>
  <table width="100%">
    <tr>
      <?php foreach ($report['kpis'] as $i => $k) : ?>
        <?php if ($i > 0) : ?><td width="1%"></td><?php endif ?>
        <td class="kpi kpi--<?= esc($k['tone']) ?>" width="19.2%">
          <div class="kpi-label"><?= esc($k['label']) ?></div>
          <div class="kpi-val"><?= $n(esc($k['value'])) ?></div>
          <div class="kpi-pct"><?= $k['pct'] === '' ? esc(lang('Report.unit_items')) : $n('(' . esc($k['pct']) . '%)') ?></div>
        </td>
      <?php endforeach ?>
    </tr>
  </table>
<!-- Set 2 - สถานะ + แผนก -->
  <div class="gap">&nbsp;</div>
  <table width="100%" cellspacing="0" style="page-break-inside: avoid">
    <tr>
      <td class="c-head" width="34%"><div class="card-title"><?= esc(lang('Report.uchart_status')) ?></div></td>
      <td width="2%"></td>
      <td class="c-head" width="64%"><div class="card-title"><?= esc($report['deptTitle']) ?></div></td>
    </tr>
    <tr>
      <td class="c-body" align="center">
        <?= $report['statusDonut'] ?>
        <table class="lg">
          <?php foreach (array_chunk($report['statusLegend'], 2) as $group) : ?>
            <tr><?= view('admin/reports/_legend_cells', ['group' => $group]) ?></tr>
          <?php endforeach ?>
        </table>
      </td>
      <td></td>
      <td class="c-body" align="center">
        <?= $report['deptChart'] ?>
      </td>
    </tr>
    <tr>
      <td class="c-note"><?= view('admin/reports/_insight', ['title' => lang('Report.uinsight_title'), 'notes' => $report['execNotes']]) ?></td>
      <td></td>
      <td class="c-note"><?= view('admin/reports/_insight', ['title' => lang('Report.uinsight_title'), 'notes' => $report['deptNotes']]) ?></td>
    </tr>
  </table>
<!-- Set 3 - ผู้ใช้งาน + รถ -->
  <div class="gap">&nbsp;</div>
  <table width="100%" cellspacing="0" style="page-break-inside: avoid">
    <tr>
      <td class="c-head" width="49%"><div class="card-title"><?= esc(lang('Report.utbl_requesters')) ?></div></td>
      <td width="2%"></td>
      <td class="c-head" width="49%"><div class="card-title"><?= esc(lang('Report.utbl_vehicles')) ?></div></td>
    </tr>
    <tr>
      <td class="c-body" align="center">
        <table class="rk" width="100%">
          <thead>
            <tr>
              <th width="10%" class="c"><?= esc(lang('Report.ucol_rank')) ?></th>
              <th width="45%"><?= esc(lang('Report.ucol_user')) ?></th>
              <th width="30%"><?= esc(lang('Report.ucol_dept')) ?></th>
              <th width="15%" class="r"><?= esc(lang('Report.ucol_times')) ?></th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($report['topRequesters'] as $i => $r) : ?>
              <tr class="<?= $i % 2 === 1 ? 'alt' : '' ?>">
                <td class="c"><?= $n((string) $r['rank']) ?></td>
                <td><?= esc($r['label']) ?></td>
                <td><?= esc($r['dept'] ?: lang('Report.unspecified')) ?></td>
                <td class="r"><?= $n(esc(number_format($r['value']))) ?></td>
              </tr>
            <?php endforeach ?>
          </tbody>
        </table>
      </td>
      <td></td>
      <td class="c-body" align="center">
        <table class="rk" width="100%">
          <thead>
            <tr>
              <th width="10%" class="c"><?= esc(lang('Report.ucol_rank')) ?></th>
              <th width="45%"><?= esc(lang('Report.ucol_vehicle')) ?></th>
              <th width="30%"><?= esc(lang('Report.ucol_type')) ?></th>
              <th width="15%" class="r"><?= esc(lang('Report.ucol_times')) ?></th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($report['topVehicles'] as $i => $v) : ?>
              <tr class="<?= $i % 2 === 1 ? 'alt' : '' ?>">
                <td class="c"><?= $n((string) $v['rank']) ?></td>
                <td><?= $n(esc($v['label'])) ?></td>
                <td><?= esc($v['type']) ?></td>
                <td class="r"><?= $n(esc(number_format($v['value']))) ?></td>
              </tr>
            <?php endforeach ?>
          </tbody>
        </table>
      </td>
    </tr>
    <tr>
      <td class="c-note"><?= view('admin/reports/_insight', ['title' => lang('Report.uinsight_title'), 'notes' => $report['requesterNote']]) ?></td>
      <td></td>
      <td class="c-note"><?= view('admin/reports/_insight', ['title' => lang('Report.uinsight_title'), 'notes' => $report['vehicleNote']]) ?></td>
    </tr>
  </table>
<!-- Set 4 - ประเภท + รายเดือน -->
  <div class="gap">&nbsp;</div>
  <table width="100%" cellspacing="0" style="page-break-inside: avoid">
    <tr>
      <td class="c-head" width="34%"><div class="card-title"><?= esc(lang('Report.uchart_type')) ?></div></td>
      <td width="2%"></td>
      <td class="c-head" width="64%"><div class="card-title"><?= esc($report['monthTitle']) ?></div></td>
    </tr>
    <tr>
      <td class="c-body" align="center">
        <?= $report['typeDonut'] ?>
        <table class="lg">
          <?php foreach (array_chunk($report['typeLegend'], 2) as $group) : ?>
            <tr><?= view('admin/reports/_legend_cells', ['group' => $group]) ?></tr>
          <?php endforeach ?>
        </table>
      </td>
      <td></td>
      <td class="c-body" align="center">
        <?= $report['monthChart'] ?>
      </td>
    </tr>
    <tr>
      <td class="c-note"><?= view('admin/reports/_insight', ['title' => lang('Report.uinsight_title'), 'notes' => $report['typeNote']]) ?></td>
      <td></td>
      <td class="c-note"><?= view('admin/reports/_insight', ['title' => lang('Report.uinsight_title'), 'notes' => $report['monthNote']]) ?></td>
    </tr>
  </table>
<?php endif ?>
