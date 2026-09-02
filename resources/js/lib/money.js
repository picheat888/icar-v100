// จัดรูปแบบจำนวนเงิน - ใช้ที่เดียวทั้งระบบ (ห้าม toLocaleString/toFixed เองในหน้าอื่น)

/**
 * ตัวเลข -> '1,500.00' (คั่นหลักพัน ทศนิยม 2 ตำแหน่งเสมอ)
 * ค่าว่าง/ไม่ใช่ตัวเลข -> null ให้ผู้เรียกตัดสินใจว่าจะแสดงอะไรแทน
 */
export function fmtMoney(v) {
  if (v === null || v === undefined || v === '') {
    return null;
  }
  const n = Number(String(v).replace(/,/g, ''));
  if (! Number.isFinite(n)) {
    return null;
  }

  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** ตัดทุกอย่างที่ไม่ใช่ตัวเลขกับจุด แล้วคุมทศนิยมไม่เกิน 2 ตำแหน่ง */
export function onlyMoney(v) {
  const s = String(v ?? '').replace(/[^\d.]/g, '');
  const [head, ...rest] = s.split('.');

  return rest.length ? `${head}.${rest.join('').slice(0, 2)}` : head;
}

/**
 * ค่าที่กำลังพิมพ์ -> ใส่ , คั่นหลักพัน (คงจุดทศนิยมที่พิมพ์ค้างไว้ ยังไม่เติม 0)
 * '12500.5' -> '12,500.5' · '1234.' -> '1,234.'
 */
export function maskMoney(v) {
  const s = onlyMoney(v);
  const [int = '', dec] = s.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return dec === undefined ? grouped : `${grouped}.${dec}`;
}

/** ตัด , ออกก่อนส่ง/ตรวจค่า */
export function unmaskMoney(v) {
  return String(v ?? '').replace(/,/g, '');
}

/**
 * ตำแหน่งเคอร์เซอร์ใหม่หลังใส่ , - นับจากจำนวนตัวเลขที่อยู่ก่อนเคอร์เซอร์เดิม
 * ไม่ทำแบบนี้เคอร์เซอร์จะเด้งไปท้ายช่องทุกครั้งที่มี , โผล่
 */
export function caretAfterMask(oldValue, caret, masked) {
  const before = String(oldValue).slice(0, caret).replace(/[^\d.]/g, '').length;
  let seen = 0;
  for (let i = 0; i < masked.length; i++) {
    if (/[\d.]/.test(masked[i])) {
      seen++;
    }
    if (seen >= before) {
      return i + 1;
    }
  }

  return masked.length;
}
