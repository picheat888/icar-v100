// กราฟ SVG สำหรับรายงาน PDF - เขียนเป็นสตริงตรง ๆ เพราะต้องยัดลงหน้าต่างพิมพ์ ไม่ผ่าน React

/** จานสีหมวดหมู่ - ต้องแยกออกจากกันด้วยเฉดสี ไม่ใช่แค่ความเข้ม (ใช้ในโดนัท/แท่ง/ไอคอนหน้าแถว) */
export const SERIES_COLORS = ['#0f8a86', '#2b4a9b', '#e8721f', '#f0bf27', '#8b5fbf', '#4a8fd4', '#c2537a', '#5aa668'];

export const seriesColor = (i) => SERIES_COLORS[i % SERIES_COLORS.length];

/** ตัวเลขคั่นหลักพัน ไม่มีทศนิยม (ใช้กับแกนกราฟ) */
const axisNum = (n) => Math.round(n).toLocaleString('en-US');

/** ตัวเลขเงิน 2 ตำแหน่ง */
const money = (n) => Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** ขั้นแกนที่อ่านง่าย (1/2/5 × 10^n) ครอบคลุมค่าสูงสุด */
function niceStep(max, targetTicks = 3) {
  const raw  = Math.max(max, 1) / targetTicks;
  const mag  = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;

  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
}

/**
 * โดนัท + คำอธิบายด้านขวา
 * items = [{ label, value }] เรียงมากไปน้อยแล้ว · total = ยอดรวม
 */
