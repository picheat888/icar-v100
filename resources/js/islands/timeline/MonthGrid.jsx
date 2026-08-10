import { STATUS_META, TH_DOW, ymd, hhmm, monthGridRange, overlapsDay, bookingLabel, effectiveEnd } from './helpers';

// สีวันหยุด: อาทิตย์ = แดง · เสาร์ = เหลือง (ทอง-เหลืองให้อ่านออกบนพื้นขาว)
const SUN = '#d0555f';
const SAT = '#e6b500';
const weekendColor = (dow) => (dow === 0 ? SUN : dow === 6 ? SAT : null);

// ปฏิทินรายเดือน — grid 7x6, แต่ละวันโชว์ป้ายการจองสูงสุด 3 + "+N"
// props: year, month (0-based), bookings, today (Date), onSelectDay(dateStr), onOpenDetail(booking),
//        showCounts (แสดงตัวนับงานข้างเลขวันที่ — เฉพาะ admin), compact (ย่อสำหรับมือถือ)
export default function MonthGrid({ year, month, bookings, today, onSelectDay, onOpenDetail, showCounts, compact }) {
  const [start] = monthGridRange(year, month);
  const todayStr = ymd(today);

  // ค่าขนาดตาม compact (มือถือย่อลง)
  const cellMinH = compact ? 66 : 96;
  const cellPad = compact ? 4 : 6;
  const dayFont = compact ? 11 : 12;
  const dowFont = compact ? 10 : 12;
  const pillFont = compact ? 9.5 : 11;
  const countFont = compact ? 10 : 11;

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {TH_DOW.map((h, i) => (
          <div key={h} style={{ textAlign: 'center', fontSize: dowFont, fontWeight: (i === 0 || i === 6) ? 700 : 600, color: weekendColor(i) || '#8a97a2', padding: compact ? '6px 0' : '9px 0' }}>{h}</div>
        ))}
      </div>

      {/* ช่องวัน */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid #dde3e8', borderRadius: 10, overflow: 'hidden' }}>
        {cells.map((c) => (
          <div
            key={c.dateStr}
            onClick={() => onSelectDay(c.dateStr)}
            style={{
              minHeight: cellMinH,
              minWidth: 0,
              borderRight: '1px solid #e3e8ec',
              borderBottom: '1px solid #e3e8ec',
              padding: cellPad,
              background: c.isToday ? '#e9f5f3' : (c.inMonth && c.isWeekend ? '#f7f9fb' : '#fff'),
              cursor: 'pointer',
            }}
          >
            {/* เลขวันที่ + ตัวนับงาน (เขียว=อนุมัติ, ส้ม=รออนุมัติ) มุมบนของช่อง */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: compact ? 4 : 6, marginBottom: 4 }}>
              {c.isToday ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: dayFont + 10, height: dayFont + 10, borderRadius: '50%', background: '#0c8b87', color: '#fff', fontSize: dayFont, fontWeight: 700 }}>
                  {c.day}
                </span>
              ) : (
                <span style={{ fontSize: dayFont, fontWeight: 700, color: !c.inMonth ? '#b6bec6' : (weekendColor(c.dow) || '#1f2a33') }}>
                  {c.day}
                </span>
              )}
              {showCounts && c.apprCount > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: countFont, fontWeight: 700, color: '#0c8b87' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0c8b87' }} />{c.apprCount}
                </span>
              )}
              {showCounts && c.pendCount > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: countFont, fontWeight: 700, color: '#e08a1e' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e08a1e' }} />{c.pendCount}
                </span>
              )}
            </div>
            {c.dayBookings.slice(0, 3).map((b) => {
              const meta = STATUS_META[b.status] || STATUS_META.pending;
              return (
                <div
                  key={b.id}
                  onClick={(e) => { e.stopPropagation(); onOpenDetail(b); }}
                  title={`${hhmm(b.start_at)}–${hhmm(effectiveEnd(b))} ${bookingLabel(b)}`}
                  style={{
                    background: meta.bg,
                    color: meta.fg,
                    fontSize: pillFont,
                    lineHeight: 1.5,
                    borderRadius: 5,
                    padding: compact ? '1px 4px' : '1px 5px',
                    marginBottom: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    opacity: c.inMonth ? 1 : 0.45,
                  }}
                >
                  {hhmm(b.start_at)}–{hhmm(effectiveEnd(b))} {bookingLabel(b)}
                </div>
              );
            })}
            {c.dayBookings.length > 3 && (
              <div style={{ fontSize: pillFont, color: '#8a97a2', fontWeight: 600, opacity: c.inMonth ? 1 : 0.45 }}>+{c.dayBookings.length - 3}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
