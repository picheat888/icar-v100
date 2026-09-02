// หน้าพิมพ์รายงานสรุปค่าใช้จ่ายคนขับภายนอก - ประกอบ HTML แล้วเปิดหน้าต่างพิมพ์ (ผู้ใช้เลือก "บันทึกเป็น PDF")
import { t } from './i18n';
import { fmtDate, fmtDateTime, dateOf, todayStr } from './date';
import { fmtMoney } from './money';
import { donutSvg, barsSvg, lineSvg } from './costReportChart';

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const costOf = (b) => Number(b.ext_driver_cost) || 0;

/** ยุบหมวดที่เหลือเป็น "อื่น ๆ" ให้กราฟอ่านออก */
function topN(items, n) {
  if (items.length <= n) {
    return items;
  }
  const rest = items.slice(n).reduce((s, i) => s + i.value, 0);

  return [...items.slice(0, n), { label: t('pdf.others'), value: rest }];
}

/** รวมยอดตาม key แล้วเรียงมากไปน้อย */
function groupSum(rows, keyOf) {
  const map = new Map();
  rows.forEach((b) => {
    const k = keyOf(b) || '-';
    map.set(k, (map.get(k) || 0) + costOf(b));
  });

  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

/** ไอคอนวงกลมบนการ์ดตัวเลข - เขียน path เอง ให้เข้าชุดเส้นบางแบบเดียวกับไอคอนในระบบ */
const KPI_ICONS = [
  ['#e6f3f2', '#0a716e', '<path d="M12 3v2M9.5 5h5l2.5 4.5a7 7 0 1 1-10 0Z"/><path d="M12 10v6M10 12h3a1.5 1.5 0 0 1 0 3h-2a1.5 1.5 0 0 0 0 3h3"/>'],
  ['#e9eefb', '#2b4a9b', '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 10h6M9 14h6M9 18h3"/>'],
  ['#fdf0e0', '#b5701a', '<path d="M4 19V9M9 19V5M14 19v-7M19 19V3"/>'],
  ['#fbe9ef', '#c2537a', '<path d="M4 18h16"/><path d="M4 15 6 7l4 4 2-6 2 6 4-4 2 8Z"/>'],
  ['#efe8fa', '#7a4fb0', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>'],
];

const kpiIcon = (i) => {
  const [bg, fg, body] = KPI_ICONS[i % KPI_ICONS.length];

  return `<span class="kpi-ico" style="background:${bg};color:${fg}">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>
  </span>`;
};

/**
 * เปิดหน้าต่างพิมพ์รายงานค่าใช้จ่าย
 * rows = แถวจาก endpoint · summary = { total, jobs, avg } · rangeText/scopeText = ข้อความบนหัว
 * คืน false ถ้าเบราว์เซอร์บล็อก popup
 */
export function printCostReport({ rows, summary, rangeText, scopeText, brand, logo }) {
  const w = window.open('', '_blank', 'width=1100,height=800');
  if (! w) {
    return false;
  }

  // แยกชื่อแบรนด์เป็น 2 บรรทัดแบบเดียวกับ sidebar (iCar / BOOKING)
  const [bName, ...bRest] = String(brand).trim().split(' ');
  const bSub = bRest.join(' ');

  const total = Number(summary.total) || 0;
  const byDept   = groupSum(rows, (b) => b.requester_name);
  const byDriver = groupSum(rows, (b) => b.ext_driver_name);
  const byDay    = groupSum(rows, (b) => dateOf(b.start_at))
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((d) => ({ ...d, label: fmtDate(d.label) }));
  const top      = rows.reduce((m, b) => (costOf(b) > costOf(m) ? b : m), rows[0]);
  const topDay   = byDay.reduce((m, d) => (d.value > m.value ? d : m), byDay[0]);

  const deptTop   = topN(byDept, 6);
  const driverTop = topN(byDriver, 6);

  const kpis = [
    { label: t('pdf.kpi_total'), value: fmtMoney(total), unit: t('rpt.baht') },
    { label: t('pdf.kpi_count'), value: String(summary.jobs ?? rows.length), unit: t('pdf.unit_items') },
    { label: t('pdf.kpi_avg'), value: fmtMoney(summary.avg ?? (rows.length ? total / rows.length : 0)), unit: t('rpt.baht') },
    { label: t('pdf.kpi_max'), value: fmtMoney(costOf(top)), unit: t('rpt.baht') },
    { label: t('pdf.kpi_days'), value: String(byDay.length), unit: t('pdf.unit_days') },
  ];

  const kpiHtml = kpis.map((k, i) => `
    <div class="kpi">
      <div class="kpi-label">${esc(k.label)}</div>
      <div class="kpi-val">${esc(k.value)}</div>
      <div class="kpi-unit">${esc(k.unit)}</div>
      ${kpiIcon(i)}
    </div>`).join('');

  const rowsHtml = rows.map((b) => `<tr>
      <td class="c-code">${esc(b.booking_code)}</td>
      <td>${esc(b.requester_name || '-')}${b.dept_name ? `<div class="c-sub">(${esc(b.dept_name)})</div>` : ''}</td>
      <td>${esc(b.ext_driver_name || '-')}</td>
      <td>${esc(b.ext_driver_vehicle || '-')}</td>
      <td class="c-time">${esc(fmtDateTime(b.start_at))}</td>
      <td class="c-time">${esc(fmtDateTime(b.end_at))}</td>
      <td class="c-cost">${esc(fmtMoney(costOf(b)))}</td>
    </tr>`).join('');

  const notes = [
    t('pdf.note_share', {
      pct: total > 0 ? (byDept[0].value / total * 100).toFixed(1) : '0.0',
      who: byDept[0].label,
      code: top.booking_code,
      amount: fmtMoney(costOf(top)),
    }),
    t('pdf.note_days', { n: byDay.length, date: topDay.label }),
    t('pdf.note_advice'),
  ].map((n) => `<li>${esc(n)}</li>`).join('');

  w.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${esc(t('pdf.title'))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4 portrait; margin: 10mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Noto Sans Thai', system-ui, sans-serif; color: #243039; background: #fff; font-size: 11px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.wrap { max-width: 1000px; margin: 0 auto; }

/* หัวรายงาน */
.hd { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-bottom: 12px; border-bottom: 2px solid #e7ebee; }
.hd-brand { display: flex; align-items: center; gap: 10px; min-width: 150px; }
.hd-logo { width: 38px; height: 38px; border-radius: 10px; object-fit: contain; display: block; }
.hd-name { font-size: 18px; font-weight: 700; letter-spacing: 1.3px; color: #21215c; line-height: 1; }
.hd-sub { margin-top: 4px; font-size: 8.5px; font-weight: 600; letter-spacing: 2.5px; color: #0c8b87; line-height: 1; }
.hd-titles { flex: 1; text-align: center; }
.hd-th { font-size: 21px; font-weight: 700; letter-spacing: -.3px; }
.hd-en { margin-top: 2px; font-size: 11px; letter-spacing: 1.4px; color: #6b7884; }
.hd-range { display: flex; align-items: center; gap: 9px; background: #0a5f5c; color: #fff; border-radius: 9px; padding: 10px 15px; min-width: 190px; }
.hd-range small { display: block; font-size: 9.5px; opacity: .8; }
.hd-range b { font-size: 11.5px; font-weight: 600; }

/* การ์ดตัวเลข */
.kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0; margin: 14px 0; border: 1px solid #e7ebee; border-radius: 12px; overflow: hidden; }
.kpi { padding: 13px 10px 16px; text-align: center; border-right: 1px solid #f0f3f5; }
.kpi:last-child { border-right: none; }
.kpi-label { font-size: 9.5px; font-weight: 600; color: #54616c; }
.kpi-val { margin-top: 5px; font-size: 21px; font-weight: 700; color: #0a716e; letter-spacing: -.5px; font-variant-numeric: tabular-nums; }
.kpi-unit { font-size: 9px; color: #7a8794; }
.kpi-ico { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 50%; margin-top: 9px; }

/* กราฟ */
.charts { display: grid; grid-template-columns: 1.15fr 1fr 1fr; gap: 10px; }
.card { border: 1px solid #e7ebee; border-radius: 12px; padding: 11px 13px; }
.card-title { font-size: 11.5px; font-weight: 700; color: #0a716e; margin-bottom: 6px; }
.chart-body { display: flex; align-items: flex-start; gap: 8px; }
.chart-body--full { display: block; }
.lg { display: flex; flex-direction: column; gap: 6px; }
.lg-row { display: flex; align-items: flex-start; gap: 6px; }
.lg-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; margin-top: 3px; }
.lg-txt { font-size: 8.5px; line-height: 1.35; color: #54616c; }
.lg-txt b { font-size: 9px; color: #1f2a33; }

/* ตาราง */
.sec-title { margin: 16px 0 8px; font-size: 13px; font-weight: 700; color: #0a716e; }
table { width: 100%; border-collapse: collapse; border: 1px solid #e7ebee; border-radius: 10px; overflow: hidden; }
th { background: #0a5f5c; color: #fff; font-size: 9.5px; font-weight: 600; padding: 9px 10px; text-align: left; }
th.r, td.r { text-align: right; }
td { padding: 9px 10px; font-size: 10px; border-bottom: 1px solid #f0f3f5; vertical-align: middle; }
tr:last-child td { border-bottom: none; }
.c-code { white-space: nowrap; font-weight: 600; }
.c-sub { font-size: 8.5px; color: #7a8794; }
.c-time { white-space: nowrap; font-size: 9.5px; color: #54616c; }
.c-cost { text-align: right; white-space: nowrap; font-size: 12px; font-weight: 700; color: #0a716e; font-variant-numeric: tabular-nums; }
tfoot td { background: #f6f8f9; font-weight: 700; font-size: 11px; }

/* สรุปและข้อสังเกต */
.notes { margin-top: 14px; border: 1px solid #cfe6e3; background: #f4faf9; border-radius: 11px; padding: 12px 15px; }
.notes b { display: block; font-size: 11.5px; color: #0a716e; margin-bottom: 5px; }
.notes ul { margin: 0; padding-left: 17px; }
.notes li { font-size: 10px; line-height: 1.7; color: #37434d; }

.ft { margin-top: 12px; padding-top: 9px; border-top: 1px solid #e7ebee; display: flex; justify-content: flex-end; gap: 10px; font-size: 9.5px; color: #7a8794; }
.ft b { color: #0a5f5c; }
</style></head><body><div class="wrap">

<div class="hd">
  <div class="hd-brand">
    ${logo ? `<img class="hd-logo" src="${esc(logo)}" alt="">` : ''}
    <div><div class="hd-name">${esc(bName)}</div>${bSub ? `<div class="hd-sub">${esc(bSub)}</div>` : ''}</div>
  </div>
  <div class="hd-titles">
    <div class="hd-th">${esc(t('pdf.title'))}</div>
    <div class="hd-en">${esc(t('pdf.title_en'))}</div>
  </div>
  <div class="hd-range">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>
    <span><small>${esc(t('rpt.range_label'))}</small><b>${esc(rangeText)}</b></span>
  </div>
</div>

<div class="kpis">${kpiHtml}</div>

<div class="charts">
  <div class="card"><div class="card-title">${esc(t('pdf.chart_by_requester'))}</div>${donutSvg(deptTop, total, t('pdf.center_total'), t('rpt.baht'))}</div>
  <div class="card"><div class="card-title">${esc(t('pdf.chart_by_driver'))}</div>${barsSvg(driverTop, total, t('rpt.baht'))}</div>
  <div class="card"><div class="card-title">${esc(t('pdf.chart_by_day'))}</div>${lineSvg(byDay, t('rpt.baht'))}</div>
</div>

<div class="sec-title">${esc(t('pdf.table_title'))}</div>
<table>
  <thead><tr>
    <th>${esc(t('pdf.col_code'))}</th>
    <th>${esc(t('rpt.col_requester'))}</th>
    <th>${esc(t('rpt.col_ext_driver'))}</th>
    <th>${esc(t('rpt.col_vehicle'))}</th>
    <th>${esc(t('req.start_label'))}</th>
    <th>${esc(t('req.end_label'))}</th>
    <th class="r">${esc(t('rpt.col_paid'))}</th>
  </tr></thead>
  <tbody>${rowsHtml}</tbody>
  <tfoot><tr><td colspan="6" class="r">${esc(t('rpt.foot_total', { n: rows.length }))}</td><td class="c-cost">${esc(fmtMoney(total))}</td></tr></tfoot>
</table>

<div class="notes"><b>${esc(t('pdf.notes_title'))}</b><ul>${notes}</ul></div>

<div class="ft"><span>${esc(t('pdf.printed_on', { date: fmtDate(todayStr()) }))}</span>${scopeText ? `<span>|</span><b>${esc(t('rpt.scope_label'))} ${esc(scopeText)}</b>` : ''}</div>
</div>
<script>var go=function(){setTimeout(function(){window.print();},350);};if(document.readyState==='complete'){go();}else{window.addEventListener('load',go);}<\/script>
</body></html>`);
  w.document.close();

  return true;
}
