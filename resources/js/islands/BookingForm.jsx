import { useState, useEffect, useRef } from 'react';
import { getCsrf, setCsrf } from '../lib/csrf';
import { t } from '../lib/i18n';
import { MONTHS, DOW, pad } from '../lib/date';
import { CloseIcon } from '../lib/icons';
import DonePopup from '../lib/DonePopup';

// สถานะรถที่แสดงบนป้าย (คำแปล + modifier ของ .pill กลาง) - ไม่ว่าง(กำลังถูกใช้) ใช้สีเดียวกับซ่อมบำรุง (pill--amber)
const CAR_STATUS = {
  available:   ['car.status_available', 'pill--green'],
  maintenance: ['car.status_maintenance', 'pill--amber'],
};
const dateStr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

const carIcon = (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#b3c0c8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13l1.6-4.7A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.3L21 13v5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H6.5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><circle cx="7" cy="16" r="1" /><circle cx="17" cy="16" r="1" /></svg>
);

/**
 * จองรถ - แท็บรถขับเอง: grid การ์ดรถ → modal 2 คอลัมน์ (ปฏิทินวันไม่ว่างของรถคันนั้น + ฟอร์ม)
 * แท็บรถอื่น ๆ: 2 คอลัมน์ในหน้าเลย ไม่มี modal - ปฏิทินเป็นทางลัดเลือกวัน (ไม่มีวันไม่ว่างให้แสดง)
 * props: endpoints {store, availability}, cars, baseUrl, backUrl (หน้าปฏิทินการจองรถของ role นั้น)
 */
