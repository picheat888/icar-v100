import { CheckIcon } from './icons';

/**
 * ป็อปอัปแจ้งผลสำเร็จ - ไอคอนติ๊กถูก + ข้อความ กลางจอ
 * ผู้เรียกเป็นคนคุมเองว่าจะโชว์นานเท่าไร (setTimeout) แล้วค่อยเลิกเรนเดอร์
 * ใช้: {done && <DonePopup title={t('…')} sub={t('…')} />}
 */
export default function DonePopup({ title, sub = '' }) {
  return (
    <div className="modal-backdrop" role="status" aria-live="polite">
      <div className="done-box">
        <div className="done-icon">{CheckIcon}</div>
        <div className="done-title">{title}</div>
        {sub && <div className="done-sub">{sub}</div>}
      </div>
    </div>
  );
}
