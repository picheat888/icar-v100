// CSRF token กลาง - อ่าน/เขียนจาก <meta name="csrf"> ที่ layout ฝังไว้ (shell.php)
// Shield หมุน token ทุก POST - ทุก island ต้องอ่าน/เขียนผ่านที่นี่ ห้ามเก็บสำเนาไว้ใน state
export function getCsrf() {
  const el = document.querySelector('meta[name="csrf"]');
  return el ? el.getAttribute('content') : '';
}

export function setCsrf(v) {
  const el = document.querySelector('meta[name="csrf"]');
  if (el && v) el.setAttribute('content', v);
}
