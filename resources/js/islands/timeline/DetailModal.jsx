import { t } from '../../lib/i18n';
import { STATUS_META } from './helpers';
import { fmtDateTime, dateTimeRange } from '../../lib/date';

// modal รายละเอียดการจอง (อ่านอย่างเดียว) - ไม่มีปุ่มจัดการ
// props: booking, role, onClose
export default function DetailModal({ booking, role, onClose }) {
  if (!booking) return null;
  const meta = STATUS_META[booking.status] || STATUS_META.pending;
  // key สถานะจริงที่ใช้ (ตกไปที่ pending ถ้า status ไม่รู้จัก) - ใช้ต่อ class สี st-*
  const statusKey = STATUS_META[booking.status] ? booking.status : 'pending';
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

  rows.push([t('req.col_time_range'), dateTimeRange(booking.start_at, booking.end_at)]);
  // รถขับเองที่คืนแล้ว: โชว์เวลาคืนจริงเพิ่ม (ช่วงที่เหลือปล่อยว่างให้จองต่อ)
  if (booking.status === 'completed' && booking.returned_at && booking.booking_type === 'self') {
    rows.push([t('tl.actual_return'), fmtDateTime(booking.returned_at)]);
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
      className="tl-dm-overlay"
    >
      <div onClick={(e) => e.stopPropagation()} className="tl-dm-modal">
        <div className="tl-dm-head">
          <div className="tl-dm-title">{t('tl.detail_title', { code: booking.booking_code })}</div>
          <button onClick={onClose} className="tl-dm-close">×</button>
        </div>
        <div className="tl-dm-statuswrap">
          <span className={`tl-dm-badge st-${statusKey}`}>{meta.label}</span>
        </div>
        <div className="tl-dm-rows">
          {rows.map(([k, v]) => (
            <div key={k} className="tl-dm-row">
              <div className="tl-dm-label">{k}</div>
              <div className="tl-dm-value">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
