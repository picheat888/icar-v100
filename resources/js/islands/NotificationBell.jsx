import { useState, useEffect, useRef, useCallback } from 'react';
import { thTime } from '../lib/date';
import { t } from '../lib/i18n';
import { getCsrf, setCsrf } from '../lib/csrf';

// กระดิ่งแจ้งเตือน - badge + dropdown + poll 60วิ + load-more
export default function NotificationBell({ endpoints }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unseen, setUnseen] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const openRef = useRef(false);
  const chainRef = useRef(Promise.resolve());

  // GET รายการ (offset 0 = แทนที่, มากกว่านั้น = ต่อท้าย)
  const fetchPage = useCallback((offset, append) => {
    setLoading(true);
    return fetch(`${endpoints.data}?offset=${offset}`, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => {
        setUnseen(d.unseenCount || 0);
        setHasMore(!!d.hasMore);
        setItems((prev) => (append ? [...prev, ...(d.items || [])] : (d.items || [])));
      })
      .finally(() => setLoading(false))
      .catch(() => {});
  }, [endpoints.data]);

  // POST helper (แนบ CSRF + อัปเดต meta) - ต่อคิวทีละคำขอกัน CSRF token ชนกัน (Shield regenerate=true)
  const post = useCallback((url, body, opts) => {
    const run = () => fetch(url, {
      method: 'POST',
      ...opts,
      headers: { 'X-CSRF-TOKEN': getCsrf(), 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      credentials: 'same-origin',
      body: new URLSearchParams(body || {}).toString(),
    }).then((r) => r.json()).then((d) => { setCsrf(d.csrf); return d; }).catch(() => ({}));
    const p = chainRef.current.then(run, run);
    chainRef.current = p.catch(() => {});
    return p;
  }, []);

  // เก็บ open ล่าสุดไว้ใน ref ให้ interval callback อ่านค่าปัจจุบันได้ (กัน stale closure)
  useEffect(() => { openRef.current = open; }, [open]);

  // โหลดครั้งแรก + poll ทุก 60 วิ (อัปเดต badge; ถ้าไม่ได้เปิดอยู่ให้รีเฟรชหน้าแรกด้วย)
  useEffect(() => {
    fetchPage(0, false);
    const id = setInterval(() => { if (!openRef.current) fetchPage(0, false); }, 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  // ปิด dropdown เมื่อคลิกนอกกล่อง
  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // สลับเปิด/ปิด - ตอนเปิด: โหลดหน้าแรกใหม่ + เห็นแล้วทั้งหมด (badge=0)
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      fetchPage(0, false);
      post(endpoints.seen).then(() => setUnseen(0));
    }
  };

  // ลิงก์ปลอดภัย: อนุญาตเฉพาะ http(s) หรือ path ภายใน (ขึ้นต้นด้วย /) - กัน javascript:/data: (defense-in-depth)
  const safeLink = (u) => typeof u === 'string' && (/^https?:\/\//i.test(u) || u.startsWith('/'));

  // กดรายการ -> อ่านแล้ว + ไปลิงก์ (ไปหลัง POST เสร็จ กัน request ถูกตัด)
  const onItem = (n) => {
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    post(endpoints.read, { id: n.id }, { keepalive: true }).finally(() => { if (safeLink(n.link)) window.location = n.link; });
  };

  // อ่านทั้งหมด
  const onReadAll = () => {
    post(endpoints.readAll);
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
  };

  // จัดกลุ่มแจ้งเตือนตามวัน (items เรียงใหม่->เก่าอยู่แล้ว กลุ่มเดียวกันจึงต่อเนื่องกัน)
  const groups = [];
  let curGroup = null;
  for (const n of items) {
    const k = String(n.created_at).slice(0, 10);
    if (!curGroup || curGroup.key !== k) {
      curGroup = { key: k, items: [] };
      groups.push(curGroup);
    }
    curGroup.items.push(n);
  }

  // ป้ายหัวข้อวัน: วันนี้ / เมื่อวาน / DD-MM-YYYY
  const dayLabel = (k) => {
    const p2 = (x) => (x < 10 ? '0' + x : '' + x);
    const asYmd = (d) => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
    const today = new Date();
    const yest = new Date(today);
    yest.setDate(today.getDate() - 1);
    if (k === asYmd(today)) return t('notif.today');
    if (k === asYmd(yest)) return t('notif.yesterday');
    const p = k.split('-');
    return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : k;
  };

  return (
    <div ref={boxRef} className="nb-wrap">
      {/* ปุ่มกระดิ่ง + badge */}
      <button type="button" onClick={toggle} className="nb-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
        {unseen > 0 && (
          <span className="nb-badge">
            {unseen > 99 ? '99+' : unseen}
          </span>
        )}
      </button>

      {/* dropdown */}
      {open && (
        <div className="nb-dropdown">
          <div className="nb-head">
            <span className="title title--sm">{t('notif.title')}</span>
            <button type="button" onClick={onReadAll} className="nb-readall">{t('notif.read_all')}</button>
          </div>

          <div className="nb-list">
            {loading && items.length === 0 && (
              <div className="nb-empty">{t('common.loading')}</div>
            )}
            {items.length === 0 && !loading && (
              <div className="nb-empty">{t('notif.empty')}</div>
            )}
            {groups.map((g) => (
              <div key={g.key}>
                {/* หัวข้อวัน */}
                <div className="nb-daylabel">{dayLabel(g.key)}</div>
                {g.items.map((n) => (
                  <div key={n.id} onClick={() => onItem(n)}
                    className={`nb-item${n.isRead ? '' : ' nb-item--unread'}`}>
                    <div className="nb-item-msg">{n.message}</div>
                    <div className="subtext subtext--faint nb-item-time">{thTime(n.created_at)}</div>
                  </div>
                ))}
              </div>
            ))}
            {hasMore && (
              <button type="button" onClick={() => fetchPage(items.length, true)} disabled={loading}
                className="nb-more">
                {loading ? t('common.loading') : t('notif.load_more')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
