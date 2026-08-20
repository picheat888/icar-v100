import { useState, useEffect, useRef, useCallback } from 'react';
import { thTime } from '../lib/date';
import { t } from '../lib/i18n';
import { getCsrf, setCsrf } from '../lib/csrf';
import Icon from '../lib/Icon';
import Spinner from '../lib/Spinner';

// ไอคอน + โทนสีตามประเภทแจ้งเตือน (ชื่อไอคอนดูที่ resources/icons.json)
const TYPE_ICON = {
  booking_new:       ['bookings', 'amber'],
  cancel_requested:  ['alert', 'amber'],
  member_new:        ['members', 'amber'],
  booking_approved:  ['check-circle', 'teal'],
  cancel_confirmed:  ['check', 'teal'],
  driver_assigned:   ['user', 'teal'],
  member_approved:   ['check-circle', 'teal'],
  job_new:           ['my-jobs', 'teal'],
  car_returned:      ['return', 'teal'],
  booking_rejected:  ['cancel', 'red'],
  booking_cancelled: ['cancel', 'red'],
  job_cancelled:     ['cancel', 'red'],
  member_rejected:   ['cancel', 'red'],
  booking_expired:   ['clock', 'gray'],
  booking_edited:    ['pencil', 'gray'],
};

// กระดิ่งแจ้งเตือน - badge + dropdown + poll 60วิ + load-more
export default function NotificationBell({ endpoints }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const boxRef = useRef(null);
  const btnRef = useRef(null);
  const openRef = useRef(false);
  const chainRef = useRef(Promise.resolve());
  const readEpoch = useRef(0);

  // GET รายการ (offset 0 = แทนที่, มากกว่านั้น = ต่อท้าย)
  const fetchPage = useCallback((offset, append) => {
    setLoading(true);
    const epoch = readEpoch.current;

    return fetch(`${endpoints.data}?offset=${offset}`, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
      .then((r) => {
        if (! r.ok) throw new Error(`HTTP ${r.status}`);

        return r.json();
      })
      .then((d) => {
        setFailed(false);
        // ถ้าผู้ใช้กดอ่านระหว่างรอ response ค่านับจาก server จะเก่ากว่า - ปล่อยให้ค่าที่หักไว้แล้วชนะ
        if (epoch === readEpoch.current) setUnread(d.unreadCount || 0);
        setHasMore(!!d.hasMore);
        setItems((prev) => (append ? [...prev, ...(d.items || [])] : (d.items || [])));
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
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

  // โหลดครั้งแรก + poll ทุก 60 วิ · ข้ามรอบที่แท็บถูกซ่อนหรือ dropdown เปิดอยู่ (กันดึงรายการใต้มือผู้ใช้)
  useEffect(() => {
    fetchPage(0, false);
    const tick = () => { if (! document.hidden && ! openRef.current) fetchPage(0, false); };
    const id = setInterval(tick, 60000);
    document.addEventListener('visibilitychange', tick);

    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  // ปิด dropdown เมื่อคลิกนอกกล่อง
  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && ! boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);

    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Escape ปิด dropdown แล้วคืน focus ให้ปุ่มกระดิ่ง
  useEffect(() => {
    if (! open) return;
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);

    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // สลับเปิด/ปิด - ตอนเปิดโหลดหน้าแรกใหม่ (badge ไม่หายจากการเปิด ต้องกดอ่านรายการ)
  const toggle = () => {
    const next = ! open;
    setOpen(next);
    if (next) fetchPage(0, false);
  };

  // ลิงก์ปลอดภัย: อนุญาตเฉพาะ http(s) หรือ path ภายใน (ขึ้นต้นด้วย /) - กัน javascript:/data: (defense-in-depth)
  const safeLink = (u) => typeof u === 'string' && (/^https?:\/\//i.test(u) || u.startsWith('/'));

  // กดรายการ -> อ่านแล้ว + ไปลิงก์ (ไปหลัง POST เสร็จ กัน request ถูกตัด) · ไม่มีลิงก์ = ปิดกล่อง
  const onItem = (n) => {
    if (! n.isRead) {
      readEpoch.current++;
      setUnread((c) => Math.max(0, c - 1));
    }
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    post(endpoints.read, { id: n.id }, { keepalive: true })
      .finally(() => { if (safeLink(n.link)) window.location = n.link; else setOpen(false); });
  };

  // อ่านทั้งหมด
  const onReadAll = () => {
    readEpoch.current++;
    setUnread(0);
    post(endpoints.readAll);
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
  };

  // จัดกลุ่มแจ้งเตือนตามวัน (items เรียงใหม่->เก่าอยู่แล้ว กลุ่มเดียวกันจึงต่อเนื่องกัน)
  const groups = [];
  let curGroup = null;
  for (const n of items) {
    const k = String(n.created_at).slice(0, 10);
    if (! curGroup || curGroup.key !== k) {
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
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="nb-btn"
        aria-label={unread > 0 ? t('notif.aria_unread', { n: unread }) : t('notif.title')}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Icon name="bell" size={20} />
        {unread > 0 && (
          <span className="nb-badge" aria-hidden="true">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {/* ประกาศจำนวนใหม่ให้ screen reader (ไม่แสดงบนจอ) */}
      <span className="sr-only" aria-live="polite">{unread > 0 ? t('notif.aria_unread', { n: unread }) : ''}</span>

      {/* dropdown */}
      {open && (
        <div className="nb-dropdown" role="dialog" aria-label={t('notif.title')}>
          <div className="nb-head">
            <span className="title title--sm">{t('notif.title')}</span>
            <button type="button" onClick={onReadAll} disabled={unread === 0} className="nb-readall">{t('notif.read_all')}</button>
          </div>

          <div className="nb-list">
            {loading && items.length === 0 && ! failed && (
              <div className="nb-empty">{t('common.loading')}</div>
            )}
            {failed && items.length === 0 && (
              <div className="nb-empty">
                {t('notif.load_err')}
                <button type="button" onClick={() => fetchPage(0, false)} className="nb-retry">{t('notif.retry')}</button>
              </div>
            )}
            {items.length === 0 && ! loading && ! failed && (
              <div className="nb-empty">{t('notif.empty')}</div>
            )}
            {groups.map((g) => (
              <div key={g.key}>
                {/* หัวข้อวัน */}
                <div className="nb-daylabel">{dayLabel(g.key)}</div>
                {g.items.map((n) => {
                  const [ic, tone] = TYPE_ICON[n.type] || ['bell', 'gray'];

                  return (
                    <button key={n.id} type="button" onClick={() => onItem(n)}
                      className={`nb-item${n.isRead ? '' : ' nb-item--unread'}`}>
                      <span className={`nb-item-ic nb-item-ic--${tone}`}><Icon name={ic} size={15} /></span>
                      <span className="nb-item-body">
                        <span className="nb-item-msg">{n.message}</span>
                        <span className="subtext subtext--faint nb-item-time">{thTime(n.created_at)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
            {hasMore && (
              <button type="button" onClick={() => fetchPage(items.length, true)} disabled={loading}
                className="nb-more">
                {loading ? <Spinner /> : t('notif.load_more')}
              </button>
            )}
            {failed && items.length > 0 && (
              <div className="nb-foot-err">{t('notif.load_err')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
