// โมดัลกลาง - ฉากหลังทึบ + กล่องขาว + หัวเรื่อง + ปุ่มปิด (CSS อยู่ที่ style.css §1.16)
import { useId, useRef } from 'react';
import { CloseIcon } from './icons';
import useModalFocus from './useModalFocus';

/**
 * โมดัลกลาง
 * props: title, onClose, children
 *   bodyClass   - class ของพื้นที่เนื้อหา (แต่ละหน้ากำหนด padding/กริดเอง)
 *   wide        - กล่องกว้าง 960px (ฟอร์ม 2 คอลัมน์)
 *   lockBackdrop - กดพื้นที่ว่างข้างนอกไม่ปิด (กันเผลอปิดจนข้อมูลหาย)
 *
 * เปิดแล้วโฟกัสช่องแรกให้เอง · Esc ปิด · Tab วนอยู่ในกล่อง · ปิดแล้วคืนโฟกัสให้ตัวที่กดเปิด
 */
export default function Modal({ title, onClose, children, bodyClass = '', wide = false, lockBackdrop = false }) {
  const boxRef  = useRef(null);
  const titleId = useId();

  useModalFocus(boxRef, onClose);

  return (
    <div onClick={lockBackdrop ? undefined : onClose} className="modal-backdrop">
      <div ref={boxRef} onClick={(e) => e.stopPropagation()} className={wide ? 'modal-box modal-box--wide' : 'modal-box'} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-head">
          <h3 id={titleId} className="modal-title">{title}</h3>
          <button type="button" onClick={onClose} className="modal-close">{CloseIcon}</button>
        </div>
        <div className={bodyClass}>{children}</div>
      </div>
    </div>
  );
}
