# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **สถานะโปรเจกต์ (อ่านก่อน):** เฟส 1 (**Auth + App shell**) เสร็จแล้ว — ดูรายละเอียด/งานค้างที่ [`docs/PLAN.md`](docs/PLAN.md)
> - ✅ **Login/Register จริง** — login ด้วย username + ด่านตรวจสถานะ (`Auth\LoginController`), สมัคร→`user_profiles` status=`pending` (`Auth\RegisterController`) ไม่ auto-login
> - ✅ **App shell** (`layouts/{admin,user,driver}.php` + `templates/{sidebar,header,footer,scripts,shell}.php`) · หน้า `/profile` + `/change-password` ใช้ร่วมทุก role
> - ✅ **DB:** `departments`, `positions`, `user_profiles` (1:1, status enum, FK) + Models · seeder `MasterDataSeeder` + `DemoUsersSeeder` (admin/somchai/prasert รหัส `123`, profile approved)
> - ✅ `Routes.php` group `admin`/`user(group:user)`/`driver` + override auth routes (นิยามก่อน `service('auth')->routes()`) · `Shield groups+permissions` ใน `AuthGroups.php` (§4.1)
> - ✅ **Member (เฟส 2)** — `จัดการสมาชิก` (`islands/MembersManager.jsx`): list+ฟิลเตอร์+อนุมัติ/ปฏิเสธ/เปิด-ปิดใช้งาน/แก้ไข · `Admin\MemberController` · guard บัญชีตัวเอง/admin คนสุดท้าย
> - ✅ **Master + Car (เฟส 3)** — แผนก/ตำแหน่ง (`MasterData.jsx` รับ prop `only=dept|position` + `Admin\MasterController`) **เป็นเมนูย่อย (submenu) ใต้ "จัดการสมาชิก" ใน sidebar** → หน้าแยก `/admin/departments`, `/admin/positions` (`/admin/master` redirect) · sidebar รองรับ submenu แบบกาง/พับ (ดู `templates/sidebar.php` — item ที่มี children) · `จัดการรถ` (`CarsManager.jsx` + `Admin\CarController` + ตาราง `cars`: self/other + อัปโหลดรูป `public/uploads/cars`)
> - **Pattern ของ island:** ส่ง CSRF ผ่าน header `X-CSRF-TOKEN` + `X-Requested-With: XMLHttpRequest` · action คืน csrf ใหม่ใน JSON ให้ island อัปเดต (regenerate=true)
> - ✅ **Booking (เฟส 4a+4b)** — User จองรถ (`BookingForm`: grid การ์ด + modal 2 คอลัมน์ + ปฏิทินว่าง + custom datetime picker) · คำขอของฉัน (`MyRequests`) · Admin อนุมัติ/ปฏิเสธ + มอบหมายคนขับ 3 แบบ (`RequestsManager` + `Admin\RequestController` + ตาราง `bookings`) · admin จองรถได้จากหน้าจัดการรถ
> - ⬜ ที่เหลือ: Driver "งานของฉัน" (4c) · Timeline (5) · Dashboard/Log (6) — ยัง placeholder
> - `vite.config.js` `rollupOptions.input`: app-css + members-manager + master-data + cars-manager + booking-form + my-requests + requests-manager (เพิ่ม entry ทุกครั้งที่มี island ใหม่)
> - ✅ **CSS/Component cleanup** — ไม่มี inline style หลงเหลือใน view (PHP) และ React islands (ยกเว้นจุดที่ตั้งใจเก็บไว้ — ดู §5.5) · CSS ของหน้า/island ทั้งหมดอยู่ที่ `resources/css/style.css` (มีสารบัญ 6 หมวด) แยกจาก `resources/css/app.css` ที่เหลือแค่ Tailwind entry + design token + base element · component กลางฝั่ง React อยู่ที่ `resources/js/lib/` (`Toast`, `Table`, `Pager`, `Alert`) — ดูรายละเอียดที่ §3, §5.5, §6, §9
>
> โมดูลที่ยังไม่ทำ: เอกสารด้านล่างเป็น **แผน/ดีไซน์เป้าหมาย** ใช้เป็นแนวทางตอนสร้าง — เช็คของจริงใน `docs/PLAN.md` ก่อน
>
> **แหล่งอ้างอิงสำคัญใน `docs/` (ดูก่อนสร้างฟีเจอร์):**
> - `docs/database-design/iCar-Database-Design.docx` — ดีไซน์ฐานข้อมูล (สร้างจาก `generate-docx.php` ด้วย PhpWord; รันด้วย `php docs/database-design/generate-docx.php`)
> - `docs/mockuo-master/` — **source of truth ด้านหน้าตา/พฤติกรรม**: prototype HTML (`design-files/ระบบจองรถ.dc.html`) + `README.md` (handoff สเปก) + `screenshots/` (desktop/tablet/mobile ทุกหน้า)
> - Brand: INABA FLEET BOOKING / iCar BOOKING (Thai Inaba Foods) · UI ภาษาไทยเป็นหลัก · ฟอนต์ Sarabun (mPDF/เว็บ) / IBM Plex Sans Thai (ดีไซน์)

