import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react';
import { thDate, thTime, thDateTime, thWeekday } from '../lib/date';
import { getCsrf, setCsrf } from '../lib/csrf';
import { t } from '../lib/i18n';
import { isSafeUrl } from '../lib/url';
import { CloseIcon, CalIcon } from '../lib/icons';
import Alert from '../lib/Alert';
import Pager from '../lib/Pager';
import Table from '../lib/Table';
import { useToast } from '../lib/Toast';
import DonePopup from '../lib/DonePopup';
import { setNavBadge } from '../lib/navBadge';

// normalize เวลา → 'YYYY-MM-DD HH:MM:SS' (รับทั้งจาก DB และ input datetime-local)
const padDt = (s) => { s = String(s || '').replace('T', ' '); return s.length === 16 ? s + ':00' : s; };

// แสดง 3 กลุ่มสถานะฝั่ง Admin: รออนุมัติ / อนุมัติแล้ว / ยกเลิก+ปฏิเสธ (รวมความหมายเดียวกัน)
// ป้ายชื่อกลุ่ม (สีมาจาก class .st-*/.rq-st-* แยกต่างหาก - ดู STATUS_CLASS)
const STATUS_LABEL = {
  pending: t('status.pending'),
  approved: t('status.approved'),
  cancelled: t('status.rejected'),
};
// คลาสสีของแต่ละกลุ่ม - 'pending'/'approved' ตรงกับสถานะจริงในชุดสีกลาง .st-* ใช้ตรง ๆ
// 'cancelled' รวมสถานะจริง 3 ตัว (rejected/cancelled/cancel_requested) เป็นสีเดียว (แดง) ไม่มีในชุดกลาง จึงมี .rq-st-cancelled ของหน้านี้เอง
const STATUS_CLASS = {
  pending: 'st-pending',
  approved: 'st-approved',
  cancelled: 'rq-st-cancelled',
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
const carText = (b) => (b.car_model ? `${b.car_model}${b.car_plate ? ' · ' + b.car_plate : ''}` : (b.booking_type === 'other' ? t('req.provided_by_admin') : '-'));

// ไอคอนบนปุ่ม
const ICO = {
  check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  x: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
};
const driverAssigned = (b) => (b.driver_type === 'company' ? (b.driver_name || t('req.driver_company')) : (b.driver_type === 'external' ? (b.ext_driver_name || t('req.driver_external')) : ''));
// เบอร์โทร: ตัดให้เหลือเฉพาะตัวเลข สูงสุด 10 หลัก (ใช้ตอนพิมพ์)
const onlyDigits10 = (v) => String(v || '').replace(/\D/g, '').slice(0, 10);
// เบอร์โทรคนขับภายนอก: เว้นว่างได้ แต่ถ้ากรอกต้องเป็นตัวเลข 10 หลักพอดี
const extPhoneBad = (f) => {
  const p = String(f.ext_phone || '').trim();
  return p !== '' && !/^\d{10}$/.test(p);
};

// รถอื่นๆ มอบหมายคนขับครบหรือยัง - คืนข้อความเตือน หรือ '' ถ้าครบ (บริษัท=เลือกในลิสต์, ภายนอก=กรอกชื่อ+เบอร์ 10 หลัก)
const driverWarn = (f) => {
  if (f.driver === '') return t('req.warn_pick_driver');
  if (f.driver !== 'external') return '';
  if (!String(f.ext_name || '').trim()) return t('req.warn_ext_name');
  if (extPhoneBad(f)) return t('req.warn_ext_phone');
  return '';
};

// จุดสีนำหน้าตัวเลขสรุปยอดในหัวกลุ่มวันที่ - variant: 'pending' | 'approved' | 'cancelled'
const Dot = ({ variant, children }) => (
  <span className={`rq-dot rq-dot--${variant}`}>
    <span className="rq-dot-bullet" />{children}
  </span>
);

/**
 * จัดการคำขอจองรถ (Admin) - list + filter + modal อนุมัติ/ปฏิเสธ + มอบหมายคนขับ
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
  const [done, setDone] = useState(null);         // ป็อปอัปแจ้งผลสำเร็จ {title, sub}
  const { showToast, ToastView } = useToast();
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
      .then((d) => {
        const list = d.bookings || [];
        setRows(list); setDrivers(d.drivers || []); setCars(d.cars || []);
        // sync badge "งานค้าง" บน sidebar ให้ตรงกับข้อมูลล่าสุด (นับเหมือน admin_nav_badges())
        setNavBadge('requests', list.filter((b) => b.status === 'pending' || b.status === 'cancel_requested').length);
      })
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

  // กลับมาที่แท็บนี้ -> ดึงข้อมูลใหม่ ให้เห็นสิ่งที่คนอื่นทำระหว่างที่ไม่ได้ดู
  // ข้ามถ้ามีโมดัลเปิดอยู่ (กันข้อมูลใต้มือเปลี่ยนระหว่างกรอก)
  useEffect(() => {
    const onVisible = () => { if (!document.hidden && !modal) load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load, modal]);

  // doneMsg = {title, sub} -> ทำรายการสำเร็จแล้วขึ้นป็อปอัปแจ้งผล 1.5 วินาที (แทน toast)
  const post = async (url, body, doneMsg = null) => {
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
      if (d.ok) {
        load();   // ดึงรายการใหม่ทันที สถานะของคำขอบนหน้าจอจะอัปเดตตาม
        if (doneMsg) {
          setDone(doneMsg);
          setTimeout(() => setDone(null), 1500);
        } else {
          showToast(d.message || t('common.success'));
        }
        return true;
      }
      // คนอื่นเปลี่ยนสถานะข้อมูลนี้ไปแล้ว -> ปิดโมดัล ดึงข้อมูลใหม่ แล้วบอกด้วย toast
      // (ไม่ค้างกล่องแดงในโมดัล เพราะกดซ้ำก็ไม่มีทางสำเร็จจนกว่าจะเห็นข้อมูลใหม่)
      if (d.conflict) {
        setModal(null);
        load();
        showToast(`${d.message} - ${t('common.conflict_refreshed')}`);
        return false;
      }
      // ข้อผิดพลาดจากการกรอกข้อมูล → กล่องแดงค้างในโมดัล ให้ผู้ใช้แก้ต่อได้ (ไม่ปิดโมดัล)
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

  // จัดกลุ่มตามวัน (start_at) + นับสถานะ - เฉพาะรายการในหน้าปัจจุบัน
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
    if (await post(endpoints.approve, body, { title: t('req.done_approved'), sub: b.booking_code })) setModal(null);
  };
  const doReject = async () => {
    // บังคับกรอกเหตุผลการปฏิเสธ (ห้ามเว้นว่าง)
    const note = String(modal.form.admin_note || '').trim();
    if (!note) return showToast(t('req.warn_reject_reason'));
    if (await post(endpoints.reject, { id: modal.booking.id, admin_note: note }, { title: t('req.done_rejected'), sub: modal.booking.booking_code })) setModal(null);
  };
  // ยืนยันการยกเลิก (คำขอที่ User ขอยกเลิก)
  const doConfirmCancel = async () => {
    if (await post(endpoints.confirmCancel, { id: modal.booking.id }, { title: t('req.done_cancel_confirmed'), sub: modal.booking.booking_code })) setModal(null);
  };
  // มอบหมาย/เปลี่ยนคนขับ ให้คำขอที่อนุมัติแล้ว (รถอื่น ๆ) - เติมกรณีอนุมัติแบบยังไม่มอบหมาย
  const doAssign = async () => {
    const f = modal.form;
    // เปลี่ยน/มอบหมายคนขับ ต้องเลือกคนขับเสมอ (ถอดคนขับออกไม่ได้) + กันคนขับซ้อนเวลา
    const w = driverWarn(f); if (w) return showToast(w);
    if (driverClash()) return showToast(t('req.driver_clash'));
    const body = { id: modal.booking.id, driver: f.driver, ext_name: f.ext_name, ext_phone: f.ext_phone, ext_seats: f.ext_seats, ext_vehicle: f.ext_vehicle };
    if (await post(endpoints.assign, body, { title: t('req.done_assigned'), sub: modal.booking.booking_code })) setModal(null);
  };

  // Admin ยกเลิกคำขอ (ทุกคำขอที่ยัง active - ปล่อยรถคืน)
  const doCancel = async () => {
    if (await post(endpoints.cancel, { id: modal.booking.id, admin_note: modal.form.admin_note }, { title: t('req.done_cancelled'), sub: modal.booking.booking_code })) setModal(null);
  };
  // Admin บันทึกการแก้ไขคำขอ
  const doUpdate = async () => {
    const b = modal.booking; const f = modal.form;
    // รถอื่นๆ ที่อนุมัติแล้ว ห้ามถอดคนขับ - ต้องเลือกคนขับ (คำขอ pending ยังเว้นได้ ค่อยมอบตอนอนุมัติ)
    if (b.booking_type === 'other' && b.status !== 'pending') { const w = driverWarn(f); if (w) return showToast(w); }
    // กันคนขับซ้อนเวลา (รถอื่นๆ ที่เลือกคนขับบริษัท)
    if (b.booking_type === 'other' && driverClash()) return showToast(t('req.driver_clash'));
    const body = { id: b.id, location: f.location, start_at: f.start_at, end_at: f.end_at, people: f.people, purpose: f.purpose, map_link: f.map_link };
    if (b.booking_type === 'self') body.car_id = f.car_id;
    else { body.driver = f.driver; body.ext_name = f.ext_name; body.ext_phone = f.ext_phone; body.ext_seats = f.ext_seats; body.ext_vehicle = f.ext_vehicle; }
    if (await post(endpoints.update, body, { title: t('req.done_updated'), sub: b.booking_code })) setModal(null);
  };
  // เข้าโหมดแก้ไข - เติมค่าปัจจุบันของคำขอลงฟอร์ม
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

  // ฟอร์มแก้ไขคำขอ - รายละเอียดเดินทาง + รถ(self) / คนขับ(other)
  const editForm = () => {
    const isOther = modal.booking.booking_type === 'other';
    return (
      <div className="rq-modal-section">
        <label className="form-label">{t('req.location_label')}</label>
        <input value={modal.form.location} onChange={(e) => setForm({ location: e.target.value })} className="form-input form-input--sm rq-field-gap" />
        <div className="rq-form-grid">
          <div><label className="form-label">{t('req.start_label')}</label><input type="datetime-local" value={modal.form.start_at} onChange={(e) => setForm({ start_at: e.target.value })} className="form-input form-input--sm" /></div>
          <div><label className="form-label">{t('req.end_label')}</label><input type="datetime-local" value={modal.form.end_at} onChange={(e) => setForm({ end_at: e.target.value })} className="form-input form-input--sm" /></div>
        </div>
        <div className="rq-form-grid">
          <div><label className="form-label">{t('req.people_label')}</label><input type="number" min="1" value={modal.form.people} onChange={(e) => setForm({ people: e.target.value })} className="form-input form-input--sm" /></div>
          <div><label className="form-label">{t('req.map_label')}</label><input value={modal.form.map_link} maxLength={500} onChange={(e) => setForm({ map_link: e.target.value })} placeholder={t('req.map_placeholder')} className="form-input form-input--sm" /></div>
        </div>
        <label className="form-label">{t('req.purpose_label')}</label>
        <textarea value={modal.form.purpose} onChange={(e) => setForm({ purpose: e.target.value })} rows={2} className="form-input form-input--sm rq-textarea rq-field-gap" />
        {isOther ? driverPicker() : (
          <>
            <label className="form-label">{t('req.car_self_label')}</label>
            <select value={modal.form.car_id} onChange={(e) => setForm({ car_id: e.target.value })} className="form-input form-input--sm rq-select">
              {cars.map((c) => <option key={c.id} value={c.id}>{c.model}{c.plate ? ` - ${c.plate}` : ''} ({t('req.seats_count', { n: c.seats })})</option>)}
            </select>
          </>
        )}
        <div className="rq-modal-actions rq-modal-actions--mt18">
          <button onClick={() => setModal((m) => ({ ...m, editing: false }))} disabled={busy} className="rq-modal-btn rq-modal-btn--gray">{t('req.cancel_edit')}</button>
          <button onClick={doUpdate} disabled={busy || !!driverClash()} className={`rq-modal-btn rq-modal-btn--save ${driverClash() ? 'rq-modal-btn--clash' : ''}`}>{t('common.save')}</button>
        </div>
      </div>
    );
  };

  // คนขับบริษัทที่เลือกมีงานซ้อนช่วงเวลาของคำขอนี้ไหม - คืนงานที่ชน {id,code,...} หรือ null
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

  // UI เลือกคนขับ (ใช้ซ้ำทั้งตอนอนุมัติ และตอนมอบหมายภายหลัง) - คนขับบริษัท/ภายนอก
  const driverPicker = () => {
    const isExternal = modal.form.driver === 'external';
    const selDriver = drivers.find((d) => String(d.id) === String(modal.form.driver));
    return (
      <>
        <label className="form-label">{t('req.pick_driver_label')}</label>
        <select value={modal.form.driver} onChange={(e) => pickDriver(e.target.value)} className="form-input form-input--sm rq-select rq-field-gap-lg">
          <option value="">{t('req.not_assigned_option')}</option>
          {drivers.map((d) => <option key={d.id} value={d.id}>{d.name || t('req.driver_hash', { n: d.id })}</option>)}
          <option value="external">{t('req.external_driver_option')}</option>
        </select>

        {/* เตือนคนขับซ้อนเวลา - กล่องแดงเต็มความกว้าง ค้างไว้จนกว่าจะเปลี่ยนคนขับ */}
        {(() => { const c = driverClash(); return c ? <div className="rq-alert-gap"><Alert>{t('req.driver_clash_code', { code: c.code })}</Alert></div> : null; })()}

        {/* คนขับบริษัท: pre-fill เบอร์โทร/รถ/ที่นั่งจากคนขับ แล้วแก้ไขได้ (เฉพาะคำขอนี้) */}
        {selDriver && (
          <div className="rq-driver-box rq-driver-box--company">
            <div className="rq-driver-box-title">{t('req.driver_car_info')}</div>
            <div className="rq-driver-box-row">
              <div className="detail-label">{t('req.driver_name_label')}</div>
              <div className="rq-detail-value">{selDriver.name || '-'}</div>
            </div>
            <div className="rq-driver-grid">
              <div><label className="form-label">{t('req.phone_label')}</label><input value={modal.form.ext_phone} onChange={(e) => setForm({ ext_phone: onlyDigits10(e.target.value) })} inputMode="numeric" maxLength={10} className="form-input form-input--sm" /></div>
              <div><label className="form-label">{t('req.seats_label')}</label><input type="number" min="0" value={modal.form.ext_seats} onChange={(e) => setForm({ ext_seats: e.target.value })} className="form-input form-input--sm" /></div>
              <div className="rq-grid-full"><label className="form-label">{t('req.vehicle_used_label')}</label><input value={modal.form.ext_vehicle} onChange={(e) => setForm({ ext_vehicle: e.target.value })} placeholder={t('req.vehicle_example_placeholder')} className="form-input form-input--sm" /></div>
            </div>
            <div className="rq-driver-box-note">{t('req.edit_note_driver')}</div>
          </div>
        )}

        {/* คนขับภายนอก: กรอกเอง */}
        {isExternal && (
          <>
            <label className="form-label">{t('req.ext_driver_name_label')} <span className="rq-required">*</span></label>
            <input value={modal.form.ext_name} onChange={(e) => setForm({ ext_name: e.target.value })} placeholder={t('req.name_surname_placeholder')} className="form-input form-input--sm rq-field-gap-lg" />
            <div className="rq-driver-box rq-driver-box--external">
              <div className="rq-driver-box-title">{t('req.driver_car_info')}</div>
              <div className="rq-driver-grid">
                <div><label className="form-label">{t('req.phone_label')}</label><input value={modal.form.ext_phone} onChange={(e) => setForm({ ext_phone: onlyDigits10(e.target.value) })} inputMode="numeric" maxLength={10} className="form-input form-input--sm" /></div>
                <div><label className="form-label">{t('req.seats_label')}</label><input type="number" min="0" value={modal.form.ext_seats} onChange={(e) => setForm({ ext_seats: e.target.value })} className="form-input form-input--sm" /></div>
                <div className="rq-grid-full"><label className="form-label">{t('req.vehicle_used_label')}</label><input value={modal.form.ext_vehicle} onChange={(e) => setForm({ ext_vehicle: e.target.value })} placeholder={t('req.vehicle_example_placeholder')} className="form-input form-input--sm" /></div>
              </div>
            </div>
          </>
        )}
      </>
    );
  };

  // ป้ายสถานะ = 1 ใน 3 กลุ่มที่แสดง (label + ชื่อคลาสสี)
  const rowStat = (b) => { const g = groupOf(b.status); return { label: STATUS_LABEL[g], cls: STATUS_CLASS[g] }; };

  return (
    <div>
      {loadErr && (
        <div className="alert-error rq-alert">
          {t('common.load_err')}
        </div>
      )}
      {/* ฟิลเตอร์ */}
      <div className="filter-card">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('req.search_placeholder')} className="form-input form-input--sm rq-input-search" />
        <select value={fType} onChange={(e) => setFType(e.target.value)} className="form-input form-input--sm rq-filter-select">
          <option value="all">{t('req.all_types')}</option><option value="self">{t('req.car_self')}</option><option value="other">{t('req.car_other')}</option>
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="form-input form-input--sm rq-filter-select">
          <option value="all">{t('req.all_statuses')}</option><option value="pending">{t('status.pending')}</option><option value="approved">{t('status.approved')}</option><option value="cancelled">{t('status.rejected')}</option>
        </select>
        {/* กรองตามวันที่ใช้รถ (เฉพาะวันที่ต้องการ) */}
        <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} title={t('req.date_filter_title')} className="form-input form-input--sm rq-filter-select" />
        {fDate && (
          <button onClick={() => setFDate('')} title={t('req.clear_date')} className="form-input form-input--sm rq-filter-select rq-clear-date">{t('req.clear_date')}</button>
        )}
      </div>

      {loading && <div className="rq-loading">{t('common.loading')}</div>}
      {!loading && filtered.length === 0 && <div className="empty-card rq-empty">{t('req.not_found')}</div>}

      {/* จัดกลุ่มตามวัน */}
      {!loading && filtered.length > 0 && (narrow ? (
        /* มือถือ/แท็บเล็ต: การ์ดจัดกลุ่มตามวัน */
        <div className="rq-groups">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="rq-day-badge">
                <span className="rq-day-label">{CalIcon}{thDate(g.key)} {thWeekday(g.key)}</span>
                <div className="rq-day-counts">
                  <span>{t('req.total', { n: g.rows.length })}</span>
                  <Dot variant="pending">{t('req.count_pending', { n: g.pend })}</Dot>
                  <Dot variant="approved">{t('req.count_appr', { n: g.appr })}</Dot>
                  <Dot variant="cancelled">{t('req.count_rej', { n: g.canc })}</Dot>
                </div>
              </div>
              <div className="rq-cards">
                {g.rows.map((b) => { const { label, cls } = rowStat(b); const highlight = b.status === 'pending' || b.status === 'cancel_requested'; return (
                  <div key={b.id} className={`rq-card ${cls} ${highlight ? 'rq-card--highlight' : ''}`}>
                    <div onClick={() => openDetail(b)} className="rq-card-body">
                      <div className="rq-card-head">
                        <div className="rq-card-id"><span className="rq-card-code">{b.booking_code}</span> <span className="rq-card-requester">{b.requester_name || '-'}</span></div>
                        <span className={`pill pill--sm rq-badge ${cls}`}>{label}</span>
                      </div>
                      <div className="rq-card-car">{carText(b)}</div>
                      <div className="rq-card-meta">
                        <div>{b.location} · {t('req.people', { n: b.people })}</div>
                        <div>{(() => { const [l1, l2] = rangeLines(b.start_at, b.end_at); return `${l1} ${l2}`; })()}</div>
                      </div>
                    </div>
                    {b.status === 'pending' && (
                      <div className="rq-card-actions">
                        <button onClick={() => openDetail(b)} className="rq-mini-btn rq-mini-btn--success">{t('common.approve')}</button>
                        <button onClick={() => openDetail(b, 'reject')} className="rq-mini-btn rq-mini-btn--danger">{t('common.reject')}</button>
                      </div>
                    )}
                    {b.status === 'cancel_requested' && (
                      <div className="rq-card-actions">
                        <button onClick={() => openDetail(b)} className="rq-mini-btn rq-mini-btn--warn">{t('req.confirm_cancel')}</button>
                      </div>
                    )}
                  </div>
                ); })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* เดสก์ท็อป: ตารางจริง + แถวคั่นวันที่ (colSpan เต็มความกว้าง) */
        <div className="rq-table-wrap">
          <Table center>
            <thead>
              <tr>
                <th>{t('req.col_code_requester')}</th>
                <th>{t('req.col_car_plate')}</th>
                <th>{t('req.col_location_people')}</th>
                <th>{t('req.col_time_range')}</th>
                <th>{t('req.col_status')}</th>
                <th>{t('req.col_manage')}</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <Fragment key={g.key}>
                  {/* แถบวันที่ + สรุปยอด */}
                  <tr>
                    <td colSpan={6} className="rq-group-cell">
                      <div className="rq-group-inner">
                        <div className="rq-group-label">{CalIcon}{thDate(g.key)} {thWeekday(g.key)}</div>
                        <div className="rq-group-counts">
                          <span>{t('req.total', { n: g.rows.length })}</span>
                          <span className="rq-dot-sep">·</span><Dot variant="pending">{t('req.count_pending', { n: g.pend })}</Dot>
                          <span className="rq-dot-sep">·</span><Dot variant="approved">{t('req.count_appr', { n: g.appr })}</Dot>
                          <span className="rq-dot-sep">·</span><Dot variant="cancelled">{t('req.count_rej', { n: g.canc })}</Dot>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {/* แถวคำขอ */}
                  {g.rows.map((b) => { const { label, cls } = rowStat(b); const highlight = b.status === 'pending' || b.status === 'cancel_requested'; return (
                    <tr key={b.id} onClick={() => openDetail(b)} className={`rq-row ${cls} ${highlight ? 'rq-row--highlight' : ''}`}>
                      <td><div className="rq-td-code">{b.booking_code}</div><div className="rq-td-requester">{b.requester_name || '-'}</div></td>
                      <td><div className="rq-td-carmodel">{b.car_model || (b.booking_type === 'other' ? t('req.provided_by_admin') : '-')}</div><div className="rq-td-carplate">{b.car_plate || ' '}</div></td>
                      <td><div className="rq-td-loc">{b.location}</div><div className="rq-td-people">{t('req.people_count', { n: b.people })}</div></td>
                      <td className="rq-td-time">{(() => { const [l1, l2] = rangeLines(b.start_at, b.end_at); return (<><div>{l1}</div><div>{l2}</div></>); })()}</td>
                      <td><span className={`pill pill--sm rq-badge ${cls}`}>{label}</span></td>
                      <td>
                        <div className="rq-td-actions">
                          {b.status === 'pending' && (<>
                            <button onClick={(e) => { e.stopPropagation(); openDetail(b); }} className="rq-btn-solid rq-btn-solid--approve">{ICO.check}{t('common.approve')}</button>
                            <button onClick={(e) => { e.stopPropagation(); openDetail(b, 'reject'); }} className="rq-btn-solid rq-btn-solid--reject">{ICO.x}{t('common.reject')}</button>
                          </>)}
                          {b.status === 'cancel_requested' && (
                            <button onClick={(e) => { e.stopPropagation(); openDetail(b); }} className="rq-btn-solid rq-btn-solid--confirm-cancel">{t('req.confirm_cancel_short')}</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ); })}
                </Fragment>
              ))}
            </tbody>
          </Table>
        </div>
      ))}

      {/* แบ่งหน้า (pagination) - ใต้ตาราง ทำงานกับผลลัพธ์หลังกรอง */}
      {!loading && sorted.length > 0 && (
        <Pager page={curPage} totalPages={totalPages} total={sorted.length} perPage={PER_PAGE} onPage={(n) => setPage(Math.max(1, Math.min(n, totalPages)))} />
      )}

      {/* โมดัลรายละเอียด */}
      {modal && (() => {
        const b = modal.booking; const { label: sl, cls: sc } = rowStat(b);
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
          <div onClick={() => setModal(null)} className="icar-drawer-backdrop">
            <div onClick={(e) => e.stopPropagation()} className="icar-drawer">
              <div className="modal-head">
                <h3 className="modal-title">{t('req.detail_title', { code: b.booking_code })}</h3>
                <button onClick={() => setModal(null)} className="modal-close">{CloseIcon}</button>
              </div>
              <div className="rq-drawer-body">
                {modalErr && <div className="rq-alert-gap"><Alert>{modalErr}</Alert></div>}
                <div className="rq-detail-grid">
                  {fields.map(([k, v]) => <div key={k}><div className="detail-label">{k}</div><div className="rq-detail-value">{v}</div></div>)}
                </div>
                {b.map_link && (isSafeUrl(b.map_link)
                  ? <a href={b.map_link} target="_blank" rel="noopener" className="rq-map-link">{t('req.open_in_maps')}</a>
                  : <span className="rq-map-link rq-map-link--invalid">{t('req.invalid_map_link')}</span>)}

                {/* แถบเครื่องมือ Admin: แก้ไข/ยกเลิก คำขอที่ยัง active */}
                {isActive && !modal.editing && !modal.cancelling && !modal.rejecting && (
                  <div className="rq-toolbar-row">
                    <button onClick={enterEdit} disabled={busy} className="rq-toolbar-btn rq-toolbar-btn--edit">{t('req.edit_request')}</button>
                    {canAdminCancel && <button onClick={() => setModal((m) => ({ ...m, cancelling: true }))} disabled={busy} className="rq-toolbar-btn rq-toolbar-btn--cancel">{t('req.cancel_request')}</button>}
                  </div>
                )}

                {modal.editing ? editForm() : modal.cancelling ? (
                  <div className="rq-modal-section">
                    <div className="rq-notice rq-notice--danger">{t('req.confirm_cancel_msg')}</div>
                    <label className="form-label">{t('req.note_optional_label')}</label>
                    <textarea value={modal.form.admin_note} onChange={(e) => setForm({ admin_note: e.target.value })} rows={2} className="form-input form-input--sm rq-textarea" />
                    <div className="rq-modal-actions rq-modal-actions--mt14">
                      <button onClick={() => setModal((m) => ({ ...m, cancelling: false }))} disabled={busy} className="rq-modal-btn rq-modal-btn--gray">{t('req.no_cancel')}</button>
                      <button onClick={doCancel} disabled={busy} className="rq-modal-btn rq-modal-btn--danger-solid">{t('req.confirm_cancel_request')}</button>
                    </div>
                  </div>
                ) : modal.rejecting ? (
                  // ป็อปอัปปฏิเสธ - บังคับกรอกเหตุผล (ผู้ขอจะเห็นเหตุผลนี้)
                  <div className="rq-modal-section">
                    <div className="rq-notice rq-notice--danger">{t('req.reject_reason_notice')}</div>
                    <label className="form-label">{t('req.reject_reason_label')} <span className="rq-required">*</span></label>
                    <textarea value={modal.form.admin_note} onChange={(e) => setForm({ admin_note: e.target.value })} placeholder={t('req.reject_reason_placeholder')} rows={3} className="form-input form-input--sm rq-textarea" autoFocus />
                    <div className="rq-modal-actions rq-modal-actions--mt14">
                      <button onClick={() => setModal((m) => ({ ...m, rejecting: false }))} disabled={busy} className="rq-modal-btn rq-modal-btn--gray">{t('common.back')}</button>
                      <button onClick={doReject} disabled={busy} className="rq-modal-btn rq-modal-btn--danger-solid">{t('req.confirm_reject')}</button>
                    </div>
                  </div>
                ) : pending ? (
                  <div className="rq-modal-section rq-modal-section--lg">
                    {isOther && driverPicker()}
                    <label className="form-label">{t('req.reply_note_label')}</label>
                    <textarea value={modal.form.admin_note} onChange={(e) => setForm({ admin_note: e.target.value })} placeholder={t('req.note_to_requester_placeholder')} rows={2} className="form-input form-input--sm rq-textarea" />
                    <div className="rq-modal-actions rq-modal-actions--mt20">
                      <button onClick={() => setModal((m) => ({ ...m, rejecting: true }))} disabled={busy} className="rq-modal-btn rq-modal-btn--reject-soft">{t('common.reject')}</button>
                      <button onClick={doApprove} disabled={busy || !!driverClash()} className={`rq-modal-btn rq-modal-btn--approve ${driverClash() ? 'rq-modal-btn--clash' : ''}`}>{t('common.approve')}</button>
                    </div>
                  </div>
                ) : isCancelReq ? (
                  <div className="rq-modal-section rq-modal-section--lg">
                    <div className="rq-notice rq-notice--warn">
                      {t('req.cancel_req_pre')}<b>{t('req.cancel_req_mid')}</b>{t('req.cancel_req_post')}
                    </div>
                    {driverAssigned(b) && <div className="rq-assigned-note rq-assigned-note--gap">{t('req.assigned_driver_label')}<b>{driverAssigned(b)}</b></div>}
                    <div className="rq-modal-actions">
                      <button onClick={() => setModal(null)} disabled={busy} className="rq-modal-btn rq-modal-btn--gray">{t('common.close')}</button>
                      <button onClick={doConfirmCancel} disabled={busy} className="rq-modal-btn rq-modal-btn--danger-solid">{t('req.confirm_cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="rq-modal-section rq-modal-section--col">
                    <div className="rq-status-row"><span className="rq-status-row-label">{t('req.status_colon')}</span><span className={`pill pill--sm rq-badge ${sc}`}>{sl}</span></div>
                    {driverAssigned(b) && <div className="rq-assigned-note">{t('req.assigned_driver_label')}<b>{driverAssigned(b)}</b></div>}
                    {b.status === 'completed' && b.returned_at && <div className="rq-returned-note">{t('req.returned_at_label')}<b>{thDateTime(b.returned_at)}</b></div>}
                    {b.admin_note && <div className="rq-admin-note">{t('req.note_label')}{b.admin_note}</div>}

                    {/* มอบหมาย/เปลี่ยนคนขับ - เฉพาะคำขอรถอื่น ๆ ที่อนุมัติแล้ว (เติมกรณีอนุมัติแบบยังไม่มอบหมาย) */}
                    {b.status === 'approved' && isOther && (modal.assigning ? (
                      <div className="rq-modal-section rq-modal-section--assign">
                        {driverPicker()}
                        <div className="rq-modal-actions rq-modal-actions--mt6">
                          <button onClick={() => setModal((m) => ({ ...m, assigning: false }))} disabled={busy} className="rq-modal-btn rq-modal-btn--gray">{t('common.cancel')}</button>
                          <button onClick={doAssign} disabled={busy || !!driverClash()} className={`rq-modal-btn rq-modal-btn--approve ${driverClash() ? 'rq-modal-btn--clash' : ''}`}>{t('req.save_driver')}</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setModal((m) => ({ ...m, assigning: true }))} className="rq-assign-btn">{driverAssigned(b) ? t('req.change_driver') : t('req.assign_driver')}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ป็อปอัปแจ้งผลหลังทำรายการ - โชว์ 1.5 วินาทีแล้วหายเอง (รายการอัปเดตสถานะให้แล้ว) */}
      {done && <DonePopup title={done.title} sub={done.sub} />}

      <ToastView />
    </div>
  );
}
