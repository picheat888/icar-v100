import { t } from './i18n';

// ตัวควบคุมแบ่งหน้า (pagination) — สรุปช่วงที่แสดง + ปุ่ม ก่อนหน้า/1,2,3…/ถัดไป (ย่อด้วย … เมื่อหน้าเยอะ)
// ใช้ร่วมกันหลาย island (จัดการคำขอจองรถ / คำขอของฉัน)
export default function Pager({ page, totalPages, total, perPage, onPage }) {
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
  const btn = (active, disabled) => ({
    minWidth: 36,
    height: 36,
    padding: '0 11px',
    borderRadius: 8,
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: disabled ? 'default' : 'pointer',
    border: `1px solid ${active ? '#0a716e' : '#e2e7ea'}`,
    background: active ? '#0a716e' : '#fff',
    color: active ? '#fff' : (disabled ? '#c2cad0' : '#54616c'),
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
      <div style={{ fontSize: 13, color: '#7a8794' }}>{t('pager.range', { from, to, total })}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} style={btn(false, page <= 1)}>{t('pager.prev')}</button>
        {nums.map((n, i) => n === '…'
          ? <span key={`e${i}`} style={{ minWidth: 24, textAlign: 'center', color: '#9aa7b2' }}>…</span>
          : <button key={n} onClick={() => onPage(n)} style={btn(n === page, false)}>{n}</button>)}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} style={btn(false, page >= totalPages)}>{t('pager.next')}</button>
      </div>
    </div>
  );
}
