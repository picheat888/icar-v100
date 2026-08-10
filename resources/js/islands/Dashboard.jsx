import { useState, useEffect, useRef, useCallback } from 'react';
import { getCsrf, setCsrf } from '../lib/csrf';
import { t, currentLocale } from '../lib/i18n';

const TEAL = '#0c8b87';
const LOCALE = currentLocale();
const TH_MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const TH_MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TH_MONTHS = LOCALE === 'en' ? TH_MONTHS_EN : TH_MONTHS_TH;
const TH_MONTHS_SHORT_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_MONTHS_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TH_MONTHS_SHORT = LOCALE === 'en' ? TH_MONTHS_SHORT_EN : TH_MONTHS_SHORT_TH;

// ป้ายสถานะคำขอ [ข้อความ, พื้นหลัง, สีตัวอักษร]
const STATUS = {
  pending:          [t('status.pending'), '#fdf0e0', '#9a5a12'],
  approved:         [t('status.approved'), '#e7f4ee', '#16855a'],
  cancel_requested: [t('status.cancel_requested'), '#fdf0e0', '#9a5a12'],
  completed:        [t('status.completed'), '#eef1f4', '#5b6b7a'],
  rejected:         [t('status.rejected'), '#fbecea', '#c0392b'],
  cancelled:        [t('status.cancelled'), '#fbecea', '#c0392b'],
};

// 'YYYY-MM-DD HH:MM:SS' -> {date:'YYYY-MM-DD', hm:'HH:MM', th:'19 มิถุนายน 2026'}
const parseDt = (s) => {
  if (!s) return { date: '', hm: '', th: '' };
  const [d, t] = s.split(' ');
  const [y, m, dd] = d.split('-');
  return { date: d, hm: (t || '').slice(0, 5), th: `${+dd} ${TH_MONTHS[+m - 1]} ${y}` };
};
// ช่วงเวลาแบบสั้น: "20 มิ.ย. 13:00 – 18:00"
const rangeShort = (start, end) => {
  const s = parseDt(start);
  const e = parseDt(end);
  const [, sm, sd] = s.date.split('-');
  return `${+sd} ${TH_MONTHS_SHORT[+sm - 1]} ${s.hm} – ${e.hm}`;
};

// เงายกลอยของการ์ด — ให้เด่นแยกจากพื้นเทา (ใช้ร่วมการ์ดสรุป + panel)
const CARD_SHADOW = '0 1px 2px rgba(17,24,39,.05), 0 12px 26px -10px rgba(17,24,39,.16)';

// การ์ดสรุปตัวเลข — เงายกลอย + ขอบคม ให้เด่นแยกจากพื้นเทา
function StatCard({ label, value, sub, icon, iconBg, iconColor }) {
  return (
    <div className="dash-card" style={{ background: '#fff', border: '1px solid #e3e8ec', borderRadius: 16, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 132, boxShadow: CARD_SHADOW }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 13.5, color: '#7a8794', fontWeight: 500, lineHeight: 1.4 }}>{label}</div>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{icon}</div>
      </div>
      <div className="dash-card-val" style={{ fontSize: 34, fontWeight: 700, color: '#1f2a33', lineHeight: 1.1, marginTop: 'auto' }}>{value}</div>
      <div style={{ fontSize: 12.5, color: '#9aa7b2' }}>{sub}</div>
    </div>
  );
}

const icons = {
  clock: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>,
  person: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>,
  car: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13l1.6-4.7A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.3L21 13v5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H6.5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><circle cx="7" cy="16" r="1" /><circle cx="17" cy="16" r="1" /></svg>,
  doc: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></svg>,
};

/**
 * Dashboard (Admin) — การ์ดสรุป 4 ใบ + panel คำขอล่าสุด + panel สมาชิกรออนุมัติ
 * props: endpoints {data, memberApprove, memberReject}, links {requests, members}
 */
