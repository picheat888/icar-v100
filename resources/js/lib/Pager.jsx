import { t } from './i18n';

// ตัวควบคุมแบ่งหน้า (pagination) — สรุปช่วงที่แสดง + ปุ่ม ก่อนหน้า/1,2,3…/ถัดไป (ย่อด้วย … เมื่อหน้าเยอะ)
// ใช้ร่วมกันหลาย island · inCard = วางอยู่ในการ์ดตาราง (มีเส้นคั่นบนแทนระยะห่าง)
export default function Pager({ page, totalPages, total, perPage, onPage, inCard = false }) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  // สร้างเลขหน้า: หน้าแรก/สุดท้ายเสมอ + หน้ารอบ ๆ ปัจจุบัน, ที่เหลือย่อเป็น …
  const nums = [];
  const win = 1;
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || (n >= page - win && n <= page + win)) nums.push(n);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <div className={inCard ? 'pager pager--incard' : 'pager'}>
      <div className="pager-range">{t('pager.range', { from, to, total })}</div>
      <div className="pager-btns">
        <button className="pager-btn" onClick={() => onPage(page - 1)} disabled={page <= 1}>{t('pager.prev')}</button>
        {nums.map((n, i) => n === '…'
          ? <span key={`e${i}`} className="pager-gap">…</span>
          : <button key={n} className={n === page ? 'pager-btn active' : 'pager-btn'} onClick={() => onPage(n)}>{n}</button>)}
        <button className="pager-btn" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>{t('pager.next')}</button>
      </div>
    </div>
  );
}
