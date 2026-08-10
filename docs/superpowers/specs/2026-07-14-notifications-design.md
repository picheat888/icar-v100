# ระบบแจ้งเตือน (กระดิ่ง 🔔) — เฟส 6

> สถานะ: ดีไซน์ (รออนุมัติ implement)
> วันที่: 2026-07-14
> ขอบเขต: เฟส 6 — กระดิ่งแจ้งเตือนใน header (ใช้ร่วมทุก role) + สร้างแจ้งเตือนตาม event
> หมายเหตุ: **ไม่มีดีไซน์ใน `docs/mockuo-master/`** (ส่วนที่เพิ่มจาก PLAN) — ออกแบบเองตามสไตล์ header/island เดิม

## 1. เป้าหมาย

ผู้ใช้ทุก role เห็นกระดิ่งใน header — มี badge จำนวนแจ้งเตือนใหม่ + dropdown รายการ กดแล้วไปหน้างานที่เกี่ยว
พฤติกรรมแบบ Facebook (2 ชั้น): **badge = ยังไม่เห็น** · **ไฮไลต์แถว = ยังไม่กดอ่าน**

## 2. หลักการออกแบบ

- **island เดียว** `NotificationBell.jsx` mount ใน `templates/header.php` (แสดงทุกหน้า/ทุก role)
- backend: `NotificationModel` + `NotificationController` ใช้ร่วมทุก role ใต้ `filter: session`
- **สร้างแจ้งเตือน inline** ใน controller ที่เกิด event — เรียก `NotificationModel::push()` / `pushToAdmins()` (ไม่ใช้ CI4 Events เพื่อความตรงไปตรงมา/เทสต์ง่าย)
- โหลดตอนเปิดหน้า + **poll ทุก 60 วิ** อัปเดต badge

## 3. ตาราง `notifications` (2 สถานะ)

migration `create_notifications_table`:

| คอลัมน์ | ชนิด | หมายเหตุ |
|--------|------|----------|
| `id` | int unsigned, PK, AI | |
| `user_id` | int unsigned | ผู้รับ · **FK → users.id** (ON DELETE CASCADE) |
| `type` | varchar(50) | ชนิด event (เช่น `booking_approved`) ไว้เลือกไอคอน/สี |
| `message` | varchar(255) | ข้อความไทย |
| `link` | varchar(255) NULL | URL ปลายทางเมื่อกด |
| `seen_at` | datetime NULL | เวลาที่เห็น (เปิด dropdown) → คุม **badge** |
| `read_at` | datetime NULL | เวลาที่กดอ่าน (คลิกรายการ) → คุม **ไฮไลต์แถว** |
| `created_at`, `updated_at` | datetime | (`useTimestamps`) |

- Index: `(user_id, seen_at)`, `(user_id, created_at)`
- **badge count** = จำนวน `seen_at IS NULL` ของ user · **ไฮไลต์** = `read_at IS NULL`

## 4. `NotificationModel`

- `push(int $userId, string $type, string $message, ?string $link = null): void` — insert 1 แถว
- `pushToAdmins(string $type, string $message, ?string $link = null, ?int $excludeUserId = null): void`
  — หา user_id ทุกคนกลุ่ม `admin` (`auth_groups_users`) แล้ว insert ทีละคน · ข้าม `excludeUserId` (กันแจ้งตัวเองตอน admin เป็นผู้ก่อ event)
- `listFor(int $userId, int $limit, int $offset): array` — ล่าสุดก่อน (order by created_at DESC)
- `unseenCount(int $userId): int`
- `markAllSeen(int $userId): void` — set `seen_at = now()` ที่ยัง null
- `markRead(int $userId, int $id): void` — set `read_at = now()` (เฉพาะแถวของ user นั้น — กันแก้ของคนอื่น)
- `markAllRead(int $userId): void` — set `read_at = now()` ที่ยัง null

## 5. `NotificationController` (ใต้ `filter: session`)

