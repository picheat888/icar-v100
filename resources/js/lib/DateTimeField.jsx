import { useState } from 'react';
import { MONTHS, DOW, pad, ymd, ymdParts, fmtDateTime } from './date';
import { t } from './i18n';


const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i)); // 00,01,...,59 (ทุก 1 นาที)
/**
 * ช่องเลือกวัน-เวลา แบบ popup: ปฏิทินเลือกวัน + dropdown ชั่วโมง/นาที + ยืนยัน/ยกเลิก
 * value/onChange ใช้รูปแบบ 'YYYY-MM-DDTHH:MM' (เหมือน datetime-local)
 */
export default function DateTimeField({ id, value, onChange, placeholder, invalid }) {
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
  const todayDs = ymd(now);
  const selPast = selDate && new Date(`${selDate}T${hh}:${mm}:00`) < now;   // วันเวลาที่เลือกเป็นอดีต

  return (
    <>
      <button type="button" id={id} onClick={openPicker}
        className={`form-input form-input--sm bk-dt-trigger${value ? ' bk-dt-trigger--filled' : ''}${invalid ? ' is-invalid' : ''}`}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0c8b87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="bk-dt-icon"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        <span className="bk-dt-trigger-text">{value ? fmtDateTime(value) : placeholder}</span>
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
                  const ds = ymdParts(cal.y, cal.m, d);
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
              <select value={hh} onChange={(e) => setHh(e.target.value)} className="form-input form-input--sm form-select bk-dtp-select">{HOURS.map((h) => <option key={h} value={h}>{h}</option>)}</select>
              <span className="bk-dtp-colon">:</span>
              <select value={mm} onChange={(e) => setMm(e.target.value)} className="form-input form-input--sm form-select bk-dtp-select">{MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}</select>
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
