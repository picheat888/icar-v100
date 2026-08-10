# Handoff: ระบบจองรถ — Factory Vehicle / Fleet Booking System

> Brand: **INABA FLEET BOOKING / iCar BOOKING** (Thai Inaba Foods Co., Ltd.)
> Language of UI: **Thai (ภาษาไทย)** · Font: **IBM Plex Sans Thai**

---

## 1. Overview

A web application for employees of a factory to **request company vehicles** and for
administrators to **approve requests, manage members, manage the vehicle fleet, and view a
usage timeline**. It supports three roles (Admin / User / Driver), an account
registration + approval flow, two booking modes (self-drive and admin-arranged with a
driver), a vehicle-availability calendar, an activity log with CSV export, and a fully
responsive layout (desktop / tablet / mobile).

The design is **high-fidelity** — final colors, typography, spacing, copy, and
interactions are all decided. Recreate it pixel-faithfully.

---

## 2. About the design files

The files in `design-files/` are a **design reference built in HTML** (a single
self-contained prototype). They are **not** production code to ship as-is.

- `design-files/ระบบจองรถ.dc.html` — the full prototype (markup + an embedded logic class).
- `design-files/support.js` — the lightweight runtime the prototype uses to render. **You do
  not need to port this.** It is included only so the prototype opens and runs locally for
  reference (open the `.dc.html` in a browser).

**Your task:** recreate these screens in the target codebase using its established
environment and patterns (React, Vue, Next, etc.). If no codebase exists yet, pick the
most appropriate stack. Treat the HTML as the visual + behavioral source of truth; map the
state and handlers described below onto your framework's idioms (router, store, API calls).

The prototype keeps all data **in memory** (seeded mock arrays). In production these become
API calls — see §7 State & Data.

---

## 3. Fidelity

**High-fidelity (hifi).** All visual values below are exact. Reproduce layout, color,
type, radius, and shadow precisely. The only thing to swap is the data layer (mock →
real API) and auth (mock username/password → real authentication).

---

## 4. Roles & navigation

| Role | Thai label | Lands on | Sidebar items |
|---|---|---|---|
| `admin` | Admin | `dashboard` | ภาพรวมระบบ · ตารางการใช้รถ · จัดการสมาชิก · จัดการคำขอจองรถ · จัดการรถ · ข้อมูลหลัก |
| `user` | User ทั่วไป | `timeline` | จองรถ · คำขอของฉัน · ตารางการใช้รถ |
| `driver` | คนขับรถ | `myJobs` | งานของฉัน · ตารางการใช้รถ |

The sidebar is filtered by role (see `navShow*` flags in the logic). The **timeline**
page is shared by all roles but shows role-appropriate content (admin sees status badges
and can open request details; user sees a "จองรถ" CTA).

**Demo accounts** (mock auth, password is `123` for all). The login screen shows quick-login
buttons (`User ทั่วไป`, `คนขับรถ`, `Admin`) — these are a prototype convenience; remove or
gate them in production.

| Username | Password | Role |
|---|---|---|
| `admin` | `123` | Admin |
| `somchai` | `123` | User |
| `prasert` | `123` | Driver |

---

## 5. Screens / Views

Screenshots for every screen are in `screenshots/{desktop,tablet,mobile}/`. Desktop =
Full HD 16:9 (1920×1080). Tablet & mobile are shown in device frames.

### 5.1 Login (`screen: 'login'`)
- **Purpose:** authenticate. **Layout (desktop):** two columns — left teal hero panel
  (`flex:1`), right white form column (`width:452px; max-width:48%`, vertically centered).
- Hero: brand chip (white rounded card, logo gradient tile + "iCar / BOOKING"), headline
  `ระบบจัดการการจองรถสำหรับโรงงาน` (35px/700), subtitle `FACTORY VEHICLE BOOKING SYSTEM`,
  3 check-bullets, copyright footer.
- Form: "เข้าสู่ระบบ" (26px/700), username + password fields, full-width teal submit
  button, divider, 3 quick-login buttons, and a "สมัครสมาชิก" register link.
- **Errors:** wrong credentials → `ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง`; pending account →
  `บัญชีของคุณอยู่ระหว่างรอ Admin อนุมัติ`; rejected → `บัญชีนี้ถูกปฏิเสธ กรุณาติดต่อผู้ดูแลระบบ`.
