# ตารางการใช้รถ (Timeline / Calendar) — เฟส 5

> สถานะ: ดีไซน์ (รออนุมัติ implement)
> วันที่: 2026-07-13
> ขอบเขต: เฟส 5 — หน้า "ตารางการใช้รถ" ใช้ร่วม 3 role (Admin / User / Driver)
> อ้างอิงดีไซน์: `docs/mockuo-master/` (screenshot `08-admin-timeline`, README §5.8)

## 1. เป้าหมาย / ที่มา

route `timeline` ของทั้ง 3 role ยังเป็น placeholder (`_coming_soon`) — เฟสนี้เติมหน้าจริง:
ปฏิทินแสดง **ช่วงเวลาที่รถแต่ละคันว่างหรือถูกจอง** และงานที่เกี่ยวข้องกับผู้ใช้ตาม role

หน้านี้เป็น **หน้าดูอย่างเดียว (read-only)** — ไม่มีการอนุมัติ/แก้ไข/จองในหน้านี้ (ไปทำที่หน้าของแต่ละ role)

## 2. หลักการออกแบบ

- **island เดียว** `Timeline.jsx` ใช้ร่วมทุก role — mount ต่างกันด้วย prop `role` + `endpoint`
- **เขียน React grid + คำนวณวันด้วย JS `Date` เอง** — ไม่เพิ่ม dependency ใหม่ (สอดคล้อง pattern island เดิม)
- **logic ดึงข้อมูลรวมศูนย์** ที่ `BookingModel::listForTimeline()` ตัวเดียว รับ role + userId + ช่วงวันที่
- reuse `sweepExpired()` เดิม (lazy sweep) ให้สถานะตรงเสมอ ไม่ต้อง cron
- **2 มุมมอง:** รายเดือน (month) / รายวัน (day) สลับด้วย toggle

## 3. ขอบเขตข้อมูลต่อ role

ตารางสรุปสิ่งที่แต่ละ role เห็น (ทุก role กดดูรายละเอียดได้ทุกป้ายที่ตัวเองเห็น):

| Role | รถขับเอง (self) | รถอื่นๆ (other) |
|------|-----------------|------------------|
| **Admin** | การจองของทุกคน | การจองของทุกคน |
| **User** | การจองของ **ทุกคน** (ดูคิว/ว่าง) | **เฉพาะของตัวเอง** (`requester_id` = ตัวเอง) |
| **Driver** | — (ไม่แสดง) | เฉพาะงานที่ `driver_id` = ตัวเอง (ทั้งรายเดือนและรายวัน) |

> **ข้อมูลข้ามผู้ใช้ (privacy):** ในรถขับเอง (self) User เห็น **ชื่อผู้จอง / แผนก / ตำแหน่ง** ของคนอื่นได้ (เพื่อประสานงาน) แต่ **ไม่เห็น สถานที่ / วัตถุประสงค์ / หมายเหตุ Admin / ลิงก์แผนที่** — บังคับที่ **server** (`listForTimeline` ตัดฟิลด์เหล่านี้ออกจาก JSON ตาม role: user ตัด `location/purpose/admin_note/map_link`, driver ตัด `admin_note`) ไม่ใช่แค่ซ่อนใน UI · admin เห็นครบ

**สถานะที่แสดง + สี:**

| สถานะ | สี | ความหมาย |
|-------|-----|----------|
| `pending` | ส้ม (`#fdf0e0`/`#e08a1e`) | รออนุมัติ |
| `approved` / `cancel_requested` | เขียว (`#e7f4ee`/`#0c8b87`) | อนุมัติแล้ว (กันเวลาอยู่) |
| `completed` | เทาจาง | ประวัติ — เดินทางเสร็จแล้ว |
| `rejected` / `cancelled` | — | **ซ่อน** (ไม่แสดง) |

## 4. มุมมอง (View)

