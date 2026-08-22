/**
 * ข้อความผิดพลาดใต้ช่องกรอก - region อยู่ใน DOM ตลอด เปิดด้วย is-shown
 * aria-live ต้องมีอยู่ก่อนข้อความถูกใส่ ไม่งั้น screen reader บางตัวไม่อ่าน
 * ใช้คู่กับ fieldAttrs() ที่ช่องกรอก - id ต้องเป็นตัวเดียวกัน
 */
export default function FieldError({ id, msg }) {
  return (
    <div id={`${id}-err`} className={`form-err${msg ? ' is-shown' : ''}`} aria-live="polite">
      {msg || ''}
    </div>
  );
}
