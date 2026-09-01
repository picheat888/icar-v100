import { useRef } from 'react';
import { t } from '../../lib/i18n';
import { STATUS_META } from './helpers';
import { fmtDateTime } from '../../lib/date';
import Icon from '../../lib/Icon';
import { CloseIcon } from '../../lib/icons';
import useModalFocus from '../../lib/useModalFocus';

// modal รายละเอียดการจอง (อ่านอย่างเดียว) - ไม่มีปุ่มจัดการ
// props: booking, role, onClose
export default function DetailModal({ booking, role, onClose }) {
  const boxRef = useRef(null);

  // อ่านอย่างเดียว - โฟกัสที่ตัวกล่องเพื่อให้โปรแกรมอ่านหน้าจออ่านหัวเรื่องก่อน
  useModalFocus(boxRef, onClose, { enabled: !! booking, focusBox: true });

  if (! booking) {
    return null;
  }

  const meta = STATUS_META[booking.status] || STATUS_META.pending;
  // key สถานะจริงที่ใช้ (ตกไปที่ pending ถ้า status ไม่รู้จัก) - ใช้ต่อ class สี st-*
  const statusKey = STATUS_META[booking.status] ? booking.status : 'pending';
  const typeLabel = booking.booking_type === 'self' ? t('req.car_self') : t('tl.type_other_provided');

  // รถอื่นๆ ที่ยังรออนุมัติ - Admin จัดรถ/คนขับให้ตอนอนุมัติ ตอนนี้จึงยังไม่มีค่า
  const awaiting = booking.booking_type === 'other' && booking.status === 'pending';
  const blank    = awaiting ? t('tl.awaiting_assign') : '-';

  // ชื่อรถ/คนขับ ตามประเภท
  const carText = booking.booking_type === 'self'
    ? [booking.car_model, booking.car_plate].filter(Boolean).join(' · ') || '-'
    : (booking.ext_driver_vehicle || blank);
  // ยังไม่ได้มอบหมายคนขับ - ความหมายต่างกันตามประเภท/สถานะ
  const noDriverText = booking.booking_type === 'self'
    ? t('tl.driven_by_requester')
    : awaiting
      ? t('tl.awaiting_assign')
      : t('tl.no_driver');

  const driverText = booking.driver_type === 'company'
    ? (booking.driver_name || '-')
    : booking.driver_type === 'external'
      ? (booking.ext_driver_name || '-') + (booking.ext_driver_phone ? ` (${booking.ext_driver_phone})` : '')
      : noDriverText;

  // ข้อมูลผู้ขอ
  const requesterRows = [
    [t('tl.label_requester'), booking.requester_name || '-'],
    [t('req.dept_label'), booking.dept_name || '-'],
    [t('mem.position_label'), booking.position_name || '-'],
  ];

  // User: ไม่เห็นเบอร์โทรผู้ขอ (server ก็ตัดฟิลด์นี้ทิ้งก่อนส่งมาแล้ว)
  if (role !== 'user') {
    requesterRows.push([t('mem.phone_full_label'), booking.requester_phone || '-']);
  }

  // ข้อมูลการจอง - User เห็นแค่ใคร/เมื่อไร (ตัด ประเภท/สถานที่/วัตถุประสงค์ ออก)
  const bookingRows = [];
  if (role !== 'user') {
    bookingRows.push([t('req.type_label'), typeLabel]);
  }
  bookingRows.push([t('req.people_label'), t('req.people', { n: booking.people })]);
  bookingRows.push([t('req.car_label'), carText]);
  bookingRows.push([t('tl.driver_label'), driverText]);
  if (role !== 'user') {
    bookingRows.push([t('req.location_short'), booking.location || '-']);
    bookingRows.push([t('req.purpose_label'), booking.purpose || '-']);
  }
  bookingRows.push([t('req.start_label'), fmtDateTime(booking.start_at)]);
  bookingRows.push([t('req.end_label'), fmtDateTime(booking.end_at)]);
  // รถขับเองที่คืนแล้ว: โชว์เวลาคืนจริงเพิ่ม (ช่วงที่เหลือปล่อยว่างให้จองต่อ)
  if (booking.status === 'completed' && booking.returned_at && booking.booking_type === 'self') {
    bookingRows.push([t('tl.actual_return'), fmtDateTime(booking.returned_at)]);
  }

  // ข้อมูลอื่น ๆ - หมายเหตุ Admin เห็นเฉพาะ role admin
  const otherRows = [];
  if (role === 'admin') {
    otherRows.push([t('tl.admin_note_label'), booking.admin_note || '-']);
  }

  // กลุ่มที่ไม่มีฟิลด์เลย (ตามสิทธิ์ของ role) ไม่ต้องแสดงหัวข้อ
  const sections = [
    [t('tl.sec_requester'), requesterRows],
    [t('tl.sec_booking'), bookingRows],
    [t('tl.sec_other'), otherRows],
  ].filter(([, rows]) => rows.length);

  return (
    <div onClick={onClose} className="tl-dm-overlay">
      <div
        ref={boxRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="tl-dm-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${t('tl.detail_title')} ${booking.booking_code}`}
      >
        <div className="tl-dm-head">
          {/* ไอคอนบอกประเภทการจอง - รถขับเอง = รถ, รถอื่นๆ = องค์กรจัดหาให้ */}
          <div className="icon-box icon-box--teal tl-dm-icon" title={typeLabel}>
            <Icon name={booking.booking_type === 'self' ? 'car' : 'building'} size={20} />
          </div>
          <div className="tl-dm-headtext">
            <div className="tl-dm-title">{t('tl.detail_title')}</div>
            <div className="tl-dm-code">{booking.booking_code}</div>
          </div>
          <span className={`tl-dm-badge st-${statusKey}`}>{meta.label}</span>
          <button type="button" onClick={onClose} className="tl-dm-close" aria-label={t('common.close')}>{CloseIcon}</button>
        </div>

        <div className="tl-dm-body">
          {sections.map(([title, rows]) => (
            <section key={title} className="tl-dm-sec">
              <h4 className="tl-dm-sec-title">{title}</h4>
              <div className="tl-dm-rows">
                {rows.map(([k, v]) => (
                  <div key={k} className="tl-dm-row">
                    <div className="tl-dm-label">{k}</div>
                    <div className="tl-dm-value">{v}</div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