- **Responsive:** tablet & mobile hide the hero, show the form full-width and centered.

### 5.2 Register (`screen: 'register'`)
- Centered card (`max-width:620px`) on `#eef2f4`. Fields: รหัสพนักงาน*, ชื่อ-นามสกุล*,
  แผนก (select), ตำแหน่ง (select), เบอร์โทร, Username*, Password*, ยืนยันรหัสผ่าน.
- Validation: required = empId/name/username/password (else
  `กรุณากรอกข้อมูลที่จำเป็นให้ครบ…`); password mismatch
  (`รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน`); duplicate username
  (`Username นี้ถูกใช้งานแล้ว…`). On submit → new registration with `status:'pending'`,
  `level:null` → goes to Register success.

### 5.3 Register success (`screen: 'register-success'`)
- Centered confirmation card: green check circle, "สมัครสมาชิกเรียบร้อย", note that the
  account awaits Admin approval, and a button back to login.

### 5.4 Admin · Dashboard (`page: 'dashboard'`)
- Title "ภาพรวมระบบ" / subtitle "สรุปภาพรวมการใช้งานระบบจองรถ".
- **4 stat cards** (2×2 grid; 1 col on mobile): คำขอจองรถรออนุมัติ, สมาชิกรออนุมัติ,
  รถพร้อมใช้งาน, คำขอทั้งหมด — each a number + small icon tile.
- **คำขอจองรถ** panel: bookings grouped by date, each row = id, requester, vehicle, time,
  status badge, and (for pending) อนุมัติ / ปฏิเสธ actions. "ดูทั้งหมด" link.
- A **สมาชิกที่รอการอนุมัติ** panel may sit alongside.

### 5.5 Admin · จัดการสมาชิก (`page: 'members'`)
- Title "จัดการสมาชิก". Filter bar: status (all/pending/approved/rejected), role, dept,
  text search. Member list/table with name, dept, position, role badge, status.
- Pending members → **อนุมัติ** opens the *approve member* modal (assign role/level).
- Approved members → **แก้ไข** opens the *edit member* modal (info tab / password tab).

### 5.6 Admin · จัดการคำขอจองรถ (`page: 'requests'`)
- Title "จัดการคำขอจองรถ". Filters: type (self/other), status, search.
- **Desktop:** full table. **Tablet:** 2-column card grid (`.req-cards`). **Mobile:**
  stacked cards. Each row opens the *request detail* modal; pending requests can be
  approved/rejected, and admin assigns a driver for "other" (admin-arranged) bookings.

### 5.7 Admin · จัดการรถ (`page: 'vehicles'`)
- Title "จัดการรถ". Tabs: **รถของบริษัท (self)** vs **รถจัดหาโดย Admin (other)**.
  - Self: card grid of vehicles (model, plate, seats, status badge available/maintenance,
    optional uploaded image). "เพิ่มรถใหม่".
  - Other: table of pooled vehicles incl. assigned driver + note.
- Add/Edit open the *vehicle form* / *other vehicle form* modals (image upload supported).

### 5.8 Shared · ตารางการใช้รถ / Timeline (`page: 'timeline'`)
- Title "ตารางการใช้รถ". Toggle **รายเดือน / รายวัน**, with ‹ › month/day nav and a label.
- **Month view:** 7-col calendar; each day cell shows approved/pending counts, up to 3
  event pills (`HH:MM – HH:MM Vehicle`), "+N" overflow. Approved pills green
  (`#e7f4ee`/`#0c8b87`), pending amber (`#fdf0e0`/`#e08a1e`). Admin pills are clickable
  (open detail); users see a booking CTA. Legend at bottom.
- **Day view:** horizontal time axis 06:00–20:00 with positioned booking bars.

### 5.9 Admin · ข้อมูลหลัก (`page: 'master'`)
- Title "ข้อมูลหลัก (แผนก / ตำแหน่ง)". Tabs **ข้อมูล (data)** / **ประวัติการใช้งาน (log)**.
  - Data: manage **แผนก (departments)** and **ตำแหน่ง (positions)** lists — add via input +
    button, remove with confirm. Counts shown.
  - Log: **activity log** table (เวลา, ผู้ใช้, บทบาท, การกระทำ), date-range filter
    (from/to) and **Export CSV**. Mobile shows log as cards.

