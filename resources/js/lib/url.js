// ลิงก์ปลอดภัยไหม - รับเฉพาะ http:// หรือ https:// (กัน javascript:/data: ที่หลุดชั้น validate มา)
export const isSafeUrl = (u) => /^https?:\/\//i.test(String(u || ''));
