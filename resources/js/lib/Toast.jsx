import { useState, useCallback } from 'react';

/**
 * Toast แจ้งผล — ลอยกลางล่าง หายเองใน 2.8 วินาที
 * ใช้: const { showToast, ToastView } = useToast();  แล้ววาง <ToastView /> ท้าย component
 */
export function useToast(ms = 2800) {
  const [toast, setToast] = useState('');

  const showToast = useCallback((m) => {
    setToast(m);
    setTimeout(() => setToast(''), ms);
  }, [ms]);

  const ToastView = useCallback(
    () => (toast ? <div className="toast">{toast}</div> : null),
    [toast],
  );

  return { toast, showToast, ToastView };
}
