import { t } from './i18n';

// เป็นจำนวนเต็มบวกไหม - ตรงกับกฎฝั่ง server (preg_match '/^\d+$/' หลัง trim)
export const isPositiveInt = (v) => /^\d+$/.test(String(v ?? '').trim());

// เพดานจำนวนผู้โดยสารเมื่อไม่รู้จำนวนที่นั่งของรถ (ตรงกับคอลัมน์ people ที่เป็น SMALLINT)
export const MAX_PEOPLE = 999;

/**
 * ตรวจจำนวนผู้โดยสาร - คืนข้อความผิดพลาด หรือ '' ถ้าผ่าน
 * seats = จำนวนที่นั่งของรถ (0 หรือไม่ส่ง = ไม่รู้ ใช้เพดาน MAX_PEOPLE)
 * ลำดับการตรวจตรงกับฝั่ง server: จำนวนเต็ม -> ขั้นต่ำ -> ที่นั่งรถ -> เพดาน
 */
export function peopleError(raw, seats = 0) {
  const v = String(raw ?? '').trim();
  if (! isPositiveInt(v)) return t('book.err_people_int');
  const n = Number(v);
  if (n < 1) return t('book.err_people_min');
  const cap = Number(seats) > 0 ? Number(seats) : 0;
  if (cap > 0 && n > cap) return t('common.err_seats', { n: cap });
  if (n > MAX_PEOPLE) return t('book.err_people_max');
  return '';
}
