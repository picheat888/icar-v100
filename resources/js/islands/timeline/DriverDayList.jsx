import { t } from '../../lib/i18n';
import { STATUS_META, hhmm, overlapsDay } from './helpers';

// มุมมองรายวันของคนขับ — ลิสต์งานของวันนั้น (การ์ดเรียงตามเวลา)
// props: bookings, dayStr, onOpenDetail
export default function DriverDayList({ bookings, dayStr, onOpenDetail }) {
  const jobs = bookings
    .filter((b) => overlapsDay(b, dayStr))
    .sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));

  if (jobs.length === 0) {
    return <div style={{ padding: 30, textAlign: 'center', color: '#9aa7b2' }}>{t('tl.no_jobs_today')}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {jobs.map((b) => {
        const meta = STATUS_META[b.status] || STATUS_META.pending;
        return (
          <div
            key={b.id}
            onClick={() => onOpenDetail(b)}
            style={{ border: '1px solid #eef1f3', borderLeft: `4px solid ${meta.fg}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontWeight: 700, color: '#1f2a33' }}>{hhmm(b.start_at)}–{hhmm(b.end_at)}</div>
              <span style={{ fontSize: 12, color: meta.fg, background: meta.bg, borderRadius: 6, padding: '2px 8px' }}>{meta.label}</span>
            </div>
            <div style={{ fontSize: 13, color: '#54616c', marginTop: 4 }}>{b.location}</div>
            <div style={{ fontSize: 12, color: '#9aa7b2', marginTop: 2 }}>{t('tl.requester_colon')}{b.requester_name || '-'} · {t('req.people', { n: b.people })}</div>
          </div>
        );
      })}
    </div>
  );
}
