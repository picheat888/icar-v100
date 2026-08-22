import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react';
import { fmtDate, fmtDateTime, weekdayName, todayStr, rangeLines, dateTimeRange } from '../lib/date';
import { getCsrf, setCsrf } from '../lib/csrf';
import { t } from '../lib/i18n';
import { isSafeUrl } from '../lib/url';
import { CloseIcon, CalIcon } from '../lib/icons';
import Icon from '../lib/Icon';
import Spinner from '../lib/Spinner';
import Alert from '../lib/Alert';
import Pager from '../lib/Pager';
import Table from '../lib/Table';
import { SkelRows, SkelCards } from '../lib/Skeleton';
import { useToast } from '../lib/Toast';
import DonePopup from '../lib/DonePopup';
import { setNavBadge } from '../lib/navBadge';
import { STATUS_LABEL as REAL_STATUS, ST_CLASS } from '../lib/status';

// normalize เวลา → 'YYYY-MM-DD HH:MM:SS' (รับทั้งจาก DB และ input datetime-local)
const padDt = (s) => { s = String(s || '').replace('T', ' '); return s.length === 16 ? s + ':00' : s; };

// แสดง 3 กลุ่มสถานะฝั่ง Admin: รออนุมัติ / อนุมัติแล้ว / ยกเลิก+ปฏิเสธ (รวมความหมายเดียวกัน)
// ป้ายชื่อกลุ่ม (สีอยู่ที่ STATUS_CLASS)
const STATUS_LABEL = {
  pending: t('status.pending'),
  approved: t('status.approved'),
  cancelled: t('status.rejected'),
};
// คลาสสีของแต่ละกลุ่ม - 'cancelled' รวม rejected/cancelled/cancel_requested เป็นสีแดงสีเดียว
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
// ไอคอนปุ่มในลิ้นชัก: check = ทำจริง · cancel = ปฏิเสธ/ยกเลิก · arrow-left = ถอยกลับ · close = ปิด
const bIcon = (name) => <Icon name={name} size={16} className="rq-btn-ico" strokeWidth={2.4} />;

