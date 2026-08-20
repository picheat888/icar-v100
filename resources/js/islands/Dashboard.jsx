import { useState, useEffect, useCallback } from 'react';
import { t } from '../lib/i18n';
import { MONTHS, SHORT_MONTHS } from '../lib/date';
import { STATUS_LABEL, ST_CLASS } from '../lib/status';
import { SkelBar, SkelList } from '../lib/Skeleton';

// class สีของป้ายสถานะ - 4 สถานะที่มีชุดสีกลาง (.st-*) ใช้คู่กับ .dash-status-badge
// ส่วนที่เหลือ (rejected/cancelled) สีตรงกับ .pill--red ของกลางพอดี
const STATUS_CLASS = {
  pending: `dash-status-badge ${ST_CLASS.pending}`,
  approved: `dash-status-badge ${ST_CLASS.approved}`,
  cancel_requested: `dash-status-badge ${ST_CLASS.cancel_requested}`,
  completed: `dash-status-badge ${ST_CLASS.completed}`,
  rejected: 'pill--red',
  cancelled: 'pill--red',
};

// 'YYYY-MM-DD HH:MM:SS' -> {date:'YYYY-MM-DD', hm:'HH:MM', th:'19 มิถุนายน 2026'}
const parseDt = (s) => {
  if (!s) return { date: '', hm: '', th: '' };
  const [d, t] = s.split(' ');
  const [y, m, dd] = d.split('-');
  return { date: d, hm: (t || '').slice(0, 5), th: `${+dd} ${MONTHS[+m - 1]} ${y}` };
};
// ช่วงเวลาแบบสั้น: "20 มิ.ย. 13:00 - 18:00"
const rangeShort = (start, end) => {
  const s = parseDt(start);
  const e = parseDt(end);
  const [, sm, sd] = s.date.split('-');
  return `${+sd} ${SHORT_MONTHS[+sm - 1]} ${s.hm} - ${e.hm}`;
};

// การ์ดสรุปตัวเลข - เงายกลอย + ขอบคม ให้เด่นแยกจากพื้นเทา
function StatCard({ label, value, sub, icon, iconClass }) {
  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <div className="subtext dash-card-label">{label}</div>
        <div className={`icon-box ${iconClass}`}>{icon}</div>
      </div>
      <div className="dash-card-val">{value}</div>
      <div className="subtext subtext--faint">{sub}</div>
    </div>
  );
}

// ลูกศรท้ายปุ่มที่พาไปหน้าอื่น (ไม่ใช่ทำงานในหน้านี้)
const goArrow = (
  <svg className="dash-go-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
);

const icons = {
  clock: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>,
  person: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>,
  car: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13l1.6-4.7A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.3L21 13v5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H6.5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><circle cx="7" cy="16" r="1" /><circle cx="17" cy="16" r="1" /></svg>,
  doc: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></svg>,
};

/**
 * Dashboard (Admin) - การ์ดสรุป 4 ใบ + panel คำขอล่าสุด + panel สมาชิกรออนุมัติ
 * props: endpoints {data}, links {requests, members}
 */
