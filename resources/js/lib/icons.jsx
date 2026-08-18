import Icon from './Icon';

// ไอคอนที่ใช้ซ้ำข้าม island - element สำเร็จรูปจากชุดกลาง (resources/icons.json)
// ไอคอนอื่นเรียก <Icon name="..." /> ตรง ๆ ได้เลย

// กากบาทปิดโมดัล/drawer
export const CloseIcon = <Icon name="close" size={22} />;

// ติ๊กถูก - ป็อปอัปแจ้งผลสำเร็จ
export const CheckIcon = <Icon name="check" size={30} strokeWidth={2.8} />;

// ถังขยะ - ป็อปอัปยืนยันการลบ
export const TrashIcon = <Icon name="trash" size={26} strokeWidth={2.2} />;

// ปฏิทิน - นำหน้าแถบหัวข้อวันในตาราง/การ์ด
export const CalIcon = <Icon name="calendar-day" size={15} className="cal-icon" />;
