import { useState, useEffect, useMemo, useCallback } from 'react';
import { t } from '../lib/i18n';
import { fmtDate, fmtDateTime, ymd, todayStr } from '../lib/date';
import { fmtMoney } from '../lib/money';
import { ST_CLASS } from '../lib/status';
import { downloadCsv, printReport } from '../lib/reportExport';
import { printCostReport } from '../lib/costReportPdf';
import { useToast } from '../lib/Toast';
import Icon from '../lib/Icon';
import { SkelBox } from '../lib/Skeleton';

// รายงานที่มีให้เลือก - key ตรงกับพารามิเตอร์ kind ของ endpoint
const KINDS = [
  { key: 'cost',  name: () => t('rpt.cost_name'),  desc: () => t('rpt.cost_desc') },
  { key: 'usage', name: () => t('rpt.usage_name'), desc: () => t('rpt.usage_desc') },
];

// ขอบเขตที่นับเข้ารายงานค่าใช้จ่าย - ต้องตรงกับ COST_SCOPES ฝั่ง server
const SCOPES = [
  { key: 'both',     label: () => t('rpt.scope_both') },
  { key: 'approved', label: () => t('rpt.scope_approved') },
  { key: 'done',     label: () => t('rpt.scope_done') },
];

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

// วันแรก/วันสุดท้ายของเดือนที่ห่างจากเดือนปัจจุบัน $offset เดือน
function monthBounds(offset) {
  const n = new Date();
  const first = new Date(n.getFullYear(), n.getMonth() + offset, 1);
  const last  = new Date(n.getFullYear(), n.getMonth() + offset + 1, 0);

  return [ymd(first), ymd(last)];
}

// ป้ายสถานะของแถว - รวมกลุ่มให้เหลือ 3 คำเหมือนหน้าจัดการคำขอ
function statusLabel(s) {
  if (s === 'completed') return t('tl.status_completed');
  if (s === 'approved') return t('status.approved');
  if (s === 'pending') return t('status.pending');

  return t('status.rejected');
}

/**
 * โมดูลรายงาน (Admin) - เลือกรายงานทางซ้าย + กรองช่วงวันที่ + ส่งออก CSV/PDF
 * props: endpoint (URL JSON), requestLink (หน้าจัดการคำขอ), logo (โลโก้บนหัวรายงาน PDF)
 */
