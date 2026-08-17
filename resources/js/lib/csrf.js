// CSRF token กลาง - อ่าน/เขียนจาก <meta name="csrf"> ที่ layout ฝังไว้ (shell.php)
// ทุก island ต้องใช้ตัวนี้แทนการเก็บ token ใน state ของตัวเอง
// เพราะ Shield หมุน token ทุก POST - ถ้าแต่ละ island เก็บสำเนาของตัวเอง จะค้างไม่ sync ข้าม island (เช่นกดกระดิ่งแล้ว POST หน้าอื่นพัง)
export function getCsrf() {
  const el = document.querySelector('meta[name="csrf"]');
  return el ? el.getAttribute('content') : '';
}

export function setCsrf(v) {
  const el = document.querySelector('meta[name="csrf"]');
  if (el && v) el.setAttribute('content', v);
}