### 5.10 User · จองรถ (`page: 'book'`)
- Title "จองรถ". Choose booking type:
  - **จองรถขับเอง (self)** — 2-step modal: (1) pick a vehicle + see its **availability
    calendar** (month/week/day) and fill location/time/people/purpose/map link; (2) review.
    Wider modal (`960px`).
  - **จองรถ (จัดหาโดย Admin) (other)** — single-step form; Admin later assigns vehicle+driver.
- Date-time fields use a **custom picker** (calendar + hour/minute columns); on mobile it's
  a **bottom sheet**. On submit → booking added with `status:'pending'`, user is taken to
  คำขอของฉัน, toast `ส่งคำขอจองรถเรียบร้อย รอ Admin อนุมัติ`.

### 5.11 User · คำขอของฉัน (`page: 'myRequests'`)
- Title "คำขอของฉัน". User's bookings grouped by date with status badges; pending can be
  cancelled; tap a row for detail. Mobile = compact cards.

### 5.12 Driver · งานของฉัน (`page: 'myJobs'`)
- Title "งานของฉัน". List of bookings assigned to the logged-in driver (the
  admin-arranged "other" bookings with `driver === <name>`), with time, location, requester.

### Modals & overlays (shared)
`bookForm` (self 2-step / other), `reqDetail`, `approveMember`, `editMember` (info/password
tabs), `vehForm`, `otherVeh`, `myProfile`, `changePass`, a generic **confirm dialog**, and a
**toast**. Profile dropdown (top-right avatar) → ข้อมูลส่วนตัว / เปลี่ยนรหัสผ่าน / ออกจากระบบ.

---

## 6. Interactions & behavior

- **Navigation:** `go(page)` sets the active page, closes any modal & the mobile nav drawer.
- **Sidebar toggle:** desktop collapses the sidebar (icon-only); tablet/mobile open it as an
  overlay drawer (hamburger in the header).
- **Approve / Reject booking:** updates booking `status` and writes an activity-log entry +
  toast. Reject can carry a note shown in the request detail.
- **Approve member:** sets `status:'approved'` and a `level` (admin/user/driver).
- **CSV export:** filters the activity log by from/to date and downloads a CSV; empty range
  → toast `ไม่มีข้อมูลในช่วงวันที่ที่เลือก`.
- **Confirm dialog:** destructive/important actions (delete dept/position, change password,
  etc.) route through a confirm overlay before committing.
- **Toasts:** transient (~2.8s), centered near top, slide-up in.
- **Animations:** `fadeUp` (cards/screens), `ovIn` (overlay fade), `mdIn` (modal rise+scale),
  `toastIn`, `sheetUp` (mobile bottom sheets). Easing for sheets:
  `cubic-bezier(.2,.8,.3,1)`, ~.28s.
- **Focus state (inputs):** border `#0c8b87` + `box-shadow:0 0 0 3px rgba(12,139,135,.12)`.

### Responsive rules
- Device is driven by a `device` value (`desktop` / `tablet` / `mobile`). In production this
  is just your normal responsive CSS; the prototype additionally emulates device frames.
- **Mobile breakpoint** mirrors `@media (max-width:680px)`.
- Pattern swaps: requests table → card grid (tablet) → stacked cards (mobile); activity log
  table → cards (mobile); date-time picker & confirm/edit modals → bottom sheets / compact
  on mobile; sidebar → overlay drawer.

---

## 7. State & data (prototype → production)

The prototype's logic class holds everything in `state`. Map these to API resources:

| State | Becomes | Notes |
|---|---|---|
| `registrations[]` | Users/accounts API | fields: empId, name, dept, position, phone, username, password, **status** (pending/approved/rejected), **level** (admin/user/driver/null) |
| `bookings[]` | Bookings API | id, requester, dept, **type** (self/other), vehicle(+vehicleId), location, start, end, people, purpose, mapLink, **status** (pending/approved/rejected), driver, note, submittedAt |
| `vehicles[]` | Fleet API (company) | id, model, plate, seats, status (available/maintenance), image |
| `otherVehicles[]` | Fleet API (pooled + driver) | + driver, note |
| `departments[]`, `positions[]` | Master-data API | used in registration selects |
| `activityLog[]` | Audit log API | at, user, roleLabel, action; supports date filter + CSV |

