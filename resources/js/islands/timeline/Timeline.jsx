import { useState, useEffect, useCallback, useRef } from 'react';
import { t } from '../../lib/i18n';
import { useDevice } from './useDevice';
import { STATUS_META, monthGridRange, parseDT } from './helpers';
import { MONTHS, ymd, fmtDate, weekdayName } from '../../lib/date';
import MonthGrid from './MonthGrid';
import DayGrid from './DayGrid';
import DriverDayList from './DriverDayList';
import DetailModal from './DetailModal';
import { SkelBox } from '../../lib/Skeleton';

// กว้างของช่วงที่ค้นหาการจองจากลิงก์ (ปี) - ย้อนหลังและล่วงหน้าเท่านี้จากปีปัจจุบัน
const DEEP_LINK_YEARS = 1;

// รหัสการจองใน URL (?b=BK-0001) - ไม่มีคืน null
function readCode() {
  return new URLSearchParams(window.location.search).get('b') || null;
}

// เขียน ?b= ลง URL - mode 'push' (เปิดรายละเอียด ให้ปุ่ม Back ย้อนได้) หรือ 'replace' (แก้เงียบ ๆ ไม่เพิ่มประวัติ)
function writeCode(code, mode) {
  const url = new URL(window.location.href);
  if (code) {
    url.searchParams.set('b', code);
  } else {
    url.searchParams.delete('b');
  }
  const state = code ? { tlBooking: code } : {};
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](state, '', url.toString());
}

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
  const [deepCode, setDeepCode] = useState(readCode);  // รหัสจาก URL ที่ยังหาไม่เจอ

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

  const wideSeek = useRef(false);   // ค้นช่วงกว้างไปแล้วหรือยัง - กันยิงซ้ำระหว่างรอ response
  // เปิดรายละเอียดตามรหัสใน URL - อยู่ในเดือนที่โหลดแล้วก็เปิดเลย ไม่งั้นค้นช่วงกว้างแล้วเด้งปฏิทินไปเดือนของการจองนั้น
  useEffect(() => {
    if (! deepCode || loading) {
      return;
    }

    const hit = data.bookings.find((b) => b.booking_code === deepCode);
    if (hit) {
      setSelected(hit);
      setDeepCode(null);

      return;
    }

    if (wideSeek.current) {
      return;
    }
    wideSeek.current = true;

    const y    = new Date().getFullYear();
    const from = ymd(new Date(y - DEEP_LINK_YEARS, 0, 1));
    const to   = ymd(new Date(y + DEEP_LINK_YEARS, 11, 31));

    // หาไม่เจอ/ไม่มีสิทธิ์ดู -> ล้าง ?b= ทิ้งเงียบ ๆ ให้เหลือหน้าปฏิทินปกติ
    const giveUp = () => {
      setDeepCode(null);
      writeCode(null, 'replace');
    };

    fetch(`${endpoint}?from=${from}&to=${to}`, { headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((json) => {
        const b = (json.bookings || []).find((x) => x.booking_code === deepCode);
        if (! b) {
          giveUp();

          return;
        }
        const d = parseDT(b.start_at);
        setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
        setSelectedDay(ymd(d));
        setSelected(b);
        setDeepCode(null);
      })
      .catch(giveUp);
  }, [deepCode, loading, data.bookings, endpoint]);

  // ปุ่ม Back/Forward ของเบราว์เซอร์ - ตาม ?b= ใน URL ที่ย้อนไปถึง
  useEffect(() => {
    const onPop = () => {
      const code = readCode();
      wideSeek.current = false;
      setSelected(null);
      setDeepCode(code);
    };
    window.addEventListener('popstate', onPop);

    return () => window.removeEventListener('popstate', onPop);
  }, []);

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

  // เปิดโมดัลรายละเอียดการจอง - ใส่รหัสลง URL ให้คัดลอกลิงก์ส่งต่อได้
  const openDetail = (b) => {
    writeCode(b.booking_code, 'push');
    setSelected(b);
  };

  // ปิดโมดัล - ถ้าเราเป็นคน push ให้ถอยประวัติ 1 ขั้น (Back กับปุ่มปิดจึงให้ผลเดียวกัน)
  // เปิดจากลิงก์ตรง ๆ ไม่มีขั้นให้ถอย -> ล้าง ?b= ทิ้งแทน
  const closeDetail = () => {
    if (window.history.state?.tlBooking) {
      window.history.back();

      return;
    }
    writeCode(null, 'replace');
    setSelected(null);
  };

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

      <DetailModal booking={selected} role={role} onClose={closeDetail} />
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
