import { t } from '../../lib/i18n';
import { STATUS_META, hhmm, dmy } from './helpers';

// modal รายละเอียดการจอง (อ่านอย่างเดียว) — ไม่มีปุ่มจัดการ
// props: booking, role, onClose
export default function DetailModal({ booking, role, onClose }) {
  if (!booking) return null;
  const meta = STATUS_META[booking.status] || STATUS_META.pending;
  const typeLabel = booking.booking_type === 'self' ? t('req.car_self') : t('tl.type_other_provided');

  // ชื่อรถ/คนขับ ตามประเภท
  const carText = booking.booking_type === 'self'
    ? [booking.car_model, booking.car_plate].filter(Boolean).join(' · ') || '-'
    : (booking.ext_driver_vehicle || '-');
  const driverText = booking.driver_type === 'company'
    ? (booking.driver_name || '-')
    : booking.driver_type === 'external'
      ? (booking.ext_driver_name || '-') + (booking.ext_driver_phone ? ` (${booking.ext_driver_phone})` : '')
      : t('tl.no_driver');

  const rows = [
    [t('tl.label_requester'), booking.requester_name || '-'],
    [t('req.dept_label'), booking.dept_name || '-'],
    [t('mem.position_label'), booking.position_name || '-'],
  ];

  // User: ตัด ประเภท/สถานที่ ออก (เห็นแค่ใคร/เมื่อไร/รถ/คนขับ)
  if (role !== 'user') {
    rows.push([t('req.type_label'), typeLabel]);
    rows.push([t('req.location_short'), booking.location || '-']);
  }

  rows.push([t('req.col_time_range'), `${dmy(booking.start_at)} ${hhmm(booking.start_at)} – ${dmy(booking.end_at)} ${hhmm(booking.end_at)}`]);
  // รถขับเองที่คืนแล้ว: โชว์เวลาคืนจริงเพิ่ม (ช่วงที่เหลือปล่อยว่างให้จองต่อ)
  if (booking.status === 'completed' && booking.returned_at && booking.booking_type === 'self') {
    rows.push([t('tl.actual_return'), `${dmy(booking.returned_at)} ${hhmm(booking.returned_at)}`]);
  }
  rows.push([t('req.people_label'), t('req.people', { n: booking.people })]);
  rows.push([t('req.car_label'), carText]);
  rows.push([t('tl.driver_label'), driverText]);

  // User: ตัด หมายเหตุ ออก
  if (role !== 'user') {
    rows.push([t('tl.note_label'), booking.purpose || '-']);
  }

  // แสดงหมายเหตุ Admin เฉพาะ role admin
  if (role === 'admin') {
    rows.push([t('tl.admin_note_label'), booking.admin_note || '-']);
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,32,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2a33' }}>{t('tl.detail_title', { code: booking.booking_code })}</div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, color: '#9aa7b2', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: meta.fg, background: meta.bg, borderRadius: 6, padding: '3px 10px', fontWeight: 600 }}>{meta.label}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
              <div style={{ width: 110, flexShrink: 0, color: '#9aa7b2' }}>{k}</div>
              <div style={{ color: '#1f2a33', wordBreak: 'break-word' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