| Method | Route | คืน |
|--------|-------|-----|
| `data()` | `GET notifications/data?offset=0` | `{ items:[...], unseenCount:int, hasMore:bool }` (page = 10 คงที่ฝั่ง server) |
| `seen()` | `POST notifications/seen` | markAllSeen → `{ ok, csrf }` |
| `read()` | `POST notifications/read` (id) | markRead(id) → `{ ok, csrf }` |
| `readAll()` | `POST notifications/read-all` | markAllRead → `{ ok, csrf }` |

- `hasMore` = มีแถวเก่ากว่าที่ส่ง (offset+limit < total) ไว้โชว์ปุ่ม "ดูเพิ่มเติม"
- `items` แต่ละอัน: `id, type, message, link, read_at (หรือ isRead), created_at` (ส่ง created_at ดิบ ให้ island ฟอร์แมตด้วย `thDateTime` จาก `resources/js/lib/date.js` → DD-MM-YYYY HH:MM)
- Route เพิ่มในกลุ่ม `$routes->group('', ['filter' => 'session'], ...)` เดิม (ที่มี profile/change-password)
- CSRF: POST อ่าน token จาก `<meta name="csrf">` แนบ header `X-CSRF-TOKEN` (pattern island เดิม) · action คืน csrf ใหม่

## 6. `NotificationBell.jsx` (island ใน header)

- **badge**: ตัวเลข `unseenCount` (ซ่อนถ้า 0) บนไอคอนกระดิ่ง
- **poll**: `setInterval` 60 วิ → ยิง `data` (offset 0, limit 10) อัปเดต `unseenCount` + รายการหน้าแรก · เคลียร์ interval ตอน unmount
- **เปิด dropdown**:
  - โหลดหน้าแรกใหม่ (offset 0) + ยิง `POST seen` → `unseenCount` = 0 ทันที (optimistic)
  - แสดง 10 อันล่าสุด · แถว `read_at IS NULL` มีพื้นไฮไลต์ (อ่อน teal)
- **กดรายการ** → ยิง `POST read(id)` → ไฮไลต์แถวนั้นหาย → `window.location = link` (ถ้ามี link)
- **"ดูเพิ่มเติม"** (ท้ายกล่อง ถ้า `hasMore`) → ยิง `data?offset=<จำนวนที่โหลดแล้ว>` → **ต่อท้ายรายการเดิม** (เลื่อนดูย้อนหลังเรื่อยๆ) · กล่องมี `max-height` + `overflow-y:auto`
- **"อ่านทั้งหมด"** (หัว dropdown) → ยิง `POST read-all` → เคลียร์ไฮไลต์ทุกแถว
- ปิด/เปิด dropdown ใหม่ → รีเซ็ตกลับหน้าแรก (ไม่ค้าง state โหลดเพิ่ม)
- vite entry ใหม่: `notification-bell`

## 7. Event → ผู้รับ → ข้อความ → ลิงก์ (จุด hook)

> `{code}` = booking_code · `{ชื่อ}` = ชื่อผู้ขอ/สมาชิก · ลิงก์ user = `site_url('my-requests')`, admin = `site_url('admin/requests')`/`site_url('admin/members')`, driver = `site_url('driver')`

