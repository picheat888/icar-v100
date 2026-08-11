// สถานะการจอง — ป้ายชื่อ + class สีที่ใช้ร่วมกันทุก island
// สีจริงอยู่ใน CSS ชุด .st-* (style.css §1.15) ซึ่งจ่ายแค่ --st-bg/--st-fg
// island ต้องมี reader class ของตัวเองที่อ่าน 2 ตัวแปรนี้ไปทาพื้น/ตัวอักษร
import { t } from './i18n';

// ป้ายชื่อสถานะมาตรฐาน — หน้าไหนใช้คำต่างออกไปให้ spread แล้วเขียนทับเฉพาะ key นั้น
export const STATUS_LABEL = {
  pending: t('status.pending'),
  approved: t('status.approved'),
  cancel_requested: t('status.cancel_requested'),
  completed: t('status.completed'),
  rejected: t('status.rejected'),
  cancelled: t('status.cancelled'),
};

// class สีของสถานะที่มีชุดสีกลาง — rejected/cancelled ไม่มีในชุดนี้ แต่ละหน้าจัดการเอง
export const ST_CLASS = {
  pending: 'st-pending',
  approved: 'st-approved',
  cancel_requested: 'st-cancel_requested',
  completed: 'st-completed',
};
