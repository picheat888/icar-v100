// attribute ของช่องกรอกที่ผูกกับข้อความ error ของมัน - ใช้คู่กับ <FieldError id={...} />
// aria-describedby ชี้ไปที่ region เสมอ เพราะ region อยู่ใน DOM ตลอดแม้ยังไม่มีข้อความ
export const fieldAttrs = (id, err) => ({
  id,
  'aria-invalid': err ? 'true' : undefined,
  'aria-describedby': `${id}-err`,
});

// ลบข้อความผิดพลาดของช่องที่ระบุออกจากชุด error - keys รับได้ทั้งคีย์เดียวและอาร์เรย์
// คืน object เดิมเมื่อไม่มีคีย์ไหนอยู่ในชุด (React จะข้าม re-render)
export const omitErrs = (errs, keys) => {
  const list = Array.isArray(keys) ? keys : [keys];
  if (! list.some((k) => k in errs)) return errs;
  const next = { ...errs };
  list.forEach((k) => delete next[k]);

  return next;
};