| # | Controller::method | ผู้รับ | type | ข้อความ | link |
|---|--------------------|--------|------|---------|------|
| 1 | `User\BookingController::store` | admin ทุกคน (ข้ามผู้ก่อ) | `booking_new` | มีคำขอจองรถใหม่จาก {ชื่อ} | admin/requests |
| 2 | `Auth\RegisterController::attempt` (สำเร็จ) | admin ทุกคน | `member_new` | มีสมาชิกลงทะเบียนใหม่: {ชื่อ} | admin/members |
| 3 | `User\BookingController::cancel` (→ `cancel_requested`) | admin ทุกคน (ข้ามผู้ก่อ) | `cancel_requested` | {ชื่อ} ขอยกเลิกคำขอ {code} | admin/requests |
| 4 | `User\BookingController::returnCar` | admin ทุกคน (ข้ามผู้ก่อ) | `car_returned` | {ชื่อ} คืนรถแล้ว ({code}) | admin/requests |
| 5 | `Admin\RequestController::approve` | ผู้ขอ | `booking_approved` | คำขอ {code} ได้รับการอนุมัติแล้ว | my-requests |
| 5b | ↑ ถ้า `driver_type=company` | คนขับ (`driver_id`) | `job_new` | คุณได้รับมอบหมายงานใหม่ ({code}) | driver |
| 6 | `Admin\RequestController::reject` | ผู้ขอ | `booking_rejected` | คำขอ {code} ถูกปฏิเสธ | my-requests |
| 7 | `Admin\RequestController::confirmCancel` | ผู้ขอ | `cancel_confirmed` | ยืนยันการยกเลิกคำขอ {code} แล้ว | my-requests |
| 7b | ↑ ถ้ามีคนขับ company | คนขับ | `job_cancelled` | งานที่ได้รับมอบหมาย ({code}) ถูกยกเลิก | driver |
| 8 | `Admin\RequestController::cancel` | ผู้ขอ | `booking_cancelled` | คำขอ {code} ถูกยกเลิกโดย Admin | my-requests |
| 8b | ↑ ถ้ามีคนขับ company | คนขับ | `job_cancelled` | งานที่ได้รับมอบหมาย ({code}) ถูกยกเลิก | driver |
| 9 | `Admin\RequestController::update` | ผู้ขอ | `booking_edited` | Admin แก้ไขรายละเอียดคำขอ {code} | my-requests |
| 9b | ↑ ถ้ามอบคนขับ company ใหม่ | คนขับใหม่ | `job_new` | คุณได้รับมอบหมายงานใหม่ ({code}) | driver |
| 10 | `Admin\RequestController::assignDriver` | ผู้ขอ | `driver_assigned` | คำขอ {code} ได้รับมอบหมายคนขับแล้ว | my-requests |
| 10b | ↑ | คนขับ | `job_new` | คุณได้รับมอบหมายงานใหม่ ({code}) | driver |

- **ข้าม self**: event ที่ผู้รับเป็น "admin ทุกคน" ให้ข้าม `auth()->id()` ปัจจุบัน (กันแจ้งตัวเอง เช่น admin จองรถเอง) · event ที่ผู้รับเป็นผู้ขอ ถ้าผู้ก่อ (admin) = ผู้ขอ (admin จองเอง แล้วอนุมัติเอง) จะข้ามด้วย
- แจ้งเตือนสร้าง**หลัง** update DB สำเร็จ (ในเมธอดเดิม ก่อน return JSON)

## 8. เกณฑ์ทดสอบ (Checkpoint)

- `php spark migrate` สร้าง `notifications` สำเร็จ · `php -l` ทุกไฟล์ · `npm run build` มี entry `notification-bell`
- **data-layer E2E** (ยิง event จริง/เรียก push): store → admin ทุกคนได้ 1 แถว (ผู้ก่อไม่ได้) · approve → ผู้ขอได้ + คนขับได้ (ถ้า company) · reject/cancel/return/register/assign ถูกผู้รับ
- `unseenCount` ถูก · `markAllSeen` → count=0 · `markRead(id)` เฉพาะแถวตัวเอง · `markRead` ของ id คนอื่นไม่มีผล (guard `user_id`)
- pagination: `data?offset=10` คืนอันเก่าต่อ + `hasMore` ถูก
- badge/ไฮไลต์เรนเดอร์ถูก (ตรวจในเบราว์เซอร์)

## 9. ไม่ทำในเฟสนี้ (YAGNI)

- real-time (WebSocket/SSE) — ใช้ polling 60 วิ
- หน้า "ดูทั้งหมด" แยก — ใช้ load-more ใน dropdown
- ตั้งค่าปิด/เปิดแจ้งเตือนรายชนิด, อีเมล/push ภายนอก
- Activity Log (เฟส 7) — แม้ event ชุดเดียวกัน แต่ทำแยกเฟส
