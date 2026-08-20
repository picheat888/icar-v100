import { t } from './i18n';
import Spinner from './Spinner';

/**
 * ป็อปอัปยืนยันการทำรายการ (ใช้แทน window.confirm ของเบราว์เซอร์)
 * ใช้: <ConfirmDialog tone="danger" icon={<svg…/>} title="…" okText="…" onOk={fn} onCancel={fn} busy={bool}>ข้อความ</ConfirmDialog>
 *
 * tone: 'danger' (ลบ/ยกเลิก) | 'teal' (ทำรายการทั่วไป) - คุมสีวงกลมไอคอนและปุ่มยืนยัน
 * คลิกฉากหลังหรือปุ่มย้อนกลับ = onCancel (ปิดไม่ได้ระหว่าง busy)
 */
export default function ConfirmDialog({
  tone = 'danger',
  icon = null,
  title,
  children,
  okText,
  cancelText,
  onOk,
  onCancel,
  busy = false,
}) {
  return (
    <div onClick={() => !busy && onCancel()} className="confirm-backdrop" role="dialog" aria-modal="true">
      <div onClick={(e) => e.stopPropagation()} className="confirm-box">
        <div className="confirm-body">
          {icon && <div className={`confirm-icon confirm-icon--${tone}`}>{icon}</div>}
          <h3 className="confirm-title">{title}</h3>
          <p className="confirm-msg">{children}</p>
        </div>
        <div className="confirm-actions">
          <button onClick={onCancel} disabled={busy} className="confirm-btn confirm-btn--ghost">
            {cancelText || t('common.back')}
          </button>
          <button onClick={onOk} disabled={busy} className={`confirm-btn confirm-btn--ok confirm-btn--${tone}`}>
            {busy && <Spinner />}
            {okText}
          </button>
        </div>
      </div>
    </div>
  );
}