## 1. Project Overview 

ชื่อระบบ: iCar booking 
ทำอะไร: ระบบจองรถสำหรับองค์กร กลุ่มผู้ใช้งาน (1) Admin จัดตารางการใช้งานรถ, จัดการสมาชิก, จัดการคำขอใช้รถ, จัดการข้อมูลรถ (2) User มีแค่สิทธิ์จองรถ ตรวจสอบตารางการจองรถ (3) Driver คนขับรถมีหน้ามีดูงานตัวเอง ที่ได้รับมอบหมาย **รถมี 2 ประเภท รถขับเอง และรถอื่น ๆ รถอื่นๆ คือรถที่ Admin จัดให้ว่าจะเป็นรถที่มีคนขับของบริษัท หรือไม่รถที่จ้างจากนอกบริษัท** รองรับ 2 ภาษา อังกฤษ/ไทย

### โมดูลหลัก

| # | Module | คำอธิบาย |
|---|--------|----------|
| 1 | Dashboard | แสดงภาพรวมของระบบ ใน Role Admin |
| 2 | Calendar | แสดงตารางการใช้งานของรถ ใน Role Admin แสดงตารางทุกอย่างเป็นตารางรวม Role User แสดงตารางรถขับเอง และที่ตัวเองจอง Role Driver แสดงเฉพาะตารางงานของตัวเอง |
| 3 | Car booking | แสดงรายการคำขอใช้งานรถ ใน Role Admin แสดงรายการคำขอการใช้รถ, Admin สามารถอนุมัติ หรือปฏิเสธคำขอ และสามารถเข้าไปตรวจสอบรายละเอียดการขอใช้งาน, การอนุมติของ Admin เลือกได้ว่า (1) รถขับเอง (2) รถอื่น ๆ (3) คนขับภายนอก (Admin Manage คนขับ ข้อมูลรถเอง ตอนอนุมัติ) History Booking เช่น การเข้าใช้งานระบบ การจองรถ การอนุมัติรถ และสามารถ |
| 4 | Car management | แสดงรายละเอียดรถในระบบ แบบที่ (1) รถขับเอง (2) รถอื่น ๆ โดย Role Admin สามารถเพิ่ม ลบ แก้ไขรถ และสถานะรถ หรือ จองรถ |
| 5 | Member | แสดงรายชื่อสมาชิกในระบบ ใน Role Admin แสดงรายการคำขอ Admin สามารถอนุมัติหรือปฏิเสธผู้ใช้งานที่ลงทะเบียนเข้าใช้งานระบบ และแก้ไขรายละเอียดต่างๆของผู้ใช้งานรวมถึง Role ของผู้ลงทะเบียน  |

---

## 2. Tech Stack

| Layer | Technology | ทำหน้าที่ |
|-------|------------|-----------|
| Backend | PHP ≥8.2 + CodeIgniter 4 (`^4.7`) | ตัวระบบหลัก (MVC) เรนเดอร์ HTML และเป็น JSON API ให้ island |
| Frontend | React + TypeScript | แปะเฉพาะส่วนที่ต้อง interactive ในหน้าที่ CI4 เรนเดอร์ (Hybrid / Islands) |
| Build | Vite | build / bundle ไฟล์ React + Tailwind, มี HMR ตอน dev |
| Database | MariaDB | เก็บข้อมูล |
| Styling | Tailwind CSS | จัดสไตล์แบบ utility-first |
| Auth | CodeIgniter Shield | ล็อกอิน / สิทธิ์ผู้ใช้ (admin, user, driver) — ใช้ **session** |
| Validation | CI4 Validation (มากับ CI4) | ตรวจข้อมูลที่ฝั่ง server เสมอ |
| Export Excel | **PhpSpreadsheet** | ออกรายงาน Excel — **ยังไม่ได้ติดตั้ง** `composer require` เมื่อต้องใช้ |
| Export PDF | **mPDF** | ออก PDF จาก HTML รองรับภาษาไทย — **ยังไม่ได้ติดตั้ง** `composer require` เมื่อต้องใช้ |

