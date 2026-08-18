import { useState, useEffect, useCallback, useRef } from 'react';
import { useDevice } from './timeline/useDevice';
import { t } from '../lib/i18n';
import { SHORT_MONTHS, pad } from '../lib/date';
import { useToast } from '../lib/Toast';
import Table from '../lib/Table';
import Pager from '../lib/Pager';

// 'YYYY-MM-DD HH:MM:SS' -> '21 ก.ค. 2026 · 14:30'
const fmtTime = (s) => {
  if (!s) return '-';
  const [d, tm] = s.split(' ');
  const [y, m, dd] = d.split('-');
  return `${+dd} ${SHORT_MONTHS[+m - 1]} ${y} · ${(tm || '').slice(0, 5)}`;
};
// วันนี้/ก่อนหน้า สำหรับ default range (YYYY-MM-DD)
const ymd = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

// จำนวนแถวต่อหน้าที่เลือกได้ - ต้องตรงกับ PER_PAGE_OPTIONS ใน Admin\ActivityLogController
const PER_PAGE_OPTIONS = [10, 25, 50, 100];

// คลาส pill กลางตามบทบาท (ชุดจำกัด admin/user/driver)
const ROLE_PILL = {
  admin: 'pill--teal',
  user: 'pill--gray',
  driver: 'pill--amber',
};

/**
 * ประวัติการใช้งาน - ตาราง log + ฟิลเตอร์ช่วงวันที่ + Export CSV
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
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE_OPTIONS[0]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const { showToast, ToastView } = useToast();
  const device = useDevice();
  const seqRef = useRef(0);

  // โหลด log ตามช่วงวันที่ (กัน response เก่าทับด้วย seq)
  const load = useCallback(() => {
    const seq = ++seqRef.current;
    setLoading(true);
    setLoadErr(false);
    fetch(`${endpoints.data}?from=${from}&to=${to}&page=${page}&perPage=${perPage}`, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => {
        if (seq !== seqRef.current) return;
        setLogs(d.logs || []);
        setTotal(d.total || 0);
        // server เป็นคนตัดสินหน้าสุดท้าย (เช่นเปลี่ยนช่วงวันที่แล้วรายการลดลง) จึงอ่านกลับมาใช้
        if (d.page && d.page !== page) setPage(d.page);
      })
      .finally(() => { if (seq === seqRef.current) setLoading(false); })
      .catch(() => { if (seq === seqRef.current) setLoadErr(true); });
  }, [endpoints.data, from, to, page, perPage]);

  useEffect(() => { load(); }, [load]);

  // Export CSV - ไม่มีข้อมูล = toast (ตามสเปก) มิฉะนั้นเปิดลิงก์ดาวน์โหลด
  const exportCsv = () => {
    if (logs.length === 0) { showToast(t('log.no_data_range')); return; }
    window.location.href = `${endpoints.export}?from=${from}&to=${to}`;
  };

  const roleBadge = (role, label) => (
    <span className={`pill pill--sm ${ROLE_PILL[role] || ROLE_PILL.user}`}>{label}</span>
  );

  const mobile = device === 'mobile';
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div>
      {/* แถบฟิลเตอร์ */}
      <div className="filter-card al-filter">
        <div>
          <label className="form-label">{t('log.date_range_label')}</label>
          <div className="al-date-row">
            <input type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="form-input form-input--sm al-date-input" />
            <span className="al-arrow">→</span>
            <input type="date" value={to} min={from} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="form-input form-input--sm al-date-input" />
          </div>
        </div>
        <button onClick={exportCsv} className="btn-primary al-export-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          Export CSV
        </button>
      </div>

      {loadErr && <div className="alert-error alert-error--sm">{t('common.load_err')}</div>}
      {loading ? (
        <div className="al-loading">{t('common.loading')}</div>
      ) : logs.length === 0 ? (
        <div className="al-empty-card">{t('log.no_data_range')}</div>
      ) : mobile ? (
        // มือถือ: การ์ด
        <div className="al-mobile-list">
          {logs.map((l) => (
            <div key={l.id} className="al-card">
              <div className="al-card-head">
                <span className="al-card-name">{l.actor_name || '-'}</span>
                {roleBadge(l.role, l.role_label)}
              </div>
              <div className="al-card-action">{l.action}</div>
              <div className="al-card-time">{fmtTime(l.created_at)}</div>
            </div>
          ))}
        </div>
      ) : (
        // เดสก์ท็อป: ตาราง
        <div className="al-table-wrap">
          <Table>
            <thead><tr>
              {[t('log.col_time'), t('log.col_user'), t('log.col_role'), t('log.col_action')].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="al-td al-td-time">{fmtTime(l.created_at)}</td>
                  <td className="al-td al-td-actor">{l.actor_name || '-'}</td>
                  <td className="al-td">{roleBadge(l.role, l.role_label)}</td>
                  <td className="al-td">{l.action}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
      {/* ท้ายตาราง: เลือกจำนวนแถวต่อหน้า (ซ้าย) + แบ่งหน้า (ขวา)
          หน้าเดียวจบก็ยังโชว์ตัวเลือกไว้ ไม่งั้นเลือก 100 แล้วจะกลับมา 10 ไม่ได้ */}
      {!loading && total > 0 && (
        <div className="al-foot">
          <label className="al-perpage">
            {t('log.rows_per_page')}
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="form-input form-input--sm al-perpage-select"
            >
              {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          {totalPages > 1
            ? <Pager page={page} totalPages={totalPages} total={total} perPage={perPage} onPage={setPage} />
            : <div className="al-summary">{t('log.total_items', { n: total })}</div>}
        </div>
      )}
      <ToastView />
    </div>
  );
}
