import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { thDate, thTime, thDateTime, thWeekday } from '../lib/date';
import { getCsrf, setCsrf } from '../lib/csrf';
import Pager from '../lib/Pager';
import { t } from '../lib/i18n';

// สถานะ [ข้อความ, พื้นหลัง, สีตัวอักษร] — โทนเดียวกับเว็บ (อำพัน/เขียว/แดง/teal/เทา) ไล่เฉดให้แยกกันได้
const STATUS = {
  pending:          [t('status.pending'), '#fdf0e0', '#b5701a'],                  // รออนุมัติ = อำพัน
  approved:         [t('status.approved'), '#e7f4ee', '#16855a'],                 // อนุมัติแล้ว = เขียว
  rejected:         [t('status.rejected'), '#fbecea', '#c0392b'],                 // ปฏิเสธ = แดง
  cancel_requested: [t('myreq.status_cancel_requested'), '#fbe7de', '#bd5a2a'],   // รอยืนยันยกเลิก = ส้มอิฐ
  cancelled:        [t('myreq.status_cancelled'), '#eef1f4', '#7a8794'],          // ยกเลิกการจอง = เทา
  completed:        [t('myreq.status_completed'), '#e6f3f2', '#0a716e'],          // คืนรถ = teal (แบรนด์)
};
// จบงานอัตโนมัติ (ใช้ครบ/เลยเวลา ไม่ได้กดคืนรถเอง) = เขียวสาง (muted) แยกจากเขียว/teal
const DONE = [t('myreq.status_done'), '#eaf1ec', '#5a7d68'];
// ประเภทรถ: ระวังชื่อพารามิเตอร์ชนกับฟังก์ชัน t() แปลภาษา จึงใช้ bt แทน
const typeLabel = (bt) => (bt === 'other' ? t('myreq.type_other') : t('myreq.type_self'));
// จำนวนคำขอต่อหน้า (pagination)
const PER_PAGE = 20;
// รุ่นรถที่แสดง: รถขับเอง -> car_model / รถอื่น ๆ -> รถที่ Admin จัดให้ (หลังอนุมัติ)
const carModelLabel = (b) => (b.booking_type === 'other' ? (b.ext_driver_vehicle || '') : (b.car_model || ''));
const badge = (bg, c) => ({ background: bg, color: c, borderRadius: 999, padding: '4px 13px', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-block' });
const driverName = (b) => (b.driver_type === 'external' ? b.ext_driver_name : (b.driver_type === 'company' ? (b.driver_name || '') : ''));
// ไอคอนปฏิทินนำหน้าแถบวันที่
const CAL_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);

const th = { padding: '12px 14px', fontSize: 12.5, fontWeight: 700, color: '#3d4852', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '2px solid #e7ebee' };
const td = { padding: '12px 14px', fontSize: 13.5, color: '#37434d', textAlign: 'center', verticalAlign: 'middle', borderTop: '1px solid #f2f4f6' };
const miniBtn = (bg, c, border) => ({ background: bg, color: c, border: border || 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' });

/**
 * คำขอของฉัน — ตาราง (เดสก์ท็อป) / การ์ด (มือถือ) + คลิกดูรายละเอียด (modal) + ยกเลิก/คืนรถ
 * props: endpoints {data, cancel, return}
 */
export default function MyRequests({ endpoints }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmB, setConfirmB] = useState(null);   // คำขอที่รอยืนยัน (ยกเลิก/คืนรถ)
  const [detail, setDetail] = useState(null);        // คำขอที่เปิดดูรายละเอียด
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

  // ปิด drawer รายละเอียดด้วยปุ่ม Esc (เหมือนหน้าจัดการคำขอ)
  useEffect(() => {
    if (!detail) return;
    const onKey = (e) => { if (e.key === 'Escape') setDetail(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2800); };

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

  // คำนวณสถานะ/สิทธิ์การจัดการของคำขอหนึ่ง
  const vm = (b) => {
    const now = new Date();
    const started = new Date((b.start_at || '').replace(' ', 'T')) <= now;
    const ended = new Date((b.end_at || '').replace(' ', 'T')) <= now;
    const finishedAuto = (b.status === 'completed' && !b.returned_at) || (b.status === 'approved' && ended);
    const [sl, sb, sc] = finishedAuto ? DONE : (STATUS[b.status] || STATUS.pending);
    const showCancel = b.status === 'pending' || (b.status === 'approved' && !started);
    const showReturn = b.status === 'approved' && started && !ended && b.booking_type === 'self';
    return { started, ended, finishedAuto, sl, sb, sc, showCancel, showReturn, waitingCancel: b.status === 'cancel_requested' };
  };

  // ปุ่มจัดการ (ยกเลิก/คืนรถ) — ใช้ในตาราง/การ์ด/โมดัล
  const actionButtons = (b, v) => (
    <>
      {v.showCancel && (
        <button onClick={(e) => { e.stopPropagation(); setConfirmB({ b, action: 'cancel' }); }} disabled={busy} style={miniBtn('#fbecea', '#c0392b')}>{t('common.cancel')}</button>
      )}
      {v.showReturn && (
        <button onClick={(e) => { e.stopPropagation(); setConfirmB({ b, action: 'return' }); }} disabled={busy} style={miniBtn('#0a716e', '#fff')}>{t('myreq.return_btn')}</button>
      )}
    </>
  );

  // จัดกลุ่มคำขอตามวันใช้รถ (start_at) — วันล่าสุดอยู่บน, ในแต่ละวันเรียงคำขอใหม่สุดก่อน
  // (ต้องอยู่ก่อน early return เพื่อไม่ให้จำนวน hooks ต่างกันระหว่าง render)
  const sorted = useMemo(() =>
    [...rows].sort((a, b) => (b.start_at || '').localeCompare(a.start_at || '') || (b.created_at || '').localeCompare(a.created_at || '') || (+b.id - +a.id)),
    [rows]);

  // แบ่งหน้า หน้าละ PER_PAGE รายการ (วันเดินทางล่าสุดอยู่หน้าแรก)
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const curPage = Math.min(page, totalPages);   // กันหน้าเกินหลังรายการลด (คืนรถ/ยกเลิก)
  const pageRows = useMemo(() => sorted.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE), [sorted, curPage]);

  // จัดกลุ่มตามวันใช้รถ (start_at) — เฉพาะรายการในหน้าปัจจุบัน
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

  if (loading) return <div style={{ color: '#9aa7b2', padding: 20 }}>{t('common.loading')}</div>;

  const errBox = loadErr && (
    <div style={{ padding: '10px 14px', marginBottom: 12, background: '#fbecea', color: '#9a3b34', borderRadius: 8, fontSize: 13 }}>
      {t('common.load_err')}
    </div>
  );

  if (rows.length === 0) {
    return (
      <div>
        {errBox}
        <div style={{ background: '#fff', border: '1px solid #e7ebee', borderRadius: 14, padding: 48, textAlign: 'center', color: '#9aa7b2' }}>{t('myreq.empty')}</div>
      </div>
    );
  }

  return (
    <div>
      {errBox}

      {narrow ? (
        /* มือถือ: การ์ดจัดกลุ่มตามวัน (แตะดูรายละเอียด) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groups.map((g) => (
            <div key={g.key}>
              {/* แถบหัวข้อวัน (ไม่มีตัวนับ) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#e6f3f2', border: '1px solid #cbe6e2', borderRadius: 8, padding: '10px 14px 6px', marginBottom: 10, fontSize: 13, fontWeight: 700, color: '#0a605e' }}>{CAL_ICON}<span>{thDate(g.key)} {thWeekday(g.key)}</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {g.rows.map((b) => { const v = vm(b); return (
                  <div key={b.id} onClick={() => setDetail(b)} style={{ background: '#fff', border: '1px solid #e7ebee', borderLeft: `3px solid ${v.sc}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#37434d' }}>{b.booking_code}</span>
                        <span style={{ marginLeft: 8, background: '#eef2f4', color: '#5b6b7a', borderRadius: 6, padding: '2px 8px', fontSize: 11.5, fontWeight: 600 }}>{typeLabel(b.booking_type)}</span>
                      </div>
                      <span style={badge(v.sb, v.sc)}>{v.sl}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2a33' }}>{b.location}</div>
                    {carModelLabel(b) && <div style={{ fontSize: 12.5, color: '#6b7884', marginTop: 3 }}>{t('myreq.model_label')}{carModelLabel(b)}</div>}
                    <div style={{ fontSize: 12.5, color: '#6b7884', marginTop: 3 }}>{thDate(b.start_at)} {thTime(b.start_at)} → {thTime(b.end_at)} · {b.people} {t('myreq.unit_people')}</div>
                    {(v.showCancel || v.showReturn) && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>{actionButtons(b, v)}</div>
                    )}
                  </div>
                ); })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* เดสก์ท็อป: ตาราง */
        <div style={{ background: '#fff', border: '1px solid #e3e8ec', borderRadius: 16, boxShadow: '0 1px 2px rgba(17,24,39,.05), 0 12px 26px -10px rgba(17,24,39,.16)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
              <thead>
                <tr style={{ background: '#fff' }}>
                  <th style={th}>{t('myreq.col_code')}</th>
                  <th style={th}>{t('myreq.col_type')}</th>
                  <th style={th}>{t('myreq.col_model')}</th>
                  <th style={th}>{t('myreq.col_destination')}</th>
                  <th style={th}>{t('myreq.col_time')}</th>
                  <th style={th}>{t('myreq.col_people')}</th>
                  <th style={th}>{t('myreq.col_status')}</th>
                  <th style={th}>{t('myreq.col_manage')}</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={g.key}>
                    {/* แถบหัวข้อวัน (ไม่มีตัวนับ) */}
                    <tr>
                      <td colSpan={8} style={{ padding: '11px 20px 7px', background: '#e6f3f2', borderTop: '1px solid #cbe6e2', borderBottom: '1px solid #cbe6e2', fontSize: 12.5, fontWeight: 700, color: '#0a605e', verticalAlign: 'middle' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{CAL_ICON}<span>{thDate(g.key)} {thWeekday(g.key)}</span></div></td>
                    </tr>
                    {g.rows.map((b) => { const v = vm(b); return (
                      <tr key={b.id} onClick={() => setDetail(b)} style={{ cursor: 'pointer', background: (b.status === 'pending' || b.status === 'cancel_requested') ? '#fff8ea' : '#fff' }}>
                        <td style={{ ...td, fontWeight: 700 }}>{b.booking_code}</td>
                        <td style={td}>{typeLabel(b.booking_type)}</td>
                        <td style={td}>{carModelLabel(b) || <span style={{ color: '#c2cad1' }}>–</span>}</td>
                        <td style={{ ...td, maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.location}</td>
                        <td style={{ ...td, whiteSpace: 'nowrap', lineHeight: 1.5 }}>{thDate(b.start_at)}<br />{thTime(b.start_at)} → {thTime(b.end_at)}</td>
                        <td style={td}>{b.people}</td>
                        <td style={td}><span style={badge(v.sb, v.sc)}>{v.sl}</span></td>
                        <td style={td}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            {(v.showCancel || v.showReturn) ? actionButtons(b, v) : null}
                          </div>
                        </td>
                      </tr>
                    ); })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* แบ่งหน้า (pagination) — ใต้ตาราง */}
      <Pager page={curPage} totalPages={totalPages} total={sorted.length} perPage={PER_PAGE} onPage={(n) => setPage(Math.max(1, Math.min(n, totalPages)))} />

      {/* โมดัลรายละเอียด */}
      {detail && (() => {
        const b = detail; const v = vm(b); const drv = driverName(b);
        return (
          <div onClick={() => setDetail(null)} className="icar-drawer-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(31,42,51,.45)', display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', zIndex: 150 }}>
            <div onClick={(e) => e.stopPropagation()} className="icar-drawer" style={{ background: '#fff', width: 'min(560px, 100%)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,.22)' }}>
              <div style={{ flex: 'none', padding: '20px 24px', borderBottom: '1px solid #f0f3f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#1f2a33' }}>{t('myreq.detail_title', { code: b.booking_code })}</h3>
                <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aa7b2', padding: 4, display: 'flex' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ background: '#eef2f4', color: '#5b6b7a', borderRadius: 6, padding: '2px 9px', fontSize: 12, fontWeight: 600 }}>{typeLabel(b.booking_type)}</span>
                  <span style={badge(v.sb, v.sc)}>{v.sl}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px 20px', marginBottom: 4 }}>
                  <div style={{ gridColumn: '1 / -1' }}><div style={dLbl}>{t('myreq.col_destination')}</div><div style={dVal}>{b.location}</div></div>
                  <div><div style={dLbl}>{t('myreq.col_time')}</div><div style={dVal}>{thDateTime(b.start_at)} → {thDateTime(b.end_at)}</div></div>
                  <div><div style={dLbl}>{t('myreq.passenger_count_label')}</div><div style={dVal}>{b.people} {t('myreq.unit_people')}</div></div>
                  {b.purpose && <div style={{ gridColumn: '1 / -1' }}><div style={dLbl}>{t('myreq.purpose_label')}</div><div style={dVal}>{b.purpose}</div></div>}
                  {b.booking_type === 'self' && b.car_model && <div style={{ gridColumn: '1 / -1' }}><div style={dLbl}>{t('myreq.car_label')}</div><div style={dVal}>{b.car_model}{b.car_plate ? ` (${b.car_plate})` : ''}</div></div>}
                  {b.booking_type === 'other' && b.status === 'approved' && b.ext_driver_vehicle && <div><div style={dLbl}>{t('myreq.received_car_label')}</div><div style={dVal}>{b.ext_driver_vehicle}</div></div>}
                  {b.booking_type === 'other' && b.status === 'approved' && drv && <div><div style={dLbl}>{t('myreq.driver_label')}</div><div style={{ ...dVal, color: '#0a716e' }}>{drv}</div></div>}
                  {b.booking_type === 'other' && b.status === 'approved' && b.ext_driver_phone && <div><div style={dLbl}>{t('myreq.driver_phone_label')}</div><div style={dVal}>{b.ext_driver_phone}</div></div>}
                  {b.status === 'completed' && b.returned_at && <div><div style={dLbl}>{t('myreq.returned_at_label')}</div><div style={{ ...dVal, color: '#0a716e' }}>{thDateTime(b.returned_at)}</div></div>}
                </div>

                {/* เหตุผลถูกปฏิเสธ / หมายเหตุ Admin */}
                {b.admin_note && (b.status === 'rejected' ? (
                  <div style={{ marginTop: 14, background: '#fbecea', border: '1px solid #f3cfca', borderRadius: 8, padding: '12px 14px', fontSize: 13.5, color: '#a5352b' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      {t('myreq.rejected_reason_title')}
                    </div>
                    <div style={{ color: '#8a2f27', lineHeight: 1.5 }}>{b.admin_note}</div>
                  </div>
                ) : (
                  <div style={{ marginTop: 14, background: '#f6f8f9', borderRadius: 8, padding: '10px 13px', fontSize: 13.5, color: '#54616c' }}>{t('myreq.admin_note_prefix')}{b.admin_note}</div>
                ))}

                {/* รอ Admin ยืนยันการยกเลิก */}
                {v.waitingCancel && (
                  <div style={{ marginTop: 14, fontSize: 13, color: '#b5701a', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>
                    {t('myreq.waiting_cancel_notice')}
                  </div>
                )}

                {/* ปุ่มจัดการ */}
                {(v.showCancel || v.showReturn) && (
                  <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #f0f3f5', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    {actionButtons(b, v)}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ป็อปอัปยืนยัน — ยกเลิก / คืนรถ */}
      {confirmB && (() => {
        const isReturn = confirmB.action === 'return';
        const isRequest = !isReturn && confirmB.b.status === 'approved';
        const accent = isReturn ? '#0a716e' : '#c0392b';
        const accentBg = isReturn ? '#e6f3f2' : '#fbecea';
        const title = isReturn ? t('myreq.confirm_return_title') : t('myreq.confirm_cancel_title');
        const okText = isReturn ? (busy ? t('myreq.returning_busy') : t('myreq.confirm_return_btn')) : (busy ? t('myreq.processing_busy') : t('myreq.confirm_cancel_btn'));
        return (
          <div onClick={() => !busy && setConfirmB(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(31,42,51,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 190, padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 400, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.25)', overflow: 'hidden' }}>
              <div style={{ padding: '24px 26px 20px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  {isReturn
                    ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9" /><polyline points="3 3 3 8 8 8" /></svg>
                    : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" /></svg>}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#1f2a33' }}>{title}</h3>
                <p style={{ fontSize: 14, color: '#6b7884', margin: 0, lineHeight: 1.6 }}>
                  {isReturn ? (
                    <>{t('myreq.confirm_return_msg_pre')}<b style={{ color: '#0a716e', fontWeight: 700 }}>{confirmB.b.booking_code}</b>?<br />{t('myreq.confirm_return_msg_note')}</>
                  ) : isRequest ? (
                    <>{t('myreq.confirm_cancel_pre')}<b style={{ color: '#0a716e', fontWeight: 700 }}>{confirmB.b.booking_code}</b>?<br />{t('myreq.confirm_cancel_request_note')}</>
                  ) : (
                    <>{t('myreq.confirm_cancel_pre')}<b style={{ color: '#0a716e', fontWeight: 700 }}>{confirmB.b.booking_code}</b>?<br />{t('myreq.confirm_cancel_note')}</>
                  )}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, padding: '0 26px 24px' }}>
                <button onClick={() => setConfirmB(null)} disabled={busy} style={{ flex: 1, background: '#f1f3f5', color: '#54616c', border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 14.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{t('common.back')}</button>
                <button onClick={doAction} disabled={busy} style={{ flex: 1, background: accent, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 14.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: 'inherit' }}>{okText}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {toast && <div style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', background: '#1f2a33', color: '#fff', padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, boxShadow: '0 8px 30px rgba(0,0,0,.2)', zIndex: 200 }}>{toast}</div>}
    </div>
  );
}

const dLbl = { fontSize: 12, color: '#9aa7b2', fontWeight: 600, marginBottom: 3 };
const dVal = { fontSize: 14, color: '#37434d', fontWeight: 600, wordBreak: 'break-word' };
