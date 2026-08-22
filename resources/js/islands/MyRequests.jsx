import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { fmtDate, fmtDateTime, weekdayName, rangeLines, dateTimeRange } from '../lib/date';
import { getCsrf, setCsrf } from '../lib/csrf';
import { isPositiveInt } from '../lib/validate';
import DateTimeField from '../lib/DateTimeField';
import Pager from '../lib/Pager';
import Table from '../lib/Table';
import { SkelRows, SkelCards } from '../lib/Skeleton';
import { useToast } from '../lib/Toast';
import ConfirmDialog from '../lib/ConfirmDialog';
import Modal from '../lib/Modal';
import { t } from '../lib/i18n';
import { STATUS_LABEL as BASE_LABEL, ST_CLASS } from '../lib/status';
import { CloseIcon, CalIcon } from '../lib/icons';
import Icon from '../lib/Icon';
import Spinner from '../lib/Spinner';

// ป้ายชื่อสถานะ - ใช้ชุดกลาง แล้วเขียนทับ 3 คำที่หน้านี้เรียกต่างออกไป
// (สีมาจาก class .st-*/.mr-st-* แยกต่างหาก - ดู STATUS_CLASS ด้านล่าง)
const STATUS_LABEL = {
  ...BASE_LABEL,
  cancel_requested: t('myreq.status_cancel_requested'),
  cancelled:        t('myreq.status_cancelled'),
  completed:        t('myreq.status_completed'),
};
// จบงานอัตโนมัติ (ใช้ครบ/เลยเวลา ไม่ได้กดคืนรถเอง) - pseudo-status ที่คำนวณเอง ไม่ใช่ค่า status ใน DB
// ป้ายและสีจึงแยกจาก "completed" ปกติ (ดู .mr-st-done)
const DONE_LABEL = t('myreq.status_done');
// คลาสสีตามสถานะ - ตัวที่เป็นค่า status enum จริงจาก DB (pending/approved/cancel_requested/completed)
// ใช้ชุดสีกลาง .st-* · rejected/cancelled ใช้ .mr-st-* ของหน้านี้
const STATUS_CLASS = {
  ...ST_CLASS,
  rejected:         'mr-st-rejected',
  cancelled:        'mr-st-cancelled',
};
// ประเภทรถ: ระวังชื่อพารามิเตอร์ชนกับฟังก์ชัน t() แปลภาษา จึงใช้ bt แทน
const typeLabel = (bt) => (bt === 'other' ? t('myreq.type_other') : t('myreq.type_self'));
const PER_PAGE = 20;
// รุ่นรถที่แสดง: รถขับเอง -> car_model / รถอื่น ๆ -> รถที่ Admin จัดให้ (หลังอนุมัติ)
const carModelLabel = (b) => (b.booking_type === 'other' ? (b.ext_driver_vehicle || '') : (b.car_model || ''));
const driverName = (b) => (b.driver_type === 'external' ? b.ext_driver_name : (b.driver_type === 'company' ? (b.driver_name || '') : ''));
/**
 * คำขอของฉัน - ตาราง (เดสก์ท็อป) / การ์ด (มือถือ) + คลิกดูรายละเอียด (modal) + ยกเลิก/คืนรถ
 * props: endpoints {data, cancel, return}
 */
