import { t } from '../../lib/i18n';
import { STATUS_META, hhmm, ymd, parseDT, overlapsDay, bookingLabel, effectiveEnd } from './helpers';

const DAY_START = 6;   // แกนเวลาเริ่ม 06:00
const DAY_END = 20;    // แกนเวลาจบ 20:00
const SPAN = DAY_END - DAY_START;

// แปลง Date -> ชั่วโมงทศนิยม (clamp ให้อยู่ในช่วง 06:00–20:00 ของวัน dayStr)
function clampHour(d, dayStr) {
  const day = new Date(dayStr + 'T00:00:00');
  const diffDays = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - day) / 86400000);
  let h = d.getHours() + d.getMinutes() / 60 + diffDays * 24; // ชั่วโมงเทียบต้นวัน dayStr
  if (h < DAY_START) h = DAY_START;
  if (h > DAY_END) h = DAY_END;
  return h;
}

// มุมมองรายวัน — แถว = รถขับเองแต่ละคัน, แถบการจอง self วางตามเวลา
// props: cars, bookings, dayStr, onOpenDetail, device ('mobile'|'tablet'|'desktop')
export default function DayGrid({ cars, bookings, dayStr, onOpenDetail, device, book }) {
  // แกนเวลารายชั่วโมง 06:00–20:00 (ป้าย + เส้นแนวตั้งทุกชั่วโมง)
  const ticks = Array.from({ length: SPAN + 1 }, (_, i) => DAY_START + i);

  // เส้น "เวลาตอนนี้" — แสดงเฉพาะเมื่อดูวันนี้ และเวลาปัจจุบันอยู่ในช่วง 06:00–20:00
  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;
  const showNow = dayStr === ymd(now) && nowH >= DAY_START && nowH <= DAY_END;
  const nowLeft = ((nowH - DAY_START) / SPAN) * 100;
  const nowLine = { position: 'absolute', top: 0, bottom: 0, left: `${nowLeft}%`, width: 2, background: '#e5484d', zIndex: 3, pointerEvents: 'none' };

  // มีการจองในวันนี้ไหม (self + other) — ใช้ตัดสิน empty state
  const dayCount = bookings.filter((b) => overlapsDay(b, dayStr)).length;

  const isMobile = device === 'mobile';
  const isTablet = device === 'tablet';

  // ป้ายรายชั่วโมง 15 อัน ต้องการความกว้าง — ให้เลื่อนแนวนอนได้ทุกจอถ้าไม่พอ (เดสก์ท็อปกว้างพอ)
  const overflowX = 'auto';
  const innerMinWidth = isMobile ? 760 : isTablet ? 820 : 940;
  const labelW = isMobile ? 108 : isTablet ? 116 : 150;
  const trackMinH = isMobile ? 38 : 46;
  const barH = trackMinH - 14;
  const tickFont = isMobile ? 9.5 : isTablet ? 10 : 11.5;
  const labelFont = isMobile ? 11.5 : 13;
  const subFont = isMobile ? 10 : 11;

  // คำขอ "รถอื่นๆ" ของวันนี้ (ไม่มีคอลัมน์รถ) — แสดงแถวละคำขอใต้ตารางรถ ตาม scoping ที่ backend ส่งมา
  const otherBookings = bookings
    .filter((b) => b.booking_type === 'other' && overlapsDay(b, dayStr))
    .sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));

  return (
    <div>
      {/* ยังไม่มีการจองในวันนี้ (รถทุกคันว่าง) */}
      {dayCount === 0 && (
        <div style={{ background: '#f2f8f7', border: '1px solid #cfe6e3', borderRadius: 10, padding: '12px 16px', marginBottom: 12, fontSize: 13.5, color: '#0a716e', fontWeight: 600 }}>{t('tl.day_empty')}</div>
      )}
      {/* hint สำหรับมือถือ: เลื่อนแนวนอนดูช่วงเวลา */}
      {isMobile && (
        <div style={{ fontSize: 11.5, color: '#9aa7b2', marginBottom: 8 }}>{t('tl.scroll_hint')}</div>
      )}
      <div style={{ overflowX }}>
        <div style={{ minWidth: innerMinWidth }}>
          {/* แกนเวลา */}
          <div style={{ display: 'flex' }}>
            <div style={{ width: labelW, flexShrink: 0 }} />
            <div style={{ position: 'relative', flex: 1, height: 22 }}>
              {ticks.map((t) => (
                <span key={t} style={{ position: 'absolute', left: `${((t - DAY_START) / SPAN) * 100}%`, transform: 'translateX(-50%)', fontSize: tickFont, color: '#9aa7b2', fontWeight: 600 }}>
                  {(t < 10 ? '0' + t : t) + ':00'}
                </span>
              ))}
              {/* จุดแดง = เวลาตอนนี้ */}
              {showNow && <span style={{ position: 'absolute', left: `${nowLeft}%`, transform: 'translateX(-50%)', bottom: 0, width: 8, height: 8, borderRadius: '50%', background: '#e5484d' }} />}
            </div>
          </div>

          {/* แถวรถ */}
          {cars.map((car) => {
            const maint = car.status === 'maintenance';
            const bars = maint ? [] : bookings.filter(
              (b) => b.booking_type === 'self' && String(b.car_id) === String(car.id) && overlapsDay(b, dayStr),
            );
            return (
              <div key={car.id} style={{ display: 'flex', alignItems: 'stretch', borderTop: '1px solid #e3e8ec' }}>
                <div style={{ width: labelW, flexShrink: 0, padding: '10px 8px', fontSize: labelFont, color: maint ? '#b0b9c0' : '#1f2a33' }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{car.model}</div>
                  <div style={{ fontSize: subFont, color: '#9aa7b2' }}>{car.plate}{maint ? ' · ' + t('car.status_maintenance') : ''}</div>
                </div>
                <div style={{ position: 'relative', flex: 1, minHeight: trackMinH, background: maint ? '#f7f8f9' : '#fff' }}>
                  {ticks.map((t) => (
                    <div key={t} style={{ position: 'absolute', top: 0, bottom: 0, left: `${((t - DAY_START) / SPAN) * 100}%`, width: 1, background: '#e3e8ec' }} />
                  ))}
                  {showNow && <div style={nowLine} />}
                  {bars.map((b) => {
                    const eEnd = effectiveEnd(b);
                    const sh = clampHour(parseDT(b.start_at), dayStr);
                    const eh = clampHour(parseDT(eEnd), dayStr);
                    const meta = STATUS_META[b.status] || STATUS_META.pending;
                    return (
                      <div
                        key={b.id}
                        className="tl-bar"
                        onClick={() => onOpenDetail(b)}
                        title={`${hhmm(b.start_at)}–${hhmm(eEnd)} ${bookingLabel(b)}`}
                        style={{
                          position: 'absolute',
                          top: 7,
                          height: barH,
                          left: `${((sh - DAY_START) / SPAN) * 100}%`,
                          width: `${Math.max((eh - sh) / SPAN * 100, 2)}%`,
                          background: meta.bg,
                          color: meta.fg,
                          border: `1px solid ${meta.fg}`,
                          borderRadius: 6,
                          fontSize: 11,
                          padding: '2px 6px',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer',
                        }}
                      >
                        {hhmm(b.start_at)}–{hhmm(eEnd)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {cars.length === 0 && (
            <div style={{ padding: 30, textAlign: 'center', color: '#9aa7b2' }}>{t('tl.no_self_cars')}</div>
          )}

          {/* รถอื่นๆ (จัดหา) — คำขอที่ไม่มีคอลัมน์รถ วางแถวละคำขอบนแกนเวลาเดียวกัน */}
          {otherBookings.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid #e3ecec', background: '#f2f8f7' }}>
                <div style={{ width: labelW, flexShrink: 0, padding: '7px 8px', fontSize: subFont, fontWeight: 700, color: '#0a716e' }}>{t('tl.other_cars_label')}</div>
                <div style={{ flex: 1 }} />
              </div>
              {otherBookings.map((b) => {
                const sh = clampHour(parseDT(b.start_at), dayStr);
                const eh = clampHour(parseDT(b.end_at), dayStr);
                const meta = STATUS_META[b.status] || STATUS_META.pending;
                return (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'stretch', borderTop: '1px solid #e3e8ec' }}>
                    <div style={{ width: labelW, flexShrink: 0, padding: '10px 8px', fontSize: labelFont, color: '#1f2a33' }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.requester_name || t('tl.other_car_requester_fallback')}</div>
                      <div style={{ fontSize: subFont, color: '#9aa7b2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bookingLabel(b)}</div>
                    </div>
                    <div style={{ position: 'relative', flex: 1, minHeight: trackMinH, background: '#fff' }}>
                      {ticks.map((t) => (
                        <div key={t} style={{ position: 'absolute', top: 0, bottom: 0, left: `${((t - DAY_START) / SPAN) * 100}%`, width: 1, background: '#e3e8ec' }} />
                      ))}
                      {showNow && <div style={nowLine} />}
                      <div
                        className="tl-bar"
                        onClick={() => onOpenDetail(b)}
                        title={`${hhmm(b.start_at)}–${hhmm(b.end_at)} ${bookingLabel(b)}`}
                        style={{
                          position: 'absolute',
                          top: 7,
                          height: barH,
                          left: `${((sh - DAY_START) / SPAN) * 100}%`,
                          width: `${Math.max((eh - sh) / SPAN * 100, 2)}%`,
                          background: meta.bg,
                          color: meta.fg,
                          border: `1px solid ${meta.fg}`,
                          borderRadius: 6,
                          fontSize: 11,
                          padding: '2px 6px',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer',
                        }}
                      >
                        {hhmm(b.start_at)}–{hhmm(b.end_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
