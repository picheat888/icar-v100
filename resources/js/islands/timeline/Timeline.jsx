import { useState, useEffect, useCallback, useRef } from 'react';
import { thWeekday } from '../../lib/date';
import { t } from '../../lib/i18n';
import { useDevice } from './useDevice';
import { STATUS_META, TH_MONTHS, ymd, dmy, monthGridRange } from './helpers';
import MonthGrid from './MonthGrid';
import DayGrid from './DayGrid';
import DriverDayList from './DriverDayList';
import DetailModal from './DetailModal';

// เงายกลอยของการ์ด (เข้าชุดกับ Dashboard)
const CARD_SHADOW = '0 1px 2px rgba(17,24,39,.04), 0 10px 24px -10px rgba(17,24,39,.13)';

// container หน้าตารางการใช้รถ — จัดการ view/เดือน/วัน/fetch/modal
// props: role ('admin'|'user'|'driver'), endpoint (URL JSON), book (URL หน้าจองรถ — user+admin; driver ไม่ส่ง)
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

  const loadSeq = useRef(0);   // ลำดับคำขอล่าสุด — กด ‹/› สลับเร็ว ๆ response เก่าจะไม่มาทับ (race)
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

  // เปลี่ยนวัน (มุมมองรายวัน) — ถ้าเลื่อนออกนอกเดือนที่โหลด ให้ขยับ cursor เพื่อโหลดข้อมูลใหม่
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

  // ไปมุมมองรายวัน — ถ้าวันที่เลือกอยู่นอกเดือนที่โหลด ให้รีเซ็ตเป็นวันที่ 1 ของเดือนนั้น
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
    <div style={{ background: '#fff', border: '1px solid #e3e8ec', borderRadius: 16, padding: 18, boxShadow: CARD_SHADOW }}>
      {loadErr && (
        <div style={{ padding: '10px 14px', marginBottom: 12, background: '#fbecea', color: '#9a3b34', borderRadius: 8, fontSize: 13 }}>
          {t('common.load_err')}
        </div>
      )}
      {/* แถบเครื่องมือ: view toggle + ปุ่มวันนี้ + นำทาง (เดือน/วัน) + ปุ่มจองรถ (ขวาสุด) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'inline-flex', background: '#eef1f3', borderRadius: 9, padding: 3, gap: 2 }}>
          <button onClick={() => setView('month')} style={segBtn(view === 'month')}>{t('tl.view_month')}</button>
          <button onClick={showDayView} style={segBtn(view === 'day')}>{t('tl.view_day')}</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={goToday} style={todayBtn}>{t('tl.today')}</button>
          {view === 'month' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => shiftMonth(-1)} style={navBtn} aria-label={t('tl.prev_month')}>‹</button>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2a33', minWidth: 150, textAlign: 'center' }}>
                {TH_MONTHS[month]} {year}
              </div>
              <button onClick={() => shiftMonth(1)} style={navBtn} aria-label={t('tl.next_month')}>›</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => shiftDay(-1)} style={navBtn} aria-label={t('tl.prev_day')}>‹</button>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1f2a33', minWidth: 170, textAlign: 'center' }}>
                {thWeekday(selectedDay)} {dmy(selectedDay)}
              </div>
              <button onClick={() => shiftDay(1)} style={navBtn} aria-label={t('tl.next_day')}>›</button>
            </div>
          )}
          {book && <a href={book} style={bookBtn}>{t('tl.book_car')}</a>}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9aa7b2' }}>{t('common.loading')}</div>
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

// สไตล์ปุ่มจองรถ (เขียว)
const bookBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '9px 18px',
  borderRadius: 9,
  background: '#0c8b87',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
  fontFamily: 'inherit',
};

// segment ของ view toggle (active = พื้นขาวยกนูน)
const segBtn = (on) => ({
  padding: '7px 18px',
  borderRadius: 7,
  border: 'none',
  background: on ? '#fff' : 'transparent',
  color: on ? '#0a716e' : '#6b7884',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: on ? '0 1px 3px rgba(0,0,0,.10)' : 'none',
});

// ปุ่ม "วันนี้" (โทน teal อ่อน)
const todayBtn = {
  padding: '7px 15px',
  borderRadius: 8,
  border: '1px solid #cfe3e1',
  background: '#e6f3f2',
  color: '#0a716e',
  fontWeight: 600,
  fontSize: 13.5,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const navBtn = {
  width: 30,
  height: 30,
  border: '1px solid #e3e9ec',
  borderRadius: 7,
  background: '#fff',
  color: '#54616c',
  cursor: 'pointer',
  fontSize: 18,
  lineHeight: 1,
  fontFamily: 'inherit',
};

// legend สีสถานะใต้ปฏิทิน
function Legend() {
  const items = [STATUS_META.approved, STATUS_META.pending, STATUS_META.completed];
  return (
    <div style={{ display: 'flex', gap: 18, marginTop: 16, paddingTop: 14, borderTop: '1px solid #f2f4f6', flexWrap: 'wrap' }}>
      {items.map((m) => (
        <span key={m.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#54616c', fontWeight: 500 }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, background: m.bg, border: `1px solid ${m.fg}` }} />
          {m.label}
        </span>
      ))}
    </div>
  );
}
