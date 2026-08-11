// โมดัลกลาง — ฉากหลังทึบ + กล่องขาว + หัวเรื่อง + ปุ่มปิด (CSS อยู่ที่ style.css §1.16)
import { CloseIcon } from './icons';

/**
 * โมดัลกลาง
 * props: title, onClose, children
 *   bodyClass   — class ของพื้นที่เนื้อหา (แต่ละหน้ากำหนด padding/กริดเอง)
 *   wide        — กล่องกว้าง 960px (ฟอร์ม 2 คอลัมน์)
 *   lockBackdrop — กดพื้นที่ว่างข้างนอกไม่ปิด (กันเผลอปิดจนข้อมูลหาย)
 */
export default function Modal({ title, onClose, children, bodyClass = '', wide = false, lockBackdrop = false }) {
  return (
    <div onClick={lockBackdrop ? undefined : onClose} className="modal-backdrop">
      <div onClick={(e) => e.stopPropagation()} className={wide ? 'modal-box modal-box--wide' : 'modal-box'}>
        <div className="modal-head">
          <h3 className="modal-title">{title}</h3>
          <button type="button" onClick={onClose} className="modal-close">{CloseIcon}</button>
        </div>
        <div className={bodyClass}>{children}</div>
      </div>
    </div>
  );
}
