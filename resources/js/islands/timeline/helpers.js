import { t, currentLocale } from '../../lib/i18n';

const LOCALE = currentLocale();

// สี/label ของสถานะการจอง (ตัด rejected/cancelled ออกก่อนถึง client แล้ว)
export const STATUS_META = {
  pending:          { label: t('status.pending'),             bg: '#fdf0e0', fg: '#e08a1e' },
  approved:         { label: t('status.approved'),             bg: '#e7f4ee', fg: '#0c8b87' },
  cancel_requested: { label: t('tl.status_cancel_requested'), bg: '#e7f4ee', fg: '#0c8b87' },
  completed:        { label: t('tl.status_completed'),        bg: '#eef1f3', fg: '#8a97a2' },
};

const TH_MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
// ชื่อเดือนเต็มภาษาอังกฤษ คู่ขนานกับ TH_MONTHS_TH
const TH_MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const TH_MONTHS = LOCALE === 'en' ? TH_MONTHS_EN : TH_MONTHS_TH;

// หัวคอลัมน์ปฏิทิน เริ่มวันอาทิตย์ จบวันเสาร์
const TH_DOW_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
// หัวคอลัมน์ปฏิทินภาษาอังกฤษ คู่ขนานกับ TH_DOW_TH (เริ่มวันอาทิตย์)
const TH_DOW_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
export const TH_DOW = LOCALE === 'en' ? TH_DOW_EN : TH_DOW_TH;

// เติม 0 หน้าเลข 1 หลัก
const p2 = (n) => (n < 10 ? '0' + n : '' + n);

// Date -> 'YYYY-MM-DD' (เวลาท้องถิ่น)
export function ymd(d) {
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
}

// 'YYYY-MM-DD HH:MM:SS' -> 'HH:MM'
export function hhmm(dt) {
  return String(dt).slice(11, 16);
}

// 'YYYY-MM-DD HH:MM:SS' -> 'DD-MM-YYYY'
export function dmy(s) {
  const p = String(s).slice(0, 10).split('-');
  return (p.length === 3 && p[0]) ? `${p[2]}-${p[1]}-${p[0]}` : String(s).slice(0, 10);
}

// 'YYYY-MM-DD HH:MM:SS' -> Date (local)
export function parseDT(dt) {
  return new Date(String(dt).replace(' ', 'T'));
}

// คืน [firstCellDate, lastCellDate] ของ grid เดือน (6 แถว x 7 วัน, เริ่มอาทิตย์)
export function monthGridRange(year, month) {
  const first = new Date(year, month, 1);
  const dow = first.getDay();            // อาทิตย์=0 ... เสาร์=6
  const start = new Date(year, month, 1 - dow);
  const end = new Date(start);
  end.setDate(start.getDate() + 41);
  return [start, end];
}

// เวลาจบแถบจริง: รถขับเองที่คืนแล้ว (completed + มี returned_at) จบที่เวลาคืนจริง แทน end_at
// -> Timeline หดแถบมาถึงเวลาคืน ช่วงที่เหลือจึงว่างให้คนอื่นจองได้
export function effectiveEnd(b) {
  return (b.status === 'completed' && b.returned_at && b.booking_type === 'self') ? b.returned_at : b.end_at;
}

// booking b คาบเกี่ยววันที่ dayStr ('YYYY-MM-DD') ไหม (เทียบเฉพาะวันที่)
export function overlapsDay(b, dayStr) {
  const s = String(b.start_at).slice(0, 10);
  const e = String(b.end_at).slice(0, 10);
  return s <= dayStr && dayStr <= e;
}

// ข้อความสั้นบนป้าย: รถขับเอง = รุ่นรถ · รถอื่นๆ = รถที่กรอก/‘รถจัดหา’
export function bookingLabel(b) {
  if (b.booking_type === 'self') {
    return b.car_model || t('req.car_self');
  }
  return b.ext_driver_vehicle || t('tl.provided_car_fallback');
}