> **หมายเหตุ:** `composer.json` มี `phpoffice/phpword` ติดตั้งอยู่ แต่ **ไม่ใช่ระบบ export ของแอป** — มีไว้ให้สคริปต์ `docs/database-design/generate-docx.php` สร้างเอกสารออกแบบ DB เป็น `.docx` เท่านั้น

> **สถาปัตยกรรม (สำคัญ):** CI4 เรนเดอร์หน้า HTML เป็นหลัก (ผ่าน Shield session ตามปกติ)
> แล้ว **ฝัง React เฉพาะส่วนที่ต้อง interactive** เช่น ตารางที่กรอง/เรียง/แบ่งหน้าได้, ฟอร์มซับซ้อน
> หน้า CRUD หรือฟอร์มทั่วไป → ใช้ CI4 view ล้วนได้เลย ไม่ต้องมี React
> เพราะใช้ session (same-origin) Shield จึงป้องกัน endpoint JSON ของ island ได้ฟรีๆ ไม่ต้องทำ token

---

## 3. Folder Structure

> หลักคิดง่ายๆ: **Controller** รับคำสั่ง → **Model** คุยกับฐานข้อมูล → **View** แสดงผล
> โฟลเดอร์ `Admin/` `User/` `Driver/` คือแยก "หลังบ้าน" "หน้าผู้ใช้" "หน้าคนขับ" ออกจากกัน
> ส่วน `resources/` คือซอร์ส React/Tailwind ที่ Vite จะ build ออกไปไว้ที่ `public/build/`

