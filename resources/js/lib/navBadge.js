// badge งานค้างบน sidebar (วงกลมส้ม) — sidebar เรนเดอร์จากฝั่ง server ตอนโหลดหน้า
// island จึงต้องอัปเดตตัวเลขเองหลังทำรายการ ไม่งั้นเลขจะค้างจนกว่าจะรีโหลดหน้า

/**
 * ตั้งค่า badge ของเมนูหนึ่ง — 0 = ซ่อน
 * key: 'requests' (คำขอจองรถค้าง) | 'members' (สมาชิกรออนุมัติ)
 */
export function setNavBadge(key, count) {
  const el = document.querySelector(`[data-badge="${key}"]`);
  if (!el) return;
  const n = Math.max(0, Number(count) || 0);
  el.textContent = n > 99 ? '99+' : String(n);
  el.classList.toggle('nav-badge--hide', n === 0);
}
