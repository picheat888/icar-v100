// ตัวช่วยจัดรูปแบบวันที่/เวลาให้เหมือนกันทั้งระบบ — วันที่รูปแบบ DD-MM-YYYY เช่น "22-06-2026"
import { currentLocale } from './i18n';

// locale ปัจจุบัน (จาก meta[name=locale] ผ่าน i18n.js) — ใช้เลือก array เดือน/วัน
const LOCALE = currentLocale();

const TH_SHORT_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
// เดือนย่อภาษาอังกฤษ คู่ขนานกับ TH_SHORT_MONTHS
const EN_SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// เดือนย่อ — เลือกตาม locale (th: ค่าเดิมเป๊ะ)
export const SHORT_MONTHS = LOCALE === 'en' ? EN_SHORT_MONTHS : TH_SHORT_MONTHS;

const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
// ชื่อเดือนเต็มภาษาอังกฤษ คู่ขนานกับ TH_MONTHS
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// ชื่อเดือนเต็ม — หัวปฏิทิน (จองรถ / timeline / dashboard)
export const MONTHS = LOCALE === 'en' ? EN_MONTHS : TH_MONTHS;

const TH_DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
// หัวคอลัมน์ปฏิทินภาษาอังกฤษ คู่ขนานกับ TH_DOW (เริ่มวันอาทิตย์)
const EN_DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
// หัวคอลัมน์ปฏิทิน เริ่มวันอาทิตย์จบวันเสาร์
export const DOW = LOCALE === 'en' ? EN_DOW : TH_DOW;

// เติม 0 หน้าเลข 1 หลัก (5 -> '05')
export const pad = (n) => (n < 10 ? '0' + n : '' + n);

// "2026-06-22 ..." -> "22-06-2026"
export const thDate = (s) => {
  const p = (s || '').slice(0, 10).split('-');
  return (p.length === 3 && p[0]) ? `${p[2]}-${p[1]}-${p[0]}` : (s || '').slice(0, 10);
};

// ชื่อวันในสัปดาห์ (ไทย)
export const TH_WEEKDAYS = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
// ชื่อวันในสัปดาห์ (อังกฤษ) คู่ขนานกับ TH_WEEKDAYS
const EN_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// "2026-07-29 ..." -> "วันพุธ" (parse แบบ local กัน timezone เลื่อนวัน) — เลือกชื่อวันตาม locale
export const thWeekday = (s) => {
  const p = (s || '').slice(0, 10).split('-');
  if (p.length !== 3 || !p[0]) return '';
  const names = LOCALE === 'en' ? EN_WEEKDAYS : TH_WEEKDAYS;
  return names[new Date(+p[0], +p[1] - 1, +p[2]).getDay()] || '';
};

// "...THH:MM..." หรือ "... HH:MM:SS" -> "HH:MM"
export const thTime = (s) => (s ? s.slice(11, 16) : '');

// "2026-06-22 08:00:00" -> "22-06-2026 08:00"
export const thDateTime = (s) => (s ? `${thDate(s)} ${thTime(s)}`.trim() : '');