```
project-root/
│
├── app/
│   ├── Config/
│   │   ├── Routes.php          # กำหนด URL ว่าวิ่งไป Controller ไหน
│   │   ├── Auth.php            # ตั้งค่า Shield (auth)
│   │   └── AuthGroups.php      # กำหนดกลุ่มผู้ใช้: admin, user, driver
│   │
│   ├── Controllers/            # รับ request → สั่งงาน → ส่ง view (หรือ JSON)
│   │   ├── BaseController.php  #   โหลด helper 'vite' ไว้ที่นี่
│   │   ├── Auth/               # login / logout
│   │   ├── Admin/              # หลังบ้าน   → URL: /admin/...
│   │   ├── User/               # หน้าผู้ใช้  → URL: /...
│   │   └── Driver/             # หน้าคนขับ  → URL: /driver/...
│   │
│   ├── Models/                 # คุยกับฐานข้อมูล (1 model : 1 ตาราง)
│   │   ├── {Name}Model.php     #   ตั้งชื่อ PascalCase ลงท้าย "Model"
│   │   └── ExampleModel.php    #   เช่น UserModel.php, ProductModel.php
│   │
│   ├── Database/
│   │   ├── Migrations/         # โครงสร้างตาราง (สร้าง/แก้ตารางผ่านโค้ด)
│   │   └── Seeds/              # ข้อมูลตั้งต้น (เช่น บัญชี admin)
│   │
│   ├── Views/                  # ไฟล์หน้าเว็บ (.php) — เรนเดอร์ฝั่ง server
│   │   ├── templates/          # ชิ้นส่วนใช้ซ้ำ
│   │   │   ├── header.php       #   ฝัง CSRF token ลง <meta> ที่นี่ให้ React อ่าน
│   │   │   ├── navbar.php
│   │   │   ├── sidebar.php
│   │   │   ├── footer.php
│   │   │   └── scripts.php
│   │   │
│   │   ├── layouts/            # โครงหน้าหลัก (เอา template มาประกอบ)
│   │   │   ├── admin.php       #   โครงหน้าหลังบ้าน
│   │   │   ├── user.php        #   โครงหน้าผู้ใช้
│   │   │   └── driver.php      #   โครงหน้าคนขับ
│   │   │
│   │   ├── auth/
│   │   │   └── login.php
│   │   │
│   │   ├── admin/              # หน้าหลังบ้าน (1 โฟลเดอร์ : 1 โมดูล)
│   │   │   ├── dashboard/
│   │   │   ├── profile/
│   │   │   └── {module}/       #   ข้างใน: index.php / create.php / edit.php
│   │   │                       #   วาง <div id="..."> + vite_asset() ตรงที่อยากมี island
│   │   │
│   │   ├── user/               # หน้าผู้ใช้
│   │   │   ├── dashboard/
│   │   │   ├── profile/
│   │   │   └── {module}/
│   │   │
│   │   └── driver/             # หน้าคนขับ
│   │       ├── dashboard/
│   │       ├── profile/
│   │       └── jobs/           #   งานที่ได้รับมอบหมาย
│   │
│   ├── Filters/                # ยาม: เช็คก่อนเข้าหน้า (ล็อกอินยัง? เป็น admin ไหม?)
│   ├── Helpers/                # ฟังก์ชันสั้นๆ ใช้ซ้ำ (format วันที่, สร้างรหัส)
│   │   └── vite_helper.php     #   ฟังก์ชัน vite_asset() เชื่อม CI4 ↔ Vite
│   ├── Libraries/              # คลาสเสริมที่เขียนเอง (เพิ่มเมื่อต้องใช้)
│   ├── Services/               # business logic ก้อนใหญ่ (เพิ่มเมื่อ logic ซับซ้อน)
│   └── Validation/             # กฎ validate ที่ใช้ซ้ำ
│
├── resources/                  # ★ ซอร์สฝั่ง frontend (Vite จะ build จากที่นี่)
│   ├── css/
│   │   ├── app.css             #   Tailwind entry + @import "./style.css" + design token :root + base element (body/input/button/::placeholder)
│   │   └── style.css           #   CSS ของหน้า view + island ทั้งหมด — มีสารบัญ 6 หมวดบนไฟล์ (Components/Shell/Auth/Profile/Pages/Islands)
│   └── js/
│       ├── islands/            # React component จริง (เอาไปใช้ซ้ำได้หลายหน้า)
│       │   └── ProductTable.jsx
│       ├── lib/                # React component กลางใช้ซ้ำข้าม island (Toast, Table, Pager, Alert)
│       └── entries/            # จุด mount React เข้า DOM (1 entry : 1 จุดใช้งาน)
│           └── product-table.jsx
│
├── public/                     # โฟลเดอร์เดียวที่เปิดให้เข้าถึงจากเว็บ
│   ├── index.php               # ประตูเข้าระบบ
│   ├── build/                  # ★ ไฟล์ที่ Vite build ออกมา (อย่า commit, อยู่ใน .gitignore)
│   ├── assets/                 # ไฟล์ static ที่ไม่ผ่าน Vite
│   │   ├── images/
│   │   └── fonts/              #   เช่น ฟอนต์ไทย (Sarabun) สำหรับ mPDF
│   └── uploads/                # ไฟล์ที่ผู้ใช้อัปโหลด (ถ้าเป็นไฟล์ลับ ให้ย้ายไป writable/)
│
├── writable/                   # log, cache, session (ระบบเขียนไฟล์ที่นี่)
├── tests/
│   ├── Database/               # ทดสอบ migration / seed
│   └── Feature/                # ทดสอบการทำงานของ controller
├── vendor/                     # โค้ด library (composer สร้างให้ ห้ามแก้)
├── node_modules/               # library ฝั่ง JS (npm สร้างให้ ห้ามแก้, ไม่ commit)
├── vite.config.js              # ★ ตั้งค่า Vite (entry, output, plugin)
├── package.json                # รายการ dependency ฝั่ง JS + script (dev/build)
└── .env                        # ค่าตั้งค่า (รหัส DB, vite.dev) — ห้าม commit ขึ้น git
```

> **`Helpers/ Libraries/ Services/ Validation/`** เป็นโฟลเดอร์ที่ CI4 มีให้ตั้งแต่แรก
> ปล่อยว่างไว้ก่อนได้ ค่อยใส่ของเมื่อต้องใช้ — ไม่ต้องรีบเติม

---

## 4. URL ทำงานยังไง (กำหนดที่ `app/Config/Routes.php`)

ชื่อโฟลเดอร์ Controller **ไม่ใช่** ตัวกำหนด URL — เรากำหนด URL เองใน `Routes.php`

