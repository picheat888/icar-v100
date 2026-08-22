// ตัวช่วยจัดรูปแบบวันที่/เวลาชุดเดียวของทั้งระบบ - ห้าม format เองในไฟล์อื่น
// วันที่ DD-MM-YYYY (ค.ศ.) · เวลา 24 ชม. HH:MM · วันที่กับเวลาคั่นด้วยเว้นวรรค · ช่วงเวลาคั่นด้วยคำ "ถึง"/"to"
import { t, currentLocale } from './i18n';

// locale ปัจจุบัน (จาก meta[name=locale] ผ่าน i18n.js) - ใช้เลือก array เดือน/วัน
const LOCALE = currentLocale();

const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
// ชื่อเดือนเต็มภาษาอังกฤษ คู่ขนานกับ TH_MONTHS
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// ชื่อเดือนเต็ม - ใช้ได้เฉพาะหัวปฏิทิน/หัวเดือน ที่ไม่มีส่วนวันที่ให้จัดเป็น DD-MM-YYYY
export const MONTHS = LOCALE === 'en' ? EN_MONTHS : TH_MONTHS;

const TH_DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
// หัวคอลัมน์ปฏิทินภาษาอังกฤษ คู่ขนานกับ TH_DOW (เริ่มวันอาทิตย์)
const EN_DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
// หัวคอลัมน์ปฏิทิน เริ่มวันอาทิตย์จบวันเสาร์
export const DOW = LOCALE === 'en' ? EN_DOW : TH_DOW;

const TH_WEEKDAYS = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
// ชื่อวันในสัปดาห์ภาษาอังกฤษ คู่ขนานกับ TH_WEEKDAYS
const EN_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// เติม 0 หน้าเลข 1 หลัก (5 -> '05')
export const pad = (n) => (n < 10 ? '0' + n : '' + n);

// Date -> 'YYYY-MM-DD' (เวลาท้องถิ่น)
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// วันนี้ตามเวลาเครื่อง -> 'YYYY-MM-DD'
export const todayStr = () => ymd(new Date());

// "2026-08-21 ..." -> "21-08-2026"
export const fmtDate = (s) => {
  const d = String(s || '').slice(0, 10);
  const p = d.split('-');
  return (p.length === 3 && p[0]) ? `${p[2]}-${p[1]}-${p[0]}` : d;
};

// "...THH:MM..." หรือ "... HH:MM:SS" -> "HH:MM" (24 ชม.)
export const fmtTime = (s) => (s ? String(s).slice(11, 16) : '');

// "2026-08-21 08:00:00" -> "21-08-2026 08:00"
export const fmtDateTime = (s) => (s ? `${fmtDate(s)} ${fmtTime(s)}`.trim() : '');

// คำคั่นช่วง - เรียกตอนใช้ ไม่ใช่ตอน module โหลด
const to = () => t('common.to');

// "08:00 ถึง 17:00"
export const timeRange = (s, e) => `${fmtTime(s)} ${to()} ${fmtTime(e)}`;

// "21-08-2026 08:00 ถึง 22-08-2026 17:00"
export const dateTimeRange = (s, e) => `${fmtDateTime(s)} ${to()} ${fmtDateTime(e)}`;

// ช่วงเวลาแบบ 2 บรรทัด สำหรับช่องแคบ - วันเดียวกันแยกวันที่ไว้บรรทัดบน
export const rangeLines = (s, e) => {
  if (! s) return ['', ''];
  return String(s).slice(0, 10) === String(e || '').slice(0, 10)
    ? [fmtDate(s), timeRange(s, e)]
    : [`${fmtDateTime(s)} ${to()}`, fmtDateTime(e)];
};

// ช่วงเวลาบรรทัดเดียว สำหรับที่ที่มีวันที่อยู่บนหัวกลุ่มแล้ว - วันเดียวกันตัดวันที่ทิ้ง
export const rangeCompact = (s, e) => (
  String(s).slice(0, 10) === String(e || '').slice(0, 10) ? timeRange(s, e) : dateTimeRange(s, e)
);

// "2026-08-21 ..." -> "วันศุกร์" (parse แบบ local กัน timezone เลื่อนวัน)
export const weekdayName = (s) => {
  const p = String(s || '').slice(0, 10).split('-');
  if (p.length !== 3 || ! p[0]) return '';
  const names = LOCALE === 'en' ? EN_WEEKDAYS : TH_WEEKDAYS;
  return names[new Date(+p[0], +p[1] - 1, +p[2]).getDay()] || '';
};
