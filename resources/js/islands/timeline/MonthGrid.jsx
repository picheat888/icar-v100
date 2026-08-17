import { STATUS_META, TH_DOW, ymd, hhmm, monthGridRange, overlapsDay, bookingLabel, effectiveEnd } from './helpers';

// ปฏิทินรายเดือน - grid 7x6, แต่ละวันโชว์ป้ายการจองสูงสุด 3 + "+N"
// props: year, month (0-based), bookings, today (Date), onSelectDay(dateStr), onOpenDetail(booking),
//        showCounts (แสดงตัวนับงานข้างเลขวันที่ - เฉพาะ admin), compact (ย่อสำหรับมือถือ)
export default function MonthGrid({ year, month, bookings, today, onSelectDay, onOpenDetail, showCounts, compact }) {
  const [start] = monthGridRange(year, month);
  const todayStr = ymd(today);

  // สร้าง 42 ช่อง
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = ymd(d);
    const inMonth = d.getMonth() === month;
    const dayBookings = bookings
      .filter((b) => overlapsDay(b, dateStr))
      .sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));
    // นับงานต่อวัน: เขียว = อนุมัติแล้ว (approved/รอยกเลิก) · ส้ม = รออนุมัติ
    const apprCount = dayBookings.filter((b) => b.status === 'approved' || b.status === 'cancel_requested').length;
    const pendCount = dayBookings.filter((b) => b.status === 'pending').length;
    cells.push({ dateStr, day: d.getDate(), inMonth, isToday: dateStr === todayStr, dow: i % 7, isWeekend: (i % 7) === 0 || (i % 7) === 6, dayBookings, apprCount, pendCount });
  }

  return (
    <div>
      {/* หัวคอลัมน์วัน */}
      <div className="tl-mg-head">
        {TH_DOW.map((h, i) => (
          <div
            key={h}
            className={`tl-mg-dow${compact ? ' tl-mg-dow--compact' : ''}${i === 0 ? ' tl-mg-dow--sun' : i === 6 ? ' tl-mg-dow--sat' : ''}`}
          >
            {h}
          </div>
        ))}
      </div>

      {/* ช่องวัน */}
      <div className="tl-mg-grid">
        {cells.map((c) => (
          <div
            key={c.dateStr}
            onClick={() => onSelectDay(c.dateStr)}
            className={`tl-mg-cell${compact ? ' tl-mg-cell--compact' : ''}${c.isToday ? ' tl-mg-cell--today' : (c.inMonth && c.isWeekend ? ' tl-mg-cell--weekend' : '')}`}
          >
            {/* เลขวันที่ + ตัวนับงาน (เขียว=อนุมัติ, ส้ม=รออนุมัติ) มุมบนของช่อง */}
            <div className={`tl-mg-daynum-row${compact ? ' tl-mg-daynum-row--compact' : ''}`}>
              {c.isToday ? (
                <span className={`tl-mg-today-badge${compact ? ' tl-mg-today-badge--compact' : ''}`}>
                  {c.day}
                </span>
              ) : (
                <span className={`tl-mg-daynum${compact ? ' tl-mg-daynum--compact' : ''}${!c.inMonth ? ' tl-mg-daynum--out' : (c.dow === 0 ? ' tl-mg-daynum--sun' : c.dow === 6 ? ' tl-mg-daynum--sat' : '')}`}>
                  {c.day}
                </span>
              )}
              {showCounts && c.apprCount > 0 && (
                <span className={`tl-mg-count st-approved${compact ? ' tl-mg-count--compact' : ''}`}>
                  <span className="tl-mg-count-dot" />{c.apprCount}
                </span>
              )}
              {showCounts && c.pendCount > 0 && (
                <span className={`tl-mg-count st-pending${compact ? ' tl-mg-count--compact' : ''}`}>
                  <span className="tl-mg-count-dot" />{c.pendCount}
                </span>
              )}
            </div>
            {c.dayBookings.slice(0, 3).map((b) => {
              // key สถานะจริงที่ใช้ (ตกไปที่ pending ถ้า status ไม่รู้จัก) - ใช้ต่อ class สี st-*
              const statusKey = STATUS_META[b.status] ? b.status : 'pending';
              return (
                <div
                  key={b.id}
                  onClick={(e) => { e.stopPropagation(); onOpenDetail(b); }}
                  title={`${hhmm(b.start_at)}-${hhmm(effectiveEnd(b))} ${bookingLabel(b)}`}
                  className={`tl-mg-pill st-${statusKey}${compact ? ' tl-mg-pill--compact' : ''}${!c.inMonth ? ' tl-mg-pill--out' : ''}`}
                >
                  {hhmm(b.start_at)}-{hhmm(effectiveEnd(b))} {bookingLabel(b)}
                </div>
              );
            })}
            {c.dayBookings.length > 3 && (
              <div className={`tl-mg-more${compact ? ' tl-mg-more--compact' : ''}${!c.inMonth ? ' tl-mg-more--out' : ''}`}>+{c.dayBookings.length - 3}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
