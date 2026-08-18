import { ICONS } from './icons-data';

/**
 * ไอคอน SVG สำหรับ React island - ใช้ชุดเดียวกับฝั่ง PHP (ฟังก์ชัน icon() ใน app/Helpers/icon_helper.php)
 *
 * ข้อมูลมาจาก icons-data.js ที่ generate จาก lucide + Font Awesome ด้วย npm run icons
 * รายชื่อที่ใช้ได้ดูที่ resources/icons.json
 *
 * ใช้: <Icon name="car" /> · <Icon name="close" size={22} /> · <Icon name="trash" size={26} strokeWidth={2.2} />
 * ไอคอนรับสีจาก currentColor จึงเปลี่ยนสีได้ด้วย CSS ของ element ที่ครอบอยู่
 */
export default function Icon({ name, size = 20, className = '', strokeWidth = 2 }) {
  const data = ICONS[name];

  // ไม่มีชื่อนี้ในทะเบียน - ไม่เรนเดอร์อะไร
  if (!data) {
    if (import.meta.env.DEV) console.warn(`[Icon] ไม่พบไอคอน "${name}" (เพิ่มได้ที่ resources/icons.json)`);

    return null;
  }

  // lucide เป็นเส้น Font Awesome เป็นทึบ - attribute คนละชุด
  const isStroke = data.kind === 'stroke';
  const paint = isStroke
    ? { fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' }
    : { fill: 'currentColor' };

  return (
    <svg
      width={size}
      height={size}
      viewBox={data.vb}
      className={className}
      aria-hidden="true"
      {...paint}
      // เนื้อใน svg มาจากไฟล์ที่ generate ตอน build ไม่ใช่ข้อมูลจากผู้ใช้
      dangerouslySetInnerHTML={{ __html: data.body }}
    />
  );
}