```php
// หน้าผู้ใช้: http://localhost/...
$routes->group('', ['filter' => 'session'], function ($routes) {
    $routes->get('dashboard', 'User\DashboardController::index');   // /dashboard
});

// หลังบ้าน: http://localhost/admin/...  (เฉพาะ admin)
$routes->group('admin', ['filter' => 'group:admin'], function ($routes) {
    $routes->get('/', 'Admin\DashboardController::index');          // /admin
    $routes->resource('users', ['controller' => 'Admin\UserController']); // /admin/users

    // endpoint JSON ให้ React island ดึงข้อมูล — อยู่ใต้ filter เดียวกัน Shield จึงป้องกันให้
    $routes->get('products/data', 'Admin\ProductController::data');
});

// หน้าคนขับ: http://localhost/driver/...  (เฉพาะ driver)
$routes->group('driver', ['filter' => 'group:driver'], function ($routes) {
    $routes->get('/', 'Driver\DashboardController::index');         // /driver
    $routes->get('jobs', 'Driver\JobController::index');           // /driver/jobs  (งานที่ได้รับมอบหมาย)
});

// ล็อกอิน: http://localhost/login
$routes->get('login',  'Auth\LoginController::index');
$routes->post('login', 'Auth\LoginController::attempt');
$routes->get('logout', 'Auth\LoginController::logout');
```

- `filter => 'session'` = ต้องล็อกอินก่อนถึงเข้าได้
- `filter => 'group:admin'` = เฉพาะกลุ่ม admin (Shield จัดการให้)
- `filter => 'group:driver'` = เฉพาะกลุ่ม driver (คนขับ) เห็นเฉพาะงานของตัวเอง
- **endpoint ของ island ให้วางใต้ group/filter เดียวกับหน้าที่ใช้** เพราะ browser ส่ง cookie session ไปเอง (same-origin) Shield เลยป้องกัน JSON ได้โดยไม่ต้องทำ token

### 4.1 Shield groups & permissions (ตั้งค่าไว้แล้วใน `app/Config/AuthGroups.php`)

`defaultGroup = 'user'` (ผู้ลงทะเบียนใหม่เข้ากลุ่ม `user`). ใช้ชื่อ permission พวกนี้ตอนเช็คสิทธิ์ — **อย่าตั้งชื่อใหม่ซ้ำซ้อน**:

| Group | Permissions |
|-------|-------------|
| `admin` | `admin.*`, `members.manage`, `cars.manage`, `bookings.manage`, `bookings.create` |
| `user` | `bookings.create` |
| `driver` | `driver.access` |

permission ที่ประกาศไว้: `admin.access`, `members.manage`, `cars.manage`, `bookings.manage`, `bookings.create`, `driver.access`
เช็คในโค้ดด้วย `auth()->user()->can('bookings.manage')` หรือใน Routes ด้วย `filter => 'group:admin'` / `'permission:bookings.manage'`

---

## 5. Frontend: React Islands + Vite

แนวคิด: CI4 เรนเดอร์หน้า HTML ปกติ แล้ว React แค่ "มา mount" ลง `<div>` ว่างๆ ที่เราวางไว้

### 5.1 ไหลของงานโดยรวม

1. CI4 view วาง `<div id="...">` + ส่ง props ผ่าน `data-props` แล้วเรียก `vite_asset()`
2. ไฟล์ entry หา `<div>` นั้น → อ่าน props → `createRoot().render()` ตัว component
3. component fetch ข้อมูลจาก endpoint JSON ของ CI4 (cookie session ติดไปเอง)

### 5.2 vite.config.js (หัวใจ)

สั่ง build ลง `public/build` พร้อม `manifest: true` และระบุ entry แต่ละตัว:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/build/',
  build: {
    outDir: 'public/build',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        // ★ เพิ่มทีละบรรทัดเมื่อมี island ใหม่
        'product-table': 'resources/js/entries/product-table.jsx',
        'app-css': 'resources/css/app.css',
      },
    },
  },
  server: { origin: 'http://localhost:5173' },
});
```

### 5.3 ตัวอย่างฝั่ง CI4 (View + Controller)

```php
<!-- app/Views/admin/products/index.php -->
<div id="product-table"
     data-props='<?= esc(json_encode([
        "endpoint" => site_url("admin/products/data")
     ]), "attr") ?>'></div>

<?= vite_asset('resources/js/entries/product-table.jsx') ?>
```

```php
// app/Controllers/Admin/ProductController.php
public function index() { return view('admin/products/index'); }   // หน้า HTML ปกติ
public function data()  {                                          // JSON ให้ island
    return $this->response->setJSON((new \App\Models\ProductModel())->findAll());
}
```

### 5.4 ตัวอย่างฝั่ง React (entry + component)

```jsx
// resources/js/entries/product-table.jsx
import { createRoot } from 'react-dom/client';
import ProductTable from '../islands/ProductTable';

const el = document.getElementById('product-table');
if (el) createRoot(el).render(<ProductTable {...JSON.parse(el.dataset.props || '{}')} />);
```

```jsx
// resources/js/islands/ProductTable.jsx
import { useState, useEffect } from 'react';

