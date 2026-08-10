# iCar Booking

ระบบจองรถสำหรับองค์กร (Factory Vehicle / Fleet Booking) ของ Thai Inaba Foods
รองรับ 3 บทบาท (Admin / User / Driver), การจองรถแบบ **ขับเอง** และ **รถจัดหาโดย Admin (มี/ไม่มีคนขับ)**,
ปฏิทินการใช้รถ, ระบบอนุมัติคำขอ และรองรับภาษาไทย/อังกฤษ

> สถาปัตยกรรมแบบ **Hybrid / Islands** — CodeIgniter 4 เรนเดอร์ HTML เป็นหลัก (ผ่าน Shield session)
> แล้วฝัง React เฉพาะส่วนที่ต้อง interactive ไม่ใช่ SPA

---

## Features

| โมดูล | คำอธิบาย | สถานะ |
|-------|----------|:-----:|
| Auth (Login / Register) | login ด้วย username + ด่านตรวจสถานะ, สมัคร→รออนุมัติ (`pending`) | ✅ เสร็จ |
| App shell (Layout) | Sidebar กรองตาม role + Header + โปรไฟล์/เปลี่ยนรหัสผ่าน + responsive | ✅ เสร็จ |
| Dashboard (Admin) | ภาพรวมระบบ + การ์ดสรุป + คำขอรออนุมัติ | ⬜ placeholder |
| Calendar / Timeline | ตารางการใช้รถ (รายเดือน/รายวัน) ตาม role | ⬜ placeholder |
| Car booking | จองรถ (self/other) + คำขอของฉัน + Admin อนุมัติ/มอบหมายคนขับ ✅ · งานคนขับ (4c รอทำ) | 🟡 |
| Car management | จัดการรถ (React island): รถบริษัท/รถจัดหา + เพิ่ม/แก้ไข/ลบ + อัปโหลดรูป | ✅ เสร็จ |
| Master data | ข้อมูลหลัก (React island): จัดการแผนก/ตำแหน่ง | ✅ เสร็จ |
| Member | จัดการสมาชิก (React island): list + ฟิลเตอร์ + อนุมัติ/ปฏิเสธ/แก้ไข | ✅ เสร็จ |

> ดูสถานะงานละเอียด + สิ่งที่ค้าง/รอทำได้ที่ [`docs/PLAN.md`](docs/PLAN.md)

---

## Requirements

- **PHP** ≥ 8.2 (ทดสอบบน 8.2)
- **Composer**
- **Node.js** ≥ 18 + npm
- **MariaDB / MySQL** (XAMPP)
- เว็บเซิร์ฟเวอร์: Apache (XAMPP) หรือ `php spark serve`

---

## Installation

```bash
# 1) ติดตั้ง dependency
composer install
npm install

# 2) ตั้งค่า .env (คัดลอกจาก env.example ถ้ายังไม่มี)
#    - database.default.* ให้ตรงกับฐานข้อมูล
#    - vite.dev = true (ตอน dev) / false (ตอน prod)

# 3) สร้างตาราง (รวมตาราง auth ของ Shield)
php spark migrate

# 4) ใส่ข้อมูลตั้งต้น: แผนก/ตำแหน่ง + บัญชีทดลอง 3 role (admin/somchai/prasert — รหัส 123)
php spark db:seed MasterDataSeeder
php spark db:seed DemoUsersSeeder

# 5) รัน frontend (เลือกอย่างใดอย่างหนึ่ง)
npm run dev      # โหมด dev: Vite HMR (ต้องตั้ง vite.dev = true)
npm run build    # โหมด prod: build ลง public/build (ตั้ง vite.dev = false)

# 6) รัน backend
php spark serve  # http://localhost:8080   (หรือเปิดผ่าน Apache ที่ public/)
```

**บัญชีทดลอง** (เฉพาะ dev — รหัสผ่าน `123` ทั้งหมด):

| Username | Role | เข้าหน้าแรกที่ |
|----------|------|----------------|
| `admin`   | Admin  | `/admin` (ภาพรวมระบบ) |
| `somchai` | User   | `/timeline` |
| `prasert` | Driver | `/driver` (งานของฉัน) |

---

## Third Party Libraries

| Library | ใช้ทำอะไร |
|---------|-----------|
| **CodeIgniter 4** (`^4.7`) | เฟรมเวิร์ก backend (MVC) |
| **CodeIgniter Shield** (`^1.3`) | Auth / สิทธิ์ผู้ใช้ (admin/user/driver) แบบ session |
| **React 18** + **Vite 6** | React Islands (ส่วน interactive) + build/HMR |
| **Tailwind CSS v4** | จัดสไตล์ utility-first |
| **PhpWord** (`phpoffice/phpword`) | สร้างเอกสารออกแบบ DB (`docs/`) — ไม่ใช่ระบบ export ของแอป |
| PhpSpreadsheet / mPDF | *(ยังไม่ติดตั้ง)* สำหรับ export Excel / PDF ในอนาคต |

---

## Documentation

- [`CLAUDE.md`](CLAUDE.md) — แนวทางสถาปัตยกรรม + กฎการเขียนโค้ดสำหรับโปรเจกต์นี้
- [`docs/PLAN.md`](docs/PLAN.md) — แผนงาน, งานที่เสร็จ/ค้าง/รอทำ, checkpoint
- [`docs/mockuo-master/`](docs/mockuo-master/) — ดีไซน์ต้นฉบับ (prototype HTML + screenshots) = source of truth ด้านหน้าตา
- [`docs/database-design/`](docs/database-design/) — เอกสารออกแบบฐานข้อมูล (`.docx`)