export default function Dashboard({ endpoints, links }) {
  const [counts, setCounts] = useState({ pendingBookings: 0, pendingMembers: 0, availableCars: 0, totalBookings: 0 });
  const [bookings, setBookings] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [toast, setToast] = useState('');
  const busyRef = useRef(false);
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  // โหลดข้อมูลสรุป
  const load = useCallback(() => {
    setLoadErr(false);
    return fetch(endpoints.data, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => {
        setCounts(d.counts || {});
        setBookings(d.recentBookings || []);
        setMembers(d.pendingMembers || []);
      })
      .finally(() => setLoading(false))
      .catch(() => setLoadErr(true));
  }, [endpoints.data]);

  useEffect(() => { load(); }, [load]);

  // ยิง POST (อนุมัติ/ปฏิเสธ สมาชิก+คำขอ) inline เรียก endpoint เดิม แล้วโหลดสรุปใหม่
  const post = async (url, body) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const res = await fetch(url, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'X-CSRF-TOKEN': getCsrf(), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams(body).toString(),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok && !d.csrf) { window.location.reload(); return; }
      if (d.csrf) setCsrf(d.csrf);
      // แสดง error (เช่น 422 กฎธุรกิจ: รถไม่พร้อม/สถานะเปลี่ยน) ไม่กลืนเงียบ
      if (!res.ok || !d.ok) { showToast(d.message || t('dash.err')); return; }
      showToast(d.message || t('dash.success'));
      await load();
    } finally { busyRef.current = false; }
  };

  const cards = [
    { key: 'pendingBookings', label: t('dash.card_bookings'), sub: t('dash.card_bookings_sub'), icon: icons.clock, iconBg: '#fdf0e0', iconColor: '#e08a1e' },
    { key: 'pendingMembers', label: t('dash.card_members'), sub: t('dash.card_members_sub'), icon: icons.person, iconBg: '#e6f3f2', iconColor: TEAL },
    { key: 'availableCars', label: t('dash.card_cars'), sub: t('dash.card_cars_sub'), icon: icons.car, iconBg: '#e6f3f2', iconColor: TEAL },
    { key: 'totalBookings', label: t('dash.card_total'), sub: t('dash.card_total_sub'), icon: icons.doc, iconBg: '#e6f3f2', iconColor: TEAL },
  ];

  // จัดกลุ่มคำขอตามวันเริ่ม (ใหม่สุดก่อน — ตาม order ที่ backend ส่งมา)
  const groups = [];
  let cur = null;
  for (const b of bookings) {
    const { th, date } = parseDt(b.start_at);
    if (!cur || cur.date !== date) { cur = { date, th, rows: [] }; groups.push(cur); }
    cur.rows.push(b);
  }

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#1f2a33', color: '#fff', padding: '11px 20px', borderRadius: 9, fontSize: 14, fontWeight: 500, zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>{toast}</div>
      )}
      {loadErr && (
        <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fbecea', color: '#9a3b34', borderRadius: 8, fontSize: 13 }}>
          {t('dash.load_err')}
        </div>
      )}

      {/* การ์ดสรุป 4 ใบ — wrapper คุม layout (4→2→1 คอลัมน์) */}
      <div className="dash-stats">
        {cards.map((c) => (
          <StatCard key={c.key} {...c} value={loading ? '–' : (counts[c.key] ?? 0)} />
        ))}
      </div>

      {/* แถบเตือน — แสดงเฉพาะเมื่อมีรายการรออนุมัติ (แยกคำขอจองรถ / สมาชิก) */}
      {!loading && counts.pendingBookings > 0 && (
        <AlertBar tone="amber" title={t('dash.alert_bookings', { n: counts.pendingBookings })} sub={t('dash.alert_bookings_sub')} />
      )}
      {!loading && counts.pendingMembers > 0 && (
        <AlertBar tone="teal" title={t('dash.alert_members', { n: counts.pendingMembers })} sub={t('dash.alert_members_sub')} />
      )}

      {/* 2 คอลัมน์: คำขอล่าสุด (กว้าง) + สมาชิกรออนุมัติ — wrapper ซ้อนบนมือถือ */}
      <div className="dash-cols">
        {/* ===== panel คำขอจองรถ ===== */}
        <div style={panel}>
          <div style={panelHead}>
            <h3 style={panelTitle}>{t('dash.panel_bookings')}</h3>
            <a href={links.requests} style={seeAll}>{t('dash.see_all')}</a>
          </div>
          {loading ? <Empty text={t('dash.loading')} /> : groups.length === 0 ? <Empty text={t('dash.empty_bookings')} /> : (
            <div style={{ margin: '10px -20px 0' }}>
              {groups.map((g) => (
                <div key={g.date}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#54616c', background: '#f4f7f8', padding: '7px 20px' }}>{g.th}</div>
                  {g.rows.map((b) => {
                    const [sl, sb, sc] = STATUS[b.status] || STATUS.pending;
                    const veh = b.booking_type === 'other' ? t('dash.veh_other') : (b.car_model || '-');
                    const isPending = b.status === 'pending';
                    // ทั้ง pending และ ขอยกเลิก = งานที่ต้องจัดการ → ไฮไลต์แถบซ้าย+พื้นส้มเหมือนกัน
                    const needsAction = isPending || b.status === 'cancel_requested';
                    return (
                      <div key={b.id} className="dash-brow" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', borderBottom: '1px solid #f2f5f6', borderLeft: `3px solid ${needsAction ? '#e08a1e' : 'transparent'}`, background: needsAction ? '#fff6ea' : 'transparent' }}>
                        <div style={{ minWidth: 0, flex: '0 0 120px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1f2a33' }}>{b.booking_code}</div>
                          <div style={{ fontSize: 12, color: '#9aa7b2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.requester_name || '-'}</div>
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, color: '#37434d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{veh}</div>
                          <div style={{ fontSize: 12, color: '#9aa7b2' }}>{b.booking_type === 'other' ? (b.car_plate || '') : (b.car_plate || '')}</div>
                        </div>
                        <div style={{ flex: 'none', fontSize: 12.5, color: '#7a8794', whiteSpace: 'nowrap' }}>{rangeShort(b.start_at, b.end_at)}</div>
                        {isPending ? (
                          b.booking_type === 'other' ? (
                            // รถอื่นๆ: ต้องมอบหมายคนขับก่อนอนุมัติ → ไปทำที่หน้าจัดการคำขอ (อนุมัติ inline ตรงนี้ไม่ได้)
                            <a href={links.requests} className="dash-brow-act" style={{ flex: 'none', ...miniBtn('#e6f3f2', '#0a716e') }}>{t('dash.assign_driver')}</a>
                          ) : (
                            <div className="dash-brow-act" style={{ flex: 'none', display: 'flex', gap: 7 }}>
                              <button onClick={() => post(endpoints.requestApprove, { id: b.id })} style={miniBtn('#e7f4ee', '#16855a')}>{t('dash.approve')}</button>
                              {/* ปฏิเสธต้องกรอกเหตุผล → ไปทำที่หน้าจัดการคำขอ */}
                              <a href={links.requests} style={miniBtn('#fbecea', '#c0392b')}>{t('dash.reject')}</a>
                            </div>
                          )
                        ) : (
                          <span className="dash-brow-act" style={{ flex: 'none', ...badge(sb, sc) }}>{sl}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== panel สมาชิกรออนุมัติ ===== */}
        <div style={panel}>
          <div style={panelHead}>
            <h3 style={panelTitle}>{t('dash.panel_members')}</h3>
            <a href={links.members} style={seeAll}>{t('dash.see_all')}</a>
          </div>
          {loading ? <Empty text={t('dash.loading')} /> : members.length === 0 ? <Empty text={t('dash.empty_members')} /> : (
            <div style={{ marginTop: 4 }}>
              {members.map((m, i) => (
                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 2px', background: '#fff', borderBottom: i === members.length - 1 ? 'none' : '1px solid #f0f3f5' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1f2a33', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.full_name}</div>
                    <div style={{ fontSize: 12, color: '#9aa7b2', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('dash.pos_label')}{m.position || '-'}</div>
                    <div style={{ fontSize: 12, color: '#9aa7b2', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('dash.dept_label')}{m.dept || '-'}</div>
                  </div>
                  <button onClick={() => post(endpoints.memberApprove, { user_id: m.user_id, level: m.role || 'user' })} style={miniBtn('#e7f4ee', '#16855a')}>{t('dash.approve')}</button>
                  <button onClick={() => post(endpoints.memberReject, { user_id: m.user_id })} style={miniBtn('#fbecea', '#c0392b')}>{t('dash.reject')}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ padding: 28, textAlign: 'center', color: '#9aa7b2', fontSize: 13.5 }}>{text}</div>;
}

// โทนสีแถบเตือน — amber (คำขอจองรถ) / teal (สมาชิก) แยกให้ต่างกันชัด
const ALERT_TONES = {
  amber: { bg: '#fdf6e3', border: '#f0dca0', icon: '#e08a1e', title: '#8a5a12', sub: '#a5751f' },
  teal:  { bg: '#e8f4f3', border: '#b3ddd9', icon: '#0c8b87', title: '#0a605e', sub: '#2f807c' },
};

// แถบเตือน — ไอคอนวงกลม ! (กระเพื่อม) + หัวข้อ + คำอธิบายรอง · โทนสีตาม prop tone
function AlertBar({ title, sub, tone = 'amber' }) {
  const c = ALERT_TONES[tone] || ALERT_TONES.amber;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 18px', marginBottom: 14 }}>
      <div style={{ flex: 'none', color: c.icon, marginTop: 1 }}>
        <span className="icar-alert-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        </span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: c.title }}>{title}</div>
        <div style={{ fontSize: 13, color: c.sub, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

const panel = { background: '#fff', border: '1px solid #e3e8ec', borderRadius: 16, padding: '18px 20px', boxShadow: CARD_SHADOW };
const panelHead = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const panelTitle = { fontSize: 16, fontWeight: 700, color: '#1f2a33', margin: 0 };
const seeAll = { fontSize: 12.5, fontWeight: 600, color: TEAL, textDecoration: 'none', background: '#e6f3f2', padding: '6px 12px', borderRadius: 8 };
const badge = (bg, color) => ({ background: bg, color, borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' });
const miniBtn = (bg, color) => ({ background: bg, color, border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap' });