export default function ProductTable({ endpoint }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    fetch(endpoint, { headers: { Accept: 'application/json' } })
      .then(r => r.json()).then(setRows);   // cookie session ติดไปเอง
  }, [endpoint]);
  return (/* ...ตาราง + ช่องค้นหา (Tailwind)... */);
}
```

### 5.5 จุดที่พลาดบ่อย

- **Tailwind ตัด class ในไฟล์ .php ทิ้ง** — ต้องบอกให้สแกน view ของ CI4 ด้วย ใน `resources/css/app.css`:
  ```css
  @import "tailwindcss";
  @import "./style.css";
  @source "../../app/Views/**/*.php";
  ```
- **CSRF เวลา POST/PUT** — ฝัง token ลง `<meta name="csrf" content="...">` ที่ layout/header แล้วให้ React อ่านไปแนบใน header (GET เฉยๆ ไม่ต้อง)
- **มี component กลางแล้ว ใช้ก่อนสร้างใหม่เสมอ** — ต่างแค่ตัวเลขเล็กน้อยให้ใช้ค่ากลาง ไม่ต้อง override:
  - CSS ใน `resources/css/style.css` §1 Components: `.brand` · `.icon-box` (+`--round --teal`) · `.pill` (+`--sm --teal --orange --gray --green --amber --red`) · `.btn-primary` `.btn-ghost` `.btn-block` · `.form-label` `.form-input` (+`--sm`) `.field` `.field-eye` · `.alert-error` (+`--icon`) `.alert-success` · `.card` · `.empty-card` `.empty-icon` · `.title` (+`--xl --lg --md --sm`) · `.subtext` (+`--lg --sm --faint`) · `.tbl-wrap` `.tbl-scroll` `.tbl` (+`--center`) `.tbl-empty` `.ta-l/.ta-c/.ta-r` · `.icon-btn` (+`--green --red --gray`) · `.toast` · `.pager` (+`--incard`) · `.st-pending/.st-approved/.st-cancel_requested/.st-completed`
  - React ใน `resources/js/lib/`: `Toast.jsx` (`useToast(ms)` → `{ toast, showToast, ToastView }`) · `Table.jsx` (`<Table center? footer?>`) · `Pager.jsx` (`<Pager page totalPages total perPage onPage inCard?>`) · `Alert.jsx` (`<Alert style?>`)
- **ห้ามเขียน `*` ติดกับ `/` ในคอมเมนต์ CSS** (เช่น `.st-*/.pill`) เพราะ `*/` จะปิดคอมเมนต์กลางประโยคแล้วกลืนกฎที่ตามมาหายจาก bundle **โดย build ยังผ่าน** — เจอมาแล้ว 2 ครั้ง
- **`npm run build` ผ่านไม่ได้แปลว่า CSS ใช้ได้** — ต้อง grep หา class ใน `public/build/assets/app-css-*.css` จริง เพื่อยืนยันว่ากฎไม่ได้หายไปจาก bundle
- class ที่จ่ายแค่ custom property (เช่น `.st-*`) ต้องมี **reader class** ของ island เอง (`background: var(--st-bg); color: var(--st-fg)`) ไม่งั้นจะไม่เห็นสี

---

## 6. Coding Rules (กฎการเขียนโค้ด)

อ่านง่ายไว้ก่อน มือใหม่ทำตามได้:

- **Controller ทำให้บาง** — แค่รับข้อมูล → สั่งงาน → ส่ง view/JSON; อย่ายัด logic เยอะ
- **อย่า query ฐานข้อมูลใน View** — ดึงข้อมูลให้เสร็จใน Controller/Model ก่อน
- **validate ที่ฝั่ง server เสมอ** (ใช้ CI4 Validation) — React/JS จะ validate ซ้ำเพื่อ UX ได้ แต่ตัวกันจริงอยู่ที่ server
- **ใช้ React เท่าที่จำเป็น** — หน้าไหนไม่ต้อง interactive ใช้ CI4 view ล้วน; จะแปะ island เฉพาะจุดที่ได้ประโยชน์จริง
- **ตั้งชื่อให้สื่อ:**
  - Controller / Model → PascalCase เช่น `UserController`, `UserModel`
  - คอลัมน์ฐานข้อมูล → snake_case เช่น `created_at`, `user_id`
  - Method → camelCase เช่น `getAllUsers`
  - React component / entry → PascalCase เช่น `ProductTable.jsx`
- **คอมเมนต์ทุก function** สั้นๆ ว่าทำอะไร Comment เป็นภาษาไทยและทับศัพท์ได้
- **อ่านไฟล์ที่เกี่ยวข้องก่อนแก้** และแก้เฉพาะที่จำเป็น — อย่าลบโค้ดเดิมถ้ายังไม่เข้าใจว่ามันทำอะไร
- **แยก Component** ให้เล็ก และอ่านง่าย
- **CSS: 1 property ต่อบรรทัด** — ขยาย block
- **ใช้ design token แทน hex ตรงๆ เสมอเมื่อมี token** — token ทั้งหมดอยู่ใน `:root` ของ `resources/css/app.css`
- **ใช้ component กลางก่อนสร้างใหม่เสมอ** — CSS ดูที่ `resources/css/style.css` §1 Components, React ดูที่ `resources/js/lib/` — ต่างแค่ตัวเลขเล็กน้อยให้ใช้ค่ากลาง ไม่ต้อง override (ดูรายละเอียด §5.5)
- **ห้ามเขียน `*` ติดกับ `/` ในคอมเมนต์ CSS** (เช่น `.st-*/.pill`) เพราะ `*/` จะปิดคอมเมนต์กลางประโยคแล้วกลืนกฎที่ตามมาหายจาก bundle โดย build ยังผ่าน
- **`npm run build` ผ่านไม่ได้แปลว่า CSS ใช้ได้** — ต้อง grep หา class ใน `public/build/assets/app-css-*.css` จริงเสมอ

ตัวอย่าง Controller ที่ดี:

```php
<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\UserModel;

