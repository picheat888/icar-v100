/**
 * กล่องตาราง - การ์ดขาว + เลื่อนแนวนอนบนจอแคบ
 * center: จัดทุกคอลัมน์กึ่งกลาง · footer: แถบแบ่งหน้าใต้ตาราง
 */
export default function Table({ center = false, footer, children }) {
  return (
    <div className="tbl-wrap">
      <div className="tbl-scroll">
        <table className={center ? 'tbl tbl--center' : 'tbl'}>{children}</table>
      </div>
      {footer}
    </div>
  );
}
