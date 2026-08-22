// attribute ของช่องกรอกที่ผูกกับข้อความ error ของมัน - ใช้คู่กับ <FieldError id={...} />
// aria-describedby ชี้ไปที่ region เสมอ เพราะ region อยู่ใน DOM ตลอดแม้ยังไม่มีข้อความ
export const fieldAttrs = (id, err) => ({
  id,
  'aria-invalid': err ? 'true' : undefined,
  'aria-describedby': `${id}-err`,
});