class UserController extends BaseController
{
    // แสดงรายชื่อผู้ใช้ทั้งหมด
    public function index()
    {
        $users = (new UserModel())->findAll();
        return view('admin/users/index', ['users' => $users]);
    }
}
```

---

## 7. Commands ที่ใช้บ่อย

```bash
# === ฝั่ง PHP (php spark) ===
php spark serve                       # เปิดที่ http://localhost:8080

# ฐานข้อมูล
php spark migrate                     # สร้าง/อัปเดตตารางตาม Migrations
php spark migrate:rollback            # ย้อนกลับ migration ล่าสุด
php spark db:seed DatabaseSeeder      # ใส่ข้อมูลตั้งต้น

# สร้างไฟล์อัตโนมัติ
php spark make:controller Admin/UserController   # สร้าง Controller
php spark make:model UserModel                   # สร้าง Model
php spark make:migration create_users_table      # สร้าง Migration
php spark make:seeder UserSeeder                 # สร้าง Seeder

# Shield (auth)
php spark shield:setup                # ติดตั้งตาราง auth
php spark shield:user create          # สร้างผู้ใช้

php spark routes                      # ดู route ทั้งหมด

# === ฝั่ง Frontend (npm + Vite) ===
npm install                           # ติดตั้ง dependency ครั้งแรก
npm run dev                           # Vite dev server (HMR) — ตอนพัฒนา ตั้ง .env vite.dev=true
npm run build                         # build ลง public/build — ตอนขึ้น prod แล้วตั้ง vite.dev=false
```

> ตอน **dev** รันคู่กัน: `npm run dev` + `php spark serve` แล้วตั้งใน `.env`:
> `vite.dev = true` และ `vite.server = 'http://localhost:5173'`
> ตอน **prod**: `npm run build` แล้วเปลี่ยนเป็น `vite.dev = false`

**ค่า `.env` ปัจจุบัน (เครื่อง dev):** `app_baseURL = http://icar.ink-connect.com/` · DB `icar-booking.v100` @ `localhost:3306` (MySQLi, user `root`) · `vite.dev = true`
รันผ่าน **XAMPP** (root อยู่ที่ `C:\xampp\htdocs\icar-v100`) เข้าผ่าน Apache ที่ `public/` — หรือใช้ `php spark serve` (`http://localhost:8080`) ก็ได้
**Test:** `composer test` (หรือ `vendor/bin/phpunit`) · รันไฟล์เดียว: `vendor/bin/phpunit tests/Feature/SomeTest.php` · รันเดี่ยว: `--filter testMethodName`

---

## 8. วิธีเพิ่มโมดูลใหม่ (ทำตามลำดับนี้)

ยกตัวอย่างเพิ่มโมดูล `Product`:

