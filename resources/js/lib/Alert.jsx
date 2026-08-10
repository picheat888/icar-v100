// กล่องแจ้งเตือน error มาตรฐานของระบบ — พื้นแดงอ่อน + ตัวอักษรแดงเข้ม + ไอคอนเตือน เต็มความกว้าง
// ใช้ซ้ำได้ทุก island: <Alert>ข้อความ</Alert> · ไม่มีข้อความ = ไม่เรนเดอร์
export default function Alert({ children, style }) {
  if (!children) return null;

  return (
    <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: '#fbecea', border: '1px solid #f0c8c3', color: '#a5352b', borderRadius: 10, padding: '11px 14px', fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, ...style }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', marginTop: 1 }}>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div>{children}</div>
    </div>
  );
}
