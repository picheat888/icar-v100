# แผนงาน iCar Booking (PLAN)

> เอกสารนี้ track ความคืบหน้า: งานเสร็จ / กำลังทำ / ค้าง / รอทำ + checkpoint
> source of truth ด้านดีไซน์: `docs/mockuo-master/` · ฐานข้อมูล: `docs/database-design/`
> อัปเดตล่าสุด: 2026-07-23

---

## สถานะภาพรวม

| เฟส | งาน | สถานะ |
|----|------|:-----:|
| 0 | โครง CI4 + Shield + Vite + Tailwind | ✅ |
| 1 | **Auth + App shell (Layout/Template/Login)** | ✅ |
| 2 | **Member** (Register + จัดการสมาชิก/อนุมัติ — island แรก) | ✅ |
| 3 | **Master data (แผนก/ตำแหน่ง) + Car management** | ✅ |
| 4 | Car booking — **4a จอง ✅ · 4b อนุมัติ ✅ · 4c คนขับ ✅** | ✅ |
| 5 | Calendar / Timeline | ✅ (data-layer E2E ผ่าน · รอ E2E ภาพในเบราว์เซอร์) |
| 6 | **ระบบแจ้งเตือน (กระดิ่ง 🔔)** | ✅ (build/review ผ่าน · รอ E2E เบราว์เซอร์) |
| 7 | Dashboard (สรุป) + Activity log + Export CSV | ✅ (7a+7b เสร็จ · รอ E2E เบราว์เซอร์) |
| 8 | i18n (ไทย/อังกฤษ) + ขึ้น prod | ✅ **batch 1+2 เสร็จ** (ทั้งระบบ: หน้าหลัก + islands + วันที่ + hero + profile) · รอ E2E เบราว์เซอร์ |

---

## ✅ เสร็จแล้ว (เฟส 1 — รอบนี้)

- [x] `resources/css/app.css` — เปลี่ยน web font เป็น **IBM Plex Sans Thai** + design tokens (สี/ฟอนต์ตามดีไซน์)
- [x] `app/Views/auth/login.php` — หน้า Login pixel-faithful (hero teal + ฟอร์ม) wire เข้า **Shield** (`login`/`password` + CSRF)
- [x] `app/Config/Auth.php` — ชี้ `views['login'] => 'auth/login'` + เปิด login ด้วย **username** (`validFields`)
- [x] `app/Views/templates/` — `sidebar.php` (nav กรองตาม role), `header.php` (+CSRF meta, profile dropdown), `footer.php`, `scripts.php` (toggle sidebar/profile), `shell.php`, `_coming_soon.php`
- [x] `app/Views/layouts/` — `admin.php` / `user.php` / `driver.php` (ประกอบ shell)
- [x] `app/Config/Routes.php` — group `admin` / `''(user)` / `driver` + filter (`group:*` / `session`)
- [x] `app/Controllers/` — `Home` (redirect ตาม role), `Admin\DashboardController`, `User\PageController`, `Driver\PageController` (placeholder)
- [x] `app/Database/Seeds/DemoUsersSeeder.php` — บัญชีทดลอง 3 role (รหัส `123`)
- [x] `README.md`

### Checkpoint ที่ผ่านแล้ว ✔
- `php -l` ทุกไฟล์ — ไม่มี syntax error
- `php spark routes` — route + filter โหลดครบ
- `php spark migrate` — สร้างตาราง Shield สำเร็จ
- `php spark db:seed DemoUsersSeeder` — สร้าง admin/somchai/prasert (active, ถูก group)
- HTTP `GET /login` → **200** + markup ครบ (hero, ฟอร์ม, ปุ่มบัญชีทดลอง)
- เรนเดอร์ shell ทั้ง 3 role → ผ่าน (sidebar/header/เนื้อหา/csrf meta) — ยืนยัน `renderSection` ทำงานผ่าน include shell

---

## ✅ เก็บงานค้างเฟส 1 (เสร็จแล้ว)

- [x] **Schema (ตาม `docs/database-design`):** migration `departments`, `positions`, `user_profiles` (1:1 กับ users, status enum, FK) + `MasterDataSeeder` (แผนก/ตำแหน่งตั้งต้น)
- [x] **Models:** `DepartmentModel`, `PositionModel`, `UserProfileModel`
- [x] **หน้า Register จริง** — `Auth\RegisterController` + `auth/register.php` (ตาม §5.2) + `register_success`:
      สร้าง user + `user_profiles` (status=`pending`) เพิ่ม group `user` ไม่ auto-login → ไปหน้าแจ้งรออนุมัติ
- [x] **Login gate ตามสถานะ** — `Auth\LoginController` บล็อก `pending`/`rejected` ด้วยข้อความไทยตาม mockup; เฉพาะ `approved` เข้าได้
- [x] **เมนูโปรไฟล์จริง** — หน้า `ข้อมูลส่วนตัว` (`/profile`) + `เปลี่ยนรหัสผ่าน` (`/change-password`) ใช้ร่วมทุก role
- [x] **gate หน้า user** — `/book`, `/my-requests`, `/timeline` เปลี่ยนเป็น `group:user` แล้ว
- [x] override auth routes ของ Shield (ต้องนิยาม **ก่อน** `service('auth')->routes()` เพราะ CI4 ยึด route แรก)

### Checkpoint ที่ผ่านแล้ว ✔ (รอบเก็บงานค้าง)
- `php -l` ทุกไฟล์ผ่าน · `php spark migrate` + `db:seed Master/DemoUsers` สำเร็จ
- E2E ผ่าน: สมัคร testuser → DB `status=pending` · login pending → **ถูกบล็อก** (302) · login admin → `/admin` + `/profile` 200
- เปลี่ยนรหัสผ่าน 123→newpass123 → login รหัสใหม่ได้ → รีเซ็ตกลับ 123 (demo คงเดิม)

## 🛡️ Hardening (จากการตรวจบั๊ก Phase 1-3)

**แก้แล้ว:**
- ✅ อัปโหลดรูปรถ: เฉพาะไฟล์รูป (`is_image`+`mime_in`) ขนาด ≤ 2 MB (`CarController`)
- ✅ ที่นั่งรถติดลบไม่ได้
- ✅ เปลี่ยนรูปรถ → ลบไฟล์รูปเก่าทิ้งอัตโนมัติ
- ✅ ลบแผนก/ตำแหน่งที่มีพนักงานอยู่ไม่ได้ — แจ้งจำนวน + ต้องย้ายพนักงานออกก่อน (`MasterController`)
- ✅ ลบรถ → ลบไฟล์รูปในโฟลเดอร์ทิ้งทันที (ไม่เก็บไฟล์กำพร้า) (`CarController::delete`)