export default function Dashboard({ endpoints, links }) {
  const [counts, setCounts] = useState({ pendingBookings: 0, pendingMembers: 0, availableCars: 0, totalBookings: 0 });
  const [bookings, setBookings] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);

  // โหลดข้อมูลสรุป
  const load = useCallback(() => {
    setLoadErr(false);
    return fetch(endpoints.data, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
      .then((r) => {
        if (! r.ok) throw new Error(`HTTP ${r.status}`);

        return r.json();
      })
      .then((d) => {
        setCounts(d.counts || {});
        setBookings(d.recentBookings || []);
        setMembers(d.pendingMembers || []);
      })
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  }, [endpoints.data]);

  useEffect(() => { load(); }, [load]);


  const cards = [
    { key: 'pendingBookings', label: t('dash.card_bookings'), sub: t('dash.card_bookings_sub'), icon: icons.clock, iconClass: 'dash-icon--amber' },
    { key: 'pendingMembers', label: t('dash.card_members'), sub: t('dash.card_members_sub'), icon: icons.person, iconClass: 'icon-box--teal' },
    { key: 'availableCars', label: t('dash.card_cars'), sub: t('dash.card_cars_sub'), icon: icons.car, iconClass: 'icon-box--teal' },
    { key: 'carsInUse', label: t('dash.card_inuse'), sub: t('dash.card_inuse_sub'), icon: icons.car, iconClass: 'dash-icon--amber' },
  ];

  // จัดกลุ่มคำขอตามวันเริ่ม (ใหม่สุดก่อน - ตาม order ที่ backend ส่งมา)
  const groups = [];
  let cur = null;
  for (const b of bookings) {
    const { th, date } = parseDt(b.start_at);
    if (!cur || cur.date !== date) { cur = { date, th, rows: [] }; groups.push(cur); }
    cur.rows.push(b);
  }

  return (
    <div>
      {loadErr && (
        <div className="alert-error alert-error--sm dash-loaderr" role="alert">
          <span>{t('dash.load_err')}</span>
          <button type="button" onClick={() => { setLoading(true); load(); }} className="dash-retry">{t('dash.retry')}</button>
        </div>
      )}

      {/* การ์ดสรุป 4 ใบ - wrapper คุม layout (4→2→1 คอลัมน์) */}
      <div className="dash-stats">
        {cards.map(({ key, ...c }) => (
          <StatCard key={key} {...c} value={loadErr ? '—' : (loading ? <SkelBar w={40} className="dash-sk-val" /> : (counts[key] ?? 0))} />
        ))}
      </div>

      {/* แถบเตือน - แสดงเฉพาะเมื่อมีรายการรออนุมัติ (แยกคำขอจองรถ / สมาชิก) */}
      {!loading && counts.pendingBookings > 0 && (
        <AlertBar tone="amber" title={t('dash.alert_bookings', { n: counts.pendingBookings })} sub={t('dash.alert_bookings_sub')} />
      )}
      {!loading && counts.pendingMembers > 0 && (
        <AlertBar tone="teal" title={t('dash.alert_members', { n: counts.pendingMembers })} sub={t('dash.alert_members_sub')} />
      )}

      {/* 2 คอลัมน์: คำขอล่าสุด (กว้าง) + สมาชิกรออนุมัติ - wrapper ซ้อนบนมือถือ */}
      <div className="dash-cols">
        {/* ===== panel คำขอจองรถ ===== */}
        <div className="dash-panel">
          <div className="dash-panel-head">
            <h3 className="title title--sm">{t('dash.panel_bookings')}</h3>
            <a href={links.requests} className="dash-see-all">{t('dash.see_all')}</a>
          </div>
          {loading ? <SkelList rows={4} /> : loadErr ? <Empty text={t('dash.load_err_short')} /> : groups.length === 0 ? <Empty text={t('dash.empty_bookings')} /> : (
            <div className="dash-brow-list">
              {groups.map((g) => (
                <div key={g.date}>
                  <div className="dash-daylabel">{g.th}</div>
                  {g.rows.map((b) => {
                    const sl = STATUS_LABEL[b.status] || STATUS_LABEL.pending;
                    const stCls = STATUS_CLASS[b.status] || STATUS_CLASS.pending;
                    const veh = b.booking_type === 'other' ? t('dash.veh_other') : (b.car_model || '-');
                    // ทั้ง pending และ ขอยกเลิก = งานที่ต้องจัดการ → ไฮไลต์แถบซ้าย+พื้นส้มเหมือนกัน
                    const needsAction = b.status === 'pending' || b.status === 'cancel_requested';
                    return (
                      <div key={b.id} className={`dash-brow ${needsAction ? 'dash-brow--action' : ''}`}>
                        <div className="dash-brow-code">
                          <div className="dash-brow-code-no">{b.booking_code}</div>
                          <div className="dash-brow-code-sub">{b.requester_name || '-'}</div>
                        </div>
                        <div className="dash-brow-veh">
                          <div className="dash-brow-veh-name">{veh}</div>
                          <div className="dash-brow-veh-sub">{b.car_plate || ''}</div>
                        </div>
                        <div className="dash-brow-time">{rangeShort(b.start_at, b.end_at)}</div>
                        {/* dashboard เป็นหน้ารายงาน ไม่ตัดสินใจแทน - ทุกงานที่ต้องจัดการพาไปเปิดคำขอนั้น
                            ที่หน้าจัดการคำขอ ซึ่งมีทั้งหมายเหตุ เลือกคนขับ และขั้นยืนยัน */}
                        {needsAction ? (
                          <div className="dash-brow-act dash-brow-btns">
                            <span className={`pill pill--sm ${stCls}`}>{sl}</span>
                            <a href={`${links.requests}?open=${encodeURIComponent(b.booking_code)}`} className="dash-mini-btn dash-mini-btn--go">{t('dash.review')}{goArrow}</a>
                          </div>
                        ) : (
                          <span className={`dash-brow-act pill pill--sm ${stCls}`}>{sl}</span>
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
        <div className="dash-panel">
          <div className="dash-panel-head">
            <h3 className="title title--sm">{t('dash.panel_members')}</h3>
            <a href={links.members} className="dash-see-all">{t('dash.see_all')}</a>
          </div>
          {loading ? <SkelList rows={3} /> : loadErr ? <Empty text={t('dash.load_err_short')} /> : members.length === 0 ? <Empty text={t('dash.empty_members')} /> : (
            <div className="dash-member-list">
              {members.map((m, i) => (
                <div key={m.user_id} className={`dash-member-row ${i === members.length - 1 ? 'dash-member-row--last' : ''}`}>
                  <div className="dash-member-info">
                    <div className="dash-member-name">{m.full_name}</div>
                    <div className="dash-member-sub dash-member-sub--pos">{t('dash.pos_label')}{m.position || '-'}</div>
                    <div className="dash-member-sub dash-member-sub--dept">{t('dash.dept_label')}{m.dept || '-'}</div>
                  </div>
                  <a href={`${links.members}?open=${encodeURIComponent(m.emp_id)}`} className="dash-mini-btn dash-mini-btn--go">{t('dash.review')}{goArrow}</a>
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
  return <div className="dash-empty">{text}</div>;
}

// แถบเตือน - ไอคอน + หัวข้อ + คำอธิบายรอง · โทนสีตาม prop tone (amber/teal)
function AlertBar({ title, sub, tone = 'amber' }) {
  const cls = tone === 'teal' ? 'teal' : 'amber';
  return (
    <div className={`dash-alert dash-alert--${cls}`}>
      <div className={`dash-alert-icon dash-alert-icon--${cls}`}>
        <span className="icar-alert-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        </span>
      </div>
      <div className="dash-alert-body">
        <div className={`dash-alert-title dash-alert-title--${cls}`}>{title}</div>
        <div className={`dash-alert-sub dash-alert-sub--${cls}`}>{sub}</div>
      </div>
    </div>
  );
}
