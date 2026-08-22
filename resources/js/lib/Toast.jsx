import { useState, useCallback, useRef, useEffect } from 'react';
import Icon from './Icon';
import { t } from './i18n';

// ไอคอนประจำแต่ละชนิด - ชื่อจากทะเบียน resources/icons.json
const ICON = {
  success: 'check-circle',
  error:   'cancel',
  warn:    'alert',
  info:    'info',
};

// ชนิดที่หายเอง - ผิดพลาดกับเตือนต้องกดปิด ผู้ใช้ต้องได้อ่านจนจบ
const AUTO_HIDE = ['success', 'info'];

/**
 * Toast แจ้งผลของ action - มุมขวาบนใต้หัวเว็บ ทีละ 1 ตัว
 * ใช้: const { showToast, ToastView } = useToast();  แล้ววาง <ToastView /> ท้าย component
 * showToast('บันทึกเรียบร้อย', 'success')  ·  kind: success | error | warn | info
 */
export function useToast(ms = 4000) {
  const [toast, setToast] = useState(null);   // { msg, kind }
  const timer = useRef(null);

  const hideToast = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  const showToast = useCallback((msg, kind = 'info') => {
    // ชนิดไม่รู้จักให้ถือเป็น info ทั้งตอนแสดงผลและตอนตัดสินใจหายเอง
    const safeKind = ICON[kind] ? kind : 'info';
    clearTimeout(timer.current);
    setToast({ msg, kind: safeKind });
    if (AUTO_HIDE.includes(safeKind)) {
      timer.current = setTimeout(() => setToast(null), ms);
    }
  }, [ms]);

  // เคลียร์ตัวจับเวลาตอน component ถูกถอด
  useEffect(() => () => clearTimeout(timer.current), []);

  const ToastView = useCallback(() => {
    if (! toast) return null;

    return (
      <div className={`toast toast--${toast.kind}`} role="status">
        <Icon name={ICON[toast.kind]} size={17} />
        <span className="toast-text">{toast.msg}</span>
        <button type="button" className="toast-close" onClick={hideToast} aria-label={t('common.close')}>
          <Icon name="close" size={15} />
        </button>
      </div>
    );
  }, [toast, hideToast]);

  return { showToast, hideToast, ToastView };
}