1. **Migration** — `php spark make:migration create_products_table` แล้วเขียนโครงสร้างตาราง → `php spark migrate`
2. **Model** — `php spark make:model ProductModel` ใส่ `$allowedFields` (คอลัมน์ที่ยอมให้บันทึก)
3. **Controller** — `php spark make:controller Admin/ProductController`
4. **View** — สร้างโฟลเดอร์ `app/Views/admin/products/` (index, create, edit)
5. **Route** — เพิ่มใน `Routes.php` ใต้ group `admin`
6. **(ถ้าหน้านั้นต้อง interactive) เพิ่ม React island:**
   - สร้าง component ใน `resources/js/islands/` + entry ใน `resources/js/entries/`
   - เพิ่มบรรทัด entry ใน `rollupOptions.input` ของ `vite.config.js`
   - เพิ่ม endpoint JSON (`ProductController::data`) + route ของมัน
   - วาง `<div id="...">` + `vite_asset()` ในหน้า view
7. ทดสอบที่ `http://localhost/admin/products`

---

## 9. Notes สำหรับ Claude

- โปรเจกต์นี้ใช้ **CodeIgniter 4 + React (islands) + Vite + Tailwind CSS + Shield + MariaDB**
- **สถาปัตยกรรมแบบ Hybrid/Islands:** CI4 เรนเดอร์ HTML เป็นหลัก (ผ่าน Shield session) แล้วฝัง React เฉพาะส่วนที่ต้อง interactive — **ไม่ใช่ SPA**, ไม่ใช้ token auth
- หน้าไหนไม่ต้อง interactive → ใช้ CI4 view ล้วน ไม่ต้องแตะ React
- endpoint JSON ของ island ต้องอยู่ใต้ filter เดียวกับหน้า (`session`/`group:admin`) เพื่อให้ Shield ป้องกันให้
- เพิ่ม island = ต้องอัปเดต `vite.config.js` (`rollupOptions.input`) ด้วยทุกครั้ง
- Validate ทำที่ฝั่ง server เสมอ (CI4 Validation); React ทำซ้ำได้แค่ช่วย UX
- **อ่านไฟล์ที่เกี่ยวข้องก่อนแก้โค้ดทุกครั้ง** อธิบายแผนสั้นๆ ก่อนลงมือ และแก้เฉพาะไฟล์ที่จำเป็น
- คอมเมนต์ทุก function ที่สร้าง ว่าทำอะไร เน้น Comment เป็นภาษาไทยและทับศัพท์ได้
- ตรวจสอบว่าโค้ดที่แก้ไม่กระทบส่วนอื่น
- **มี component กลางแล้ว เช็คก่อนสร้างใหม่เสมอ** — CSS: `resources/css/style.css` §1 Components (`.btn-primary` `.form-input` `.card` `.tbl` `.pill` `.pager` `.toast` `.alert-error` ฯลฯ) · React: `resources/js/lib/{Toast,Table,Pager,Alert}.jsx` · design token ทั้งหมดอยู่ใน `:root` ของ `resources/css/app.css` (`--teal --ink --text --border --card-shadow` ฯลฯ) — ดูรายการเต็มที่ §5.5
- **inline style ที่เหลืออยู่เป็นของตั้งใจ ไม่ต้องรื้อ** — `resources/js/islands/timeline/DayGrid.jsx` (`left`/`width` เป็น % คำนวณจากเวลาจองจริง ทำเป็น class ไม่ได้) และ `resources/js/lib/Alert.jsx` (`style` prop เป็น API ตั้งใจ) — มีคอมเมนต์กำกับไว้ในโค้ดแล้ว

---

## 10. เขียนอธิบายสั้นๆ ลง README.md

- ใช้โครงสร้าง README.md มาตรฐาน
- **Project Name** — คำอธิบายสั้นๆ ของโปรเจกต์
- **Features** — สรุปทั้งหมดที่มีในระบบ
- **Requirements** — สิ่งที่ระบบต้องการ (เช่น PHP 8.3, Node.js, MariaDB)
- **Installation** — วิธีติดตั้ง (composer install, npm install, migrate, seed, build)
- **Third Party Libraries** — บอกสิ่งที่ใช้งานในระบบ (Shield, PhpSpreadsheet, mPDF, React, Vite, Tailwind)

## 11. Database
- ทุก Table มี id, created_at, updated_at
- ใช้ Foreign Key เสมอ

## 12. กฎการ comment 
- บอกแค่ "โค้ดทำอะไร" เขียนเป็นปัจจุบัน
- ไม่เล่าประวัติการแก้ (ไม่มี "ย้าย/เพิ่ม/ปรับ/แก้เป็น…")
- ไม่อ้าง task number/TODO
- Comment สั้นๆ ว่าทำอะไร 
- Comment เป็นภาษาไทย + ภาษาอังกฤษได้