// ส่งออกรายงานเป็น CSV ฝั่ง client (Blob) - PDF สร้างที่ server ด้วย mPDF

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
