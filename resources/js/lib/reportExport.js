// ส่งออกรายงาน - CSV (Blob) และ PDF (เปิดหน้าต่างพิมพ์ A4 แนวนอน) ทำฝั่ง client ทั้งคู่

/** ครอบค่าให้ปลอดภัยสำหรับ CSV (คลุมด้วย " และ escape " ข้างใน) */
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/**
 * ประกอบข้อความ CSV (แยกจากตัวดาวน์โหลดเพื่อให้ทดสอบได้)
 * นำหน้าด้วย BOM ให้ Excel อ่านภาษาไทยไม่เป็นตัวต่างดาว · ขึ้นบรรทัดด้วย CRLF ตามที่ Excel คาด
 */
export function toCsv(head, rows) {
  return `﻿${[head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')}`;
}

/**
 * ดาวน์โหลดไฟล์ CSV
 * head = ชื่อคอลัมน์ · rows = อาร์เรย์ของอาร์เรย์ · filename = ชื่อไฟล์
 */
export function downloadCsv(filename, head, rows) {
  const blob  = new Blob([toCsv(head, rows)], { type: 'text/csv;charset=utf-8;' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');

  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** escape ข้อความก่อนยัดลง HTML ของหน้าพิมพ์ */
const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * เปิดหน้าต่างพิมพ์ (ผู้ใช้เลือก "บันทึกเป็น PDF" ได้จากกล่องพิมพ์ของเบราว์เซอร์)
 * cols = [{ label, align }] · rows = อาร์เรย์ของอาร์เรย์ · foot = [{ text, span, align }]
 * คืน false ถ้าเบราว์เซอร์บล็อก popup ให้ผู้เรียกแจ้งเตือนเอง
 */
export function printReport({ brand, title, subtitle, cols, rows, foot }) {
  const w = window.open('', '_blank', 'width=1000,height=700');
  if (! w) {
    return false;
  }

  const th = cols.map((c) => `<th class="${c.align === 'right' ? 'r' : ''}">${esc(c.label)}</th>`).join('');
  const tb = rows.map((r) => `<tr>${r.map((cell, i) => `<td class="${cols[i]?.align === 'right' ? 'r' : ''}">${esc(cell)}</td>`).join('')}</tr>`).join('');
  const tf = (foot || []).map((f) => `<td colspan="${f.span || 1}" class="${f.align === 'right' ? 'r' : ''}">${esc(f.text)}</td>`).join('');

  w.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4 landscape; margin: 14mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Noto Sans Thai', system-ui, sans-serif; color: #243039; }
.hd { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; border-bottom: 2px solid #0c8b87; padding-bottom: 10px; margin-bottom: 14px; }
.brand { font-size: 16px; font-weight: 700; color: #0a5f5c; letter-spacing: 1px; }
.ti { font-size: 18px; font-weight: 700; }
.sub { font-size: 12px; color: #6b7884; margin-top: 3px; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 11px; font-weight: 700; color: #54616c; background: #f6f8f9; border-bottom: 1px solid #e7ebee; padding: 8px 10px; }
td { font-size: 11.5px; padding: 7px 10px; border-bottom: 1px solid #f0f3f5; }
tfoot td { font-weight: 700; background: #f6f8f9; border-top: 1px solid #e7ebee; }
.r { text-align: right; white-space: nowrap; }
</style></head><body>
<div class="hd"><div><div class="ti">${esc(title)}</div><div class="sub">${esc(subtitle)}</div></div><div class="brand">${esc(brand)}</div></div>
<table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody>${tf ? `<tfoot><tr>${tf}</tr></tfoot>` : ''}</table>
<script>setTimeout(function(){window.print();},400);<\/script>
</body></html>`);
  w.document.close();

  return true;
}
