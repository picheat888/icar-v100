/**
 * วงกลมหมุนระหว่างรอผล (ใช้ในปุ่มตอน busy)
 * ขนาดอิงจาก font-size ของ element แม่ (1em) สีตาม currentColor
 */
export default function Spinner({ className = '' }) {
  return <span className={`spinner${className ? ` ${className}` : ''}`} aria-hidden="true" />;
}
