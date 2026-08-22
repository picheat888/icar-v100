import { t } from '../../lib/i18n';
import { STATUS_META, parseDT, overlapsDay, bookingLabel, effectiveEnd, dayRange, fullRange } from './helpers';
import { ymd, pad } from '../../lib/date';

const DAY_START = 6;   // แกนเวลาเริ่ม 06:00
const DAY_END = 20;    // แกนเวลาจบ 20:00
const SPAN = DAY_END - DAY_START;

// แปลง Date -> ชั่วโมงทศนิยม (clamp ให้อยู่ในช่วง 06:00-20:00 ของวัน dayStr)
function clampHour(d, dayStr) {
  const day = new Date(dayStr + 'T00:00:00');
  const diffDays = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - day) / 86400000);
  let h = d.getHours() + d.getMinutes() / 60 + diffDays * 24; // ชั่วโมงเทียบต้นวัน dayStr
  if (h < DAY_START) h = DAY_START;
  if (h > DAY_END) h = DAY_END;
  return h;
}

// มุมมองรายวัน - แถว = รถขับเองแต่ละคัน, แถบการจอง self วางตามเวลา
// props: cars, bookings, dayStr, onOpenDetail, device ('mobile'|'tablet'|'desktop')
export default function DayGrid({ cars, bookings, dayStr, onOpenDetail, device, book }) {
  // แกนเวลารายชั่วโมง 06:00-20:00 (ป้าย + เส้นแนวตั้งทุกชั่วโมง)
  const ticks = Array.from({ length: SPAN + 1 }, (_, i) => DAY_START + i);

  // เส้น "เวลาตอนนี้" - แสดงเฉพาะเมื่อดูวันนี้ และเวลาปัจจุบันอยู่ในช่วง 06:00-20:00
  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;
  const showNow = dayStr === ymd(now) && nowH >= DAY_START && nowH <= DAY_END;
  const nowLeft = ((nowH - DAY_START) / SPAN) * 100;

  // มีการจองในวันนี้ไหม (self + other) - ใช้ตัดสิน empty state
  const dayCount = bookings.filter((b) => overlapsDay(b, dayStr)).length;

  // ปรับขนาด/ความกว้างตามจอ - คุมด้วย class modifier ใน style.css (§6 .tl-dg-*)
  const isMobile = device === 'mobile';
  const isTablet = device === 'tablet';

  // คำขอ "รถอื่นๆ" ของวันนี้ (ไม่มีคอลัมน์รถ) - แสดงแถวละคำขอใต้ตารางรถ ตาม scoping ที่ backend ส่งมา
  const otherBookings = bookings
    .filter((b) => b.booking_type === 'other' && overlapsDay(b, dayStr))
    .sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));

  return (
    <div>
      {/* ยังไม่มีการจองในวันนี้ (รถทุกคันว่าง) */}
      {dayCount === 0 && (
        <div className="tl-dg-empty">{t('tl.day_empty')}</div>
      )}
      {/* hint สำหรับมือถือ: เลื่อนแนวนอนดูช่วงเวลา */}
      {isMobile && (
        <div className="tl-dg-hint">{t('tl.scroll_hint')}</div>
      )}
      <div className="tl-dg-scroll">
        <div className={`tl-dg-inner${isTablet ? ' tl-dg-inner--tablet' : isMobile ? ' tl-dg-inner--mobile' : ''}`}>
          {/* แกนเวลา */}
          <div className="tl-dg-axis-row">
            <div className={`tl-dg-axis-spacer${isTablet ? ' tl-dg-axis-spacer--tablet' : isMobile ? ' tl-dg-axis-spacer--mobile' : ''}`} />
            <div className="tl-dg-axis-track">
              {ticks.map((t) => (
                <span
                  key={t}
                  className={`tl-dg-tick${isTablet ? ' tl-dg-tick--tablet' : isMobile ? ' tl-dg-tick--mobile' : ''}`}
                  // left คำนวณจากตำแหน่งชั่วโมงบนแกนเวลาต่อเนื่อง - ค่า runtime
                  style={{ left: `${((t - DAY_START) / SPAN) * 100}%` }}
                >
                  {pad(t) + ':00'}
                </span>
              ))}
              {/* จุดแดง = เวลาตอนนี้ */}
              {showNow && (
                <span
                  className="tl-dg-now-dot"
                  // left คำนวณจากเวลาปัจจุบันจริงบนแกนเวลาต่อเนื่อง - ค่า runtime
                  style={{ left: `${nowLeft}%` }}
                />
              )}
            </div>
          </div>

          {/* แถวรถ */}
          {cars.map((car) => {
            const maint = car.status === 'maintenance';
            const bars = maint ? [] : bookings.filter(
              (b) => b.booking_type === 'self' && String(b.car_id) === String(car.id) && overlapsDay(b, dayStr),
            );
            return (
              <div key={car.id} className="tl-dg-row">
                <div className={`tl-dg-label-col${isTablet ? ' tl-dg-label-col--tablet' : ''}${isMobile ? ' tl-dg-label-col--mobile' : ''}${maint ? ' tl-dg-label-col--maint' : ''}`}>
                  <div className="tl-dg-label-primary">{car.model}</div>
                  <div className={`tl-dg-label-sub${isMobile ? ' tl-dg-label-sub--mobile' : ''}`}>{car.plate}{maint ? ' · ' + t('car.status_maintenance') : ''}</div>
                </div>
                <div className={`tl-dg-track${isMobile ? ' tl-dg-track--mobile' : ''}${maint ? ' tl-dg-track--maint' : ''}`}>
                  {ticks.map((t) => (
                    <div
                      key={t}
                      className="tl-dg-tick-line"
                      // left คำนวณจากตำแหน่งชั่วโมงบนแกนเวลาต่อเนื่อง - ค่า runtime
                      style={{ left: `${((t - DAY_START) / SPAN) * 100}%` }}
                    />
                  ))}
                  {showNow && (
                    <div
                      className="tl-dg-now-line"
                      // left คำนวณจากเวลาปัจจุบันจริงบนแกนเวลาต่อเนื่อง - ค่า runtime
                      style={{ left: `${nowLeft}%` }}
                    />
                  )}
                  {bars.map((b) => {
                    const eEnd = effectiveEnd(b);
                    const sh = clampHour(parseDT(b.start_at), dayStr);
                    const eh = clampHour(parseDT(eEnd), dayStr);
                    const statusKey = STATUS_META[b.status] ? b.status : 'pending';
                    return (
                      <div
                        key={b.id}
                        className={`tl-bar st-${statusKey}${isMobile ? ' tl-bar--mobile' : ''}`}
                        onClick={() => onOpenDetail(b)}
                        title={`${fullRange(b, eEnd)} ${bookingLabel(b)}`}
                        // left/width คำนวณจากช่วงเวลาจองจริงบนแกนเวลาต่อเนื่อง - ค่า runtime
                        style={{
                          left: `${((sh - DAY_START) / SPAN) * 100}%`,
                          width: `${Math.max((eh - sh) / SPAN * 100, 2)}%`,
                        }}
                      >
                        {dayRange(b, dayStr, eEnd)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {cars.length === 0 && (
            <div className="tl-dg-no-cars">{t('tl.no_self_cars')}</div>
          )}

          {/* รถอื่นๆ (จัดหา) - คำขอที่ไม่มีคอลัมน์รถ วางแถวละคำขอบนแกนเวลาเดียวกัน */}
          {otherBookings.length > 0 && (
            <>
              <div className="tl-dg-other-head">
                <div className={`tl-dg-other-label${isTablet ? ' tl-dg-other-label--tablet' : ''}${isMobile ? ' tl-dg-other-label--mobile' : ''}`}>{t('tl.other_cars_label')}</div>
                <div className="tl-dg-other-head-fill" />
              </div>
              {otherBookings.map((b) => {
                const sh = clampHour(parseDT(b.start_at), dayStr);
                const eh = clampHour(parseDT(b.end_at), dayStr);
                const statusKey = STATUS_META[b.status] ? b.status : 'pending';
                return (
                  <div key={b.id} className="tl-dg-row">
                    <div className={`tl-dg-label-col${isTablet ? ' tl-dg-label-col--tablet' : ''}${isMobile ? ' tl-dg-label-col--mobile' : ''}`}>
                      <div className="tl-dg-label-primary">{b.requester_name || t('tl.other_car_requester_fallback')}</div>
                      <div className={`tl-dg-label-sub tl-dg-label-sub-clip${isMobile ? ' tl-dg-label-sub--mobile' : ''}`}>{bookingLabel(b)}</div>
                    </div>
                    <div className={`tl-dg-track${isMobile ? ' tl-dg-track--mobile' : ''}`}>
                      {ticks.map((t) => (
                        <div
                          key={t}
                          className="tl-dg-tick-line"
                          // left คำนวณจากตำแหน่งชั่วโมงบนแกนเวลาต่อเนื่อง - ค่า runtime
                          style={{ left: `${((t - DAY_START) / SPAN) * 100}%` }}
                        />
                      ))}
                      {showNow && (
                        <div
                          className="tl-dg-now-line"
                          // left คำนวณจากเวลาปัจจุบันจริงบนแกนเวลาต่อเนื่อง - ค่า runtime
                          style={{ left: `${nowLeft}%` }}
                        />
                      )}
                      <div
                        className={`tl-bar st-${statusKey}${isMobile ? ' tl-bar--mobile' : ''}`}
                        onClick={() => onOpenDetail(b)}
                        title={`${fullRange(b, b.end_at)} ${bookingLabel(b)}`}
                        // left/width คำนวณจากช่วงเวลาจองจริงบนแกนเวลาต่อเนื่อง - ค่า runtime
                        style={{
                          left: `${((sh - DAY_START) / SPAN) * 100}%`,
                          width: `${Math.max((eh - sh) / SPAN * 100, 2)}%`,
                        }}
                      >
                        {dayRange(b, dayStr, b.end_at)}
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
