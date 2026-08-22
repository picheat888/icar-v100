import { useState, useEffect, useCallback, useRef } from 'react';
import { t } from '../../lib/i18n';
import { useDevice } from './useDevice';
import { STATUS_META, monthGridRange } from './helpers';
import { MONTHS, ymd, fmtDate, weekdayName } from '../../lib/date';
import MonthGrid from './MonthGrid';
import DayGrid from './DayGrid';
import DriverDayList from './DriverDayList';
import DetailModal from './DetailModal';
import { SkelBox } from '../../lib/Skeleton';

// container หน้าตารางการใช้รถ - จัดการ view/เดือน/วัน/fetch/modal
// props: role ('admin'|'user'|'driver'), endpoint (URL JSON), book (URL หน้าจองรถ - user+admin; driver ไม่ส่ง)
export default function Timeline({ role, endpoint, book }) {
  const today = new Date();
  const device = useDevice();                           // 'mobile' | 'tablet' | 'desktop'
  const [view, setView] = useState('month');           // 'month' | 'day'
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(ymd(today)); // 'YYYY-MM-DD'
  const [data, setData] = useState({ bookings: [], cars: [] });
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [selected, setSelected] = useState(null);      // booking สำหรับ modal

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const loadSeq = useRef(0);   // ลำดับคำขอล่าสุด - กด ‹/› สลับเร็ว ๆ response เก่าจะไม่มาทับ (race)
  // ดึงข้อมูลของช่วง grid เดือนที่ดู
  const load = useCallback(() => {
    const [gs, ge] = monthGridRange(year, month);
    const seq = ++loadSeq.current;
    setLoading(true);
    setLoadErr(false);
    fetch(`${endpoint}?from=${ymd(gs)}&to=${ymd(ge)}`, { headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((json) => { if (seq === loadSeq.current) setData({ bookings: json.bookings || [], cars: json.cars || [] }); })
      .finally(() => { if (seq === loadSeq.current) setLoading(false); })
      .catch(() => { if (seq === loadSeq.current) setLoadErr(true); });
  }, [endpoint, year, month]);

  useEffect(() => { load(); }, [load]);

  // เปลี่ยนเดือน
  const shiftMonth = (dir) => setCursor(new Date(year, month + dir, 1));

  // เปลี่ยนวัน (มุมมองรายวัน) - ถ้าเลื่อนออกนอกเดือนที่โหลด ให้ขยับ cursor เพื่อโหลดข้อมูลใหม่
  const shiftDay = (dir) => {
    const d = new Date(selectedDay + 'T00:00:00');
    d.setDate(d.getDate() + dir);
    setSelectedDay(ymd(d));
    if (d.getFullYear() !== year || d.getMonth() !== month) {
      setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  // กลับมาที่ "วันนี้" (ทั้งเดือนปัจจุบัน + วันนี้)
  const goToday = () => {
    const t = new Date();
    setCursor(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelectedDay(ymd(t));
  };

  // แตะวัน -> ไปมุมมองรายวัน
  const selectDay = (dateStr) => { setSelectedDay(dateStr); setView('day'); };

  // ไปมุมมองรายวัน - ถ้าวันที่เลือกอยู่นอกเดือนที่โหลด ให้รีเซ็ตเป็นวันที่ 1 ของเดือนนั้น
  const showDayView = () => {
    const d = new Date(selectedDay + 'T00:00:00');
    if (d.getFullYear() !== year || d.getMonth() !== month) {
      setSelectedDay(ymd(new Date(year, month, 1)));
    }
    setView('day');
  };

  // เปิดโมดัลรายละเอียดการจอง
  const openDetail = (b) => setSelected(b);

  return (
    <div className="tl-wrap">
      {loadErr && (
        <div className="alert-error alert-error--sm">
          {t('common.load_err')}
        </div>
      )}
      {/* แถบเครื่องมือ: view toggle + ปุ่มวันนี้ + นำทาง (เดือน/วัน) + ปุ่มจองรถ (ขวาสุด) */}
      <div className="tl-toolbar">
        <div className="tl-viewtoggle">
          <button onClick={() => setView('month')} className={`tl-segbtn${view === 'month' ? ' tl-segbtn--active' : ''}`}>{t('tl.view_month')}</button>
          <button onClick={showDayView} className={`tl-segbtn${view === 'day' ? ' tl-segbtn--active' : ''}`}>{t('tl.view_day')}</button>
        </div>
        <div className="tl-actions">
          <button onClick={goToday} className="tl-today-btn">{t('tl.today')}</button>
          {view === 'month' ? (
            <div className="tl-navwrap">
              <button onClick={() => shiftMonth(-1)} className="tl-nav-btn" aria-label={t('tl.prev_month')}>‹</button>
              <div className="tl-month-label">
                {MONTHS[month]} {year}
              </div>
              <button onClick={() => shiftMonth(1)} className="tl-nav-btn" aria-label={t('tl.next_month')}>›</button>
            </div>
          ) : (
            <div className="tl-navwrap">
              <button onClick={() => shiftDay(-1)} className="tl-nav-btn" aria-label={t('tl.prev_day')}>‹</button>
              <div className="tl-day-label">
                {weekdayName(selectedDay)} {fmtDate(selectedDay)}
              </div>
              <button onClick={() => shiftDay(1)} className="tl-nav-btn" aria-label={t('tl.next_day')}>›</button>
            </div>
          )}
          {book && <a href={book} className="tl-book-btn">{t('tl.book_car')}</a>}
        </div>
      </div>

      {loading ? (
        <SkelBox />
      ) : view === 'month' ? (
        <>
          <MonthGrid
            year={year}
            month={month}
            bookings={data.bookings}
            today={today}
            onSelectDay={selectDay}
            onOpenDetail={openDetail}
            showCounts={role === 'admin'}
            compact={device === 'mobile'}
          />
          <Legend />
        </>
      ) : role === 'driver' ? (
        <DriverDayList bookings={data.bookings} dayStr={selectedDay} onOpenDetail={openDetail} />
      ) : (
        <DayGrid cars={data.cars} bookings={data.bookings} dayStr={selectedDay} onOpenDetail={openDetail} device={device} book={book} />
      )}

      <DetailModal booking={selected} role={role} onClose={() => setSelected(null)} />
    </div>
  );
}

// legend สีสถานะใต้ปฏิทิน - ใช้คู่กับ class .st-* (ดู §1.15)
function Legend() {
  const keys = ['approved', 'pending', 'completed'];
  return (
    <div className="tl-legend">
      {keys.map((k) => (
        <span key={k} className="tl-legend-item">
          <span className={`tl-legend-swatch st-${k}`} />
          {STATUS_META[k].label}
        </span>
      ))}
    </div>
  );
}