Key derived/UI state: `screen` (login/register/register-success/app), `page` (active route),
`modal` (which dialog + its payload), `toast`, `confirm`, `navOpen`/`navCollapsed`,
`profileOpen`, booking/vehicle/member filter + tab fields, timeline & availability view/date.

**Auth/security note:** the prototype stores plaintext passwords in mock data and matches
them client-side purely for demo. Use real authentication, hashed passwords, and
server-side authorization (role gating) in production.

---

## 8. Design tokens

**Typography** — `'IBM Plex Sans Thai', system-ui, sans-serif`, weights 300/400/500/600/700.
- Hero H1 35px/700 · H2 26px/700 · section/card titles ~16–20px/600–700
- Body 14–15px · labels 12–13px/600 · small/meta 11–12.5px
- Base text color `#243039`; headings `#1f2a33`.

**Color**
| Token | Hex |
|---|---|
| Primary teal | `#0c8b87` |
| Teal dark (gradients/hover) | `#0a5f5c` · `#0a605e` · `#0a716e` |
| Brand tile gradient | `linear-gradient(145deg,#0c8b87,#0a5f5c)` |
| Hero gradient | `linear-gradient(155deg,#0c8b87 0%,#0a605e 100%)` |
| Page background | `#f3f5f7` |
| Register/success bg | `#eef2f4` |
| Card / surface | `#ffffff` |
| Borders | `#e7ebee` · `#f0f3f5` · `#eceff1` |
| Device backdrop | `#dfe3e7` |
| Text muted | `#7a8794` · `#6b7884` · `#9aa7b2` |
| Placeholder | `#9aa7b2` |

**Status colors**
| State | Background | Text |
|---|---|---|
| Approved (อนุมัติแล้ว) | `#e7f4ee` | `#16855a` |
| Rejected (ปฏิเสธ) | `#fbecea` | `#c0392b` |
| Pending (รออนุมัติ) | `#eef1f4` | `#5b6b7a` |
| Vehicle maintenance (ซ่อมบำรุง) | `#fde7d6` | `#b5701a` |
| Vehicle available (พร้อมใช้งาน) | `#e7f4ee` | `#16855a` |

**Calendar event pills** — approved: bg `#e7f4ee`, border `#0c8b87`, text `#0a5f5c`;
pending: bg `#fdf0e0`, border `#e08a1e`, text `#9a5a12`.

**Radius** — inputs/buttons 8–9px · small chips/segmented 6–7px · cards 12–16px ·
badges/pills full (`border-radius:50%`/pill). Device frame 30px with 11px bezel.

**Shadow** — card `0 1px 2px rgba(0,0,0,.1)`; elevated card `0 8px 30px rgba(31,42,51,.08)`;
brand chip `0 8px 24px rgba(0,0,0,.16)`; device `0 24px 70px rgba(0,0,0,.28)`.

**Focus ring** — `border-color:#0c8b87; box-shadow:0 0 0 3px rgba(12,139,135,.12)`.

**Layout** — desktop sidebar `width:250px`; header `height:64px`; content max width is fluid.
Tablet frame 834×1040, mobile frame 390×838 (reference device sizes).

---

## 9. Assets

- **Logos / icons:** all inline SVG (a car/van glyph in a teal gradient tile + "iCar /
  BOOKING" wordmark, and "INABA FLEET BOOKING" in the app sidebar). No external icon font is
  required — recreate with your icon library or keep the inline SVGs.
- **Vehicle images:** user-uploaded (stored as data URLs in the prototype). In production,
  upload to your storage and reference the URL.
- No external image assets are required to reproduce the screens.

---

## 10. Files in this bundle

```
design_handoff_vehicle_booking/
├── README.md                        ← this document
├── design-files/
│   ├── ระบบจองรถ.dc.html            ← the full HTML prototype (open in a browser)
│   └── support.js                   ← prototype runtime (reference only; do not port)
└── screenshots/
    ├── desktop/   01..12 .png       ← Full HD 16:9 (1920×1080)
    ├── tablet/    01..12 .png       ← tablet device frame
    └── mobile/    01..12 .png       ← mobile device frame
```

Screenshot index (same numbering across all three sizes):
`01-login`, `02-register`, `03-register-success`, `04-admin-dashboard`,
`05-admin-members`, `06-admin-requests`, `07-admin-vehicles`, `08-admin-timeline`,
`09-admin-master`, `10-user-book`, `11-user-myrequests`, `12-driver-myjobs`.
