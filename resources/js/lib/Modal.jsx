// โมดัลกลาง - ฉากหลังทึบ + กล่องขาว + หัวเรื่อง + ปุ่มปิด (CSS อยู่ที่ style.css §1.16)
import { useEffect, useId, useRef } from 'react';
import { CloseIcon } from './icons';

// ตัวที่โฟกัสได้ในกล่อง (เรียงตามลำดับใน DOM)
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const boxRef   = useRef(null);
  const closeRef = useRef(onClose);
  const titleId  = useId();

  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement;
    const list   = () => [...boxRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);

    // ช่องกรอกช่องแรกก่อน - ถ้าไม่มีเลยค่อยตกไปที่ปุ่ม
    const items = list();
    (items.find((el) => el.tagName !== 'BUTTON') || items[0])?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeRef.current();

        return;
      }
      if (e.key !== 'Tab') {
        return;
      }
      const items = list();
      if (! items.length) {
        return;
      }
      const edge = e.shiftKey ? items[0] : items[items.length - 1];
      if (document.activeElement === edge) {
        e.preventDefault();
        (e.shiftKey ? items[items.length - 1] : items[0]).focus();
      }
    };

    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, []);

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