const typeLabel = (bt) => (bt === 'other' ? t('req.car_other') : t('req.car_self'));
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

  // เรียงคำขอทั้งหมด: วันเดินทางที่ยังไม่ผ่านขึ้นก่อน (ใกล้ถึง → ไกล) แล้วต่อด้วยวันที่ผ่านมาแล้ว
  // (ล่าสุด → เก่า) → ในวันเดียวกันเรียงคำขอล่าสุด (created_at) ก่อน
  const sorted = useMemo(() => {
    const today = todayStr();
    return [...filtered].sort((a, b) => {
      const da = (a.start_at || '').slice(0, 10);
      const db = (b.start_at || '').slice(0, 10);
      if (da !== db) {
        const pa = da < today;
        const pb = db < today;
        if (pa !== pb) return pa ? 1 : -1;
        return pa ? db.localeCompare(da) : da.localeCompare(db);
      }
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
  // past = วันเดินทางผ่านมาแล้ว (ติดป้ายกำกับบนแถบวันที่)
  const groups = useMemo(() => {
    const today = todayStr();
    const map = [];
    pageRows.forEach((b) => {
      const key = (b.start_at || '').slice(0, 10);
      let g = map.find((x) => x.key === key);
      if (!g) { g = { key, rows: [], pend: 0, appr: 0, canc: 0, past: key !== '' && key < today }; map.push(g); }
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
  // มาจากลิงก์ ?open=BK-xxxx (เช่นจาก dashboard) -> เปิดคำขอนั้นเลย ไม่ต้องไล่หาในรายการ
  const openedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current || loading || rows.length === 0) return;
    const code = new URLSearchParams(window.location.search).get('open');
    if (! code) return;
    openedRef.current = true;
    // ล้าง query ออกจาก URL กันรีเฟรชแล้วเด้งโมดัลซ้ำ
    window.history.replaceState({}, '', window.location.pathname);
    const found = rows.find((b) => b.booking_code === code);
    if (found) {
      openDetail(found);
    } else {
      showToast(t('req.open_not_found', { code }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, rows]);

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
  // ฟอร์มของ Admin - จัดสรรรถ/คนขับเท่านั้น · รายละเอียดการเดินทางผู้ขอแก้เองที่ "คำขอของฉัน"
  const editForm = () => {
    const isOther = modal.booking.booking_type === 'other';
    return (
      <div className="rq-modal-section">
        <div className="rq-notice rq-notice--info">{t('req.admin_edit_scope')}</div>
        {isOther ? driverPicker() : (
          <>
            <label className="form-label">{t('req.car_self_label')}</label>
            <select value={modal.form.car_id} onChange={(e) => setForm({ car_id: e.target.value })} className="form-input form-input--sm form-select rq-select">
              {cars.map((c) => <option key={c.id} value={c.id}>{c.model}{c.plate ? ` - ${c.plate}` : ''} ({t('req.seats_count', { n: c.seats })})</option>)}
            </select>
          </>
        )}
        <div className="rq-modal-actions rq-modal-actions--mt18">
          <button onClick={() => setModal((m) => ({ ...m, editing: false }))} disabled={busy} className="rq-modal-btn rq-modal-btn--gray">{bIcon('arrow-left')}{t('common.cancel')}</button>
          <button onClick={doUpdate} disabled={busy || !!driverClash()} className={`rq-modal-btn rq-modal-btn--save ${driverClash() ? 'rq-modal-btn--clash' : ''}`}>{busy ? <Spinner /> : bIcon('check')}{t('common.save')}</button>
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
        <select value={modal.form.driver} onChange={(e) => pickDriver(e.target.value)} className="form-input form-input--sm form-select rq-select rq-field-gap-lg">
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

  // หัวตารางเดสก์ท็อป - ใช้ทั้งตอนโหลด (โครงร่าง) และตอนมีข้อมูลจริง
  const tableHead = (
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
  );

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
        <select value={fType} onChange={(e) => setFType(e.target.value)} className="form-input form-input--sm form-select rq-filter-select">
          <option value="all">{t('req.all_types')}</option><option value="self">{t('req.car_self')}</option><option value="other">{t('req.car_other')}</option>
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="form-input form-input--sm form-select rq-filter-select">
          <option value="all">{t('req.all_statuses')}</option><option value="pending">{t('status.pending')}</option><option value="approved">{t('status.approved')}</option><option value="cancelled">{t('status.rejected')}</option>
        </select>
        {/* กรองตามวันที่ใช้รถ (เฉพาะวันที่ต้องการ) */}
        <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} title={t('req.date_filter_title')} className="form-input form-input--sm rq-filter-select" />
        {fDate && (
          <button onClick={() => setFDate('')} title={t('req.clear_date')} className="form-input form-input--sm rq-filter-select rq-clear-date">{t('req.clear_date')}</button>
        )}
      </div>

      {/* ระหว่างโหลด: โครงร่างรูปทรงเดียวกับของจริง (การ์ดบนจอแคบ / ตารางบนเดสก์ท็อป) */}
      {loading && (narrow
        ? <SkelCards className="rq-cards" count={4} lines={3} />
        : <div className="rq-table-wrap"><Table center>{tableHead}<SkelRows cols={6} /></Table></div>)}
      {!loading && filtered.length === 0 && <div className="empty-card rq-empty">{t('req.not_found')}</div>}

      {/* จัดกลุ่มตามวัน */}
      {!loading && filtered.length > 0 && (narrow ? (
        /* มือถือ/แท็บเล็ต: การ์ดจัดกลุ่มตามวัน */
        <div className="rq-groups">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="rq-day-badge">
                <span className="rq-day-label">{CalIcon}{fmtDate(g.key)} {weekdayName(g.key)}
                  {g.past && <span className="rq-day-past">{t('req.past')}</span>}
                </span>
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
            {tableHead}
            <tbody>
              {groups.map((g) => (
                <Fragment key={g.key}>
                  {/* แถบวันที่ + สรุปยอด */}
                  <tr>
                    <td colSpan={6} className="rq-group-cell">
                      <div className="rq-group-inner">
                        <div className="rq-group-label">{CalIcon}{fmtDate(g.key)} {weekdayName(g.key)}
                          {g.past && <span className="rq-day-past">{t('req.past')}</span>}
                        </div>
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
        const isApproved = b.status === 'approved';
        const isActive = pending || isCancelReq || isApproved;   // แก้ไขคำขอได้
        // ยกเลิกการจอง = เฉพาะงานที่อนุมัติแล้ว · pending ใช้ "ปฏิเสธ" · cancel_requested ใช้ "ยืนยันการยกเลิก"
        const canAdminCancel = isApproved;
        const inMode = modal.editing || modal.cancelling || modal.rejecting;
        return (
          <div onClick={() => setModal(null)} className="rq-focus-backdrop">
            <div onClick={(e) => e.stopPropagation()} className="rq-focus-panel" role="dialog" aria-label={t('req.detail_title', { code: b.booking_code })}>

              {/* หัว: รหัสคำขอ + สถานะ */}
              <div className="rq-focus-head">
                <div className="rq-focus-head-main">
                  <h3 className="rq-focus-code">{b.booking_code}</h3>
                  <span className="rq-focus-kind">{typeLabel(b.booking_type)}</span>
                </div>
                <span className={`pill pill--sm rq-badge ${ST_CLASS[b.status] || sc}`}>{REAL_STATUS[b.status] || sl}</span>
                <button onClick={() => setModal(null)} className="modal-close rq-focus-x" aria-label={t('common.close')}>{CloseIcon}</button>
              </div>

              {modalErr && <div className="rq-focus-err"><Alert>{modalErr}</Alert></div>}

              {modal.editing ? (
                <div className="rq-focus-edit">{editForm()}</div>
              ) : (
                <div className="rq-focus-cols">

                  {/* ===== ซ้าย: ข้อมูลที่ผู้ขอส่งมา (อ่านอย่างเดียว) ===== */}
                  <div className="rq-focus-col rq-focus-col--request">
                    <div className="rq-focus-colhead">
                      <span className="rq-focus-coltitle">{t('req.sec_request')}</span>
                    </div>

                    <div className="rq-focus-sec">
                      <div className="rq-focus-sectitle">{t('req.sec_requester')}</div>
                      <div className="rq-focus-value">{b.requester_name || '-'}</div>
                      <div className="rq-focus-sub">{b.dept_name || '-'}</div>
                    </div>

                    <div className="rq-focus-sec">
                      <div className="rq-focus-sectitle">{t('req.sec_trip')}</div>
                      <div className="rq-focus-field">
                        <div className="detail-label">{t('req.col_time_range')}</div>
                        <div className="rq-focus-value">{dateTimeRange(b.start_at, b.end_at)}</div>
                      </div>
                      <div className="rq-focus-field">
                        <div className="detail-label">{t('req.location_short')}</div>
                        <div className="rq-focus-value">{b.location}</div>
                        {b.map_link && (isSafeUrl(b.map_link)
                          ? <a href={b.map_link} target="_blank" rel="noopener" className="rq-map-link">{t('req.open_in_maps')}</a>
                          : <span className="rq-map-link rq-map-link--invalid">{t('req.invalid_map_link')}</span>)}
                      </div>
                      <div className="rq-focus-pair">
                        <div><div className="detail-label">{t('req.passenger_count_label')}</div><div className="rq-focus-value">{t('req.people', { n: b.people })}</div></div>
                        <div><div className="detail-label">{t('req.purpose_label')}</div><div className="rq-focus-value">{b.purpose || '-'}</div></div>
                      </div>
                    </div>
                  </div>

                  {/* ===== ขวา: สิ่งที่ Admin ตัดสินใจ ===== */}
                  <div className="rq-focus-col rq-focus-col--decide">
                    <div className="rq-focus-colhead">
                      <span className="rq-focus-coltitle">{t('req.sec_manage')}</span>
                      {isActive && ! inMode && (
                        <button onClick={enterEdit} disabled={busy} className="rq-focus-edit-btn">{bIcon('pencil')}{isOther ? t('req.change_driver') : t('req.change_car')}</button>
                      )}
                    </div>

                    {/* รถ & คนขับ */}
                    <div className="rq-focus-sec">
                      <div className="rq-focus-sectitle">{t('req.sec_vehicle')}</div>
                      {! isOther && <div className="rq-focus-value">{b.car_model ? `${b.car_model} (${b.car_plate})` : '-'}</div>}
                      {isOther && ! inMode && pending && driverPicker()}
                      {isOther && ! pending && (
                        driverAssigned(b)
                          ? <div className="rq-focus-value">{driverAssigned(b)}</div>
                          : <div className="rq-focus-sub">{t('req.no_driver_yet')}</div>
                      )}
                      {/* เติมคนขับให้งานที่อนุมัติแล้วแต่ยังไม่ได้มอบหมาย */}
                      {isApproved && isOther && ! inMode && (modal.assigning ? (
                        <div className="rq-focus-assign">
                          {driverPicker()}
                          <div className="rq-modal-actions rq-modal-actions--mt6">
                            <button onClick={() => setModal((m) => ({ ...m, assigning: false }))} disabled={busy} className="rq-modal-btn rq-modal-btn--gray">{bIcon('arrow-left')}{t('common.cancel')}</button>
                            <button onClick={doAssign} disabled={busy || !!driverClash()} className={`rq-modal-btn rq-modal-btn--approve ${driverClash() ? 'rq-modal-btn--clash' : ''}`}>{busy ? <Spinner /> : bIcon('check')}{t('req.save_driver')}</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setModal((m) => ({ ...m, assigning: true }))} className="rq-assign-btn">{driverAssigned(b) ? t('req.change_driver') : t('req.assign_driver')}</button>
                      ))}
                    </div>

                    {/* คืนรถจริง (งานที่จบแล้ว) */}
                    {b.status === 'completed' && b.returned_at && (
                      <div className="rq-focus-sec">
                        <div className="rq-focus-sectitle">{t('req.returned_at_label')}</div>
                        <div className="rq-focus-value">{fmtDateTime(b.returned_at)}</div>
                      </div>
                    )}

                    {/* หมายเหตุ: กรอกได้เมื่อยังตัดสินใจได้ · อ่านอย่างเดียวเมื่อจบแล้ว */}
                    <div className="rq-focus-sec rq-focus-sec--grow">
                      <div className="rq-focus-sectitle">
                        {modal.rejecting ? t('req.reject_reason_label') : modal.cancelling ? t('req.cancel_reason_label') : pending ? t('req.reply_note_label') : t('req.sec_note')}
                        {(modal.rejecting || modal.cancelling) && <span className="rq-required"> *</span>}
                      </div>
                      {pending || modal.rejecting || modal.cancelling ? (
                        <textarea value={modal.form.admin_note} onChange={(e) => setForm({ admin_note: e.target.value })}
                          placeholder={modal.rejecting ? t('req.reject_reason_placeholder') : t('req.note_to_requester_placeholder')}
                          rows={4} className="form-input form-input--sm rq-textarea" autoFocus={modal.rejecting || modal.cancelling} />
                      ) : (
                        <div className={b.admin_note ? 'rq-focus-value' : 'rq-focus-sub'}>{b.admin_note || t('req.no_note')}</div>
                      )}
                    </div>

                    {/* คำเตือนของโหมดที่กำลังทำ */}
                    {modal.rejecting && <div className="rq-notice rq-notice--danger">{t('req.reject_reason_notice')}</div>}
                    {modal.cancelling && <div className="rq-notice rq-notice--danger">{t('req.confirm_cancel_msg')}</div>}
                    {isCancelReq && ! inMode && (
                      <div className="rq-notice rq-notice--warn">
                        {t('req.cancel_req_pre')}<b>{t('req.cancel_req_mid')}</b>{t('req.cancel_req_post')}
                      </div>
                    )}

                    {/* ===== ปุ่ม - ชุดเดียวต่อสถานะ ===== */}
                    <div className="rq-focus-actions">
                      {modal.rejecting ? (<>
                        <button onClick={() => setModal((m) => ({ ...m, rejecting: false }))} disabled={busy} className="rq-modal-btn rq-modal-btn--gray">{bIcon('arrow-left')}{t('common.back')}</button>
                        <button onClick={doReject} disabled={busy} className="rq-modal-btn rq-modal-btn--danger-solid">{busy ? <Spinner /> : bIcon('cancel')}{t('req.confirm_reject')}</button>
                      </>) : modal.cancelling ? (<>
                        <button onClick={() => setModal((m) => ({ ...m, cancelling: false }))} disabled={busy} className="rq-modal-btn rq-modal-btn--gray">{bIcon('arrow-left')}{t('req.no_cancel')}</button>
                        <button onClick={doCancel} disabled={busy} className="rq-modal-btn rq-modal-btn--danger-solid">{busy ? <Spinner /> : bIcon('cancel')}{t('req.confirm_cancel_request')}</button>
                      </>) : pending ? (<>
                        <button onClick={() => setModal((m) => ({ ...m, rejecting: true }))} disabled={busy} className="rq-modal-btn rq-modal-btn--reject-soft">{bIcon('cancel')}{t('common.reject')}</button>
                        <button onClick={doApprove} disabled={busy || !!driverClash()} className={`rq-modal-btn rq-modal-btn--approve ${driverClash() ? 'rq-modal-btn--clash' : ''}`}>{busy ? <Spinner /> : bIcon('check')}{t('common.approve')}</button>
                      </>) : isCancelReq ? (<>
                        <button onClick={() => setModal(null)} disabled={busy} className="rq-modal-btn rq-modal-btn--gray">{bIcon('close')}{t('common.close')}</button>
                        <button onClick={doConfirmCancel} disabled={busy} className="rq-modal-btn rq-modal-btn--warn-solid">{busy ? <Spinner /> : bIcon('cancel')}{t('req.confirm_cancel')}</button>
                      </>) : canAdminCancel ? (<>
                        <button onClick={() => setModal(null)} disabled={busy} className="rq-modal-btn rq-modal-btn--gray">{bIcon('close')}{t('common.close')}</button>
                        <button onClick={() => setModal((m) => ({ ...m, cancelling: true }))} disabled={busy} className="rq-modal-btn rq-modal-btn--danger-solid">{bIcon('cancel')}{t('req.cancel_booking')}</button>
                      </>) : (
                        <button onClick={() => setModal(null)} disabled={busy} className="rq-modal-btn rq-modal-btn--gray">{bIcon('close')}{t('common.close')}</button>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