export default function MyRequests({ endpoints }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const { showToast, ToastView } = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmB, setConfirmB] = useState(null);   // คำขอที่รอยืนยัน (ยกเลิก/คืนรถ)
  const [detail, setDetail] = useState(null);        // คำขอที่เปิดดูรายละเอียด
  const [edit, setEdit] = useState(null);            // คำขอที่กำลังแก้ไข { b, form }
  const [editErr, setEditErr] = useState('');
  const [narrow, setNarrow] = useState(false);
  const [page, setPage] = useState(1);   // หน้าปัจจุบันของ pagination

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const on = () => setNarrow(mq.matches); on();
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setLoadErr(false);
    fetch(endpoints.data, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => setRows(d.bookings || []))
      .finally(() => setLoading(false))
      .catch(() => setLoadErr(true));
  }, [endpoints.data]);

  useEffect(() => { load(); }, [load]);

  // ปิด drawer รายละเอียดด้วยปุ่ม Esc (โมดัลแก้ไขที่ซ้อนอยู่ปิดตัวเองก่อน)
  useEffect(() => {
    if (!detail || edit) return;
    const onKey = (e) => { if (e.key === 'Escape') setDetail(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail, edit]);

  // ยืนยันการทำรายการ (ยกเลิก / คืนรถ)
  const doAction = async () => {
    if (!confirmB) return;
    const url = confirmB.action === 'return' ? endpoints.return : endpoints.cancel;
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'X-CSRF-TOKEN': getCsrf(), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams({ id: confirmB.b.id }).toString(),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok && !d.csrf) { window.location.reload(); return; }
      if (d.csrf) setCsrf(d.csrf);
      showToast(d.message || (d.ok ? t('common.success') : t('common.err')));
      if (d.ok) { setConfirmB(null); setDetail(null); load(); }
    } finally { setBusy(false); }
  };

  // เปิดฟอร์มแก้ไข - แปลงค่าจาก DB เป็นรูปแบบที่ DateTimeField ใช้ ('YYYY-MM-DDTHH:MM')
  const openEdit = (b) => {
    setEditErr('');
    setEdit({
      b,
      form: {
        location: b.location || '',
        start_at: String(b.start_at || '').slice(0, 16).replace(' ', 'T'),
        end_at:   String(b.end_at || '').slice(0, 16).replace(' ', 'T'),
        people:   String(b.people || 1),
        purpose:  b.purpose || '',
        map_link: b.map_link || '',
      },
    });
  };

  const setEditForm = (patch) => setEdit((m) => ({ ...m, form: { ...m.form, ...patch } }));

  // บันทึกการแก้ไขคำขอของตัวเอง (เฉพาะที่ยังรออนุมัติ)
  const doUpdate = async () => {
    const f = edit.form;
    if (! f.location.trim()) { setEditErr(t('book.err_location')); return; }
    if (! f.start_at || ! f.end_at) { setEditErr(t('book.err_datetime')); return; }
    if (f.end_at <= f.start_at) { setEditErr(t('book.err_end_after_start')); return; }
    if (edit.b.booking_type === 'other' && ! f.purpose.trim()) { setEditErr(t('book.err_purpose')); return; }
    // จำนวนผู้โดยสาร: จำนวนเต็มบวก ในช่วง 1-999 คน (กฎเดียวกับหน้าจองรถและฝั่ง server)
    const people = String(f.people).trim();
    if (! isPositiveInt(people)) { setEditErr(t('book.err_people_int')); return; }
    if (Number(people) < 1) { setEditErr(t('book.err_people_min')); return; }
    if (Number(people) > 999) { setEditErr(t('book.err_people_max')); return; }

    setBusy(true);
    setEditErr('');
    try {
      const res = await fetch(endpoints.update, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'X-CSRF-TOKEN': getCsrf(), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams({ id: edit.b.id, ...f, start_at: f.start_at.replace('T', ' '), end_at: f.end_at.replace('T', ' ') }).toString(),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok && !d.csrf) { window.location.reload(); return; }
      if (d.csrf) setCsrf(d.csrf);
      if (d.ok) { setEdit(null); setDetail(null); showToast(d.message || t('common.success')); load(); }
      else setEditErr(d.message || t('common.err'));
    } finally { setBusy(false); }
  };

  // คำนวณสถานะ/สิทธิ์การจัดการของคำขอหนึ่ง
  const vm = (b) => {
    const now = new Date();
    const started = new Date((b.start_at || '').replace(' ', 'T')) <= now;
    const ended = new Date((b.end_at || '').replace(' ', 'T')) <= now;
    const finishedAuto = (b.status === 'completed' && !b.returned_at) || (b.status === 'approved' && ended);
    const sl = finishedAuto ? DONE_LABEL : (STATUS_LABEL[b.status] || STATUS_LABEL.pending);
    const stClass = finishedAuto ? 'mr-st-done' : (STATUS_CLASS[b.status] || STATUS_CLASS.pending);
    const showCancel = b.status === 'pending' || (b.status === 'approved' && !started);
    const showReturn = b.status === 'approved' && started && !ended && b.booking_type === 'self';
    return { started, ended, finishedAuto, sl, stClass, showCancel, showReturn, showEdit: b.status === 'pending', waitingCancel: b.status === 'cancel_requested' };
  };

  // ปุ่มจัดการ (แก้ไข/ยกเลิก/คืนรถ) - ใช้ในตาราง/การ์ด/โมดัล
  const actionButtons = (b, v) => (
    <>
      {v.showEdit && (
        <button onClick={(e) => { e.stopPropagation(); openEdit(b); }} disabled={busy} className="mr-mini-btn"><Icon name="pencil" size={14} />{t('common.edit')}</button>
      )}
      {v.showCancel && (
        <button onClick={(e) => { e.stopPropagation(); setConfirmB({ b, action: 'cancel' }); }} disabled={busy} className="mr-mini-btn mr-mini-btn--danger"><Icon name="cancel" size={14} />{t('common.cancel')}</button>
      )}
      {v.showReturn && (
        <button onClick={(e) => { e.stopPropagation(); setConfirmB({ b, action: 'return' }); }} disabled={busy} className="mr-mini-btn mr-mini-btn--teal"><Icon name="return" size={14} />{t('myreq.return_btn')}</button>
      )}
    </>
  );

  // จัดกลุ่มคำขอตามวันใช้รถ (start_at) - วันล่าสุดอยู่บน, ในแต่ละวันเรียงคำขอใหม่สุดก่อน
  // (ต้องอยู่ก่อน early return เพื่อไม่ให้จำนวน hooks ต่างกันระหว่าง render)
  const sorted = useMemo(() =>
    [...rows].sort((a, b) => (b.start_at || '').localeCompare(a.start_at || '') || (b.created_at || '').localeCompare(a.created_at || '') || (+b.id - +a.id)),
    [rows]);

  // แบ่งหน้า หน้าละ PER_PAGE รายการ (วันเดินทางล่าสุดอยู่หน้าแรก)
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const curPage = Math.min(page, totalPages);   // กันหน้าเกินหลังรายการลด (คืนรถ/ยกเลิก)
  const pageRows = useMemo(() => sorted.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE), [sorted, curPage]);
  const onPage = (n) => setPage(Math.max(1, Math.min(n, totalPages)));

  // จัดกลุ่มตามวันใช้รถ (start_at) - เฉพาะรายการในหน้าปัจจุบัน
  const groups = useMemo(() => {
    const map = [];
    pageRows.forEach((b) => {
      const key = (b.start_at || '').slice(0, 10);
      let g = map.find((x) => x.key === key);
      if (!g) { g = { key, rows: [] }; map.push(g); }
      g.rows.push(b);
    });
    return map;
  }, [pageRows]);

  // หัวตารางเดสก์ท็อป - ใช้ทั้งตอนโหลด (โครงร่าง) และตอนมีข้อมูลจริง
  const tableHead = (
    <thead>
      <tr>
        <th>{t('myreq.col_code')}</th>
        <th>{t('myreq.col_type')}</th>
        <th>{t('myreq.col_model')}</th>
        <th>{t('myreq.col_destination')}</th>
        <th>{t('myreq.col_time')}</th>
        <th>{t('myreq.col_people')}</th>
        <th>{t('myreq.col_status')}</th>
        <th>{t('myreq.col_manage')}</th>
      </tr>
    </thead>
  );

  // ระหว่างโหลด: โครงร่างรูปทรงเดียวกับของจริง (การ์ดบนจอแคบ / ตารางบนเดสก์ท็อป)
  if (loading) {
    return narrow
      ? <SkelCards className="mr-cards" count={4} lines={3} />
      : <div className="mr-table-wrap"><Table center>{tableHead}<SkelRows cols={8} /></Table></div>;
  }

  const errBox = loadErr && (
    <div className="alert-error mr-alert">
      {t('common.load_err')}
    </div>
  );

  if (rows.length === 0) {
    return (
      <div>
        {errBox}
        <div className="empty-card mr-empty">{t('myreq.empty')}</div>
      </div>
    );
  }

  return (
    <div>
      {errBox}

      {narrow ? (
        /* มือถือ: การ์ดจัดกลุ่มตามวัน (แตะดูรายละเอียด) */
        <>
          <div className="mr-groups">
            {groups.map((g) => (
              <div key={g.key}>
                {/* แถบหัวข้อวัน (ไม่มีตัวนับ) */}
                <div className="mr-day-badge">{CalIcon}<span>{fmtDate(g.key)} {weekdayName(g.key)}</span></div>
                <div className="mr-cards">
                  {g.rows.map((b) => { const v = vm(b); return (
                    <div key={b.id} onClick={() => setDetail(b)} className={`mr-card ${v.stClass}`}>
                      <div className="mr-card-head">
                        <div className="mr-card-id">
                          <span className="mr-card-code">{b.booking_code}</span>
                          <span className="mr-type-badge mr-type-badge--ml">{typeLabel(b.booking_type)}</span>
                        </div>
                        <span className={`pill pill--sm mr-badge ${v.stClass}`}>{v.sl}</span>
                      </div>
                      <div className="mr-card-loc">{b.location}</div>
                      {carModelLabel(b) && <div className="mr-card-meta">{t('myreq.model_label')}{carModelLabel(b)}</div>}
                      <div className="mr-card-meta">{(() => { const [l1, l2] = rangeLines(b.start_at, b.end_at); return `${l1} ${l2}`; })()} · {b.people} {t('myreq.unit_people')}</div>
                      {(v.showEdit || v.showCancel || v.showReturn) && (
                        <div className="mr-card-actions">{actionButtons(b, v)}</div>
                      )}
                    </div>
                  ); })}
                </div>
              </div>
            ))}
          </div>
          {/* แบ่งหน้า (pagination) - ใต้รายการการ์ด */}
          <Pager page={curPage} totalPages={totalPages} total={sorted.length} perPage={PER_PAGE} onPage={onPage} />
        </>
      ) : (
        /* เดสก์ท็อป: ตาราง */
        <div className="mr-table-wrap">
          <Table center footer={<Pager page={curPage} totalPages={totalPages} total={sorted.length} perPage={PER_PAGE} onPage={onPage} inCard />}>
            {tableHead}
            <tbody>
              {groups.map((g) => (
                <Fragment key={g.key}>
                  {/* แถบหัวข้อวัน (ไม่มีตัวนับ) */}
                  <tr>
                    <td colSpan={8} className="mr-group-cell ta-l"><div className="mr-group-label">{CalIcon}<span>{fmtDate(g.key)} {weekdayName(g.key)}</span></div></td>
                  </tr>
                  {g.rows.map((b) => { const v = vm(b); const highlight = b.status === 'pending' || b.status === 'cancel_requested'; return (
                    <tr key={b.id} onClick={() => setDetail(b)} className={highlight ? 'mr-row mr-row--highlight' : 'mr-row'}>
                      <td className="mr-td-code">{b.booking_code}</td>
                      <td>{typeLabel(b.booking_type)}</td>
                      <td>{carModelLabel(b) || <span className="mr-dash">-</span>}</td>
                      <td className="mr-td-loc">{b.location}</td>
                      <td className="mr-td-time">{(() => { const [l1, l2] = rangeLines(b.start_at, b.end_at); return (<><div>{l1}</div><div>{l2}</div></>); })()}</td>
                      <td>{b.people}</td>
                      <td><span className={`pill pill--sm mr-badge ${v.stClass}`}>{v.sl}</span></td>
                      <td>
                        <div className="mr-td-actions">
                          {(v.showEdit || v.showCancel || v.showReturn) ? actionButtons(b, v) : null}
                        </div>
                      </td>
                    </tr>
                  ); })}
                </Fragment>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* โมดัลรายละเอียด */}
      {detail && (() => {
        const b = detail; const v = vm(b); const drv = driverName(b);
        return (
          <div onClick={() => setDetail(null)} className="icar-drawer-backdrop">
            <div onClick={(e) => e.stopPropagation()} className="icar-drawer">
              <div className="modal-head">
                <h3 className="modal-title">{t('myreq.detail_title', { code: b.booking_code })}</h3>
                <button onClick={() => setDetail(null)} className="modal-close">{CloseIcon}</button>
              </div>
              <div className="mr-drawer-body">
                <div className="mr-drawer-status">
                  <span className="mr-type-badge">{typeLabel(b.booking_type)}</span>
                  <span className={`pill pill--sm mr-badge ${v.stClass}`}>{v.sl}</span>
                </div>
                <div className="mr-detail-grid">
                  <div className="mr-detail-full"><div className="detail-label">{t('myreq.col_destination')}</div><div className="mr-detail-value">{b.location}</div></div>
                  <div><div className="detail-label">{t('myreq.col_time')}</div><div className="mr-detail-value">{dateTimeRange(b.start_at, b.end_at)}</div></div>
                  <div><div className="detail-label">{t('myreq.passenger_count_label')}</div><div className="mr-detail-value">{b.people} {t('myreq.unit_people')}</div></div>
                  {b.purpose && <div className="mr-detail-full"><div className="detail-label">{t('myreq.purpose_label')}</div><div className="mr-detail-value">{b.purpose}</div></div>}
                  {b.booking_type === 'self' && b.car_model && <div className="mr-detail-full"><div className="detail-label">{t('myreq.car_label')}</div><div className="mr-detail-value">{b.car_model}{b.car_plate ? ` (${b.car_plate})` : ''}</div></div>}
                  {b.booking_type === 'other' && b.status === 'approved' && b.ext_driver_vehicle && <div><div className="detail-label">{t('myreq.received_car_label')}</div><div className="mr-detail-value">{b.ext_driver_vehicle}</div></div>}
                  {b.booking_type === 'other' && b.status === 'approved' && drv && <div><div className="detail-label">{t('myreq.driver_label')}</div><div className="mr-detail-value mr-detail-value--teal">{drv}</div></div>}
                  {b.booking_type === 'other' && b.status === 'approved' && b.ext_driver_phone && <div><div className="detail-label">{t('myreq.driver_phone_label')}</div><div className="mr-detail-value">{b.ext_driver_phone}</div></div>}
                  {b.status === 'completed' && b.returned_at && <div><div className="detail-label">{t('myreq.returned_at_label')}</div><div className="mr-detail-value mr-detail-value--teal">{fmtDateTime(b.returned_at)}</div></div>}
                </div>

                {/* เหตุผลถูกปฏิเสธ / หมายเหตุ Admin */}
                {b.admin_note && (b.status === 'rejected' ? (
                  <div className="mr-reject-note">
                    <div className="mr-reject-note-title">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      {t('myreq.rejected_reason_title')}
                    </div>
                    <div className="mr-reject-note-text">{b.admin_note}</div>
                  </div>
                ) : (
                  <div className="mr-admin-note">{t('myreq.admin_note_prefix')}{b.admin_note}</div>
                ))}

                {/* รอ Admin ยืนยันการยกเลิก */}
                {v.waitingCancel && (
                  <div className="mr-waiting-note">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>
                    {t('myreq.waiting_cancel_notice')}
                  </div>
                )}

                {/* ปุ่มจัดการ */}
                {(v.showEdit || v.showCancel || v.showReturn) && (
                  <div className="mr-detail-actions">
                    {actionButtons(b, v)}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* โมดัลแก้ไขคำขอ - เฉพาะคำขอที่ยังรออนุมัติ */}
      {edit && (
        <Modal title={t('myreq.edit_title', { code: edit.b.booking_code })} onClose={() => setEdit(null)} bodyClass="mr-edit-body" lockBackdrop>
          <div className="mr-edit-hint">{t('myreq.edit_scope')}</div>
          {editErr && <div className="alert-error mr-edit-err">{editErr}</div>}

          <label className="form-label" htmlFor="mr-ed-loc">{t('book.location_label')}</label>
          <input id="mr-ed-loc" value={edit.form.location} maxLength={255} onChange={(e) => setEditForm({ location: e.target.value })} placeholder={t('book.location_placeholder')} className="form-input form-input--sm mr-edit-field" />

          <div className="mr-edit-grid">
            <div>
              <label className="form-label">{t('req.start_label')}</label>
              <DateTimeField value={edit.form.start_at} onChange={(v) => setEditForm({ start_at: v })} placeholder={t('book.start_placeholder')} />
            </div>
            <div>
              <label className="form-label">{t('req.end_label')}</label>
              <DateTimeField value={edit.form.end_at} onChange={(v) => setEditForm({ end_at: v })} placeholder={t('book.end_placeholder')} />
            </div>
          </div>

          <div className="mr-edit-grid">
            <div>
              <label className="form-label" htmlFor="mr-ed-people">{t('myreq.passenger_count_label')}</label>
              <input id="mr-ed-people" type="number" min="1" max="999" step="1" inputMode="numeric" value={edit.form.people} onChange={(e) => setEditForm({ people: e.target.value })} className="form-input form-input--sm" />
            </div>
            <div>
              <label className="form-label" htmlFor="mr-ed-map">{t('book.map_link_label')}</label>
              <input id="mr-ed-map" value={edit.form.map_link} maxLength={500} onChange={(e) => setEditForm({ map_link: e.target.value })} placeholder={t('book.map_link_placeholder')} className="form-input form-input--sm" />
            </div>
          </div>

          <label className="form-label" htmlFor="mr-ed-purpose">{t('myreq.purpose_label')}</label>
          <textarea id="mr-ed-purpose" value={edit.form.purpose} rows={3} onChange={(e) => setEditForm({ purpose: e.target.value })} placeholder={t('book.purpose_placeholder')} className="form-input form-input--sm mr-edit-textarea" />

          <div className="mr-edit-actions">
            <button onClick={() => setEdit(null)} disabled={busy} className="btn-ghost mr-edit-btn"><Icon name="close" size={16} />{t('common.cancel')}</button>
            <button onClick={doUpdate} disabled={busy} className="btn-primary mr-edit-btn">{busy ? <Spinner /> : <Icon name="check" size={16} />}{t('common.save')}</button>
          </div>
        </Modal>
      )}

      {/* ป็อปอัปยืนยัน - ยกเลิก / คืนรถ */}
      {confirmB && (() => {
        const isReturn = confirmB.action === 'return';
        const isRequest = !isReturn && confirmB.b.status === 'approved';
        const accent = isReturn ? '#0a716e' : '#c0392b';   // สีเส้นไอคอน SVG (ไม่ใช่ style - เป็น attribute stroke)
        const title = isReturn ? t('myreq.confirm_return_title') : t('myreq.confirm_cancel_title');
        const okText = isReturn ? (busy ? t('myreq.returning_busy') : t('myreq.confirm_return_btn')) : (busy ? t('myreq.processing_busy') : t('myreq.confirm_cancel_btn'));
        const icon = isReturn
          ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9" /><polyline points="3 3 3 8 8 8" /></svg>
          : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" /></svg>;
        return (
          <ConfirmDialog
            tone={isReturn ? 'teal' : 'danger'}
            icon={icon}
            title={title}
            okText={okText}
            onOk={doAction}
            onCancel={() => setConfirmB(null)}
            busy={busy}
          >
            {isReturn ? (
              <>{t('myreq.confirm_return_msg_pre')}<b className="confirm-code">{confirmB.b.booking_code}</b>?<br />{t('myreq.confirm_return_msg_note')}</>
            ) : isRequest ? (
              <>{t('myreq.confirm_cancel_pre')}<b className="confirm-code">{confirmB.b.booking_code}</b>?<br />{t('myreq.confirm_cancel_request_note')}</>
            ) : (
              <>{t('myreq.confirm_cancel_pre')}<b className="confirm-code">{confirmB.b.booking_code}</b>?<br />{t('myreq.confirm_cancel_note')}</>
            )}
          </ConfirmDialog>
        );
      })()}

      <ToastView />
    </div>
  );
}