### 4.1 รายเดือน (Month) — ทุก role
- grid 7 คอลัมน์ (จ.–อา.) 6 แถว · นำทาง `‹ [เดือน ปี] ›`
- แต่ละวันแสดงป้ายการจอง `HH:MM–HH:MM ชื่อรถ/งาน` สูงสุด 3 ป้าย + "+N" ถ้าเกิน
- สีป้ายตามสถานะ (§3) · legend ล่างปฏิทิน (อนุมัติแล้ว / รออนุมัติ / เสร็จแล้ว)
- การจองที่คาบเกี่ยวหลายวัน → แสดงป้ายในทุกวันที่คาบเกี่ยว
- แตะวันที่ → สลับไปมุมมองรายวันของวันนั้น
- **Driver:** ป้ายในรายเดือนแสดงเฉพาะงานที่ `driver_id` = ตัวเองเท่านั้น (ตาม §3)

### 4.2 รายวัน (Day)
- **Admin / User:** แกนเวลาแนวนอน **06:00–20:00** · แถว = **รถขับเอง (self) แต่ละคัน** · แถบการจอง self วางตามตำแหน่งเวลา
  - รถสถานะซ่อมบำรุง (`maintenance`) → แถวสีเทา ไม่มีแถบ
  - การจองข้ามวัน → clamp แสดงเฉพาะช่วงในวันนั้น
  - การจองเลยช่วง 06:00–20:00 → clamp แถบให้อยู่ในกรอบ (ยังเห็นว่ามีงาน)
  - หมายเหตุ: มุมมองรายวัน **แสดงเฉพาะ self** (รถอื่นๆ ไม่ผูก `car_id` เจาะจง จึงดูในรายเดือน) — สำหรับ User แถวรถ self แสดงคิวของทุกคน
- **Driver:** ไม่ใช่ grid — เป็น **ลิสต์งานของวันนั้น** (การ์ดเรียงตามเวลา: ช่วงเวลา / สถานที่ / จำนวนคน / สถานะ)

## 5. การกดดูรายละเอียด (read-only ทุก role)

กดป้าย (รายเดือน) หรือแถบ/การ์ด (รายวัน) → เปิด **modal อ่านอย่างเดียว** แสดง:
**ผู้จอง · แผนก · ตำแหน่ง · ประเภท · สถานที่ · ช่วงวันเวลา · จำนวนคน · รถ · คนขับ · สถานะ · หมายเหตุ**
ไม่มีปุ่มจัดการใดๆ

## 6. รายละเอียดการแก้ไข

### 6.1 `app/Models/BookingModel.php` — เพิ่ม `listForTimeline($role, $userId, $from, $to)`
- เรียก `sweepExpired()` ที่ต้นเมธอด
- join ผู้ขอ (`user_profiles`: ชื่อ/เบอร์) + **แผนก + ตำแหน่ง** + รถ (`cars`) + คนขับ — ชุดฟิลด์เดียวกับ modal §5
- กรองช่วงวันที่: การจองที่ `start_at < $to AND end_at > $from` (คาบเกี่ยวช่วงที่ดู)
- กรองสถานะ: เฉพาะ `pending, approved, cancel_requested, completed` (ตัด `rejected, cancelled`)
- กรองตาม role:
  - `admin` → ทั้งหมด
  - `user` → `booking_type = 'self'` (ทุกคน) **OR** `requester_id = $userId` (รวม other ของตัวเอง)
  - `driver` → `driver_id = $userId AND driver_type = 'company'`
- คืน array ของ booking (มี field พร้อมแสดงป้าย + modal)

