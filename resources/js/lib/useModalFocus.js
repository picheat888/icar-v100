import { useEffect, useRef } from 'react';

// ตัวที่โฟกัสได้ในกล่อง (เรียงตามลำดับใน DOM)
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * พฤติกรรมคีย์บอร์ดของโมดัล - ใช้ร่วมกับกล่องที่มี ref
 *   Esc ปิด · Tab วนอยู่ในกล่อง · ปิดแล้วคืนโฟกัสให้ตัวที่กดเปิด
 *
 * boxRef  - ref ของกล่องโมดัล
 * onClose - ฟังก์ชันปิด
 * opts.enabled  - false = ไม่ผูก event (ตอนโมดัลยังไม่เปิด)
 * opts.focusBox - true = โฟกัสที่ตัวกล่อง (โมดัลอ่านอย่างเดียว ต้องมี tabIndex={-1})
 *                 false = โฟกัสช่องกรอกช่องแรก ไม่มีค่อยตกไปที่ปุ่ม
 */
export default function useModalFocus(boxRef, onClose, { enabled = true, focusBox = false } = {}) {
  const closeRef = useRef(onClose);

  closeRef.current = onClose;

  useEffect(() => {
    if (! enabled || ! boxRef.current) {
      return;
    }

    const box    = boxRef.current;
    const opener = document.activeElement;
    const list   = () => [...box.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);

    if (focusBox) {
      box.focus();
    } else {
      const items = list();
      (items.find((el) => el.tagName !== 'BUTTON') || items[0])?.focus();
    }

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
        e.preventDefault();

        return;
      }

      const first  = items[0];
      const last   = items[items.length - 1];
      const active = document.activeElement;

      // โฟกัสอยู่ที่ตัวกล่องเองหรือหลุดออกไปแล้ว - ดึงกลับเข้าปลายทางฝั่งที่กำลังจะไป
      if (active === box || ! box.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();

        return;
      }

      // ถึงปลายทางแล้ว - วนไปอีกฝั่งแทนที่จะหลุดออกไปหลังฉาก
      if (e.shiftKey ? active === first : active === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };

    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [enabled, focusBox, boxRef]);
}
