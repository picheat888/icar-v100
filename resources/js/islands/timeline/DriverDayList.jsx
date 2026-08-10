import { t } from '../../lib/i18n';
import { STATUS_META, hhmm, overlapsDay } from './helpers';

// มุมมองรายวันของคนขับ — ลิสต์งานของวันนั้น (การ์ดเรียงตามเวลา)
// props: bookings, dayStr, onOpenDetail
export default function DriverDayList({ bookings, dayStr, onOpenDetail }) {
  const jobs = bookings
    .filter((b) => overlapsDay(b, dayStr))
    .sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));

  if (jobs.length === 0) {
    return <div className="tl-dl-empty">{t('tl.no_jobs_today')}</div>;
  }

  return (
    <div className="tl-dl-list">
      {jobs.map((b) => {
        const meta = STATUS_META[b.status] || STATUS_META.pending;
        return (
          <div
            key={b.id}
            onClick={() => onOpenDetail(b)}
            className="tl-dl-card"
            // สีขอบซ้ายตามสถานะการจอง (STATUS_META) แตกต่างกันไปตาม booking ที่ runtime
            style={{ borderLeftColor: meta.fg }}
          >
            <div className="tl-dl-row">
              <div className="tl-dl-time">{hhmm(b.start_at)}–{hhmm(b.end_at)}</div>
              <span
                className="tl-dl-badge"
                // สี/พื้นหลังป้ายสถานะตาม STATUS_META ของสถานะนั้นที่ runtime
                style={{ color: meta.fg, background: meta.bg }}
              >{meta.label}</span>
            </div>
            <div className="tl-dl-loc">{b.location}</div>
            <div className="tl-dl-meta">{t('tl.requester_colon')}{b.requester_name || '-'} · {t('req.people', { n: b.people })}</div>
          </div>
        );
      })}
    </div>
  );
}