### 6.2 Controllers — เพิ่ม method `timeline()` (หน้า) + `timelineData()` (JSON)
route มีอยู่แล้ว 3 เส้น — เพิ่ม endpoint JSON ใต้ group เดียวกัน:
- `Admin\DashboardController::timeline()` เรนเดอร์หน้า + `timelineData()` → `listForTimeline('admin', ...)`
- `User\PageController::timeline()` + `timelineData()` → `listForTimeline('user', auth()->id(), ...)`
- `Driver\PageController::timeline()` + `timelineData()` → `listForTimeline('driver', auth()->id(), ...)`
- endpoint รับ query `from` / `to` (ช่วงวันที่ของเดือนที่กำลังดู) · ส่งกลับ `{ bookings, cars }` (cars = รถ self สำหรับแถวรายวัน; driver ไม่ต้องส่ง)

### 6.3 Routes (`app/Config/Routes.php`)
เพิ่ม data endpoint ใต้ group ที่ตรงกัน:
- `admin/timeline/data` → `Admin\DashboardController::timelineData` (group:admin)
- `timeline/data` → `User\PageController::timelineData` (group:user)
- `driver/timeline/data` → `Driver\PageController::timelineData` (group:driver)

### 6.4 View — `app/Views/{admin,user,driver}/timeline/index.php`
วาง `<div id="timeline" data-props='...'>` (role + endpoint) + `vite_asset('resources/js/entries/timeline.jsx')`
ใช้ layout ตาม role · `active = 'timeline'`

### 6.5 Frontend island
- `resources/js/islands/Timeline.jsx` — component หลัก (toggle month/day, นำทางเดือน, fetch, render grid + modal)
  - แยกซับ component ให้เล็ก: `MonthGrid`, `DayGrid` (admin/user), `DriverDayList`, `DetailModal`
- `resources/js/entries/timeline.jsx` — mount เข้า `#timeline`
- `vite.config.js` — เพิ่ม `'timeline': 'resources/js/entries/timeline.jsx'` ใน `rollupOptions.input`

## 7. Edge cases
- การจองข้ามวัน — รายวัน clamp ช่วงในวัน · รายเดือน แสดงทุกวันที่คาบเกี่ยว
- การจองนอกช่วง 06:00–20:00 — clamp แถบให้อยู่ในกรอบ
- ไม่มีการจองในเดือน/วัน — แสดงสถานะว่าง (empty state)
- CSRF: หน้านี้เป็น GET ล้วน ไม่ต้องแนบ CSRF (ตาม pattern เดิม endpoint อยู่ใต้ filter group เดียวกัน Shield ป้องกันให้)

## 8. เกณฑ์ทดสอบ (Checkpoint)
- `php -l` ทุกไฟล์ผ่าน · `npm run build` ผ่าน (มี entry `timeline`)
- **Scoping ถูกต้อง** (ยิง 3 endpoint): admin เห็นทุกการจอง · user เห็น self ทุกคน + other ของตัวเอง · driver เห็นเฉพาะงานตัวเอง
- **สถานะ:** pending=ส้ม / approved=เขียว / completed=เทาจาง · rejected+cancelled ไม่โผล่
- **มุมมองรายวัน:** แถบวางตรงตำแหน่งเวลา · ข้ามวัน clamp · นอกช่วงเวลา clamp · maintenance เป็นแถวเทา
- **Driver รายวัน:** เป็นลิสต์งาน ไม่ใช่ grid
- **modal:** กดแล้วเห็นครบ (ผู้จอง/แผนก/ตำแหน่ง/เวลา/รถ/คนขับ/หมายเหตุ) · ไม่มีปุ่มจัดการ
- นำทางเดือนถัดไป/ก่อนหน้า → fetch ช่วงใหม่ถูกต้อง

## 9. สิ่งที่ไม่ทำในเฟสนี้ (YAGNI)
- ลาก-วางเปลี่ยนเวลา (drag-and-drop) — ไม่ทำ (read-only)
- มุมมองรายสัปดาห์ — ไม่ทำ (มีแค่รายเดือน/รายวัน)
- export ปฏิทิน / print — ไม่ทำ
- realtime update — ไม่ทำ (fetch ตอนเปิดหน้า/เปลี่ยนเดือนพอ)
