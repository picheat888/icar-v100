import { useState, useEffect, useCallback, useRef } from 'react';
import { useDevice } from './timeline/useDevice';
import { t, currentLocale } from '../lib/i18n';

const TEAL = '#0c8b87';
const LOCALE = currentLocale();
const TH_MONTHS_SHORT_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
// เดือนย่อภาษาอังกฤษ คู่ขนานกับ TH_MONTHS_SHORT_TH
const TH_MONTHS_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TH_MONTHS_SHORT = LOCALE === 'en' ? TH_MONTHS_SHORT_EN : TH_MONTHS_SHORT_TH;
const pad = (n) => (n < 10 ? '0' + n : '' + n);

// 'YYYY-MM-DD HH:MM:SS' -> '21 ก.ค. 2026 · 14:30'
const fmtTime = (s) => {
  if (!s) return '-';
  const [d, tm] = s.split(' ');
  const [y, m, dd] = d.split('-');
  return `${+dd} ${TH_MONTHS_SHORT[+m - 1]} ${y} · ${(tm || '').slice(0, 5)}`;
};
// วันนี้/ก่อนหน้า สำหรับ default range (YYYY-MM-DD)
const ymd = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

const ROLE_BADGE = {
  admin:  ['#e6f3f2', '#0a716e'],
  user:   ['#eef1f4', '#5b6b7a'],
  driver: ['#fff6ea', '#9a5a12'],
};

const inp = { padding: '9px 12px', border: '1px solid #d8dee3', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: '#37434d' };

/**
 * ประวัติการใช้งาน — ตาราง log + ฟิลเตอร์ช่วงวันที่ + Export CSV
 * props: endpoints {data, export}
 */
export default function ActivityLog({ endpoints }) {
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 6);

  const [from, setFrom] = useState(ymd(weekAgo));
  const [to, setTo] = useState(ymd(today));
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [toast, setToast] = useState('');
  const device = useDevice();
  const seqRef = useRef(0);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2800); };

  // โหลด log ตามช่วงวันที่ (กัน response เก่าทับด้วย seq)
  const load = useCallback(() => {
    const seq = ++seqRef.current;
    setLoading(true);
    setLoadErr(false);
    fetch(`${endpoints.data}?from=${from}&to=${to}`, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => { if (seq === seqRef.current) { setLogs(d.logs || []); setTotal(d.total || 0); } })
      .finally(() => { if (seq === seqRef.current) setLoading(false); })
      .catch(() => { if (seq === seqRef.current) setLoadErr(true); });
  }, [endpoints.data, from, to]);

  useEffect(() => { load(); }, [load]);

  // Export CSV — ไม่มีข้อมูล = toast (ตามสเปก) มิฉะนั้นเปิดลิงก์ดาวน์โหลด
  const exportCsv = () => {
    if (logs.length === 0) { showToast(t('log.no_data_range')); return; }
    window.location.href = `${endpoints.export}?from=${from}&to=${to}`;
  };

  const roleBadge = (role, label) => {
    const [bg, color] = ROLE_BADGE[role] || ROLE_BADGE.user;
    return <span style={{ background: bg, color, borderRadius: 999, padding: '3px 11px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>;
  };

  const mobile = device === 'mobile';

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#1f2a33', color: '#fff', padding: '11px 20px', borderRadius: 9, fontSize: 14, fontWeight: 500, zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>{toast}</div>
      )}

      {/* แถบฟิลเตอร์ */}
      <div className="filter-card" style={{ alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#54616c', marginBottom: 6 }}>{t('log.date_range_label')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={{ ...inp, width: 185, padding: '10px 14px' }} />
            <span style={{ color: '#9aa7b2', fontSize: 15, flex: 'none' }}>→</span>
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={{ ...inp, width: 185, padding: '10px 14px' }} />
          </div>
        </div>
        <button onClick={exportCsv} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: TEAL, color: '#fff', border: '1px solid transparent', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          Export CSV
        </button>
      </div>

      {loadErr && <div style={{ padding: '10px 14px', marginBottom: 12, background: '#fbecea', color: '#9a3b34', borderRadius: 8, fontSize: 13 }}>{t('common.load_err')}</div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9aa7b2' }}>{t('common.loading')}</div>
      ) : logs.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e7ebee', borderRadius: 12, padding: 40, textAlign: 'center', color: '#9aa7b2' }}>{t('log.no_data_range')}</div>
      ) : mobile ? (
        // มือถือ: การ์ด
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {logs.map((l) => (
            <div key={l.id} style={{ background: '#fff', border: '1px solid #e7ebee', borderRadius: 12, padding: '13px 15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 7 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1f2a33' }}>{l.actor_name || '-'}</span>
                {roleBadge(l.role, l.role_label)}
              </div>
              <div style={{ fontSize: 13.5, color: '#37434d', marginBottom: 6 }}>{l.action}</div>
              <div style={{ fontSize: 12, color: '#9aa7b2' }}>{fmtTime(l.created_at)}</div>
            </div>
          ))}
        </div>
      ) : (
        // เดสก์ท็อป: ตาราง
        <div style={{ background: '#fff', border: '1px solid #e3e8ec', borderRadius: 16, boxShadow: '0 1px 2px rgba(17,24,39,.05), 0 12px 26px -10px rgba(17,24,39,.16)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead><tr>
                {[t('log.col_time'), t('log.col_user'), t('log.col_role'), t('log.col_action')].map((h) => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 12.5, fontWeight: 600, color: '#7a8794', padding: '13px 16px', borderBottom: '1px solid #eef1f3', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td style={{ ...td, whiteSpace: 'nowrap', color: '#7a8794' }}>{fmtTime(l.created_at)}</td>
                    <td style={{ ...td, color: '#37434d', fontWeight: 500 }}>{l.actor_name || '-'}</td>
                    <td style={td}>{roleBadge(l.role, l.role_label)}</td>
                    <td style={{ ...td, color: '#37434d' }}>{l.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!loading && logs.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: '#9aa7b2' }}>
          {total > logs.length
            ? t('log.showing_recent', { shown: logs.length, total })
            : t('log.total_items', { n: total })}
        </div>
      )}
    </div>
  );
}

const td = { padding: '12px 16px', fontSize: 13.5, borderBottom: '1px solid #f4f6f7', verticalAlign: 'top' };
