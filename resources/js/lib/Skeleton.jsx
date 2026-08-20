import { t } from './i18n';

/**
 * โครงร่างระหว่างโหลดข้อมูล (skeleton) - แถบ shimmer แทนเนื้อหาจริงชั่วคราว
 * ความกว้างเลือกจาก modifier .sk-bar--w20/40/60/80/100 (ไม่ใช้ inline style)
 */

const CELL_W = [60, 80, 40, 100, 60];   // ความกว้างช่องในตาราง - วนใช้ให้แต่ละแถวไม่เท่ากันเป๊ะ
const LINE_W = [100, 80, 60];           // ความกว้างบรรทัดในการ์ด

// แถบ shimmer เดี่ยว - w = ความกว้าง % (20/40/60/80/100)
export function SkelBar({ w = 100, className = '' }) {
  return <span className={`sk-bar sk-bar--w${w}${className ? ` ${className}` : ''}`} aria-hidden="true" />;
}

// <tbody> ของแถวโครงร่าง - หย่อนลงใน <Table> ตัวจริง ความกว้างคอลัมน์จึงเท่าของจริง
export function SkelRows({ cols, rows = 5 }) {
  return (
    <tbody role="status" aria-busy="true" aria-label={t('common.loading')}>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="sk-tr">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c}><SkelBar w={CELL_W[(r + c) % CELL_W.length]} /></td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// การ์ดโครงร่างล้วน ๆ ไม่มี wrapper - หย่อนลงใน grid ที่หน้านั้นมีอยู่แล้ว
export function SkelCardItems({ count = 6, lines = 3 }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className="sk-card">
      <SkelBar w={60} className="sk-bar--title" />
      {Array.from({ length: lines }, (_, j) => <SkelBar key={j} w={LINE_W[j % LINE_W.length]} />)}
    </div>
  ));
}

// การ์ดโครงร่างพร้อม wrapper - className = class ของ grid ที่หน้านั้นใช้อยู่
export function SkelCards({ count = 6, lines = 3, className = '' }) {
  return (
    <div className={className} role="status" aria-busy="true" aria-label={t('common.loading')}>
      <SkelCardItems count={count} lines={lines} />
    </div>
  );
}

// ลิสต์โครงร่าง - แถวสูงเท่ากันเรียงลง (ใช้กับ panel/ลิสต์ที่ไม่ใช่ตาราง)
export function SkelList({ rows = 4, className = '' }) {
  return (
    <div className={`sk-list${className ? ` ${className}` : ''}`} role="status" aria-busy="true" aria-label={t('common.loading')}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sk-row">
          <SkelBar w={40} className="sk-bar--title" />
          <SkelBar w={LINE_W[i % LINE_W.length]} />
        </div>
      ))}
    </div>
  );
}

// กล่องโครงร่างสี่เหลี่ยมผืนเดียว (ปฏิทิน / กริดเวลา)
export function SkelBox({ className = '' }) {
  return <div className={`sk-box${className ? ` ${className}` : ''}`} role="status" aria-busy="true" aria-label={t('common.loading')} />;
}