**แก้แล้ว (map-link — กัน XSS ผ่านลิงก์แผนที่, 2026-07-11):**
- ✅ helper `is_safe_url()` (`format_helper.php`) — ตรวจว่าลิงก์ขึ้นต้นด้วย `http://`/`https://` เท่านั้น (case-insensitive) ใช้ร่วม server+view
- ✅ **Validate ตอนบันทึก:** `User\BookingController::store()` ปฏิเสธ `map_link` ที่ไม่ใช่ http(s) (กัน `javascript:`/`data:`/protocol-relative) + client-side ใน `BookingForm.jsx` (UX)
- ✅ **Guard ตอนแสดงเป็นปุ่มลิงก์:** Admin `RequestsManager.jsx` (`isSafeUrl`) + Driver `driver/jobs/index.php` → ลิงก์ไม่ปลอดภัยแสดงเป็นข้อความเทาคลิกไม่ได้ ("ลิงก์แผนที่ไม่ถูกต้อง")
- **Verify ✔:** ยิง POST /book จริง — `javascript:`/`data:`/`//`/leading-space ถูกปฏิเสธ (422) · http/https/HtTpS/ว่าง ผ่าน · Driver view เรนเดอร์ legacy `javascript:` เป็นข้อความเทา (ไม่มี href javascript ในหน้า) · Admin bundle มี guard คอมไพล์เข้าไปแล้ว (ยังไม่ได้ verify ใน browser จริง — ไม่มี browser tooling)

**แก้แล้ว (รอบทบทวนก่อนขึ้นเฟสใหม่):**
- ✅ Admin/Driver จองรถได้แต่ยกเลิก/คืนรถไม่ได้ (route my-requests เป็น group:user) → ย้าย `book`+`my-requests` เป็น `group:admin,user` · เพิ่มเมนู "คำขอของฉัน" ให้ admin (ดู/ยกเลิก/คืนรถของตัวเอง · จัดการคนอื่นที่ "จัดการคำขอจองรถ") · **Driver จองรถไม่ได้แล้ว** (เห็นเฉพาะงานที่มอบหมาย) · verify: admin/user เข้าได้ driver ถูกบล็อก
- ✅ orphan state เลย `end_at`: ขยาย `sweepExpired()` → `pending`/`cancel_requested` ที่เลยเวลา = ยกเลิกอัตโนมัติ (`cancelled`) ปล่อยรถคืน (ไม่ใส่ note) · `cancel_requested` ระหว่างรอยืนยันยังกันรถไว้ (ACTIVE) · Admin ยืนยัน → เปิดจองทันที · verify ผ่าน 7/7 เคส

**แก้แล้ว (2026-07-11):**
- ✅ **[security] คนถูกปิดใช้งาน/ปฏิเสธ ระหว่างล็อกอินอยู่ ยังใช้ต่อได้จน logout** → เพิ่ม `AccountStatusFilter` (global `before`, except หน้า auth) เช็ค `user_profiles.status` ทุก request · ไม่ใช่ `approved` → `auth()->logout()` + เด้ง `/login` (AJAX ตอบ 401 JSON) · ลงทะเบียนใน `Config/Filters.php` · **Verify ✔:** somchai approved เข้าได้ → Admin ตั้ง rejected ระหว่าง session → หน้าปกติ 302→login · AJAX 401 JSON
- ✅ **[booking] จำนวนผู้โดยสารเกินที่นั่งรถ** → `store()` เช็ค `people <= car.seats` (เฉพาะรถขับเอง) · **Verify ✔:** รถ 7 ที่นั่ง — 8/99 คนถูกปฏิเสธ ("สูงสุด 7 คน") · 7 คนผ่าน

