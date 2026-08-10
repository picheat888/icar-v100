import { useState, useEffect, useRef } from 'react';
import { getCsrf, setCsrf } from '../lib/csrf';
import { t, currentLocale } from '../lib/i18n';

const TEAL = '#0c8b87';
const LOCALE = currentLocale();
const CAR_STATUS = {
  available:   ['car.status_available', '#e7f4ee', '#16855a'],
  maintenance: ['car.status_maintenance', '#fde7d6', '#b5701a'],
};
const TH_MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
// ชื่อเดือนเต็มภาษาอังกฤษ คู่ขนานกับ TH_MONTHS_TH
const TH_MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TH_MONTHS = LOCALE === 'en' ? TH_MONTHS_EN : TH_MONTHS_TH;
const WEEKDAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
// หัวคอลัมน์ปฏิทินภาษาอังกฤษ คู่ขนานกับ WEEKDAYS_TH (เริ่มวันอาทิตย์)
const WEEKDAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WEEKDAYS = LOCALE === 'en' ? WEEKDAYS_EN : WEEKDAYS_TH;
const pad = (n) => (n < 10 ? '0' + n : '' + n);
const dateStr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

const inp = { width: '100%', padding: '11px 13px', border: '1px solid #d8dee3', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#54616c', marginBottom: 6 };
const carIcon = (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#b3c0c8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13l1.6-4.7A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.3L21 13v5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H6.5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><circle cx="7" cy="16" r="1" /><circle cx="17" cy="16" r="1" /></svg>
);
const segTab = (active) => ({ padding: '9px 18px', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: active ? '#fff' : 'transparent', color: active ? TEAL : '#6b7884', boxShadow: active ? '0 1px 3px rgba(0,0,0,.08)' : 'none' });

/**
 * จองรถ — grid การ์ดรถ (self) / ฟอร์ม (other) → modal จองรถขับเอง 2 คอลัมน์ (ปฏิทินว่าง + ฟอร์ม)
 * props: endpoints {store, availability}, cars, baseUrl
 */
export default function BookingForm({ endpoints, cars = [], baseUrl = '' }) {
  const [tab, setTab] = useState('self');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // {type:'self'|'other', car}
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

  const openOther = () => {
    resetForm(); setError(''); setBooked(new Set());
    const nowDt = new Date(); setCal({ y: nowDt.getFullYear(), m: nowDt.getMonth() });
    setModal({ type: 'other', car: null });
  };
  const availReq = useRef(0);   // ลำดับคำขอ availability ล่าสุด — กัน response เก่ามาทับ (race สลับรถเร็ว ๆ)
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
    const body = { booking_type: modal.type, ...f };
    if (modal.type === 'self') body.car_id = modal.car.id;
    setBusy(true);
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
      if (res.ok && d.ok) window.location.href = d.redirect || '/my-requests';
      else setError(d.message || t('common.err'));
    } finally { setBusy(false); }
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

  const renderCalendar = () => {
    const first = new Date(cal.y, cal.m, 1).getDay();
    const days = new Date(cal.y, cal.m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    const selDate = f.start_at ? f.start_at.slice(0, 10) : '';
    const now = new Date();
    const todayDs = dateStr(now.getFullYear(), now.getMonth(), now.getDate());
    return (
      <div style={{ border: '1px solid #eceff1', borderRadius: 10, padding: '14px 16px', background: '#fcfdfd' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#37434d', marginBottom: 12 }}>{modal.type === 'other' ? t('book.cal_title_other') : t('book.cal_title_self')}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
          <button onClick={prevMonth} style={navBtn}>‹</button>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2a33' }}>{TH_MONTHS[cal.m]} {cal.y}</div>
          <button onClick={nextMonth} style={navBtn}>›</button>
        </div>
        <div style={{ border: '1px solid #e3e9ec', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: '#f7f9fa', borderBottom: '1px solid #e3e9ec' }}>
            {WEEKDAYS.map((h) => <div key={h} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#8a97a2', padding: '7px 0' }}>{h}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {cells.map((d, i) => {
              if (d === null) return <div key={'b' + i} style={{ aspectRatio: '1', borderRight: '1px solid #eef1f3', borderBottom: '1px solid #eef1f3', background: '#fafbfc' }} />;
              const ds = dateStr(cal.y, cal.m, d);
              const isBooked = booked.has(ds);
              const isSel = ds === selDate;
              const isPast = ds < todayDs;   // วันในอดีต — เลือกไม่ได้
              return (
                <button key={ds} onClick={() => !isPast && pickDay(ds)} disabled={isPast}
                  style={{ aspectRatio: '1', border: 'none', borderRight: '1px solid #eef1f3', borderBottom: '1px solid #eef1f3', cursor: isPast ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, background: isSel ? '#0c8b87' : (isPast ? '#f4f6f7' : '#fff'), color: isSel ? '#fff' : (isPast ? '#c5ced5' : '#37434d') }}>
                  {d}
                  {isBooked && <span style={{ width: 5, height: 5, borderRadius: '50%', background: isSel ? '#fff' : '#e08a1e' }} />}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: '#9aa7b2', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          {modal.type !== 'other' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e08a1e' }} />}
          {modal.type === 'other' ? t('book.cal_hint_other') : t('book.cal_hint_self')}
        </div>
      </div>
    );
  };

  const formFields = () => (
    <>
      {error && <div style={{ background: '#fbecea', color: '#c0392b', borderRadius: 8, padding: '10px 13px', fontSize: 13.5, marginBottom: 16, fontWeight: 500 }}>{error}</div>}
      <label style={lbl}>{t('book.location_label')} <span style={{ color: '#c0392b' }}>*</span></label>
      <input value={f.location} onChange={(e) => set('location', e.target.value)} placeholder={t('book.location_placeholder')} style={{ ...inp, marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div><label style={lbl}>{t('req.start_label')} <span style={{ color: '#c0392b' }}>*</span></label><DateTimeField value={f.start_at} onChange={(v) => set('start_at', v)} placeholder={t('book.start_placeholder')} /></div>
        <div><label style={lbl}>{t('req.end_label')} <span style={{ color: '#c0392b' }}>*</span></label><DateTimeField value={f.end_at} onChange={(v) => set('end_at', v)} placeholder={t('book.end_placeholder')} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div><label style={lbl}>{t('req.people_label')}</label><input type="number" min="1" value={f.people} onChange={(e) => set('people', e.target.value)} placeholder={t('book.people_placeholder')} style={inp} /></div>
        <div><label style={lbl}>{t('book.map_link_label')}</label><input value={f.map_link} onChange={(e) => set('map_link', e.target.value)} maxLength={500} placeholder={t('book.map_link_placeholder')} style={inp} /></div>
      </div>
      <label style={lbl}>{t('req.purpose_label')}</label>
      <textarea value={f.purpose} onChange={(e) => set('purpose', e.target.value)} placeholder={t('book.purpose_placeholder')} rows={3} style={{ ...inp, resize: 'vertical' }} />
    </>
  );

  return (
    <div>
      <div style={{ display: 'inline-flex', background: '#eef2f4', borderRadius: 10, padding: 5, marginBottom: 22, gap: 4, flexWrap: 'wrap' }}>
        <button onClick={() => setTab('self')} style={segTab(tab === 'self')}>{t('car.tab_self')}</button>
        <button onClick={() => setTab('other')} style={segTab(tab === 'other')}>{t('book.tab_other')}</button>
      </div>

      {tab === 'self' && (
        <div>
          <p style={{ fontSize: 14, color: '#6b7884', margin: '0 0 18px' }}>{t('book.self_desc')}</p>
          {cars.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #e7ebee', borderRadius: 12, padding: 40, textAlign: 'center', color: '#9aa7b2' }}>{t('book.no_self_cars')}</div>
          ) : (
            <div className="book-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
              {cars.map((v) => {
                // สถานะจากเวลาจริง: ซ่อมบำรุง > ไม่ว่าง(กำลังถูกใช้) > พร้อมใช้งาน
                const isMaint = v.status === 'maintenance';
                const busyNow = v.busy && !isMaint;
                const [sl, sb, sc] = isMaint ? CAR_STATUS.maintenance : (busyNow ? ['book.status_busy', '#fde7d6', '#b5701a'] : CAR_STATUS.available);
                const canSelect = !isMaint;   // ไม่ว่างยังจองได้ (คนละช่วงเวลา) — ซ่อมบำรุงเท่านั้นที่จองไม่ได้
                return (
                  <div key={v.id} className="book-card" style={{ background: '#fff', border: '1px solid #e7ebee', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div className="book-card-img" style={{ height: 128, background: 'linear-gradient(135deg,#eef2f4,#e0e7ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                      {v.image ? <img src={baseUrl + v.image} alt={v.model} className="car-photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : carIcon}
                    </div>
                    <div className="book-card-body" style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2a33', lineHeight: 1.25 }}>{v.model}</div>
                        <span style={{ flex: 'none', background: sb, color: sc, borderRadius: 999, padding: '3px 11px', fontSize: 11.5, fontWeight: 600 }}>{t(sl)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, color: '#6b7884' }}>{t('car.plate_label')} <b style={{ color: '#37434d', fontWeight: 600 }}>{v.plate || '-'}</b></span>
                        <span style={{ fontSize: 13, color: '#6b7884' }}>{t('car.seats_count', { n: v.seats })}</span>
                      </div>
                      {canSelect ? (
                        <button onClick={() => openSelf(v)} className="book-select-btn" style={{ marginTop: 'auto', width: '100%', background: TEAL, color: '#fff', border: 'none', borderRadius: 8, padding: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('book.select_this')}</button>
                      ) : (
                        <button disabled style={{ marginTop: 'auto', width: '100%', background: '#f1f3f5', color: '#aab4bc', border: 'none', borderRadius: 8, padding: 10, fontSize: 14, fontWeight: 600, cursor: 'not-allowed', fontFamily: 'inherit' }}>{t('book.under_maintenance')}</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'other' && (
        <div style={{ background: '#fff', border: '1px solid #e7ebee', borderRadius: 12, padding: narrow ? 18 : 28, maxWidth: 680 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 5px', color: '#1f2a33' }}>{t('book.other_form_title')}</h3>
          <p style={{ fontSize: 13.5, color: '#7a8794', margin: '0 0 22px' }}>{t('book.other_form_desc')}</p>
          <button onClick={openOther} style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 9, padding: '12px 26px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('book.other_form_btn')}</button>
        </div>
      )}

      {/* โมดัลจอง */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(31,42,51,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: narrow ? 8 : 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 960, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <div style={{ padding: narrow ? '16px 16px' : '22px 26px', borderBottom: '1px solid #f0f3f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1f2a33' }}>{modal.type === 'self' ? t('book.modal_title_self') : t('book.modal_title_other')}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aa7b2', padding: 4, display: 'flex' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {/* 2 คอลัมน์ทั้ง self และ other: ซ้าย = ข้อมูล+ปฏิทิน, ขวา = ฟอร์ม */}
            <div style={{ padding: narrow ? '18px 16px' : '24px 26px', display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1.04fr .96fr', gap: narrow ? 18 : 28, alignItems: 'start' }}>
              <div>
                {modal.type === 'self' ? (
                  <>
                    {loadErr && (
                      <div style={{ padding: '10px 14px', marginBottom: 12, background: '#fbecea', color: '#9a3b34', borderRadius: 8, fontSize: 13 }}>
                        {t('book.load_avail_err')}
                      </div>
                    )}
                    <div style={{ background: '#e6f3f2', borderRadius: 9, padding: '13px 16px', marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: '#0a716e', fontWeight: 600, marginBottom: 2 }}>{t('book.selected_car_label')}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2a33' }}>{modal.car.model} — {modal.car.plate || '-'}</div>
                    </div>
                  </>
                ) : (
                  <div style={{ background: '#e6f3f2', borderRadius: 9, padding: '13px 16px', marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: '#0a716e', fontWeight: 600, marginBottom: 2 }}>{t('book.tab_other')}</div>
                    <div style={{ fontSize: 13.5, color: '#37434d' }}>{t('book.other_car_note')}</div>
                  </div>
                )}
                {renderCalendar()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#37434d', marginBottom: 14 }}>{t('book.trip_details_title')}</div>
                {formFields()}
              </div>
            </div>

            <div style={{ padding: narrow ? '14px 16px' : '18px 26px', borderTop: '1px solid #f0f3f5', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ background: '#f1f3f5', color: '#54616c', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('common.cancel')}</button>
              <button onClick={submit} disabled={busy} style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 26px', fontSize: 14.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: 'inherit' }}>{t('book.submit_btn')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn = { width: 28, height: 28, border: '1px solid #e3e9ec', borderRadius: 7, background: '#fff', color: '#54616c', cursor: 'pointer', fontSize: 17, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' };

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
  const selStyle = { ...inp, padding: '9px 10px', cursor: 'pointer', flex: 1 };

  return (
    <>
      <button type="button" onClick={openPicker}
        style={{ ...inp, display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', cursor: 'pointer', background: '#fff', color: value ? '#37434d' : '#9aa7b2' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0c8b87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value ? fmtDisplay(value) : placeholder}</span>
      </button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(31,42,51,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 160, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 320, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.28)', padding: 18 }}>
            {/* เลือกเดือน */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <button onClick={prev} style={navBtn}>‹</button>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2a33' }}>{TH_MONTHS[cal.m]} {cal.y}</div>
              <button onClick={next} style={navBtn}>›</button>
            </div>
            {/* ปฏิทิน */}
            <div style={{ border: '1px solid #e3e9ec', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: '#f7f9fa', borderBottom: '1px solid #e3e9ec' }}>
                {WEEKDAYS.map((h) => <div key={h} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 600, color: '#8a97a2', padding: '6px 0' }}>{h}</div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                {cells.map((d, i) => {
                  if (d === null) return <div key={'b' + i} style={{ aspectRatio: '1' }} />;
                  const ds = dateStr(cal.y, cal.m, d);
                  const isSel = ds === selDate;
                  const isPast = ds < todayDs;   // วันในอดีต — เลือกไม่ได้
                  return (
                    <button key={ds} type="button" onClick={() => !isPast && setSelDate(ds)} disabled={isPast}
                      style={{ aspectRatio: '1', border: 'none', cursor: isPast ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit', background: isSel ? '#0c8b87' : '#fff', color: isSel ? '#fff' : (isPast ? '#c5ced5' : '#37434d'), borderRadius: 6 }}>{d}</button>
                  );
                })}
              </div>
            </div>
            {/* เวลา: ชั่วโมง : นาที */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: '#54616c', fontWeight: 600, flex: 'none' }}>{t('book.time_label')}</span>
              <select value={hh} onChange={(e) => setHh(e.target.value)} style={selStyle}>{HOURS.map((h) => <option key={h} value={h}>{h}</option>)}</select>
              <span style={{ fontWeight: 700, color: '#9aa7b2' }}>:</span>
              <select value={mm} onChange={(e) => setMm(e.target.value)} style={selStyle}>{MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}</select>
            </div>
            {/* เตือนเมื่อเลือกเวลาที่ผ่านมาแล้ว */}
            {selPast && <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 10, textAlign: 'center' }}>{t('book.past_datetime_err')}</div>}
            {/* ปุ่ม */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, background: '#f1f3f5', color: '#54616c', border: 'none', borderRadius: 8, padding: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('common.cancel')}</button>
              <button type="button" onClick={confirm} disabled={!selDate || selPast} style={{ flex: 1, background: (selDate && !selPast) ? '#0c8b87' : '#c5ced5', color: '#fff', border: 'none', borderRadius: 8, padding: 10, fontSize: 14, fontWeight: 600, cursor: (selDate && !selPast) ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>{t('common.confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