export default function Reports({ endpoint, requestLink, logo }) {
  const [kind, setKind]   = useState('cost');
  const [from, setFrom]   = useState(() => monthBounds(0)[0]);
  const [to, setTo]       = useState(() => monthBounds(0)[1]);
  const [scope, setScope] = useState('both');
  const [perPage, setPerPage] = useState(25);
  const [page, setPage]   = useState(1);
  const [data, setData]   = useState({ rows: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const { showToast, ToastView } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    setLoadErr(false);
    const q = new URLSearchParams({ kind, from, to });
    if (kind === 'cost') {
      q.set('scope', scope);
    }
    fetch(`${endpoint}?${q}`, {
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'same-origin',
    })
      .then((r) => r.json())
      .then((d) => setData({ rows: d.rows || [], summary: d.summary || {} }))
      .finally(() => setLoading(false))
      .catch(() => setLoadErr(true));
  }, [endpoint, kind, from, to, scope]);

  useEffect(() => { load(); }, [load]);
  // เปลี่ยนตัวกรองแล้วกลับไปหน้าแรกเสมอ ไม่งั้นค้างอยู่หน้าที่ไม่มีข้อมูล
  useEffect(() => { setPage(1); }, [kind, from, to, scope, perPage]);

  const { rows, summary } = data;
  const isCost = kind === 'cost';

  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const shown = useMemo(
    () => rows.slice((page - 1) * perPage, page * perPage),
    [rows, page, perPage],
  );

  // ข้อความช่วงวันที่/ขอบเขต - ใช้บนหัวไฟล์ที่ส่งออก
  const rangeText = () => (from || to
    ? `${from ? fmtDate(from) : t('rpt.range_start')} – ${to ? fmtDate(to) : t('rpt.range_end')}`
    : t('rpt.range_all'));
  const scopeText = () => SCOPES.find((s) => s.key === scope)?.label() ?? '';

  const preset = (offset) => {
    const [a, b] = monthBounds(offset);
    setFrom(a);
    setTo(b);
  };

  // ข้อมูลตารางในรูปแบบกลาง - ใช้ทั้งเรนเดอร์และส่งออก
  const cols = isCost
    ? [
      { label: t('rpt.col_code') },
      { label: t('rpt.col_requester') },
      { label: t('rpt.col_ext_driver') },
      { label: t('rpt.col_vehicle') },
      { label: t('req.start_label') },
      { label: t('req.end_label') },
      { label: t('rpt.col_paid'), align: 'right' },
    ]
    : [
      { label: t('rpt.col_code') },
      { label: t('rpt.col_requester') },
      { label: t('req.type_label') },
      { label: t('rpt.col_vehicle') },
      { label: t('req.start_label') },
      { label: t('req.end_label') },
      { label: t('rpt.col_status') },
    ];

  const cellsOf = (b) => (isCost
    ? [
      b.booking_code,
      `${b.requester_name || '-'}${b.dept_name ? ` (${b.dept_name})` : ''}`,
      b.ext_driver_name || '-',
      b.ext_driver_vehicle || '-',
      fmtDateTime(b.start_at),
      fmtDateTime(b.end_at),
      fmtMoney(b.ext_driver_cost) ?? '-',
    ]
    : [
      b.booking_code,
      `${b.requester_name || '-'}${b.dept_name ? ` (${b.dept_name})` : ''}`,
      b.booking_type === 'other' ? t('req.car_other') : t('req.car_self'),
      b.car_model ? `${b.car_model}${b.car_plate ? ` (${b.car_plate})` : ''}` : (b.driver_name || b.ext_driver_name || '-'),
      fmtDateTime(b.start_at),
      fmtDateTime(b.end_at),
      statusLabel(b.status),
    ]);

  const reportTitle = KINDS.find((k) => k.key === kind).name();
  const subtitle = isCost ? `${rangeText()} · ${scopeText()}` : rangeText();

  const exportCsv = () => {
    if (rows.length === 0) {
      showToast(t('rpt.export_empty'), 'warn');

      return;
    }
    downloadCsv(`${kind}-${todayStr()}.csv`, cols.map((c) => c.label), rows.map(cellsOf));
    showToast(t('rpt.export_done', { n: rows.length }), 'success');
  };

  const exportPdf = () => {
    if (rows.length === 0) {
      showToast(t('rpt.export_empty'), 'warn');

      return;
    }

    // รายงานค่าใช้จ่ายใช้หน้าพิมพ์แบบมีกราฟ ส่วนรายงานอื่นใช้ตารางมาตรฐาน
    if (isCost) {
      if (! printCostReport({ rows, summary, rangeText: rangeText(), scopeText: scopeText(), brand: t('common.brand'), logo })) {
        showToast(t('rpt.export_popup_blocked'), 'error');
      }

      return;
    }

    const foot = isCost
      ? [
        { text: t('rpt.foot_total', { n: rows.length }), span: cols.length - 1, align: 'right' },
        { text: fmtMoney(summary.total) ?? '0.00', align: 'right' },
      ]
      : [{ text: t('rpt.foot_usage', { a: summary.approved, p: summary.pending, r: summary.rejected }), span: cols.length }];

    if (! printReport({ brand: t('common.brand'), title: reportTitle, subtitle, cols, rows: rows.map(cellsOf), foot })) {
      showToast(t('rpt.export_popup_blocked'), 'error');
    }
  };

  // ตัวเลขบนแถบสถิติ - ต่างกันตามชนิดรายงาน
  const stats = isCost
    ? [
      { label: t('rpt.stat_total'), value: fmtMoney(summary.total) ?? '0.00', unit: t('rpt.baht') },
      { label: t('rpt.stat_count'), value: summary.jobs ?? 0 },
      { label: t('rpt.stat_avg'), value: fmtMoney(summary.avg) ?? '0.00', unit: t('rpt.baht') },
    ]
    : [
      { label: t('rpt.stat_all'), value: summary.total ?? 0 },
      { label: t('status.pending'), value: summary.pending ?? 0 },
      { label: t('rpt.stat_rejected'), value: summary.rejected ?? 0 },
      { label: t('status.approved'), value: summary.approved ?? 0, teal: true },
    ];

  return (
    <div className="rp-layout">
      {/* เมนูรายการรายงาน */}
      <nav className="rp-menu" aria-label={t('rpt.menu_title')}>
        <div className="rp-menu-head">{t('rpt.menu_title')}</div>
        <div className="rp-menu-list">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(k.key)}
              aria-current={kind === k.key ? 'page' : undefined}
              className={`rp-menu-item${kind === k.key ? ' rp-menu-item--active' : ''}`}
            >
              <span className="rp-menu-name">{k.name()}</span>
              <span className="rp-menu-desc">{k.desc()}</span>
            </button>
          ))}
        </div>
      </nav>

      <section className="rp-panel">
        {/* แถบกรอง: ช่วงวันที่ + ปุ่มลัด + ขอบเขตที่นับ */}
        <div className="rp-bar">
          <div className="rp-field">
            <label className="rp-bar-label" htmlFor="rp-from">{t('rpt.range_label')}</label>
            <input id="rp-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="form-input form-input--sm rp-date" />
            <span className="rp-dash">–</span>
            <input id="rp-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="form-input form-input--sm rp-date" />
          </div>

          <div className="rp-btngroup">
            <button type="button" onClick={() => preset(0)} className="rp-gbtn">{t('rpt.preset_this_month')}</button>
            <button type="button" onClick={() => preset(-1)} className="rp-gbtn">{t('rpt.preset_last_month')}</button>
            <button type="button" onClick={() => { setFrom(''); setTo(''); }} className="rp-gbtn">{t('rpt.preset_all')}</button>
          </div>

          {isCost && (
            <div className="rp-field rp-field--end">
              <label className="rp-bar-label" htmlFor="rp-scope">{t('rpt.scope_label')}</label>
              <select id="rp-scope" value={scope} onChange={(e) => setScope(e.target.value)} className="form-input form-input--sm form-select rp-scope">
                {SCOPES.map((s) => <option key={s.key} value={s.key}>{s.label()}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* แถบสถิติ - ตัวเลขมาจาก SUM()/COUNT() ฝั่ง server ไม่ได้บวกจากแถวที่แสดง */}
        <div className={`rp-strip rp-strip--${stats.length}`}>
          {stats.map((s) => (
            <div key={s.label} className="rp-stat">
              <div className="rp-stat-label">{s.label}</div>
              <div className={`rp-stat-val${s.teal ? ' rp-stat-val--teal' : ''}`}>
                {loading ? '—' : s.value}
                {s.unit && <span className="rp-stat-unit">{s.unit}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* หัวตาราง + ปุ่มส่งออก */}
        <div className="rp-sechead">
          <span className="rp-sectitle">{isCost ? t('rpt.cost_table_title') : t('rpt.usage_table_title')}</span>
          <div className="rp-export">
            <span className="rp-bar-label">{t('rpt.export_label')}</span>
            <div className="rp-btngroup">
              <button type="button" onClick={exportCsv} className="rp-gbtn rp-gbtn--icon">
                <Icon name="file-csv" size={13} className="rp-gbtn-ico rp-gbtn-ico--teal" />CSV
              </button>
              <button type="button" onClick={exportPdf} className="rp-gbtn rp-gbtn--icon">
                <Icon name="file-pdf" size={13} className="rp-gbtn-ico rp-gbtn-ico--red" />PDF
              </button>
            </div>
          </div>
        </div>

        {loadErr && <div className="alert-error alert-error--sm rp-err">{t('common.load_err')}</div>}

        {loading ? <div className="rp-skel"><SkelBox /></div> : rows.length === 0 ? (
          <div className="rp-empty">{isCost ? t('rpt.empty_cost') : t('rpt.empty_usage')}</div>
        ) : (
          <>
            <div className="rp-tablewrap">
              <table className="rp-table">
                <thead>
                  <tr>
                    {cols.map((c) => <th key={c.label} className={c.align === 'right' ? 'ta-r' : ''}>{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((b) => (
                    <tr key={b.booking_code}>
                      <td className="rp-td-code">
                        <a href={`${requestLink}?open=${b.booking_code}`} className="rp-code">{b.booking_code}</a>
                      </td>
                      <td>
                        <div>{b.requester_name || '-'}</div>
                        {b.dept_name && <div className="rp-td-sub">{b.dept_name}</div>}
                      </td>
                      {isCost ? (
                        <td>{b.ext_driver_name || '-'}</td>
                      ) : (
                        <td>{b.booking_type === 'other' ? t('req.car_other') : t('req.car_self')}</td>
                      )}
                      <td className="rp-td-mute">
                        {isCost
                          ? (b.ext_driver_vehicle || '-')
                          : (b.car_model ? `${b.car_model}${b.car_plate ? ` (${b.car_plate})` : ''}` : (b.driver_name || b.ext_driver_name || '-'))}
                      </td>
                      <td className="rp-td-time">{fmtDateTime(b.start_at)}</td>
                      <td className="rp-td-time">{fmtDateTime(b.end_at)}</td>
                      {isCost ? (
                        <td className="ta-r rp-td-cost">{fmtMoney(b.ext_driver_cost)}</td>
                      ) : (
                        <td><span className={`pill pill--sm rp-badge ${ST_CLASS[b.status] || 'st-cancel_requested'}`}>{statusLabel(b.status)}</span></td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {isCost && (
                  <tfoot>
                    <tr>
                      <td colSpan={cols.length - 1} className="ta-r rp-foot-label">{t('rpt.foot_all_pages')}</td>
                      <td className="ta-r rp-foot-val">{fmtMoney(summary.total) ?? '0.00'}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* แบ่งหน้า - จำนวนต่อหน้า + ช่วงที่กำลังดู */}
            <div className="rp-pager">
              <div className="rp-field">
                <label className="rp-bar-label" htmlFor="rp-perpage">{t('rpt.per_page')}</label>
                <select id="rp-perpage" value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className="form-input form-input--sm form-select rp-perpage">
                  {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="rp-range">
                  {t('rpt.showing', { a: (page - 1) * perPage + 1, b: Math.min(page * perPage, rows.length), n: rows.length })}
                </span>
              </div>
              <div className="rp-pagenav">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rp-gbtn rp-gbtn--icon">
                  <Icon name="chevron-left" size={13} />{t('pager.prev')}
                </button>
                <span className="rp-pagenum">{t('rpt.page_of', { a: page, b: pages })}</span>
                <button type="button" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="rp-gbtn rp-gbtn--icon">
                  {t('pager.next')}<Icon name="chevron-right" size={13} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <ToastView />
    </div>
  );
}
