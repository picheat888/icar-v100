import { t } from '../../lib/i18n';
import { MONTHS, fmtTime, timeRange, dateTimeRange } from '../../lib/date';
import { STATUS_LABEL } from '../../lib/status';

// label ของสถานะการจอง (ตัด rejected/cancelled ออกก่อนถึง client แล้ว) - สีมาจาก class .st-* กลางใน CSS
export const STATUS_META = {
  pending:          { label: STATUS_LABEL.pending },
  approved:         { label: STATUS_LABEL.approved },
  cancel_requested: { label: t('tl.status_cancel_requested') },
  completed:        { label: t('tl.status_completed') },
};

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

// ช่วงเวลาบนป้ายของวัน dayStr - จองข้ามวันเห็นแค่ขาที่ตกในวันนั้น
export function dayRange(b, dayStr, end = effectiveEnd(b)) {
  const onStart = String(b.start_at).slice(0, 10) === dayStr;
  const onEnd   = String(end).slice(0, 10) === dayStr;
  if (onStart && onEnd) return timeRange(b.start_at, end);
  if (onStart) return `${fmtTime(b.start_at)} ${t('tl.onward')}`;
  if (onEnd) return `${t('common.to')} ${fmtTime(end)}`;
  return t('tl.allday');
}

// ช่วงเต็มพร้อมวันที่ - ใช้ใน tooltip
export function fullRange(b, end = effectiveEnd(b)) {
  return dateTimeRange(b.start_at, end);
}

// ข้อความสั้นบนป้าย: รถขับเอง = รุ่นรถ · รถอื่นๆ = รถที่กรอก/‘รถจัดหา’
export function bookingLabel(b) {
  if (b.booking_type === 'self') {
    return b.car_model || t('req.car_self');
  }
  return b.ext_driver_vehicle || t('tl.provided_car_fallback');
}
