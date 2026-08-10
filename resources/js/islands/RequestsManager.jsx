import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { thDate, thTime, thDateTime, thWeekday } from '../lib/date';
import { getCsrf, setCsrf } from '../lib/csrf';
import { t } from '../lib/i18n';
import Alert from '../lib/Alert';
import Pager from '../lib/Pager';

// normalize เวลา → 'YYYY-MM-DD HH:MM:SS' (รับทั้งจาก DB และ input datetime-local)
const padDt = (s) => { s = String(s || '').replace('T', ' '); return s.length === 16 ? s + ':00' : s; };

// แสดง 3 กลุ่มสถานะฝั่ง Admin: รออนุมัติ / อนุมัติแล้ว / ยกเลิก+ปฏิเสธ (รวมความหมายเดียวกัน)
const STATUS = {
  pending:   [t('status.pending'), '#fdf0e0', '#b5701a'],
  approved:  [t('status.approved'), '#e7f4ee', '#16855a'],
  cancelled: [t('status.rejected'), '#fbecea', '#c0392b'],
};
// จับสถานะจริงเข้า 1 ใน 3 กลุ่ม (completed -> อนุมัติแล้ว · rejected/cancel_requested -> ยกเลิก/ปฏิเสธ)
const GROUP_OF = {
  pending: 'pending',
  approved: 'approved', completed: 'approved',
  rejected: 'cancelled', cancelled: 'cancelled', cancel_requested: 'cancelled',
};
const groupOf = (s) => GROUP_OF[s] || 'pending';
// จำนวนคำขอต่อหน้า (pagination)
const PER_PAGE = 20;
// ลิงก์ปลอดภัยไหม — ต้องขึ้นต้นด้วย http:// หรือ https:// เท่านั้น (กัน javascript: ที่หลุดชั้น validate มา)
const isSafeUrl = (u) => /^https?:\/\//i.test(String(u || ''));
// 'YYYY-MM-DD HH:MM:SS' → 'YYYY-MM-DDTHH:MM' (ค่าเริ่มต้นของ input datetime-local)
const toLocalInput = (s) => (s ? String(s).slice(0, 16).replace(' ', 'T') : '');
const typeLabel = (bt) => (bt === 'other' ? t('req.car_other') : t('req.car_self'));
// ช่วงเวลาแบบ 2 บรรทัด: วันที่ด้านบน เวลาด้านล่าง → [บรรทัด1, บรรทัด2]
const rangeLines = (s, e) => {
  if (!s) return ['', ''];
  return s.slice(0, 10) === (e || '').slice(0, 10)
    ? [thDate(s), `${thTime(s)} → ${thTime(e)}`]
    : [`${thDate(s)} ${thTime(s)}`, `→ ${thDate(e)} ${thTime(e)}`];
};
const BAR = { pending: '#e08a1e', approved: '#16855a', rejected: '#d9534f', cancelled: '#d9534f' };
const carText = (b) => (b.car_model ? `${b.car_model}${b.car_plate ? ' · ' + b.car_plate : ''}` : (b.booking_type === 'other' ? t('req.provided_by_admin') : '-'));
const badge = (bg, c) => ({ background: bg, color: c, borderRadius: 999, padding: '3px 11px', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' });
const th = { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#8a97a2', background: '#fafbfc', borderBottom: '1px solid #eceff1', whiteSpace: 'nowrap' };
const td = { padding: '12px 16px', fontSize: 13.5, color: '#37434d', borderBottom: '1px solid #f4f6f7', verticalAlign: 'top' };
const inp = { width: '100%', padding: '11px 13px', border: '1px solid #d8dee3', borderRadius: 8, fontSize: 14.5, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', color: '#37434d' };
const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#54616c', marginBottom: 6 };

// ปุ่มในคอลัมน์จัดการ (ตาม mockup): ทึบมีไอคอน (อนุมัติ/ปฏิเสธ) + ปุ่มเทา (ดูรายละเอียด)
const btnSolid = (bg) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, background: bg, color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' });
const btnGray = { background: '#cdd5db', color: '#3f4b56', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' };
// ไอคอนบนปุ่ม
const ICO = {
  check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  x: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
};
// ไอคอนปฏิทินนำหน้าแถบวันที่
const CAL_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);

const driverAssigned = (b) => (b.driver_type === 'company' ? (b.driver_name || t('req.driver_company')) : (b.driver_type === 'external' ? (b.ext_driver_name || t('req.driver_external')) : ''));
// รถอื่นๆ มอบหมายคนขับครบหรือยัง — คืนข้อความเตือน หรือ '' ถ้าครบ (บริษัท=เลือกในลิสต์, ภายนอก=กรอกชื่อ)
const driverWarn = (f) => (f.driver === '' ? t('req.warn_pick_driver') : (f.driver === 'external' && !String(f.ext_name || '').trim() ? t('req.warn_ext_name') : ''));

// จุดสีนำหน้าตัวเลขสรุปยอดในหัวกลุ่มวันที่
const Dot = ({ color, text, children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: text }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />{children}
  </span>
);

/**
 * จัดการคำขอจองรถ (Admin) — list + filter + modal อนุมัติ/ปฏิเสธ + มอบหมายคนขับ
 * props: endpoints {data, approve, reject}
 */
export default function RequestsManager({ endpoints }) {
  const [rows, setRows] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [search, setSearch] = useState('');
  const [fType, setFType] = useState('all');
  const [fStatus, setFStatus] = useState('all');
  const [fDate, setFDate] = useState('');   // กรองตามวันที่ใช้รถ (ว่าง = ทุกวัน)
  const [modal, setModal] = useState(null);
  const [modalErr, setModalErr] = useState('');   // ข้อความ error ในโมดัล (กล่องแดงค้าง)
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false); // กันดับเบิลคลิกยิงซ้ำ (sync ref, ไม่รอ state update)
  const [narrow, setNarrow] = useState(false);
  const [page, setPage] = useState(1);   // หน้าปัจจุบันของ pagination

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const on = () => setNarrow(mq.matches); on();
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setLoadErr(false);
    fetch(endpoints.data, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => { setRows(d.bookings || []); setDrivers(d.drivers || []); setCars(d.cars || []); })
      .finally(() => setLoading(false))
      .catch(() => setLoadErr(true));
  }, [endpoints.data]);
  useEffect(() => { load(); }, [load]);

  // ปิด drawer รายละเอียดด้วยปุ่ม Esc (เหมือน M365)
  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => { if (e.key === 'Escape') setModal(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2800); };

  const post = async (url, body) => {
    if (busyRef.current) return false; // กันดับเบิลคลิกยิงซ้ำ
    busyRef.current = true;
    setBusy(true);
    setModalErr('');   // ล้าง error เดิมก่อนยิงใหม่
    try {
      const res = await fetch(url, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'X-CSRF-TOKEN': getCsrf(), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams(body).toString(),
      });
      const d = await res.json().catch(() => ({}));
      // error ที่ไม่ใช่ JSON (เช่น 500/CSRF หมดอายุ) → token หลุด sync, reload เพื่อรับ token+state ใหม่
      if (!res.ok && !d.csrf) { window.location.reload(); return false; }
      if (d.csrf) setCsrf(d.csrf);
      if (d.ok) { showToast(d.message || t('common.success')); load(); return true; }
      // ข้อผิดพลาดจากการทำรายการ → กล่องแดงค้างในโมดัล (แทน toast ดำ)
      setModalErr(d.message || t('common.err'));
      return false;
    } finally { setBusy(false); busyRef.current = false; }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((b) => {
      if (fType !== 'all' && b.booking_type !== fType) return false;
      if (fStatus !== 'all' && groupOf(b.status) !== fStatus) return false;
      // กรองวันที่ใช้รถ: เลือกวันที่ต้องอยู่ในช่วง [start_at, end_at] ของคำขอ (รองรับงานข้ามวัน)
      if (fDate && !(String(b.start_at).slice(0, 10) <= fDate && fDate <= String(b.end_at).slice(0, 10))) return false;
      if (q && ![b.booking_code, b.requester_name, b.location].some((x) => (x || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, search, fType, fStatus, fDate]);

  // เรียงคำขอทั้งหมด: วันเดินทางล่าสุดก่อน → ในวันเดียวกันเรียงคำขอล่าสุด (created_at) ก่อน
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const da = (a.start_at || '').slice(0, 10);
      const db = (b.start_at || '').slice(0, 10);
      if (da !== db) return db.localeCompare(da);
      return (b.created_at || '').localeCompare(a.created_at || '') || (+b.id - +a.id);
    });
  }, [filtered]);

  // แบ่งหน้า: กรอง/เรียงเสร็จแล้วค่อยตัดทีละ PER_PAGE รายการ
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const curPage = Math.min(page, totalPages);   // กันหน้าเกินหลังกรองจนรายการลด
  const pageRows = useMemo(() => sorted.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE), [sorted, curPage]);

  // เปลี่ยนค้นหา/ตัวกรอง → กลับไปหน้าแรกเสมอ
  useEffect(() => { setPage(1); }, [search, fType, fStatus, fDate]);

  // จัดกลุ่มตามวัน (start_at) + นับสถานะ — เฉพาะรายการในหน้าปัจจุบัน
  const groups = useMemo(() => {
    const map = [];
    pageRows.forEach((b) => {
      const key = (b.start_at || '').slice(0, 10);
      let g = map.find((x) => x.key === key);
      if (!g) { g = { key, rows: [], pend: 0, appr: 0, canc: 0 }; map.push(g); }
      g.rows.push(b);
      const grp = groupOf(b.status);
      if (grp === 'pending') g.pend++;
      else if (grp === 'approved') g.appr++;
      else g.canc++;   // ยกเลิก + ปฏิเสธ + cancel_requested (รวมกลุ่มเดียว)
    });
    return map;
  }, [pageRows]);

  const openDetail = (b, mode) => { setModalErr(''); return setModal({
    booking: b,
    rejecting: mode === 'reject',   // เปิดโมดัลเข้าโหมดปฏิเสธทันที (กดปุ่ม "ปฏิเสธ" ในแถว)
    form: {
      driver: b.driver_type === 'company' ? String(b.driver_id) : (b.driver_type === 'external' ? 'external' : ''),
      ext_name: b.ext_driver_name || '', ext_phone: b.ext_driver_phone || '', ext_seats: b.ext_driver_seats || '', ext_vehicle: b.ext_driver_vehicle || '',
      admin_note: b.admin_note || '',
    },
  }); };
  const setForm = (patch) => setModal((m) => ({ ...m, form: { ...m.form, ...patch } }));

  // เลือกคนขับ: ถ้าเป็นคนขับบริษัท เติมเบอร์โทร/รถประจำอัตโนมัติ · ถ้าอื่น ๆ ล้างค่า
  const pickDriver = (val) => {
    const d = drivers.find((x) => String(x.id) === String(val));
    if (d) {
      setForm({
        driver: val,
        ext_phone: d.phone || '',
        ext_vehicle: d.car_model ? `${d.car_model}${d.car_plate ? ' / ' + d.car_plate : ''}` : '',
        ext_seats: d.car_seats || '',
      });
    } else {
      setForm({ driver: val, ext_phone: '', ext_vehicle: '', ext_seats: '' });
    }
  };

  const doApprove = async () => {
    const b = modal.booking; const f = modal.form;
    // รถอื่นๆ ต้องมอบหมายคนขับก่อนอนุมัติ (ไม่มีคนขับ = เตือน ไม่ส่ง) + กันคนขับซ้อนเวลา
    if (b.booking_type === 'other') {
      const w = driverWarn(f); if (w) return showToast(w);
      if (driverClash()) return showToast(t('req.driver_clash'));
    }
    const body = { id: b.id, admin_note: f.admin_note };
    if (b.booking_type === 'other') { body.driver = f.driver; body.ext_name = f.ext_name; body.ext_phone = f.ext_phone; body.ext_seats = f.ext_seats; body.ext_vehicle = f.ext_vehicle; }
    if (await post(endpoints.approve, body)) setModal(null);
  };
  const doReject = async () => {
    // บังคับกรอกเหตุผลการปฏิเสธ (ห้ามเว้นว่าง)
    const note = String(modal.form.admin_note || '').trim();
    if (!note) return showToast(t('req.warn_reject_reason'));
    if (await post(endpoints.reject, { id: modal.booking.id, admin_note: note })) setModal(null);
  };
  // ยืนยันการยกเลิก (คำขอที่ User ขอยกเลิก)
  const doConfirmCancel = async () => {
    if (await post(endpoints.confirmCancel, { id: modal.booking.id })) setModal(null);
  };
  // มอบหมาย/เปลี่ยนคนขับ ให้คำขอที่อนุมัติแล้ว (รถอื่น ๆ) — เติมกรณีอนุมัติแบบยังไม่มอบหมาย
  const doAssign = async () => {
    const f = modal.form;
    // เปลี่ยน/มอบหมายคนขับ ต้องเลือกคนขับเสมอ (ถอดคนขับออกไม่ได้) + กันคนขับซ้อนเวลา
    const w = driverWarn(f); if (w) return showToast(w);
    if (driverClash()) return showToast(t('req.driver_clash'));
    const body = { id: modal.booking.id, driver: f.driver, ext_name: f.ext_name, ext_phone: f.ext_phone, ext_seats: f.ext_seats, ext_vehicle: f.ext_vehicle };
    if (await post(endpoints.assign, body)) setModal(null);
  };

  // Admin ยกเลิกคำขอ (ทุกคำขอที่ยัง active — ปล่อยรถคืน)
  const doCancel = async () => {
    if (await post(endpoints.cancel, { id: modal.booking.id, admin_note: modal.form.admin_note })) setModal(null);
  };
  // Admin บันทึกการแก้ไขคำขอ
  const doUpdate = async () => {
    const b = modal.booking; const f = modal.form;
    // รถอื่นๆ ที่อนุมัติแล้ว ห้ามถอดคนขับ — ต้องเลือกคนขับ (คำขอ pending ยังเว้นได้ ค่อยมอบตอนอนุมัติ)
    if (b.booking_type === 'other' && b.status !== 'pending') { const w = driverWarn(f); if (w) return showToast(w); }
    // กันคนขับซ้อนเวลา (รถอื่นๆ ที่เลือกคนขับบริษัท)
    if (b.booking_type === 'other' && driverClash()) return showToast(t('req.driver_clash'));
    const body = { id: b.id, location: f.location, start_at: f.start_at, end_at: f.end_at, people: f.people, purpose: f.purpose, map_link: f.map_link };
    if (b.booking_type === 'self') body.car_id = f.car_id;
    else { body.driver = f.driver; body.ext_name = f.ext_name; body.ext_phone = f.ext_phone; body.ext_seats = f.ext_seats; body.ext_vehicle = f.ext_vehicle; }
    if (await post(endpoints.update, body)) setModal(null);
  };
  // เข้าโหมดแก้ไข — เติมค่าปัจจุบันของคำขอลงฟอร์ม
  const enterEdit = () => {
    const b = modal.booking;
    setModal((m) => ({
      ...m, editing: true,
      form: {
        ...m.form,
        location: b.location || '', start_at: toLocalInput(b.start_at), end_at: toLocalInput(b.end_at),
        people: b.people || 1, purpose: b.purpose || '', map_link: b.map_link || '', car_id: b.car_id ? String(b.car_id) : '',
      },
    }));
  };

  // ฟอร์มแก้ไขคำขอ — รายละเอียดเดินทาง + รถ(self) / คนขับ(other)
  const editForm = () => {
    const isOther = modal.booking.booking_type === 'other';
    return (
      <div style={{ borderTop: '1px solid #f0f3f5', paddingTop: 16 }}>
        <label style={lbl}>{t('req.location_label')}</label>
        <input value={modal.form.location} onChange={(e) => setForm({ location: e.target.value })} style={{ ...inp, marginBottom: 14 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div><label style={lbl}>{t('req.start_label')}</label><input type="datetime-local" value={modal.form.start_at} onChange={(e) => setForm({ start_at: e.target.value })} style={inp} /></div>
          <div><label style={lbl}>{t('req.end_label')}</label><input type="datetime-local" value={modal.form.end_at} onChange={(e) => setForm({ end_at: e.target.value })} style={inp} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div><label style={lbl}>{t('req.people_label')}</label><input type="number" min="1" value={modal.form.people} onChange={(e) => setForm({ people: e.target.value })} style={inp} /></div>
          <div><label style={lbl}>{t('req.map_label')}</label><input value={modal.form.map_link} maxLength={500} onChange={(e) => setForm({ map_link: e.target.value })} placeholder={t('req.map_placeholder')} style={inp} /></div>
        </div>
        <label style={lbl}>{t('req.purpose_label')}</label>
        <textarea value={modal.form.purpose} onChange={(e) => setForm({ purpose: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical', marginBottom: 14 }} />
        {isOther ? driverPicker() : (
          <>
            <label style={lbl}>{t('req.car_self_label')}</label>
            <select value={modal.form.car_id} onChange={(e) => setForm({ car_id: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
              {cars.map((c) => <option key={c.id} value={c.id}>{c.model}{c.plate ? ` — ${c.plate}` : ''} ({t('req.seats_count', { n: c.seats })})</option>)}
            </select>
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button onClick={() => setModal((m) => ({ ...m, editing: false }))} disabled={busy} style={{ background: '#f1f3f5', color: '#54616c', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{t('req.cancel_edit')}</button>
          <button onClick={doUpdate} disabled={busy || !!driverClash()} style={{ background: '#0a716e', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 26px', fontSize: 14.5, fontWeight: 600, cursor: (busy || driverClash()) ? 'not-allowed' : 'pointer', opacity: driverClash() ? 0.55 : 1, fontFamily: 'inherit' }}>{t('common.save')}</button>
        </div>
      </div>
    );
  };

  // คนขับบริษัทที่เลือกมีงานซ้อนช่วงเวลาของคำขอนี้ไหม — คืนงานที่ชน {id,code,...} หรือ null
  // โหมดแก้ไขใช้เวลาจากฟอร์ม, กรณีอื่นใช้เวลาของคำขอ · ตัดงานของคำขอนี้เองออก
  const driverClash = () => {
    if (!modal) return null;
    const f = modal.form;
    if (!f.driver || f.driver === 'external') return null;
    const d = drivers.find((x) => String(x.id) === String(f.driver));
    if (!d || !d.jobs || d.jobs.length === 0) return null;
    const s = padDt(modal.editing ? f.start_at : modal.booking.start_at);
    const e = padDt(modal.editing ? f.end_at : modal.booking.end_at);
    if (!s || !e) return null;
    return d.jobs.find((j) => String(j.id) !== String(modal.booking.id) && padDt(j.start_at) < e && padDt(j.end_at) > s) || null;
  };

  // UI เลือกคนขับ (ใช้ซ้ำทั้งตอนอนุมัติ และตอนมอบหมายภายหลัง) — คนขับบริษัท/ภายนอก
  const driverPicker = () => {
    const isExternal = modal.form.driver === 'external';
    const selDriver = drivers.find((d) => String(d.id) === String(modal.form.driver));
    return (
      <>
        <label style={lbl}>{t('req.pick_driver_label')}</label>
        <select value={modal.form.driver} onChange={(e) => pickDriver(e.target.value)} style={{ ...inp, marginBottom: 16, cursor: 'pointer' }}>
          <option value="">{t('req.not_assigned_option')}</option>
          {drivers.map((d) => <option key={d.id} value={d.id}>{d.name || t('req.driver_hash', { n: d.id })}</option>)}
          <option value="external">{t('req.external_driver_option')}</option>
        </select>

        {/* เตือนคนขับซ้อนเวลา — กล่องแดงเต็มความกว้าง ค้างไว้จนกว่าจะเปลี่ยนคนขับ */}
        {(() => { const c = driverClash(); return c ? <Alert style={{ marginBottom: 16 }}>{t('req.driver_clash_code', { code: c.code })}</Alert> : null; })()}

        {/* คนขับบริษัท: pre-fill เบอร์โทร/รถ/ที่นั่งจากคนขับ แล้วแก้ไขได้ (เฉพาะคำขอนี้) */}
        {selDriver && (
          <div style={{ background: '#f0f7f6', border: '1px solid #cbe6e2', borderRadius: 10, padding: '15px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#0a716e', fontWeight: 700, marginBottom: 12 }}>{t('req.driver_car_info')}</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#9aa7b2', fontWeight: 600, marginBottom: 3 }}>{t('req.driver_name_label')}</div>
              <div style={{ fontSize: 14.5, color: '#37434d', fontWeight: 600 }}>{selDriver.name || '-'}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>{t('req.phone_label')}</label><input value={modal.form.ext_phone} onChange={(e) => setForm({ ext_phone: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>{t('req.seats_label')}</label><input type="number" min="0" value={modal.form.ext_seats} onChange={(e) => setForm({ ext_seats: e.target.value })} style={inp} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>{t('req.vehicle_used_label')}</label><input value={modal.form.ext_vehicle} onChange={(e) => setForm({ ext_vehicle: e.target.value })} placeholder={t('req.vehicle_example_placeholder')} style={inp} /></div>
            </div>
            <div style={{ fontSize: 11.5, color: '#9aa7b2', marginTop: 10 }}>{t('req.edit_note_driver')}</div>
          </div>
        )}

        {/* คนขับภายนอก: กรอกเอง */}
        {isExternal && (
          <>
            <label style={lbl}>{t('req.ext_driver_name_label')} <span style={{ color: '#c0392b' }}>*</span></label>
            <input value={modal.form.ext_name} onChange={(e) => setForm({ ext_name: e.target.value })} placeholder={t('req.name_surname_placeholder')} style={{ ...inp, marginBottom: 16 }} />
            <div style={{ background: '#f6f9fa', border: '1px solid #e3e9ec', borderRadius: 10, padding: '15px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#0a716e', fontWeight: 700, marginBottom: 12 }}>{t('req.driver_car_info')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>{t('req.phone_label')}</label><input value={modal.form.ext_phone} onChange={(e) => setForm({ ext_phone: e.target.value })} style={inp} /></div>
                <div><label style={lbl}>{t('req.seats_label')}</label><input type="number" min="0" value={modal.form.ext_seats} onChange={(e) => setForm({ ext_seats: e.target.value })} style={inp} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>{t('req.vehicle_used_label')}</label><input value={modal.form.ext_vehicle} onChange={(e) => setForm({ ext_vehicle: e.target.value })} placeholder={t('req.vehicle_example_placeholder')} style={inp} /></div>
              </div>
            </div>
          </>
        )}
      </>
    );
  };

  // ป้ายสถานะ = 1 ใน 4 กลุ่มที่แสดง
  const rowStat = (b) => STATUS[groupOf(b.status)];

  return (
    <div>
      {loadErr && (
        <div style={{ padding: '10px 14px', marginBottom: 12, background: '#fbecea', color: '#9a3b34', borderRadius: 8, fontSize: 13 }}>
          {t('common.load_err')}
        </div>
      )}
      {/* ฟิลเตอร์ */}
      <div className="filter-card">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('req.search_placeholder')} style={{ ...inp, flex: 1, minWidth: 220 }} />
        <select value={fType} onChange={(e) => setFType(e.target.value)} style={{ ...inp, width: 'auto', cursor: 'pointer' }}>
          <option value="all">{t('req.all_types')}</option><option value="self">{t('req.car_self')}</option><option value="other">{t('req.car_other')}</option>
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={{ ...inp, width: 'auto', cursor: 'pointer' }}>
          <option value="all">{t('req.all_statuses')}</option><option value="pending">{t('status.pending')}</option><option value="approved">{t('status.approved')}</option><option value="cancelled">{t('status.rejected')}</option>
        </select>
        {/* กรองตามวันที่ใช้รถ (เฉพาะวันที่ต้องการ) */}
        <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} title={t('req.date_filter_title')} style={{ ...inp, width: 'auto', cursor: 'pointer' }} />
        {fDate && (
          <button onClick={() => setFDate('')} title={t('req.clear_date')} style={{ ...inp, width: 'auto', cursor: 'pointer', background: '#f1f3f5', color: '#54616c', fontWeight: 600 }}>{t('req.clear_date')}</button>
        )}
      </div>

      {loading && <div style={{ color: '#9aa7b2', padding: 20 }}>{t('common.loading')}</div>}
      {!loading && filtered.length === 0 && <div style={{ background: '#fff', border: '1px solid #e7ebee', borderRadius: 12, padding: 40, textAlign: 'center', color: '#9aa7b2' }}>{t('req.not_found')}</div>}

      {/* จัดกลุ่มตามวัน */}
      {!loading && filtered.length > 0 && (narrow ? (
        /* มือถือ/แท็บเล็ต: การ์ดจัดกลุ่มตามวัน */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groups.map((g) => (
            <div key={g.key}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#e6f3f2', border: '1px solid #cbe6e2', borderRadius: 8, padding: '8px 14px', marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#0a605e' }}>{CAL_ICON}{thDate(g.key)} {thWeekday(g.key)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, fontWeight: 600, flexWrap: 'wrap' }}>
                  <span style={{ color: '#6b7884' }}>{t('req.total', { n: g.rows.length })}</span>
                  <Dot color="#e08a1e" text="#b5701a">{t('req.count_pending', { n: g.pend })}</Dot>
                  <Dot color="#16855a" text="#16855a">{t('req.count_appr', { n: g.appr })}</Dot>
                  <Dot color="#d9534f" text="#c0392b">{t('req.count_rej', { n: g.canc })}</Dot>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {g.rows.map((b) => { const [sl, sb, sc] = rowStat(b); return (
                  <div key={b.id} style={{ background: (b.status === 'pending' || b.status === 'cancel_requested') ? '#fff8ea' : '#fff', border: '1px solid #e7ebee', borderLeft: `3px solid ${BAR[groupOf(b.status)]}`, borderRadius: 10, padding: '13px 15px' }}>
                    <div onClick={() => openDetail(b)} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 9, marginBottom: 6 }}>
                        <div style={{ minWidth: 0 }}><span style={{ fontSize: 13, fontWeight: 700, color: '#37434d' }}>{b.booking_code}</span> <span style={{ fontSize: 12, color: '#9aa7b2' }}>{b.requester_name || '-'}</span></div>
                        <span style={badge(sb, sc)}>{sl}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#37434d' }}>{carText(b)}</div>
                      <div style={{ fontSize: 12.5, color: '#6b7884', marginTop: 3, lineHeight: 1.6 }}>
                        <div>{b.location} · {t('req.people', { n: b.people })}</div>
                        <div>{(() => { const [l1, l2] = rangeLines(b.start_at, b.end_at); return `${l1} ${l2}`; })()}</div>
                      </div>
                    </div>
                    {b.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
                        <button onClick={() => openDetail(b)} style={{ flex: 1, background: '#e7f4ee', color: '#16855a', border: 'none', borderRadius: 8, padding: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('common.approve')}</button>
                        <button onClick={() => openDetail(b, 'reject')} style={{ flex: 1, background: '#fbecea', color: '#c0392b', border: 'none', borderRadius: 8, padding: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('common.reject')}</button>
                      </div>
                    )}
                    {b.status === 'cancel_requested' && (
                      <div style={{ marginTop: 11 }}>
                        <button onClick={() => openDetail(b)} style={{ width: '100%', background: '#fff3e0', color: '#b5701a', border: 'none', borderRadius: 8, padding: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('req.confirm_cancel')}</button>
                      </div>
                    )}
                  </div>
                ); })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* เดสก์ท็อป: ตารางเดียว + header คอลัมน์ */
        <div style={{ background: '#fff', border: '1px solid #e3e8ec', borderRadius: 16, boxShadow: '0 2px 6px rgba(17,24,39,.06), 0 22px 48px -14px rgba(17,24,39,.28)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            {/* header คอลัมน์ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', background: '#fff', borderBottom: '2px solid #e7ebee', minWidth: 800, fontSize: 12.5, fontWeight: 700, color: '#3d4852', letterSpacing: 0.2, textAlign: 'center' }}>
              <div style={{ flex: '1 1 0', minWidth: 110 }}>{t('req.col_code_requester')}</div>
              <div style={{ flex: '1 1 0', minWidth: 120 }}>{t('req.col_car_plate')}</div>
              <div style={{ flex: '1.6 1 0', minWidth: 160 }}>{t('req.col_location_people')}</div>
              <div style={{ flex: '1.1 1 0', minWidth: 165 }}>{t('req.col_time_range')}</div>
              <div style={{ flex: '0.8 1 0', minWidth: 100 }}>{t('req.col_status')}</div>
              <div style={{ flex: '1.2 1 0', minWidth: 178 }}>{t('req.col_manage')}</div>
            </div>
            {groups.map((g) => (
              <div key={g.key} style={{ minWidth: 800 }}>
                {/* แถบวันที่ + สรุปยอด */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 20px', background: '#e6f3f2', borderTop: '1px solid #cbe6e2', borderBottom: '1px solid #cbe6e2', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#0a605e' }}>{CAL_ICON}{thDate(g.key)} {thWeekday(g.key)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 600, color: '#6b7884', flexWrap: 'wrap' }}>
                    <span>{t('req.total', { n: g.rows.length })}</span>
                    <span style={{ color: '#d4dbe0' }}>·</span><Dot color="#e08a1e" text="#b5701a">{t('req.count_pending', { n: g.pend })}</Dot>
                    <span style={{ color: '#d4dbe0' }}>·</span><Dot color="#16855a" text="#16855a">{t('req.count_appr', { n: g.appr })}</Dot>
                    <span style={{ color: '#d4dbe0' }}>·</span><Dot color="#d9534f" text="#c0392b">{t('req.count_rej', { n: g.canc })}</Dot>
                  </div>
                </div>
                {/* แถวคำขอ */}
                {g.rows.map((b) => { const [sl, sb, sc] = rowStat(b); return (
                  <div key={b.id} onClick={() => openDetail(b)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px 13px 17px', borderBottom: '1px solid #f4f6f7', borderLeft: `3px solid ${BAR[groupOf(b.status)]}`, background: (b.status === 'pending' || b.status === 'cancel_requested') ? '#fff8ea' : '#fff', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ flex: '1 1 0', minWidth: 110 }}><div style={{ fontSize: 13, fontWeight: 700, color: '#37434d' }}>{b.booking_code}</div><div style={{ fontSize: 12.5, color: '#9aa7b2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.requester_name || '-'}</div></div>
                    <div style={{ flex: '1 1 0', minWidth: 120 }}><div style={{ fontSize: 13, fontWeight: 600, color: '#37434d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.car_model || (b.booking_type === 'other' ? t('req.provided_by_admin') : '-')}</div><div style={{ fontSize: 12.5, color: '#9aa7b2' }}>{b.car_plate || ' '}</div></div>
                    <div style={{ flex: '1.6 1 0', minWidth: 160, textAlign: 'center' }}><div style={{ fontSize: 13, color: '#37434d' }}>{b.location}</div><div style={{ fontSize: 12.5, color: '#9aa7b2' }}>{t('req.people_count', { n: b.people })}</div></div>
                    <div style={{ flex: '1.1 1 0', minWidth: 165, fontSize: 12.5, color: '#6b7884', whiteSpace: 'nowrap', textAlign: 'center', lineHeight: 1.5 }}>{(() => { const [l1, l2] = rangeLines(b.start_at, b.end_at); return (<><div>{l1}</div><div>{l2}</div></>); })()}</div>
                    <div style={{ flex: '0.8 1 0', minWidth: 100, display: 'flex', justifyContent: 'center' }}><span style={badge(sb, sc)}>{sl}</span></div>
                    <div style={{ flex: '1.2 1 0', minWidth: 178, display: 'flex', gap: 7, justifyContent: 'center' }}>
                      {b.status === 'pending' && (<>
                        <button onClick={(e) => { e.stopPropagation(); openDetail(b); }} style={btnSolid('#16855a')}>{ICO.check}{t('common.approve')}</button>
                        <button onClick={(e) => { e.stopPropagation(); openDetail(b, 'reject'); }} style={btnSolid('#c0392b')}>{ICO.x}{t('common.reject')}</button>
                      </>)}
                      {b.status === 'cancel_requested' && (
                        <button onClick={(e) => { e.stopPropagation(); openDetail(b); }} style={btnSolid('#d98324')}>{t('req.confirm_cancel_short')}</button>
                      )}
                    </div>
                  </div>
                ); })}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* แบ่งหน้า (pagination) — ใต้ตาราง ทำงานกับผลลัพธ์หลังกรอง */}
      {!loading && sorted.length > 0 && (
        <Pager page={curPage} totalPages={totalPages} total={sorted.length} perPage={PER_PAGE} onPage={(n) => setPage(Math.max(1, Math.min(n, totalPages)))} />
      )}

      {/* โมดัลรายละเอียด */}
      {modal && (() => {
        const b = modal.booking; const [sl, sb, sc] = rowStat(b);
        const pending = b.status === 'pending';
        const isCancelReq = b.status === 'cancel_requested';
        const isOther = b.booking_type === 'other';
        const isActive = pending || isCancelReq || b.status === 'approved';   // แก้ไขได้
        const canAdminCancel = pending || b.status === 'approved';            // ยกเลิกโดย Admin ได้ (cancel_requested มีปุ่มยืนยันอยู่แล้ว)
        const fields = [
          [t('req.requester_label'), b.requester_name || '-'], [t('req.dept_label'), b.dept_name || '-'], [t('req.type_label'), typeLabel(b.booking_type)],
          [t('req.passenger_count_label'), t('req.people', { n: b.people })], [t('req.col_time_range'), `${thDateTime(b.start_at)} → ${thDateTime(b.end_at)}`],
          [t('req.location_short'), b.location], [t('req.purpose_label'), b.purpose || '-'],
        ];
        if (b.booking_type === 'self') fields.push([t('req.car_label'), b.car_model ? `${b.car_model} (${b.car_plate})` : '-']);
        return (
          <div onClick={() => setModal(null)} className="icar-drawer-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(31,42,51,.45)', display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', zIndex: 150 }}>
            <div onClick={(e) => e.stopPropagation()} className="icar-drawer" style={{ background: '#fff', width: 'min(560px, 100%)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,.22)' }}>
              <div style={{ flex: 'none', padding: '22px 26px', borderBottom: '1px solid #f0f3f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1f2a33' }}>{t('req.detail_title', { code: b.booking_code })}</h3>
                <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aa7b2', padding: 4, display: 'flex' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 26px' }}>
                {modalErr && <Alert style={{ marginBottom: 16 }}>{modalErr}</Alert>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginBottom: 18 }}>
                  {fields.map(([k, v]) => <div key={k}><div style={{ fontSize: 12, color: '#9aa7b2', fontWeight: 600, marginBottom: 3 }}>{k}</div><div style={{ fontSize: 14.5, color: '#37434d', fontWeight: 600 }}>{v}</div></div>)}
                </div>
                {b.map_link && (isSafeUrl(b.map_link)
                  ? <a href={b.map_link} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#e6f3f2', color: '#0a716e', borderRadius: 8, padding: '8px 14px', fontSize: 13.5, fontWeight: 600, textDecoration: 'none', marginBottom: 18 }}>{t('req.open_in_maps')}</a>
                  : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f1f3f5', color: '#9aa7b2', borderRadius: 8, padding: '8px 14px', fontSize: 13.5, fontWeight: 600, marginBottom: 18 }}>{t('req.invalid_map_link')}</span>)}

                {/* แถบเครื่องมือ Admin: แก้ไข/ยกเลิก คำขอที่ยัง active */}
                {isActive && !modal.editing && !modal.cancelling && !modal.rejecting && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <button onClick={enterEdit} disabled={busy} style={{ background: '#eef4f8', color: '#37434d', border: '1px solid #dbe4ea', borderRadius: 8, padding: '8px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('req.edit_request')}</button>
                    {canAdminCancel && <button onClick={() => setModal((m) => ({ ...m, cancelling: true }))} disabled={busy} style={{ background: '#fbecea', color: '#c0392b', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('req.cancel_request')}</button>}
                  </div>
                )}

                {modal.editing ? editForm() : modal.cancelling ? (
                  <div style={{ borderTop: '1px solid #f0f3f5', paddingTop: 16 }}>
                    <div style={{ background: '#fbecea', color: '#c0392b', borderRadius: 10, padding: '12px 15px', fontSize: 13.5, marginBottom: 14 }}>{t('req.confirm_cancel_msg')}</div>
                    <label style={lbl}>{t('req.note_optional_label')}</label>
                    <textarea value={modal.form.admin_note} onChange={(e) => setForm({ admin_note: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                      <button onClick={() => setModal((m) => ({ ...m, cancelling: false }))} disabled={busy} style={{ background: '#f1f3f5', color: '#54616c', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{t('req.no_cancel')}</button>
                      <button onClick={doCancel} disabled={busy} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 26px', fontSize: 14.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{t('req.confirm_cancel_request')}</button>
                    </div>
                  </div>
                ) : modal.rejecting ? (
                  // ป็อปอัปปฏิเสธ — บังคับกรอกเหตุผล (ผู้ขอจะเห็นเหตุผลนี้)
                  <div style={{ borderTop: '1px solid #f0f3f5', paddingTop: 16 }}>
                    <div style={{ background: '#fbecea', color: '#c0392b', borderRadius: 10, padding: '12px 15px', fontSize: 13.5, marginBottom: 14 }}>{t('req.reject_reason_notice')}</div>
                    <label style={lbl}>{t('req.reject_reason_label')} <span style={{ color: '#c0392b' }}>*</span></label>
                    <textarea value={modal.form.admin_note} onChange={(e) => setForm({ admin_note: e.target.value })} placeholder={t('req.reject_reason_placeholder')} rows={3} style={{ ...inp, resize: 'vertical' }} autoFocus />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                      <button onClick={() => setModal((m) => ({ ...m, rejecting: false }))} disabled={busy} style={{ background: '#f1f3f5', color: '#54616c', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{t('common.back')}</button>
                      <button onClick={doReject} disabled={busy} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 26px', fontSize: 14.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{t('req.confirm_reject')}</button>
                    </div>
                  </div>
                ) : pending ? (
                  <div style={{ borderTop: '1px solid #f0f3f5', paddingTop: 18 }}>
                    {isOther && driverPicker()}
                    <label style={lbl}>{t('req.reply_note_label')}</label>
                    <textarea value={modal.form.admin_note} onChange={(e) => setForm({ admin_note: e.target.value })} placeholder={t('req.note_to_requester_placeholder')} rows={2} style={{ ...inp, resize: 'vertical' }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                      <button onClick={() => setModal((m) => ({ ...m, rejecting: true }))} disabled={busy} style={{ background: '#fbecea', color: '#c0392b', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{t('common.reject')}</button>
                      <button onClick={doApprove} disabled={busy || !!driverClash()} style={{ background: '#16855a', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 26px', fontSize: 14.5, fontWeight: 600, cursor: (busy || driverClash()) ? 'not-allowed' : 'pointer', opacity: driverClash() ? 0.55 : 1, fontFamily: 'inherit' }}>{t('common.approve')}</button>
                    </div>
                  </div>
                ) : isCancelReq ? (
                  <div style={{ borderTop: '1px solid #f0f3f5', paddingTop: 18 }}>
                    <div style={{ background: '#fff3e0', border: '1px solid #f0d9b5', borderRadius: 10, padding: '13px 15px', fontSize: 13.5, color: '#8a5a12', marginBottom: 18 }}>
                      {t('req.cancel_req_pre')}<b>{t('req.cancel_req_mid')}</b>{t('req.cancel_req_post')}
                    </div>
                    {driverAssigned(b) && <div style={{ fontSize: 13.5, color: '#6b7884', marginBottom: 14 }}>{t('req.assigned_driver_label')}<b style={{ color: '#0a716e' }}>{driverAssigned(b)}</b></div>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button onClick={() => setModal(null)} disabled={busy} style={{ background: '#f1f3f5', color: '#54616c', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{t('common.close')}</button>
                      <button onClick={doConfirmCancel} disabled={busy} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 26px', fontSize: 14.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{t('req.confirm_cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ borderTop: '1px solid #f0f3f5', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 13, color: '#9aa7b2', fontWeight: 600 }}>{t('req.status_colon')}</span><span style={badge(sb, sc)}>{sl}</span></div>
                    {driverAssigned(b) && <div style={{ fontSize: 13.5, color: '#6b7884' }}>{t('req.assigned_driver_label')}<b style={{ color: '#0a716e' }}>{driverAssigned(b)}</b></div>}
                    {b.status === 'completed' && b.returned_at && <div style={{ fontSize: 13.5, color: '#0a716e' }}>{t('req.returned_at_label')}<b>{thDateTime(b.returned_at)}</b></div>}
                    {b.admin_note && <div style={{ background: '#f6f8f9', borderRadius: 8, padding: '10px 13px', fontSize: 13.5, color: '#54616c' }}>{t('req.note_label')}{b.admin_note}</div>}

                    {/* มอบหมาย/เปลี่ยนคนขับ — เฉพาะคำขอรถอื่น ๆ ที่อนุมัติแล้ว (เติมกรณีอนุมัติแบบยังไม่มอบหมาย) */}
                    {b.status === 'approved' && isOther && (modal.assigning ? (
                      <div style={{ borderTop: '1px solid #f0f3f5', paddingTop: 14 }}>
                        {driverPicker()}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                          <button onClick={() => setModal((m) => ({ ...m, assigning: false }))} disabled={busy} style={{ background: '#f1f3f5', color: '#54616c', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{t('common.cancel')}</button>
                          <button onClick={doAssign} disabled={busy || !!driverClash()} style={{ background: '#16855a', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 26px', fontSize: 14.5, fontWeight: 600, cursor: (busy || driverClash()) ? 'not-allowed' : 'pointer', opacity: driverClash() ? 0.55 : 1, fontFamily: 'inherit' }}>{t('req.save_driver')}</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setModal((m) => ({ ...m, assigning: true }))} style={{ alignSelf: 'flex-start', background: '#e6f3f2', color: '#0a716e', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{driverAssigned(b) ? t('req.change_driver') : t('req.assign_driver')}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {toast && <div style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', background: '#1f2a33', color: '#fff', padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, boxShadow: '0 8px 30px rgba(0,0,0,.2)', zIndex: 200 }}>{toast}</div>}
    </div>
  );
}
