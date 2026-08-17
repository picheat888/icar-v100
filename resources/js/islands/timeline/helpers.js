import { t } from '../../lib/i18n';
import { MONTHS, DOW, pad as p2 } from '../../lib/date';
import { STATUS_LABEL } from '../../lib/status';

// label ของสถานะการจอง (ตัด rejected/cancelled ออกก่อนถึง client แล้ว) - สีมาจาก class .st-* กลางใน CSS
export const STATUS_META = {
  pending:          { label: STATUS_LABEL.pending },
  approved:         { label: STATUS_LABEL.approved },
  cancel_requested: { label: t('tl.status_cancel_requested') },
  completed:        { label: t('tl.status_completed') },
};

// ชื่อเดือนเต็ม / หัวคอลัมน์ปฏิทิน - ใช้ชุดกลาง (re-export ให้ component ในโฟลเดอร์นี้เรียกได้เหมือนเดิม)
export const TH_MONTHS = MONTHS;
export const TH_DOW = DOW;

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