export default function BookingForm({ endpoints, cars = [], baseUrl = '', backUrl = '' }) {
  const [tab, setTab] = useState('self');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // {type:'self', car} - ใช้เฉพาะแท็บรถขับเอง
  const [done, setDone] = useState(false);  // ส่งคำขอสำเร็จ -> โชว์ popup ก่อนเด้งไปหน้าถัดไป
  const [f, setF] = useState({ location: '', start_at: '', end_at: '', people: 1, purpose: '', map_link: '' });
  const [booked, setBooked] = useState(new Set()); // วันที่มีจอง (YYYY-MM-DD)
  const [loadErr, setLoadErr] = useState(false); // โหลดตารางว่างของรถไม่สำเร็จ
  const now = new Date();
  const [cal, setCal] = useState({ y: now.getFullYear(), m: now.getMonth() });

  // จอแคบ (<=760) -> modal คอลัมน์เดียว
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)');
    const on = () => setNarrow(mq.matches);
    on(); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const resetForm = () => setF({ location: '', start_at: '', end_at: '', people: 1, purpose: '', map_link: '' });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const availReq = useRef(0);   // ลำดับคำขอ availability ล่าสุด - กัน response เก่ามาทับ (race สลับรถเร็ว ๆ)
  const openSelf = (car) => {
    resetForm(); setError(''); setModal({ type: 'self', car }); setLoadErr(false); setBooked(new Set());
    const nowDt = new Date(); setCal({ y: nowDt.getFullYear(), m: nowDt.getMonth() });
    // โหลดตารางว่างของรถคันนี้
    const seq = ++availReq.current;
    fetch(`${endpoints.availability}?car_id=${car.id}`, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => {
        if (seq !== availReq.current) return;   // มีคำขอใหม่กว่าแล้ว ทิ้งผลเก่า
        const set2 = new Set();
        (d.bookings || []).forEach((b) => {
          let dt = new Date(b.start_at.slice(0, 10) + 'T00:00:00');
          const end = new Date(b.end_at.slice(0, 10) + 'T00:00:00');
          let guard = 0;
          while (dt <= end && guard < 400) { set2.add(dateStr(dt.getFullYear(), dt.getMonth(), dt.getDate())); dt.setDate(dt.getDate() + 1); guard++; }
        });
        setBooked(set2);
      })
      .catch(() => { if (seq === availReq.current) { setBooked(new Set()); setLoadErr(true); } });
  };

  const submit = async () => {
    setError('');
    // แท็บรถอื่น ๆ ฟอร์มอยู่ในหน้าเลย (ไม่มี modal) จึงอ่านชนิดการจองจาก tab แทน
    const type = modal?.type ?? tab;
    // สถานที่ปลายทางต้องกรอก
    if (!f.location.trim()) {
      setError(t('book.err_location'));
      return;
    }
    // ต้องเลือกทั้งวันเวลาเริ่มและสิ้นสุด
    if (!f.start_at || !f.end_at) {
      setError(t('book.err_datetime'));
      return;
    }
    // เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม (เทียบ string 'YYYY-MM-DDTHH:MM' ได้ตรง ๆ)
    if (f.end_at <= f.start_at) {
      setError(t('book.err_end_after_start'));
      return;
    }
    // จำนวนผู้โดยสารต้องอยู่ในช่วง 1-999 คน
    if (Number(f.people) < 1) {
      setError(t('book.err_people_min'));
      return;
    }
    if (Number(f.people) > 999) {
      setError(t('book.err_people_max'));
      return;
    }
    // ลิงก์แผนที่ (ถ้ากรอก) ต้องขึ้นต้นด้วย http:// หรือ https:// เท่านั้น
    const mapLink = (f.map_link || '').trim();
    if (mapLink && !/^https?:\/\//i.test(mapLink)) {
      setError(t('book.err_map_link_scheme'));
      return;
    }
    if (mapLink.length > 500) {
      setError(t('book.err_map_link_length'));
      return;
    }
    // รถอื่น ๆ ต้องบอกวัตถุประสงค์ - Admin ใช้ข้อมูลนี้เลือกรถและจัดลำดับความสำคัญ
    if (type === 'other' && !f.purpose.trim()) {
      setError(t('book.err_purpose'));
      return;
    }
    const body = { booking_type: type, ...f };
    if (type === 'self') body.car_id = modal.car.id;
    setBusy(true);
    let sent = false;   // ส่งสำเร็จแล้วคง busy ไว้ กันกดซ้ำระหว่างรอ popup
    try {
      const res = await fetch(endpoints.store, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'X-CSRF-TOKEN': getCsrf(), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams(body).toString(),
      });
      const d = await res.json().catch(() => ({}));
      // error ที่ไม่ใช่ JSON (เช่น 500/CSRF หมดอายุ) → token หลุด sync, reload เพื่อรับ token+state ใหม่
      if (!res.ok && !d.csrf) { window.location.reload(); return; }
      if (d.csrf) setCsrf(d.csrf);
      if (res.ok && d.ok) {
        // โชว์ popup "ส่งคำขอจองสำเร็จ" 1.5 วินาที แล้วค่อยเด้งไปหน้าถัดไป
        // ปิดโมดัลฟอร์มด้วย ไม่งั้น backdrop ซ้อน 2 ชั้นจอจะมืดเกินไป
        sent = true;
        setModal(null);
        setDone(true);
        const next = d.redirect || backUrl || '/timeline';
        setTimeout(() => { window.location.href = next; }, 1500);
      } else setError(d.message || t('common.err'));
    } finally { if (!sent) setBusy(false); }
  };

  // คลิกวันในปฏิทิน -> ตั้งเวลาเริ่ม/สิ้นสุด default 08:00-17:00 (ถ้าเป็นวันนี้และเลย 08:00 แล้ว เริ่มที่ชั่วโมงถัดไป กันเวลาย้อนหลัง)
  const pickDay = (ds) => {
    const n = new Date();
    const todayDs = dateStr(n.getFullYear(), n.getMonth(), n.getDate());
    let sh = 8;
    if (ds === todayDs && n.getHours() >= 8) sh = n.getHours() + 1;   // เลย 08:00 แล้ว -> ชั่วโมงถัดไป
    if (sh > 22) { set('start_at', ''); set('end_at', ''); return; }  // ดึกเกินไป -> ให้ผู้ใช้เลือกเวลาเอง
    const eh = Math.min(sh + 9, 23);
    set('start_at', `${ds}T${pad(sh)}:00`);
    set('end_at', `${ds}T${pad(eh)}:00`);
  };

  const prevMonth = () => setCal((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }));
  const nextMonth = () => setCal((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }));

  // isOther = แท็บรถอื่น ๆ - ยังไม่ได้เลือกรถจึงไม่มีวันที่ไม่ว่างให้แสดง ปฏิทินทำหน้าที่เป็นทางลัด
  // เลือกวัน แล้วเติมเวลา 08:00-17:00 ให้ (ไม่มีจุดสีและไม่มี legend จุด)
  const renderCalendar = (isOther = false) => {
    const first = new Date(cal.y, cal.m, 1).getDay();
    const days = new Date(cal.y, cal.m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    const selDate = f.start_at ? f.start_at.slice(0, 10) : '';
    const now = new Date();
    const todayDs = dateStr(now.getFullYear(), now.getMonth(), now.getDate());
    return (
      <div className="bk-cal-box">
        <div className="bk-cal-title">{t(isOther ? 'book.cal_title_other' : 'book.cal_title_self')}</div>
        <div className="bk-cal-head">
          <button onClick={prevMonth} className="bk-nav-btn">‹</button>
          <div className="bk-cal-month">{MONTHS[cal.m]} {cal.y}</div>
          <button onClick={nextMonth} className="bk-nav-btn">›</button>
        </div>
        <div className="bk-cal-gridbox">
          <div className="bk-cal-weekrow">
            {DOW.map((h) => <div key={h} className="bk-cal-weekday">{h}</div>)}
          </div>
          <div className="bk-cal-daygrid">
            {cells.map((d, i) => {
              if (d === null) return <div key={'b' + i} className="bk-cal-blank" />;
              const ds = dateStr(cal.y, cal.m, d);
              const isBooked = booked.has(ds);
              const isSel = ds === selDate;
              const isPast = ds < todayDs;   // วันในอดีต - เลือกไม่ได้
              return (
                <button key={ds} onClick={() => !isPast && pickDay(ds)} disabled={isPast}
                  className={`bk-cal-day${isPast ? ' bk-cal-day--past' : ''}${isSel ? ' bk-cal-day--sel' : ''}`}>
                  {d}
                  {isBooked && <span className={`bk-cal-dot${isSel ? ' bk-cal-dot--sel' : ''}`} />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="bk-cal-legend">
          {!isOther && <span className="bk-cal-legend-dot" />}
          {t(isOther ? 'book.cal_hint_other' : 'book.cal_hint_self')}
        </div>
      </div>
    );
  };

  // isOther = แท็บรถอื่น ๆ - บังคับกรอกวัตถุประสงค์ เพราะ Admin ใช้ตัดสินใจจัดหารถ/คนขับ
  const formFields = (isOther = false) => (
    <>
      {error && <div className="alert-error">{error}</div>}
      <label className="form-label">{t('book.location_label')} <span className="bk-req">*</span></label>
      <input value={f.location} onChange={(e) => set('location', e.target.value)} placeholder={t('book.location_placeholder')} className="form-input form-input--sm bk-field-mb" />
      <div className={`bk-grid2${narrow ? ' bk-grid2--narrow' : ''}`}>
        <div><label className="form-label">{t('req.start_label')} <span className="bk-req">*</span></label><DateTimeField value={f.start_at} onChange={(v) => set('start_at', v)} placeholder={t('book.start_placeholder')} /></div>
        <div><label className="form-label">{t('req.end_label')} <span className="bk-req">*</span></label><DateTimeField value={f.end_at} onChange={(v) => set('end_at', v)} placeholder={t('book.end_placeholder')} /></div>
      </div>
      <div className={`bk-grid2${narrow ? ' bk-grid2--narrow' : ''}`}>
        <div><label className="form-label">{t('req.people_label')}</label><input type="number" min="1" value={f.people} onChange={(e) => set('people', e.target.value)} placeholder={t('book.people_placeholder')} className="form-input form-input--sm" /></div>
        <div><label className="form-label">{t('book.map_link_label')}</label><input value={f.map_link} onChange={(e) => set('map_link', e.target.value)} maxLength={500} placeholder={t('book.map_link_placeholder')} className="form-input form-input--sm" /></div>
      </div>
      <label className="form-label">{t('req.purpose_label')} {isOther && <span className="bk-req">*</span>}</label>
      <textarea value={f.purpose} onChange={(e) => set('purpose', e.target.value)} placeholder={t('book.purpose_placeholder')} rows={3} className="form-input form-input--sm bk-textarea" />
    </>
  );

  return (
    <div>
      <div className="seg bk-seg">
        <button onClick={() => setTab('self')} className={`seg-btn bk-seg-btn${tab === 'self' ? ' seg-btn--active' : ''}`}>{t('car.tab_self')}</button>
        <button onClick={() => { setTab('other'); resetForm(); setError(''); const n = new Date(); setCal({ y: n.getFullYear(), m: n.getMonth() }); }} className={`seg-btn bk-seg-btn${tab === 'other' ? ' seg-btn--active' : ''}`}>{t('book.tab_other')}</button>
      </div>

      {tab === 'self' && (
        <div>
          <p className="bk-self-desc">{t('book.self_desc')}</p>
          {cars.length === 0 ? (
            <div className="empty-card bk-empty-cars">{t('book.no_self_cars')}</div>
          ) : (
            <div className="book-grid">
              {cars.map((v) => {
                // สถานะจากเวลาจริง: ซ่อมบำรุง > ไม่ว่าง(กำลังถูกใช้) > พร้อมใช้งาน
                const isMaint = v.status === 'maintenance';
                const busyNow = v.busy && !isMaint;
                const [sl, stCls] = isMaint ? CAR_STATUS.maintenance : (busyNow ? ['book.status_busy', 'pill--amber'] : CAR_STATUS.available);
                const canSelect = !isMaint;   // ไม่ว่างยังจองได้ (คนละช่วงเวลา) - ซ่อมบำรุงเท่านั้นที่จองไม่ได้
                return (
                  <div key={v.id} className="book-card">
                    <div className="book-card-img">
                      {v.image ? <img src={baseUrl + v.image} alt={v.model} className="car-photo" /> : carIcon}
                    </div>
                    <div className="book-card-body">
                      <div className="bk-card-head">
                        <div className="bk-card-title">{v.model}</div>
                        <span className={`pill pill--sm ${stCls}`}>{t(sl)}</span>
                      </div>
                      <div className="bk-card-meta">
                        <span className="bk-card-meta-item">{t('car.plate_label')} <b className="bk-card-meta-value">{v.plate || '-'}</b></span>
                        <span className="bk-card-meta-item">{t('car.seats_count', { n: v.seats })}</span>
                      </div>
                      {canSelect ? (
                        <button onClick={() => openSelf(v)} className="book-select-btn">{t('book.select_this')}</button>
                      ) : (
                        <button disabled className="bk-btn-disabled">{t('book.under_maintenance')}</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* รถอื่น ๆ: ฟอร์มอยู่ในหน้าเลย ไม่ต้องเปิด modal เพราะแท็บนี้ไม่มีอย่างอื่นให้ทำ
          และไม่มีปฏิทิน เพราะยังไม่ได้เลือกรถจึงไม่มีตารางว่างให้แสดง */}
      {tab === 'other' && (
        <div className={`bk-other-card${narrow ? ' bk-other-card--narrow' : ''}`}>
          <p className="bk-other-desc">{t('book.other_form_desc')}</p>
          <div className={`bk-other-body${narrow ? ' bk-other-body--narrow' : ''}`}>
            <div>{renderCalendar(true)}</div>
            <div>{formFields(true)}</div>
          </div>
          <div className="bk-other-foot">
            <button onClick={submit} disabled={busy} className="btn-primary bk-submit-btn">{t('book.submit_btn')}</button>
          </div>
        </div>
      )}

      {/* โมดัลจอง */}
      {modal && (
        <div onClick={() => setModal(null)} className={`modal-backdrop${narrow ? ' modal-backdrop--narrow' : ''}`}>
          <div onClick={(e) => e.stopPropagation()} className="modal-box modal-box--wide">
            <div className={`modal-head${narrow ? ' modal-head--narrow' : ''}`}>
              <h3 className="modal-title">{t('book.modal_title_self')}</h3>
              <button onClick={() => setModal(null)} className="modal-close">{CloseIcon}</button>
            </div>

            {/* 2 คอลัมน์: ซ้าย = รถที่เลือก + ปฏิทินวันที่รถคันนั้นไม่ว่าง, ขวา = ฟอร์ม */}
            <div className={`bk-modal-body${narrow ? ' bk-modal-body--narrow' : ''}`}>
              <div>
                {loadErr && (
                  <div className="alert-error alert-error--sm">
                    {t('book.load_avail_err')}
                  </div>
                )}
                <div className="bk-info-box">
                  <div className="bk-info-label">{t('book.selected_car_label')}</div>
                  <div className="bk-info-value">{modal.car.model} - {modal.car.plate || '-'}</div>
                </div>
                {renderCalendar()}
              </div>
              <div>
                <div className="bk-section-title">{t('book.trip_details_title')}</div>
                {formFields()}
              </div>
            </div>

            <div className={`bk-modal-foot${narrow ? ' bk-modal-foot--narrow' : ''}`}>
              <button onClick={() => setModal(null)} className="bk-modal-cancel">{t('common.cancel')}</button>
              <button onClick={submit} disabled={busy} className="btn-primary bk-submit-btn">{t('book.submit_btn')}</button>
            </div>
          </div>
        </div>
      )}

      {/* popup แจ้งส่งคำขอสำเร็จ - โชว์ 1.5 วินาทีแล้วเด้งไปหน้าถัดไปเอง */}
      {done && <DonePopup title={t('book.done_title')} sub={t('book.done_sub')} />}
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i)); // 00,01,...,59 (ทุก 1 นาที)
// แสดงค่าที่เลือกแล้วเป็น "DD-MM-YYYY · HH:MM"
const fmtDisplay = (v) => {
  if (!v) return '';
  const [d, tm] = v.split('T');
  const [y, m, dd] = d.split('-');
  return `${dd}-${m}-${y} · ${tm}`;
};

/**
 * ช่องเลือกวัน-เวลา แบบ popup: ปฏิทินเลือกวัน + dropdown ชั่วโมง/นาที + ยืนยัน/ยกเลิก
 * value/onChange ใช้รูปแบบ 'YYYY-MM-DDTHH:MM' (เหมือน datetime-local)
 */
function DateTimeField({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [cal, setCal] = useState({ y: 2026, m: 0 });
  const [selDate, setSelDate] = useState('');
  const [hh, setHh] = useState('08');
  const [mm, setMm] = useState('00');

  const openPicker = () => {
    if (value) {
      const [d, tm] = value.split('T');
      const [y, m] = d.split('-');
      setSelDate(d); setCal({ y: +y, m: +m - 1 });
      const [H, M] = tm.split(':'); setHh(H); setMm(MINUTES.includes(M) ? M : '00');
    } else {
      const n = new Date();
      setSelDate(''); setCal({ y: n.getFullYear(), m: n.getMonth() }); setHh('08'); setMm('00');
    }
    setOpen(true);
  };
  const confirm = () => {
    if (!selDate) return;
    // กันเลือกเวลาที่ผ่านมาแล้ว
    if (new Date(`${selDate}T${hh}:${mm}:00`) < new Date()) return;
    onChange(`${selDate}T${hh}:${mm}`);
    setOpen(false);
  };

  const prev = () => setCal((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }));
  const next = () => setCal((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }));

  const first = new Date(cal.y, cal.m, 1).getDay();
  const days = new Date(cal.y, cal.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const now = new Date();
  const todayDs = dateStr(now.getFullYear(), now.getMonth(), now.getDate());
  const selPast = selDate && new Date(`${selDate}T${hh}:${mm}:00`) < now;   // วันเวลาที่เลือกเป็นอดีต

  return (
    <>
      <button type="button" onClick={openPicker}
        className={`form-input form-input--sm bk-dt-trigger${value ? ' bk-dt-trigger--filled' : ''}`}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0c8b87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="bk-dt-icon"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        <span className="bk-dt-trigger-text">{value ? fmtDisplay(value) : placeholder}</span>
      </button>

      {open && (
        <div onClick={() => setOpen(false)} className="bk-dtp-backdrop">
          <div onClick={(e) => e.stopPropagation()} className="bk-dtp-box">
            {/* เลือกเดือน */}
            <div className="bk-dtp-head">
              <button onClick={prev} className="bk-nav-btn">‹</button>
              <div className="bk-dtp-month">{MONTHS[cal.m]} {cal.y}</div>
              <button onClick={next} className="bk-nav-btn">›</button>
            </div>
            {/* ปฏิทิน */}
            <div className="bk-dtp-gridbox">
              <div className="bk-cal-weekrow">
                {DOW.map((h) => <div key={h} className="bk-dtp-weekday">{h}</div>)}
              </div>
              <div className="bk-cal-daygrid">
                {cells.map((d, i) => {
                  if (d === null) return <div key={'b' + i} className="bk-dtp-blank" />;
                  const ds = dateStr(cal.y, cal.m, d);
                  const isSel = ds === selDate;
                  const isPast = ds < todayDs;   // วันในอดีต - เลือกไม่ได้
                  return (
                    <button key={ds} type="button" onClick={() => !isPast && setSelDate(ds)} disabled={isPast}
                      className={`bk-dtp-day${isPast ? ' bk-dtp-day--past' : ''}${isSel ? ' bk-dtp-day--sel' : ''}`}>{d}</button>
                  );
                })}
              </div>
            </div>
            {/* เวลา: ชั่วโมง : นาที */}
            <div className="bk-dtp-time-row">
              <span className="bk-dtp-time-label">{t('book.time_label')}</span>
              <select value={hh} onChange={(e) => setHh(e.target.value)} className="form-input form-input--sm bk-dtp-select">{HOURS.map((h) => <option key={h} value={h}>{h}</option>)}</select>
              <span className="bk-dtp-colon">:</span>
              <select value={mm} onChange={(e) => setMm(e.target.value)} className="form-input form-input--sm bk-dtp-select">{MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}</select>
            </div>
            {/* เตือนเมื่อเลือกเวลาที่ผ่านมาแล้ว */}
            {selPast && <div className="bk-dtp-warn">{t('book.past_datetime_err')}</div>}
            {/* ปุ่ม */}
            <div className="bk-dtp-btns">
              <button type="button" onClick={() => setOpen(false)} className="bk-dtp-btn bk-dtp-btn--cancel">{t('common.cancel')}</button>
              <button type="button" onClick={confirm} disabled={!selDate || selPast} className="bk-dtp-btn bk-dtp-btn--confirm">{t('common.confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