**แก้แล้ว (รอบ booking hardening, 2026-07-11):**
- ✅ **[booking] คนขับบริษัทถูกมอบหมายงานซ้อนเวลา (#7+#8)** → `BookingModel::driverHasClash()` เช็คคนขับมีงาน `approved`/`cancel_requested` ทับช่วงเวลาไหม · ใช้ทั้งตอน `approve()` และ `assignDriver()` · (#8 ยุบรวม #7 — รถอื่น ๆ ไม่มี `car_id` เจาะจง ทรัพยากรที่ชนคือคนขับ) · **Verify ✔:** มอบคนขับซ้อนเวลา → บล็อก · คนขับว่าง → ผ่าน
- ✅ **[booking] มอบหมายคนขับทีหลัง (#3)** → endpoint `assignDriver` + route `requests/assign-driver` + ปุ่ม "มอบหมาย/เปลี่ยนคนขับ" ในโมดัลคำขอ approved (รถอื่น ๆ) · guard: เฉพาะ approved+other · **Verify ✔:** approve แบบ none → assign คนขับสำเร็จ (DB=company) · assign ซ้อนเวลา → บล็อก · assign บน pending → ปฏิเสธ
- ✅ **[booking] Race condition จองรถขับเองชนกัน (#9)** → ห่อ clash-check+insert ใน transaction + `SELECT … FOR UPDATE` ล็อกแถวรถ (serialize คำขอรถคันเดียวกัน) · **Verify ✔:** จอง self ผ่าน · จองทับ → บล็อก · ไม่ทับ → ผ่าน
- ✅ **[data] `map_link` ยาวเกิน 500 ตัว (#10)** → `store()` เช็ค `mb_strlen > 500` + client `maxLength` · **Verify ✔:** 501 ตัว → ปฏิเสธ · 500 ตัว → ผ่าน
- ✅ **[UX] โมดัลจอง "รถอื่น ๆ" ข้อความปฏิทิน (#4)** → หัวข้อ/legend เปลี่ยนตาม type: other = "เลือกวันที่ต้องการใช้รถ" (ไม่โชว์จุดวันที่จอง)
- ✅ **[robustness] CSRF token หลุด sync (#5)** → island (BookingForm/RequestsManager/MyRequests) `reload()` เมื่อเจอ error ที่ไม่ใช่ JSON (คง `regenerate=true`)

- ✅ **[admin] แก้ไข/ยกเลิกคำขอได้ทุกใบผ่านเมนู "จัดการคำขอจองรถ" (#11)** → `RequestController::cancel` (ยกเลิกทุกคำขอ active → cancelled ปล่อยรถคืน) + `update` (แก้รายละเอียดเดินทาง + เปลี่ยนรถ self / คนขับ other, re-validate ที่นั่ง/ชนเวลา/คนขับซ้อน) · จำกัดเฉพาะสถานะ active (pending/approved/cancel_requested) · `data()` ส่งรายการรถ self เพิ่ม · UI: ปุ่ม "แก้ไขคำขอ"/"ยกเลิกคำขอ" + ฟอร์มแก้ไขในโมดัล (`RequestsManager`) · **Verify ✔:** แก้ self (location/เวลา/คน/รถ) · แก้ other (เวลา+คนขับ) · ยกเลิก approved→cancelled · seat/overlap re-validate บล็อก · guard สถานะจบแล้วปฏิเสธ

**แก้แล้ว (รอบตรวจบั๊ก 5 โดเมน, 2026-07-20 — Medium 3 + Low ทั้งหมด):**
- ✅ **[booking][race] `assignDriver()`/`update()` เขียนแบบ non-atomic (TOCTOU)** → เปลี่ยนเป็น conditional update (`where('status',…)`+`affectedRows()`) แบบเดียวกับ approve/reject/cancel · ถ้า 0 rows re-find เช็คว่าสถานะยัง active ไหม (แยก "ไม่เปลี่ยนค่า" ออกจาก "สถานะจบไปแล้ว") กัน sweepExpired/cancel มา flip ระหว่างเปิดโมดัลแล้วเขียนทับ record ที่จบงาน (`RequestController`)
- ✅ **[timeline] user เห็นรายละเอียดคำขอ "ของตัวเอง" ไม่ครบ** → `listForTimeline` ตัดฟิลด์ (location/purpose/map_link/admin_note) เฉพาะแถวของ "คนอื่น" เช็ค `requester_id` (เดิมตัดทุกแถวตาม role) (`BookingModel:189`)
- ✅ **[frontend][race] fetch สลับรถ/เดือนเร็ว ๆ response เก่าทับใหม่** → ใส่ sequence guard (`useRef` counter) ใน `BookingForm.openSelf` (ตารางว่างรถ) + `Timeline.load` (ข้อมูลเดือน) ทิ้งผลที่ไม่ใช่คำขอล่าสุด
- ✅ **[booking] approve() รถขับเอง ไม่ re-check รถ ณ เวลาอนุมัติ** → เพิ่มเช็ครถมีอยู่/ไม่ซ่อมบำรุง/ที่นั่งพอ ก่อนอนุมัติ (รถอาจเข้าซ่อม/ลดที่นั่งหลังผู้ใช้จอง) (`RequestController::approve`)
- ✅ **[booking] update() รถอื่น ไม่ re-validate ที่นั่ง** → เช็ค `people <= ext_driver_seats` (ถ้ากรอกที่นั่งไว้) ให้สอดคล้องกับ self path (`RequestController::update`)
- ✅ **[auth] user ที่ไม่มี profile row ล็อกอินผ่าน** → เปลี่ยน `$profile &&` เป็น `! $profile ||` (ไม่มีโปรไฟล์ = ยังไม่อนุมัติ) ให้ตรงกับ `AccountStatusFilter` (`LoginController:46`)
- ✅ **[frontend] CSRF-desync recovery หายใน 3 island** → เพิ่ม `if(!res.ok && !d.csrf) reload()` ใน `MembersManager/CarsManager/MasterData` ให้ตรงกับกลุ่ม booking (จะทำงานเมื่อเปิด CSRF กลับ)
- ✅ **[car] เปลี่ยนประเภทรถ other→self ทิ้งข้อมูลคนขับค้าง** → ล้าง `default_driver_id/name/note` เมื่อ type=self (`CarController::save`)
- ✅ **[car] save id ที่ไม่มีจริง/ถูกลบแล้ว ตอบ success** → เช็ค `find($id)` ก่อนอัปโหลดไฟล์ (กันไฟล์กำพร้า) + กันรายงานสำเร็จ (`CarController::save`)
- ✅ **[master] ชื่อชนซ้ำระดับ DB (race) → 500** → ห่อ `insert/update` ด้วย try/catch `DatabaseException` ตอบข้อความเป็นมิตรแทน (`MasterController::add/update`)
- ✅ **[booking] store() ไม่เช็ค transStatus → แจ้งสำเร็จทั้งที่ DB error** → เช็ค `transStatus()`+`$id` หลัง commit ก่อน notify (`BookingController::store`)
- ✅ **[frontend] pickDay จองเวลาย้อนหลังของ "วันนี้"** → ถ้าเป็นวันนี้และเลย 08:00 เริ่มที่ชั่วโมงถัดไป/ดึกเกินไปให้เลือกเวลาเอง (`BookingForm.jsx`)
- ✅ **[frontend] NotificationBell นำทาง `n.link` โดยไม่เช็ค scheme** → `safeLink()` อนุญาตเฉพาะ http(s)/path ภายใน (defense-in-depth)
- **Verify:** `php -l` 6 ไฟล์ผ่าน · `npm run build` ผ่านครบ 47 modules · `php spark routes` bootstrap ปกติ · **ยังไม่ได้ E2E ในเบราว์เซอร์จริง** (ไม่มี browser tooling)
- **ข้ามโดยตั้งใจ:** "update() other ถอดคนขับเงียบ ไม่ยิง job_cancelled" — เป็น design เดิม (ดูหมายเหตุ UX เฟส 6)

**ยังไม่แก้ (พบจากการตรวจ — รอตัดสินใจ):**
- [ ] รหัสผ่านสมัครเช็คแค่ความยาว ≥ 8 (ไม่เช็คความแข็งแรง/pwned)
- ✅ **[HIGH] CSRF เปิดใช้งานแล้ว (2026-07-21)** — root cause ของ 403 เดิม = session ไม่ persist (`.env session.savePath=null` ที่แก้ไปแล้วเฟส 2) ไม่ใช่ตัว CSRF · เปิด `csrf` filter (session-based) กลับใน `Config/Filters.php` · **Verify ✔ (curl กับ php spark serve):** login token ถูก→303 · token ผิด→403 · island AJAX POST ผ่าน `X-CSRF-TOKEN` header→200 คืน csrf ใหม่ · ไม่ต้องแก้โค้ด island (รองรับ regenerate อยู่แล้ว)
- ✅ **[MED] `MemberController::approve()` guard เพิ่มแล้ว (2026-07-21, แบบ B)** — แยก guard เป็น method กลาง `roleChangeError()` (self/driver-jobs) + `isLastAdminDemotion()` (last-admin ใต้ GET_LOCK) ใช้ร่วม `approve()`+`update()` (แหล่งความจริงเดียว กัน drift) · **Verify ✔ (HTTP+CSRF จริง):** approve(admin→user) บล็อก 422 · approve(admin→admin role เดิม) ผ่าน 200
- ✅ **[robustness] `log_activity()` best-effort** — ห่อ insert ด้วย try/catch (log ล้มเหลวไม่ทำ action หลักพัง)

**แก้แล้ว (2026-07-22):**
- ✅ **[bug][auth] CSRF 403 สุ่ม ๆ ตอน login** — root cause = `Security::$regenerate=true` หมุน CSRF token ทุก POST → หน้า login ที่ browser cache/ค้างแท็บถือ token เก่าที่ตายแล้ว (`redirect=false` ใน dev เลยเด้ง 403 เต็มจอ) · แก้ `Config/Security.php`: `regenerate=false` (token คงที่ทั้งเซสชัน) + `redirect=true` (token ไม่ตรง → redirect กลับฟอร์มพร้อมข้อความ แทน 403) · island ไม่กระทบ (อ่าน token จาก meta/response เหมือนเดิม) · **Verify ✔ (curl):** ใช้ token เก่าซ้ำหลังมี POST คั่นกลาง เดิม 403 → ตอนนี้ 303 · E2E เบราว์เซอร์จริงโดยผู้ใช้ผ่าน
- ✅ **[booking] รถอื่นๆ อนุมัติ/บันทึกได้เฉพาะเมื่อมีคนขับ** — `RequestController::driverAssignment()` เพิ่ม `$requireDriver`: ถ้ารถอื่นๆ ไม่เลือกคนขับ (บริษัท/ภายนอก) → คืน error แทน `driver_type=none` · ครอบ `approve()` (บังคับเสมอ) + `assignDriver()` (บังคับ) + `update()` (บังคับเฉพาะคำขอที่ **ไม่ใช่** pending — approved/cancel_requested ถอดคนขับออกไม่ได้) · UI `RequestsManager.jsx` เด้ง toast เตือนถ้ายังไม่เลือก (doApprove/doAssign/doUpdate) · Dashboard คำขอรถอื่นๆ pending เปลี่ยนปุ่มเป็น "มอบหมายคนขับ" ลิงก์ไป `/admin/requests` · รถขับเอง (self) ไม่แตะ · **Verify ✔ (HTTP+DB):** approve ไม่มีคนขับ→422 คง pending · มีคนขับ(external)→200 approved
- ✅ **[booking] ปฏิเสธคำขอต้องกรอกเหตุผล (บังคับ)** — `RequestController::reject()` บังคับ `admin_note` ไม่ว่าง (422 ถ้าเว้น) บันทึกลง `admin_note`+`rejected` · `RequestsManager.jsx` มี **popup ปฏิเสธแยก** (ช่องเหตุผลบังคับ + ปุ่ม "ยืนยันการปฏิเสธ") · ปุ่ม "ปฏิเสธ" ในแถวเปิดโมดัลเข้าโหมดปฏิเสธทันที · Dashboard ปุ่มปฏิเสธ (self) เปลี่ยนเป็นลิงก์ไป `/admin/requests` · **Verify ✔ (HTTP+DB):** ปฏิเสธเว้นว่าง→422 คง pending · มีเหตุผล→200 rejected+note
- ✅ **[booking][user] แสดงเหตุผลที่ถูกปฏิเสธให้ User เห็นชัด** — `MyRequests.jsx` คำขอสถานะ `rejected` โชว์ **กล่องแดง + ไอคอน + หัวข้อ "เหตุผลที่ถูกปฏิเสธ"** (สถานะอื่นคงกล่องเทา "หมายเหตุจาก Admin") · `admin_note` มีใน `listForUser` (`bookings.*`) อยู่แล้ว ไม่ต้องแก้ query
- ✅ **[car] คนขับประจำเป็น 1:1** — `CarController::save()` (รถอื่นๆ) กันคนขับคนเดียวถูกผูกเป็นคนขับประจำของรถ >1 คัน (ยกเว้นคันที่กำลังแก้ + ไม่นับรถ soft-deleted) → 422 บอกชื่อรถที่ผูกอยู่ · `CarsManager.jsx` dropdown ปิดเลือก (disabled สีเทา) + ต่อท้าย "— ผูกกับ [รุ่นรถ] แล้ว" + guard ตอนบันทึก · เลือก enforce ระดับ app (ไม่ใช้ UNIQUE index เพราะรถ soft-deleted ยังถือ id คนขับ) · **Verify ✔ (HTTP+DB):** เลือกคนขับซ้ำ→422 ไม่สร้าง · ไม่เลือก→200 สร้างได้
- ✅ **[booking][ux] เตือนคนขับซ้อนเวลาแบบทันที + กล่อง Alert กลาง** — `RequestController::companyDrivers()` แนบ `jobs` (ตารางงาน active ต่อคนขับ: id/code/start/end จาก approved+cancel_requested) มากับ `data()` · island `RequestsManager.jsx` เพิ่ม `driverClash()` — เลือกคนขับบริษัทที่มีงานทับช่วงเวลาคำขอ → โผล่ **กล่องแดง `<Alert>` "คนขับคนนี้มีงานในช่วงเวลานี้แล้ว (คำขอ BK-xxxx)"** ใต้ dropdown ค้างไว้จนเปลี่ยนคนขับ (โหมดแก้ไขคิดจากเวลาในฟอร์ม) + **ปิดปุ่ม อนุมัติ/บันทึกคนขับ/บันทึก** จนกว่าจะแก้ + guard ใน handler · error การทำรายการ (422) ในโมดัลเปลี่ยนจาก toast ดำ → **กล่องแดงค้างบนสุดโมดัล** (success ยังเป็น toast เขียว) · **สร้าง component กลาง `resources/js/lib/Alert.jsx`** (พื้นแดงอ่อน+ตัวอักษรแดงเข้ม+ไอคอน เต็มความกว้าง) ไว้ทยอยใช้กับ island อื่น · **Verify ✔ (HTTP+DB):** `data()` คืน `jobs` ต่อคนขับถูกต้อง · build ผ่าน
- ✅ **[timeline] รายวันไม่แสดงคำขอ "รถอื่นๆ"** — `DayGrid.jsx` (มุมมองรายวัน Admin/User) เดิมกรองเฉพาะ `booking_type==='self'` เพื่อวางในคอลัมน์รถ → คำขอรถอื่นๆ (ไม่มีคอลัมน์รถ) ถูกตัดทิ้งหมด · แก้: เพิ่มส่วน **"รถอื่นๆ (จัดหา)"** ใต้ตารางรถ แสดง 1 คำขอ = 1 แถว (label ผู้จอง/รถที่จัดหา) วางแถบบนแกนเวลาเดียวกัน คลิกเปิด modal ได้ · **ไม่แก้ backend** — `listForTimeline` scope ถูกอยู่แล้ว (admin=ทั้งหมด · user=`self`+ของตัวเอง · driver=`company`+`driver_id` ผ่าน `DriverDayList`) จึงได้เงื่อนไขตรงกับรายเดือน (MonthGrid แสดง other อยู่แล้ว) อัตโนมัติ · **Verify ✔:** build ผ่าน · admin `timeline/data` คืนคำขอ other จริง

**แก้แล้ว (2026-07-23):**
- ✅ **[ui] หน้าเปลี่ยนรหัสผ่าน (เปลี่ยนเอง) ใช้สไตล์เดียวกับ popup บังคับเปลี่ยน** — เขียน `app/Views/profile/change_password.php` ใหม่เป็น **การ์ดสไตล์เดียวกับ `ForcePasswordResetModal`** บนหน้าเมนูปกติ (ไม่ใช่ overlay — ยังมี sidebar/header): ไอคอนกุญแจวงเหลี่ยม teal + หัวข้อ + **3 ช่องเรียงบนลงล่าง รหัสเดิม(`curPass`)→รหัสใหม่(`newPass`)→ยืนยัน(`confirmPass`)** + ปุ่มลูกตาสลับซ่อน/แสดงทุกช่อง (vanilla JS) + ปุ่มบันทึก teal + ลิงก์ "ยกเลิก" กลับ `/profile` · **ไม่แตะ backend** — ยังโพสต์ `change-password` (`ProfileController::updatePassword`) ชื่อ field เดิม (ตรวจรหัสเดิม + ใหม่ ≥8 + ยืนยันตรงกัน) · ไม่ต้อง build (view ล้วน) · **Verify ✔:** `php -l` ผ่าน · GET `/change-password`→200 · ฟอร์ม 3 ช่อง + ปุ่มลูกตาเรนเดอร์ครบ

## 🟡 ค้าง / ข้อควรระวังที่เหลือ

- [ ] รหัสผ่านสมัครใหม่บังคับ `min_length[8]` (ดีกว่าเดิม) — บัญชี demo (`123`) seed ตรงผ่าน entity จึงสั้นได้ ห้ามใช้ใน prod
- [ ] อีเมลผู้สมัครเป็น **อีเมลสังเคราะห์** `username@icar.local` (กัน identity ชน เพราะล็อกอินด้วย username) — ถ้าต้องใช้อีเมลจริงค่อยเพิ่มฟิลด์อีเมลในฟอร์ม
- [ ] หน้าโปรไฟล์/เปลี่ยนรหัสเป็น **หน้าเต็ม** (ดีไซน์ต้นฉบับเป็น modal) — ค่อยทำเป็น modal ตอนทำ island ของ shell

---

## ⚠️ หมายเหตุ / ของที่ตั้งค่าไว้ระหว่างทาง

- เปิด **MariaDB (XAMPP)** แล้วระหว่างพัฒนา — ถ้าเครื่องรีสตาร์ทต้องสตาร์ท MySQL ใน XAMPP ใหม่
- รหัสผ่านบัญชีทดลองคือ `123` (สั้นกว่ากฎ Shield) — seed ผ่าน entity โดยตรง **ห้ามใช้ใน prod**
- ปุ่ม "บัญชีทดลอง" ในหน้า Login แค่ **เติมฟอร์ม** (ไม่ auto-login) — ควรปิดใน production
- `app.baseURL` ใน `.env` ชี้ `http://icar.ink-connect.com/` — เวลาเทสต์ผ่าน `php spark serve` ที่ localhost
  redirect หลัง login จะเด้งไป host นั้น (ตั้งให้ตรง environment ก่อนใช้งานจริง)
- การ login ด้วย username ต้องมี email ใน identity ไม่ให้ชนกัน (seeder ใส่ email สังเคราะห์ `<user>@icar.local`)

---

## ⬜ รอทำ (เฟสถัดไป ตามลำดับแนะนำ)

### เฟส 2 — Member ✅ (เสร็จรอบนี้)
- ✅ ตาราง `user_profiles` + Register + flow รออนุมัติ
- ✅ หน้า `จัดการสมาชิก` — **React island แรก** (`MembersManager.jsx`): list + ฟิลเตอร์ (ค้นหา/สถานะ/สิทธิ์/แผนก) + โมดัล อนุมัติ/ปฏิเสธ/แก้ไข (info + password)
- ✅ Backend `Admin\MemberController`: `data` (JSON) / `approve` (status+role) / `reject` / `update` (info+role+password) — action คืน CSRF ใหม่ให้ island
- ✅ CSRF ข้าม origin: island ส่ง header `X-CSRF-TOKEN` + อัปเดต token จาก response (regenerate=true)
- ✅ **เพิ่มจากดีไซน์เดิม:** เปิดใช้งาน (กู้ rejected) · ปิดการใช้งาน (approved→ล็อกอินไม่ได้ ข้อความ "บัญชีนี้ถูกปฏิเสธ") · สมัครซ้ำด้วยบัญชี rejected เจอข้อความเดียวกัน
- ✅ **Guard (ความปลอดภัย):** กันปิด/ถอดสิทธิ์ **บัญชีตัวเอง** และ **Admin คนสุดท้าย** (บังคับทั้ง backend `reject`+`update` และซ่อนปุ่มใน island) · validate รหัสผ่านใหม่ใน edit ≥ 8 ตัว
- [ ] (ยกไป **เฟส 6**) เขียน activity log ตอน approve/reject
- ✅ **flow บังคับเปลี่ยนรหัส (forceReset) — แบบ Popup (2026-07-20, ปรับจากแบบ redirect):** UX สุดท้ายเป็น **popup ครอบทั้งแอป** (ไม่ใช่ redirect หน้า)
  - **ฝั่ง Admin:** checkbox "บังคับเปลี่ยนรหัสตอนล็อกอินครั้งถัดไป" ในโมดัลแก้ไข — ติ๊กได้เดี่ยวๆ (ไม่ต้องตั้งรหัสใหม่) + สะท้อนสถานะจริง (`UserProfileModel::listMembers` join `auth_identities.force_reset` · `MemberController::update` แยก force_reset ออกจากการตั้งรหัส: ติ๊ก→`forcePasswordReset()`, ไม่ติ๊ก→`undoForcePasswordReset()`)
  - **ฝั่ง User:** island `ForcePasswordResetModal.jsx` mount ใน `header.php` (เฉพาะเมื่อ `requiresPasswordReset()`) — modal มืดครอบจอ ปิด/Esc ไม่ได้ · 2 ช่อง (ใหม่+ยืนยัน ไม่ถามรหัสเดิม) · POST `force-reset-password` → `ProfileController::forceReset` (guard `requiresPasswordReset` + validate ≥8/ตรงกัน + `undoForcePasswordReset`) → reload · ลิงก์ "ออกจากระบบ" เป็นทางออกเดียว
  - **กันฝั่ง server:** filter `ForcePasswordResetGuard` (alias `forcepwreset`, global before) — GET ปล่อยผ่าน (หน้าโหลด+popup โผล่) · POST/PUT/DELETE บล็อกจนกว่าจะเปลี่ยนรหัส (AJAX→403 JSON) except auth+`force-reset-password` · ถอด Shield `force-reset` redirect filter เดิมออก · คืน `change_password.php`/`Auth.php` กลับเป็นเดิม
  - vite entry: `force-reset-modal` · **Verify ✔:** `php -l` ทุกไฟล์ + `npm run build` (49 modules) + `php spark routes` (endpoint excepted ถูกต้อง) + DB round-trip (listMembers คืน force_reset, set/undo flag) ผ่าน — **ยังไม่ได้ E2E ในเบราว์เซอร์จริง**
- [ ] (refinement/optional) การ์ด responsive มือถือ · โชว์รหัสพนักงาน (read-only) ในโมดัลแก้ไข

### Checkpoint เฟส 2 ✔
- `npm run build` ผ่าน (25 modules, island `members-manager.js` ~157KB) — JSX คอมไพล์ผ่าน
- E2E ผ่าน: สมัคร 2 คน (pending) → approve คนหนึ่งเป็น driver → reject อีกคน → edit (ชื่อ/เบอร์/แผนก/role) → DB ตรงทุกค่า
- หน้า `/admin/members` mount island (div + data-props + asset) ครบ · endpoint POST ทำงานผ่าน CSRF header
- แก้บั๊กระหว่างทาง: RegisterController อ่าน `$post['dept']` ตรงๆ ทำให้ error เมื่อไม่ส่งฟิลด์ optional → เปลี่ยนเป็น `getPost()`
- แก้บั๊ก session: `.env` `session.savePath = null` → session เขียนลงโฟลเดอร์ `null/` พังแล้ว echo error ต่อท้าย JSON → ปิดบรรทัดนั้นใช้ default `writable/session`
- แก้บั๊ก sidebar: CI4 `$this->include($v, [...])` อาร์กิวเมนต์ 2 เป็น options ไม่ใช่ data → ตั้ง `role` ผ่าน `setData` ใน layout (admin เคยเห็นเมนู user)
- ปรับเป็นโหมด **prod** (`vite.dev=false`): asset โหลดจาก `public/build` ผ่าน Apache (same-origin) — แก้โค้ด React ต้อง `npm run build` ทุกครั้ง
- Guard verified: ปิดบัญชีตัวเอง/ถอด admin คนสุดท้าย/รหัสสั้นในแก้ไข → ถูกบล็อกครบ (ยิง API ตรงก็บล็อก)

### เฟส 3 — Master data + รถ ✅ (เสร็จรอบนี้)
- ✅ **ข้อมูลหลัก** — `Admin\MasterController` + island `MasterData.jsx`: จัดการแผนก/ตำแหน่ง (เพิ่ม/ลบ + count + กันชื่อซ้ำ) + แท็บประวัติ (placeholder → เฟส 6)
- ✅ **จัดการรถ** — migration `cars` (self/other, soft delete) + `CarModel` + `Admin\CarController` + island `CarsManager.jsx`:
      แท็บ รถบริษัท (self, การ์ด) / รถจัดหา (other, ตาราง + คนขับ + หมายเหตุ) · เพิ่ม/แก้ไข/ลบ · **อัปโหลดรูป** (multipart → `public/uploads/cars`)
- vite entries เพิ่ม: `master-data`, `cars-manager`

### Checkpoint เฟส 3 ✔
- migrate `cars` สำเร็จ · `npm run build` ผ่าน (islands `master-data` ~5KB, `cars-manager` ~11KB)
- E2E (ASCII) ผ่าน: master เพิ่มแผนก/ตำแหน่ง · เพิ่มซ้ำ → "มีแผนกนี้อยู่แล้ว" (สะอาด) · ลบ
- E2E รถ ผ่าน: เพิ่ม self+other · data list ครบ · edit (seats/status) · delete (soft delete กรองออกจาก list)
- แก้บั๊ก: master `add` ใช้ model rule `is_unique[...,{id}]` (สไตล์ update) ไม่จับตอน insert → เช็คชื่อซ้ำเองก่อน insert

### เฟส 4 — Car booking
**4a ✅ (เสร็จรอบนี้):**
- ✅ migration `bookings` (full schema + FK + soft delete) + `BookingModel` (gen `BK-xxxx`)
- ✅ `User\BookingController` (index/store/myRequests/myData/cancel) + routes ใต้ group:user
- ✅ island `BookingForm.jsx` — เลือก self/other + ฟอร์ม (รถ/สถานที่/เวลา/จำนวนคน/วัตถุประสงค์/แผนที่) · island `MyRequests.jsx` — list + ยกเลิก
- ✅ validate: สถานที่/เวลา/end>start/จำนวนคน/รถ(self) + **กันจองชนเวลา (overlap)**
- vite entries เพิ่ม: `booking-form`, `my-requests`
- **Checkpoint 4a ✔:** จอง self/other → pending · overlap+end≤start บล็อก · คำขอของฉันแสดง+ยกเลิก(soft delete) ผ่าน

**4b ✅ (เสร็จรอบนี้) — Admin จัดการคำขอ:**
- ✅ `Admin\RequestController` (index/data/approve/reject) + `BookingModel::listAll` (join ผู้ขอ/แผนก/รถ/คนขับ) + routes
- ✅ island `RequestsManager.jsx` — list + ฟิลเตอร์ (ค้นหา/ประเภท/สถานะ) + responsive (ตาราง/การ์ด) + modal รายละเอียด
- ✅ อนุมัติ: self→driver_type=none · other→เลือก **คนขับบริษัท** (users group driver) หรือ **คนขับภายนอก** (กรอกชื่อ/เบอร์/ที่นั่ง/รถ) · ปฏิเสธ + admin_note · approved_by/at
- vite entry: `requests-manager`
- **Checkpoint 4b ✔:** อนุมัติ self/other(บริษัท)/other(ภายนอก) + ปฏิเสธ → DB ถูกต้องทุกเคส

**4b+ ✅ วงจรจบงาน (เสร็จรอบนี้):**
- ✅ คืนรถ (`returnCar`) เฉพาะรถขับเองที่ถึงเวลาเริ่มแต่ยังไม่เลย `end_at` → `completed` + `returned_at` = "คืนรถแล้ว"
- ✅ **ปิดงานอัตโนมัติเมื่อเลย `end_at`** — `BookingModel::sweepExpired()` (lazy sweep ตอน list ทั้ง 3 role) เปลี่ยน `approved` ที่หมดเวลา → `completed` (returned_at คง NULL) = "เดินทางเสร็จสิ้นแล้ว" · ครอบคลุม self+other · ไม่ใช้ cron/ไม่แก้ schema
- ✅ `MyRequests`/`RequestsManager` แยกป้าย "คืนรถแล้ว" (กดคืนเอง) กับ "เดินทางเสร็จสิ้นแล้ว" (หมดเวลาเอง) ด้วย `returned_at`
- spec: `docs/superpowers/specs/2026-07-11-auto-complete-booking-design.md` · verify ผ่าน 6/6 เคส (self/other, คง approved ก่อนหมดเวลา, ไม่แตะการคืนเอง)

**4c ✅ (เสร็จแล้ว) — Driver "งานของฉัน":**
- ✅ `Driver\PageController::index` + หน้า "งานของฉัน" (`driver/jobs/index.php`) — งานที่ `driver_id` = ตัวเอง ผ่าน `BookingModel::listForDriver()` (status=approved + driver_type=company) · route ที่ `/driver` (group root)
- [ ] (refinement) ปฏิทินว่างของรถตอนจอง (เกี่ยวกับเฟส 5) · custom date-time picker · Driver timeline ยัง placeholder

> หมายเหตุ: ตอนทดสอบพบรหัส somchai drift จาก 123 → รีเซ็ต demo ทั้งหมดเป็น 123 แล้ว (verify ผ่าน)

### เฟส 5 — Calendar / Timeline ✅ (เสร็จรอบนี้ · รอ E2E เบราว์เซอร์)
- ✅ หน้า "ตารางการใช้รถ" ใช้ร่วม 3 role — island เดียว `islands/timeline/` (`Timeline` + `MonthGrid` + `DayGrid` + `DriverDayList` + `DetailModal` + `helpers.js`) · entry `timeline` (เพิ่มใน `vite.config.js`)
- ✅ backend: `BookingModel::listForTimeline($role,$userId,$from,$to)` (scoping รวมศูนย์) + `timeline()`/`timelineData()` ใน 3 controller + helper `timeline_helper.php` + 6 route
- ✅ 2 มุมมอง: **รายเดือน** (grid 7x6, pill สูงสุด 3 + "+N", legend, นำทางเดือน, แตะวัน→รายวัน) · **รายวัน** (admin/user = grid รถ 06:00–20:00 clamp ข้ามวัน/นอกช่วง; driver = ลิสต์งาน)
- ✅ scoping: admin=ทุกอย่าง · user=self ทุกคน + other ตัวเอง · driver=งานตัวเอง · ซ่อน rejected/cancelled · completed สีจาง
- ✅ modal อ่านอย่างเดียว (ผู้จอง/แผนก/ตำแหน่ง/เวลา/รถ/คนขับ/หมายเหตุ) — `admin_note` เห็นเฉพาะ admin
- spec: `docs/superpowers/specs/2026-07-13-timeline-calendar-design.md` · plan: `docs/superpowers/plans/2026-07-13-timeline-calendar.md`
- [ ] **รอทำ: E2E เบราว์เซอร์** (login 3 role ผ่าน XAMPP ตรวจ pill/สี/รายวัน/clamp/modal/scoping) — subagent อัตโนมัติทำไม่ได้

### เฟส 6 — ระบบแจ้งเตือน (กระดิ่ง 🔔) ✅ (เสร็จรอบนี้ · รอ E2E เบราว์เซอร์)
- ✅ ตาราง `notifications` (2 สถานะ: `seen_at`=badge, `read_at`=ไฮไลต์) + FK cascade · `NotificationModel` (push/pushToAdmins ข้าม self/list/count/markSeen/markRead/markAllRead)
- ✅ `NotificationController` + 4 route ใต้ `filter:session` (data/seen/read/read-all)
- ✅ island `NotificationBell.jsx` ใน `templates/header.php` (ทุกหน้า/ทุก role) — badge + poll 60วิ (openRef กัน stale) + dropdown (เปิด→seen, กดแถว→read+ไปลิงก์, load-more "ดูเพิ่มเติม", "อ่านทั้งหมด") · POST ต่อคิวกัน CSRF ชน · entry `notification-bell`
- ✅ **10 event** hook: store/register/cancel/returnCar (→admin ข้าม self) · approve/reject/confirmCancel/cancel/update/assignDriver (→ผู้ขอ + คนขับ company) · แจ้ง job_new เฉพาะเมื่อคนขับ "ใหม่จริง"
- spec: `docs/superpowers/specs/2026-07-14-notifications-design.md` · plan: `docs/superpowers/plans/2026-07-14-notifications.md`
- verify: Task 1 model ทดสอบจริงกับ DB · final review READY TO MERGE · Important fixes (poll stale-closure, read keepalive, CSRF serialize, dup job_new) แก้แล้ว
- [ ] **รอทำ: E2E เบราว์เซอร์** (login สลับ role ยิง event จริง ดู badge/dropdown/ไฮไลต์) — subagent ทำแทนไม่ได้
- หมายเหตุ UX (ยังไม่ทำ · spec-consistent): เปลี่ยนคนขับ A→B ไม่แจ้ง A ว่างานถูกถอด

### เฟส 7 — Dashboard + Log (แตกเป็น 2 ก้อน · ทำ Dashboard ก่อน)
**7a Dashboard ✅ (เสร็จรอบนี้ · รอ E2E เบราว์เซอร์):**
- ✅ island `Dashboard.jsx` (เข้าชุด mockup 04) — การ์ดสรุป 4 ใบ (คำขอรออนุมัติ/สมาชิกรออนุมัติ/รถพร้อมใช้/คำขอทั้งหมด) + panel "คำขอจองรถ" (จัดกลุ่มตามวัน + ป้ายสถานะ) + panel "สมาชิกที่รอการอนุมัติ"
- ✅ `DashboardController::index` เรนเดอร์ view จริง (เดิม placeholder) + `data()` (JSON: counts + recentBookings[listAll ตัด 8] + pendingMembers[6]) · route `dashboard/data` · entry `dashboard` ใน vite
- ✅ **UX ปุ่ม:** สมาชิก อนุมัติ(role=user)/ปฏิเสธ = inline (เรียก `members/approve`,`members/reject`) · คำขอจองรถ อนุมัติ/ปฏิเสธ = เด้งไป `/admin/requests` (การอนุมัติรถอื่นๆต้องมอบหมายคนขับ — เก็บ logic ที่เดียว)
- **Verify ✔:** `php -l` + `npm run build` + query จริงกับ DB (counts/listAll/pendingMembers ไม่มี SQL error) · **ยังไม่ได้ E2E เบราว์เซอร์**
- ✅ ปรับเพิ่ม (ตามคำขอ): อนุมัติ/ปฏิเสธคำขอจองรถ **inline** บน dashboard (reuse endpoint) · หัวข้อวันแถบเทาอ่อน + แถวคำขอยืดเต็มกล่อง (bleed) + pending ขีดส้ม/พื้นครีม · panel สมาชิกเส้นคั่นบางโปร่ง + โชว์ ตำแหน่ง/ฝ่าย 2 บรรทัด · คำขอจำกัด **3 วันล่าสุดแบบครบทั้งวัน** (`$maxDays`, verify DB ไม่ตัดกลางวัน)

**ตรวจความพร้อมก่อนขึ้น 7b (readiness check 2026-07-21) — review โค้ดเซสชันนี้ด้วย subagent:**
- ✅ **[Dashboard] ปุ่ม inline กลืน error 422 เงียบ** → เพิ่ม toast แสดงข้อความ fail (เช่นรถเข้าซ่อม/สถานะเปลี่ยน)
- ✅ **[Dashboard] อนุมัติสมาชิก hardcode `level:'user'`** อาจ downgrade driver/admin ที่ pending → ส่ง `m.role` ปัจจุบันแทน
- ✅ **[Dashboard] busyRef ปล่อยก่อน load เสร็จ** → `await load()` + `load()` คืน promise
- ✅ **[force-reset] admin บังคับรีเซ็ตตัวเองได้ (footgun)** → กันบังคับ `user_id === auth()->id()` ใน `MemberController::update`
- sanity: `php -l` ทุกไฟล์เซสชันนี้ + `php spark routes` bootstrap ผ่าน · force-reset flow ยืนยันไม่มี bypass (endpoint guard `requiresPasswordReset`, except list ถูก, modal ปิดไม่ได้)
- ⚪ **ค้าง (minor, ไม่กระทบความพร้อม):** guard ปล่อย GET ทุกอัน (ตอนนี้ไม่มี GET เปลี่ยนข้อมูล = ไม่มีช่องโหว่จริง) · stale re-force (admin โหลด list ค้างแล้ว user รีเซ็ตไปแล้ว แก้ข้อมูลอื่นอาจ re-force — race แคบ recoverable)

**7b Activity Log + Export CSV ✅ (เสร็จรอบนี้ · รอ E2E เบราว์เซอร์):**
- ✅ migration `activity_logs` (user_id FK SET NULL, actor_name/role snapshot, action, created_at) + `ActivityLogModel` (`inRange` ตามช่วงวันที่ DESC)
- ✅ helper `log_activity($action, [actor override])` (โหลดใน `BaseController`) — ดึงผู้ใช้/ชื่อ/บทบาทปัจจุบันอัตโนมัติ · Auth controller โหลด `helper('activity')` เอง
- ✅ **บันทึก event ครอบคลุม:** login (`LoginController`) · สมัคร (`RegisterController`) · จอง/ยกเลิก/ขอยกเลิก/คืนรถ (`User\BookingController`) · อนุมัติ/ปฏิเสธ/ยืนยันยกเลิก/ยกเลิก/แก้ไข/มอบหมายคนขับ (`RequestController`) · อนุมัติ/ปฏิเสธ/แก้ไขสมาชิก (`MemberController`) · เพิ่ม/แก้/ลบรถ (`CarController`) · เพิ่ม/แก้/ลบ แผนก/ตำแหน่ง (`MasterController`)
- ✅ `Admin\ActivityLogController` (index/data/export) + island `ActivityLog.jsx` (ตาราง เวลา/ผู้ใช้/บทบาท/การกระทำ · ฟิลเตอร์ from/to default 7 วัน · มือถือ=การ์ด · seq guard) + entry `activity-log` · route `activity-log`,`/data`,`/export` (เปลี่ยน page จาก MasterController → ActivityLogController)
- ✅ **Export CSV** — `fputcsv` + UTF-8 BOM (Excel อ่านไทยได้) · ช่วงว่าง→toast "ไม่มีข้อมูล..." (ตาม spec) · (Excel/PDF ต่อยอด PhpSpreadsheet/mPDF ภายหลัง)
- **Verify ✔:** `php -l` ทุกไฟล์ + `php spark migrate` (สร้างตาราง) + `npm run build` (53 modules) + `php spark routes` (3 route ใต้ group:admin) + DB จริง (insert log ไทย → inRange DESC → CSV+BOM+UTF-8 valid → filter นอกช่วง=0) · **ยังไม่ได้ E2E เบราว์เซอร์**
- หมายเหตุ: บันทึก **login อย่างเดียว** (ไม่ log logout) · โหลด**ตามช่วงวันที่**
- ✅ **cap หน้าเว็บ = 15 แถวล่าสุด** (`ActivityLogController::PAGE_LIMIT`) + ป้าย "แสดง 15 จากทั้งหมด N — กด Export CSV เพื่อดูครบ" · **Export CSV ยังส่งครบทุกแถว** (`inRange` limit 0) · verify DB: count=total, limit→15 พอดี, all→ครบ, เรียง DESC

### เฟส 8 — i18n ไทย/อังกฤษ
**batch 1 เสร็จ 🟡** (spec: `docs/superpowers/specs/2026-08-07-i18n-design.md` · plan: `docs/superpowers/plans/2026-08-07-i18n.md` · progress: `docs/superpowers/plans/i18n-progress.md`)
- ✅ ระบบ locale: `LocaleFilter` (cookie `lang`, default th) + `App.php` (default th, supported th/en) + route `/lang/{th|en}` (`LocaleController`) + `<meta name="locale">`
- ✅ CI4 Language files: `Nav/Common/Page/Account` (th+en) — ใช้ `Account` เลี่ยงชน namespace `Auth` ของ Shield (CI4 fallback→en ทำให้ Shield ยังทำงานที่ locale=th)
- ✅ แปลแล้ว: sidebar, header (เมนู/dropdown/role), pageTitle+subtitle ทุกหน้าหลัก, login/register (แผงฟอร์ม) + validation client/server, Dashboard.jsx (`t()` + `resources/js/lib/i18n.js` + `locales/{th,en}.json`)
- ✅ ตัวสลับภาษา TH|EN (header + login + register) · zero-impact ยืนยัน (th เดิมทุกตัวอักษร) · final review (opus) = พร้อม deploy
- ✅ **batch 2 (เสร็จ):** islands ครบทุกตัว (Requests/Members/Cars/Master/ActivityLog/Timeline/MyRequests/DriverJobs/Booking/NotificationBell/Pager/ForceReset ผ่าน `resources/js/lib/i18n.js` + `locales/{th,en}.json` ~371 keys) · hero login/register + เดโม + `<title>` · **วันที่/เดือน/วัน locale-aware** (date.js + islands, Thai คงเดิม + EN) · หน้า profile/change-password/register_success/book (`Language/{th,en}/Profile.php`)
- 🟢 verify: `npm run build` ผ่าน · JS/PHP lang parity th↔en ครบ ไม่มี dup · grep ไม่มี UI Thai ตกค้าง · zero-impact (th เดิมทุกตัวอักษร)
- ⬜ E2E เบราว์เซอร์: กดสลับ th↔en ทุกหน้าหลัก + cookie จำภาษา (ต้องทดสอบด้วยคน)
- [ ] ตอนขึ้น prod: `vite.dev=false` + `npm run build` (build แล้วรอบนี้)

---

## วิธีรัน / ทดสอบ (ปัจจุบันใช้โหมด prod build)

```bash
# 1) ฐานข้อมูล + ข้อมูลตั้งต้น
php spark migrate
php spark db:seed MasterDataSeeder      # แผนก/ตำแหน่ง
php spark db:seed DemoUsersSeeder       # admin/somchai/prasert (รหัส 123) + newbie (pending)

# 2) build asset (โหมด prod: .env vite.dev = false) — แก้โค้ด React/Tailwind ต้อง build ใหม่ทุกครั้ง
npm run build

# 3) เปิดผ่าน Apache (XAMPP) ที่ http://icar.ink-connect.com  หรือ php spark serve
#    login admin / 123 → /admin เห็น sidebar 6 เมนู → จัดการสมาชิก เห็น island + ปุ่มอนุมัติ
```

> โหมด **dev (HMR)**: ตั้ง `.env` `vite.dev = true` แล้วรัน `npm run dev` ค้างคู่กับเซิร์ฟเวอร์ (asset โหลดจาก localhost:5173)