export function donutSvg(items, total, centerLabel, unit) {
  const R = 62;
  const STROKE = 30;
  const C = 2 * Math.PI * R;
  const cx = 88;
  const cy = 96;

  let offset = 0;
  const arcs = items.map((it, i) => {
    const frac = total > 0 ? it.value / total : 0;
    const len  = frac * C;
    const seg  = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${seriesColor(i)}" stroke-width="${STROKE}"
      stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"
      transform="rotate(-90 ${cx} ${cy})" />`;
    // ป้าย % กลางส่วนโค้ง - วางเฉพาะส่วนที่กว้างพอจะอ่านออก
    const mid = (offset + len / 2) / C * 2 * Math.PI - Math.PI / 2;
    const lx  = cx + Math.cos(mid) * R;
    const ly  = cy + Math.sin(mid) * R;
    const pct = (frac * 100).toFixed(1);
    const lab = frac >= 0.06
      ? `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${pct}%</text>`
      : '';
    offset += len;

    return seg + lab;
  }).join('');

  const legend = items.map((it, i) => `
    <div class="lg-row">
      <span class="lg-dot" style="background:${seriesColor(i)}"></span>
      <span class="lg-txt"><b>${esc(it.label)}</b><br>${money(it.value)}<br>(${total > 0 ? (it.value / total * 100).toFixed(1) : '0.0'}%)</span>
    </div>`).join('');

  return `<div class="chart-body">
    <svg viewBox="0 0 176 192" width="176" height="192" role="img">
      ${arcs}
      <text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="10" fill="#7a8794">${esc(centerLabel)}</text>
      <text x="${cx}" y="${cy + 7}" text-anchor="middle" font-size="14" font-weight="700" fill="#1f2a33">${money(total)}</text>
      <text x="${cx}" y="${cy + 21}" text-anchor="middle" font-size="9.5" fill="#7a8794">${esc(unit)}</text>
    </svg>
    <div class="lg">${legend}</div>
  </div>`;
}

/**
 * แท่งแนวนอน + แกนล่าง
 * items = [{ label, value }] เรียงมากไปน้อยแล้ว
 */
export function barsSvg(items, total, unit) {
  const W = 360;
  const LEFT = 108;
  const ROW = 34;
  const H = items.length * ROW + 42;
  const max = Math.max(...items.map((i) => i.value), 1);
  const step = niceStep(max);
  const axisMax = Math.ceil(max / step) * step;
  const plot = W - LEFT - 76;

  const grid = [];
  for (let v = 0; v <= axisMax + 0.001; v += step) {
    const x = LEFT + (v / axisMax) * plot;
    grid.push(`<line x1="${x.toFixed(1)}" y1="6" x2="${x.toFixed(1)}" y2="${items.length * ROW + 6}" stroke="#eceff1" stroke-width="1" />`);
    grid.push(`<text x="${x.toFixed(1)}" y="${items.length * ROW + 22}" text-anchor="middle" font-size="9" fill="#9aa7b2">${axisNum(v)}</text>`);
  }

  const bars = items.map((it, i) => {
    const y = i * ROW + 6;
    const w = Math.max((it.value / axisMax) * plot, 2);
    const pct = total > 0 ? (it.value / total * 100).toFixed(1) : '0.0';

    return `
      <text x="${LEFT - 8}" y="${y + 17}" text-anchor="end" font-size="9.5" fill="#54616c">${esc(it.label)}</text>
      <rect x="${LEFT}" y="${y + 4}" width="${w.toFixed(1)}" height="20" rx="3" fill="${seriesColor(i)}" />
      <text x="${(LEFT + w + 6).toFixed(1)}" y="${y + 14}" font-size="9.5" font-weight="700" fill="#37434d">${money(it.value)}</text>
      <text x="${(LEFT + w + 6).toFixed(1)}" y="${y + 24}" font-size="8.5" fill="#9aa7b2">(${pct}%)</text>`;
  }).join('');

  return `<div class="chart-body chart-body--full">
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img">
      ${grid.join('')}${bars}
      <text x="${LEFT + plot / 2}" y="${H - 2}" text-anchor="middle" font-size="9" fill="#9aa7b2">${esc(unit)}</text>
    </svg>
  </div>`;
}

/**
 * เส้น + พื้นที่ใต้เส้น ตามวัน
 * items = [{ label, value }] เรียงตามวันแล้ว
 */
export function lineSvg(items, unit) {
  const W = 340;
  const H = 190;
  const L = 46;
  const R = 12;
  const T = 22;
  const B = 44;
  const max = Math.max(...items.map((i) => i.value), 1);
  const step = niceStep(max);
  const axisMax = Math.ceil(max / step) * step;
  const pw = W - L - R;
  const ph = H - T - B;

  const x = (i) => L + (items.length === 1 ? pw / 2 : (i / (items.length - 1)) * pw);
  const y = (v) => T + ph - (v / axisMax) * ph;

  const grid = [];
  for (let v = 0; v <= axisMax + 0.001; v += step) {
    grid.push(`<line x1="${L}" y1="${y(v).toFixed(1)}" x2="${W - R}" y2="${y(v).toFixed(1)}" stroke="#eceff1" stroke-width="1" />`);
    grid.push(`<text x="${L - 6}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#9aa7b2">${axisNum(v)}</text>`);
  }

  const pts  = items.map((it, i) => `${x(i).toFixed(1)},${y(it.value).toFixed(1)}`).join(' ');
  const area = `${L},${(T + ph).toFixed(1)} ${pts} ${(x(items.length - 1)).toFixed(1)},${(T + ph).toFixed(1)}`;

  // ป้ายวันกว้างราว 64px - แสดงเว้นจุดตามที่แกนรับไหว กันตัวหนังสือทับกัน
  const fits  = Math.max(2, Math.floor(pw / 64));
  const every = Math.max(1, Math.ceil(items.length / fits));
  const anchor = (i) => (i === 0 ? 'start' : i === items.length - 1 ? 'end' : 'middle');

  const dots = items.map((it, i) => {
    const show = (items.length - 1 - i) % every === 0;   // นับจากจุดสุดท้าย ระยะห่างจึงเท่ากันทุกช่วง

    return `
    <circle cx="${x(i).toFixed(1)}" cy="${y(it.value).toFixed(1)}" r="3.5" fill="#0f8a86" />
    ${show ? `<text x="${x(i).toFixed(1)}" y="${(y(it.value) - 8).toFixed(1)}" text-anchor="${anchor(i)}" font-size="8.5" font-weight="600" fill="#37434d">${money(it.value)}</text>
    <text x="${x(i).toFixed(1)}" y="${(T + ph + 15).toFixed(1)}" text-anchor="${anchor(i)}" font-size="8.5" fill="#9aa7b2">${esc(it.label)}</text>` : ''}`;
  }).join('');

  return `<div class="chart-body chart-body--full">
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img">
      ${grid.join('')}
      <polygon points="${area}" fill="#0f8a86" fill-opacity=".12" />
      <polyline points="${pts}" fill="none" stroke="#0f8a86" stroke-width="2" stroke-linejoin="round" />
      ${dots}
      <text x="${L - 30}" y="${T - 8}" font-size="9" fill="#9aa7b2">${esc(unit)}</text>
    </svg>
  </div>`;
}
