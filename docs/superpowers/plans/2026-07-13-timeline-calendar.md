# ตารางการใช้รถ (Timeline / Calendar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่มหน้า "ตารางการใช้รถ" (ปฏิทินรายเดือน/รายวัน) ใช้ร่วม 3 role โดยเป็นหน้าดูอย่างเดียว (read-only) ตามสเปก `docs/superpowers/specs/2026-07-13-timeline-calendar-design.md`

**Architecture:** CI4 เรนเดอร์หน้า HTML ปกติ + ฝัง React island เดียว (`Timeline.jsx`) ที่ mount ต่างกันด้วย prop `role`/`endpoint` · ข้อมูลดึงจาก endpoint JSON ต่อ role ที่เรียก `BookingModel::listForTimeline()` ตัวเดียว (scoping รวมศูนย์) · เขียน grid + คำนวณวันด้วย JS `Date` เอง ไม่มี dependency ใหม่

**Tech Stack:** PHP 8.2 + CodeIgniter 4 + Shield (session) · React (islands) + Vite + Tailwind CSS · MariaDB

## Global Constraints

- **ไม่มี git repo** — ข้ามขั้น `git commit` ทุก task; ปลาย task ใช้ "Checkpoint" (รันคำสั่ง verify) แทน
- **โหมด prod build** (`.env` `vite.dev = false`) — แก้ React/Tailwind ต้อง `npm run build` ใหม่ทุกครั้ง asset จึงอัปเดต
- **ไม่มี JS test runner** ในโปรเจกต์ — island verify ด้วย `npm run build` (คอมไพล์ผ่าน) + E2E ในเบราว์เซอร์ (บัญชี demo รหัส `123`: `admin` / `somchai` (user) / `prasert` (driver))
- **endpoint JSON เป็น GET ล้วน** อยู่ใต้ filter group เดียวกับหน้า — ไม่ต้องแนบ CSRF
- **เพิ่ม island ใหม่ = ต้องเพิ่ม entry ใน `vite.config.js` `rollupOptions.input`**
- คอมเมนต์ทุก function เป็นภาษาไทย (สั้นๆ ว่าทำอะไร) ตามกฎ §12 ของ CLAUDE.md
- CSS: 1 property ต่อบรรทัดในไฟล์ .css (island ใช้ inline style/Tailwind ได้)
- ทุกไฟล์ PHP ต้องผ่าน `php -l`

---

### Task 1: Backend — data layer, endpoints, routes, views (ทั้ง 3 role)

**Files:**
- Modify: `app/Models/BookingModel.php` (เพิ่ม method `listForTimeline()` ท้ายคลาส)
- Create: `app/Helpers/timeline_helper.php`
- Modify: `app/Controllers/Admin/DashboardController.php` (แก้ `timeline()` + เพิ่ม `timelineData()`)
- Modify: `app/Controllers/User/PageController.php` (แก้ `timeline()` + เพิ่ม `timelineData()`)
- Modify: `app/Controllers/Driver/PageController.php` (แก้ `timeline()` + เพิ่ม `timelineData()`)
- Modify: `app/Config/Routes.php` (เพิ่ม 3 data route)
- Create: `app/Views/admin/timeline/index.php`
- Create: `app/Views/user/timeline/index.php`
- Create: `app/Views/driver/timeline/index.php`

**Interfaces:**
- Produces: `BookingModel::listForTimeline(string $role, int $userId, string $from, string $to): array` — คืน array ของ booking (มี fields: `bookings.*` + `requester_name, dept_name, position_name, car_model, car_plate, driver_name`)
- Produces: endpoint JSON คืน `{ bookings: [...], cars: [...] }` (cars = รถ self สำหรับแถวรายวัน; driver คืน `cars: []`)
- Produces: helper `timeline_range(?string $from, ?string $to): array` คืน `[$fromDatetime, $toDatetime]`
- Consumes (island Task 2-4): props `{ role: 'admin'|'user'|'driver', endpoint: string }` จาก `<div id="timeline" data-props>`

- [ ] **Step 1: เพิ่ม method `listForTimeline()` ใน `BookingModel`**

เพิ่มก่อนปีกกาปิดคลาส (หลัง `listAll()` บรรทัด 113):

```php
    // คำขอสำหรับหน้า "ตารางการใช้รถ" ตาม role + ช่วงวันที่ที่คาบเกี่ยว [$from, $to]
    // $role: 'admin'|'user'|'driver' · $userId: id ผู้ใช้ปัจจุบัน (ใช้กรอง user/driver)
    // join ผู้ขอ/แผนก/ตำแหน่ง/รถ/คนขับ ครบชุดสำหรับ modal รายละเอียด
    public function listForTimeline(string $role, int $userId, string $from, string $to): array
    {
        $this->sweepExpired();

        $this->select('bookings.*, p.full_name AS requester_name,
                d.name AS dept_name, pos.name AS position_name,
                c.model AS car_model, c.plate AS car_plate, dp.full_name AS driver_name')
            ->join('user_profiles p', 'p.user_id = bookings.requester_id', 'left')
            ->join('departments d', 'd.id = p.department_id', 'left')
            ->join('positions pos', 'pos.id = p.position_id', 'left')
            ->join('cars c', 'c.id = bookings.car_id', 'left')
            ->join('user_profiles dp', 'dp.user_id = bookings.driver_id', 'left')
            // แสดงเฉพาะสถานะที่ยังเห็นในตาราง (ตัด rejected/cancelled ทิ้ง)
            ->whereIn('bookings.status', ['pending', 'approved', 'cancel_requested', 'completed'])
            // คาบเกี่ยวช่วงที่กำลังดู
            ->where('bookings.start_at <', $to)
            ->where('bookings.end_at >', $from);

        // กรองตาม role
        if ($role === 'user') {
            // รถขับเองของทุกคน (ดูคิว/ว่าง) OR คำขอของตัวเอง (รวมรถอื่นๆ ของตัวเอง)
            $this->groupStart()
                ->where('bookings.booking_type', 'self')
                ->orWhere('bookings.requester_id', $userId)
                ->groupEnd();
        } elseif ($role === 'driver') {
            // เฉพาะงานที่มอบหมายให้คนขับคนนี้
            $this->where('bookings.driver_type', 'company')
                ->where('bookings.driver_id', $userId);
        }
        // admin: ไม่กรองเพิ่ม เห็นทั้งหมด

        return $this->orderBy('bookings.start_at', 'ASC')->findAll();
    }
```

- [ ] **Step 2: ตรวจ syntax**

Run: `php -l app/Models/BookingModel.php`
Expected: `No syntax errors detected in app/Models/BookingModel.php`

- [ ] **Step 3: สร้าง helper `timeline_helper.php`**

สร้าง `app/Helpers/timeline_helper.php`:

```php
<?php

// helper สำหรับหน้าตารางการใช้รถ (timeline)
if (! function_exists('timeline_range')) {
    /**
     * แปลง from/to (รูปแบบ YYYY-MM-DD) เป็นช่วง datetime [from 00:00:00, to 23:59:59]
     * ถ้าค่าไม่ถูกรูปแบบ → ใช้เดือนปัจจุบันเป็นค่า default
     *
     * @return array{0:string,1:string} [$from, $to]
     */
    function timeline_range(?string $from, ?string $to): array
    {
        $re = '/^\d{4}-\d{2}-\d{2}$/';

        if (! $from || ! preg_match($re, $from)) {
            $from = date('Y-m-01');
        }
        if (! $to || ! preg_match($re, $to)) {
            $to = date('Y-m-t');
        }

        return [$from . ' 00:00:00', $to . ' 23:59:59'];
    }
}
```

Run: `php -l app/Helpers/timeline_helper.php`
Expected: `No syntax errors detected`

- [ ] **Step 4: แก้ `Admin\DashboardController` — เปลี่ยน `timeline()` + เพิ่ม `timelineData()`**

เพิ่ม `use App\Models\BookingModel;` และ `use App\Models\CarModel;` ใต้ `use App\Controllers\BaseController;` (บรรทัด 5)

แทนที่ method `timeline()` (บรรทัด 29-33) ด้วย:

```php
    // ตารางการใช้รถ — หน้า island
    public function timeline()
    {
        return view('admin/timeline/index', [
            'active'       => 'timeline',
            'pageTitle'    => 'ตารางการใช้รถ',
            'pageSubtitle' => 'ดูช่วงเวลาที่รถแต่ละคันว่างหรือถูกจอง',
        ]);
    }

    // JSON: การจองทั้งหมดในช่วงเดือนที่ดู + รถขับเอง (สำหรับแถวมุมมองรายวัน)
    public function timelineData()
    {
        helper('timeline');
        [$from, $to] = timeline_range($this->request->getGet('from'), $this->request->getGet('to'));

        $bookings = (new BookingModel())->listForTimeline('admin', (int) auth()->id(), $from, $to);
        $cars     = (new CarModel())->where('car_type', 'self')->orderBy('model')->findAll();

        return $this->response->setJSON(['bookings' => $bookings, 'cars' => $cars]);
    }
```

Run: `php -l app/Controllers/Admin/DashboardController.php`
Expected: `No syntax errors detected`

- [ ] **Step 5: แก้ `User\PageController` — เปลี่ยน `timeline()` + เพิ่ม `timelineData()`**

เพิ่ม `use App\Models\BookingModel;` และ `use App\Models\CarModel;` ใต้ `use App\Controllers\BaseController;` (บรรทัด 5)

แทนที่ method `timeline()` (บรรทัด 35-38) ด้วย:

```php
    // ตารางการใช้รถ — หน้า island
    public function timeline()
    {
        return view('user/timeline/index', [
            'active'       => 'timeline',
            'pageTitle'    => 'ตารางการใช้รถ',
            'pageSubtitle' => 'ดูช่วงเวลาที่รถแต่ละคันว่างหรือถูกจอง',
        ]);
    }

    // JSON: การจองรถขับเอง (ทุกคน) + คำขอของตัวเอง ในช่วงเดือนที่ดู + รถขับเอง
    public function timelineData()
    {
        helper('timeline');
        [$from, $to] = timeline_range($this->request->getGet('from'), $this->request->getGet('to'));

        $bookings = (new BookingModel())->listForTimeline('user', (int) auth()->id(), $from, $to);
        $cars     = (new CarModel())->where('car_type', 'self')->orderBy('model')->findAll();

        return $this->response->setJSON(['bookings' => $bookings, 'cars' => $cars]);
    }
```

Run: `php -l app/Controllers/User/PageController.php`
Expected: `No syntax errors detected`

- [ ] **Step 6: แก้ `Driver\PageController` — เปลี่ยน `timeline()` + เพิ่ม `timelineData()`**

`use App\Models\BookingModel;` มีอยู่แล้ว (บรรทัด 6)

แทนที่ method `timeline()` (บรรทัด 37-40) ด้วย:

```php
    // ตารางการใช้รถ — หน้า island (เฉพาะงานของคนขับคนนี้)
    public function timeline()
    {
        return view('driver/timeline/index', [
            'active'       => 'timeline',
            'pageTitle'    => 'ตารางการใช้รถ',
            'pageSubtitle' => 'ดูตารางงานที่ได้รับมอบหมายของคุณ',
        ]);
    }

    // JSON: เฉพาะงานที่มอบหมายให้คนขับคนนี้ ในช่วงเดือนที่ดู
    public function timelineData()
    {
        helper('timeline');
        [$from, $to] = timeline_range($this->request->getGet('from'), $this->request->getGet('to'));

        $bookings = (new BookingModel())->listForTimeline('driver', (int) auth()->id(), $from, $to);

        return $this->response->setJSON(['bookings' => $bookings, 'cars' => []]);
    }
```

Run: `php -l app/Controllers/Driver/PageController.php`
Expected: `No syntax errors detected`

- [ ] **Step 7: เพิ่ม data route ใน `Routes.php`**

ใน group `admin` (หลังบรรทัด 23 `$routes->get('timeline', ...)`) เพิ่ม:

```php
    $routes->get('timeline/data', 'Admin\DashboardController::timelineData'); // JSON ตารางการใช้รถ
```

ใน group `group:user` (บรรทัด 80-83) แก้เป็น:

```php
$routes->group('', ['filter' => 'group:user'], static function ($routes) {
    // ตารางการใช้รถ (หน้า + JSON endpoint ของ island)
    $routes->get('timeline',      'User\PageController::timeline');
    $routes->get('timeline/data', 'User\PageController::timelineData');
});
```

ใน group `driver` (หลังบรรทัด 88 `$routes->get('timeline', ...)`) เพิ่ม:

```php
    $routes->get('timeline/data', 'Driver\PageController::timelineData'); // JSON ตารางการใช้รถ
```

Run: `php -l app/Config/Routes.php`
Expected: `No syntax errors detected`

- [ ] **Step 8: สร้าง view ทั้ง 3 role**

สร้าง `app/Views/admin/timeline/index.php`:

```php
<?= $this->extend('layouts/admin') ?>

<?= $this->section('content') ?>
<?php
$props = [
    'role'     => 'admin',
    'endpoint' => site_url('admin/timeline/data'),
];
?>
<div id="timeline" data-props='<?= esc(json_encode($props), 'attr') ?>'></div>
<?= vite_asset('resources/js/entries/timeline.jsx') ?>
<?= $this->endSection() ?>
```

สร้าง `app/Views/user/timeline/index.php`:

```php
<?= $this->extend('layouts/user') ?>

<?= $this->section('content') ?>
<?php
$props = [
    'role'     => 'user',
    'endpoint' => site_url('timeline/data'),
];
?>
<div id="timeline" data-props='<?= esc(json_encode($props), 'attr') ?>'></div>
<?= vite_asset('resources/js/entries/timeline.jsx') ?>
<?= $this->endSection() ?>
```

สร้าง `app/Views/driver/timeline/index.php`:

```php
<?= $this->extend('layouts/driver') ?>

<?= $this->section('content') ?>
<?php
$props = [
    'role'     => 'driver',
    'endpoint' => site_url('driver/timeline/data'),
];
?>
<div id="timeline" data-props='<?= esc(json_encode($props), 'attr') ?>'></div>
<?= vite_asset('resources/js/entries/timeline.jsx') ?>
<?= $this->endSection() ?>
```

- [ ] **Step 9: ยืนยัน route โหลดครบ**

Run: `php spark routes | grep -i timeline`
Expected: เห็น 6 บรรทัด — `admin/timeline`, `admin/timeline/data`, `timeline`, `timeline/data`, `driver/timeline`, `driver/timeline/data`

- [ ] **Step 10: Checkpoint (E2E backend ในเบราว์เซอร์)**

> ยังไม่มี island — `<div id="timeline">` จะว่าง แต่ endpoint JSON ต้องทำงาน

1. เปิด XAMPP (Apache + MySQL) → login `admin`/`123`
2. เปิด `http://icar.ink-connect.com/admin/timeline/data?from=2026-07-01&to=2026-07-31` (หรือผ่าน `php spark serve` ที่ localhost:8080) — DevTools/เบราว์เซอร์ต้องเห็น JSON `{ "bookings": [...], "cars": [...] }`
3. **Scoping check** (สร้าง booking ทดสอบไว้ก่อนถ้ายังไม่มี):
   - `admin` → เห็นทุก booking (self + other, ทุกผู้ใช้)
   - login `somchai`/`123` → `http://.../timeline/data?...` → เห็น booking รถ self ของทุกคน + other เฉพาะของ somchai
   - login `prasert`/`123` → `http://.../driver/timeline/data?...` → เห็นเฉพาะงานที่ `driver_id` = prasert (`cars` เป็น `[]`)
4. ยืนยันไม่มี booking สถานะ `rejected`/`cancelled` โผล่ใน JSON

Expected: JSON ถูกต้องตาม scoping ทั้ง 3 role

---

### Task 2: Frontend island — โครง + มุมมองรายเดือน

**Files:**
- Modify: `vite.config.js` (เพิ่ม entry `timeline`)
- Create: `resources/js/entries/timeline.jsx`
- Create: `resources/js/islands/timeline/helpers.js`
- Create: `resources/js/islands/timeline/Timeline.jsx`
- Create: `resources/js/islands/timeline/MonthGrid.jsx`

**Interfaces:**
- Consumes: props `{ role, endpoint }` (Task 1) · JSON `{ bookings, cars }` จาก endpoint
- Produces (Task 3-4 ใช้ต่อ): helpers `STATUS_META`, `TH_MONTHS`, `TH_DOW`, `ymd(d)`, `hhmm(dt)`, `parseDT(dt)`, `monthGridRange(y, m)`, `overlapsDay(b, dayStr)`, `bookingLabel(b)` · state ใน `Timeline.jsx`: `view`, `cursor` (Date), `data`, `selected` (booking|null), setter `openDetail(b)`

- [ ] **Step 1: เพิ่ม entry ใน `vite.config.js`**

ใน `rollupOptions.input` (หลังบรรทัด `'requests-manager': ...`) เพิ่ม:

```js
        'timeline': 'resources/js/entries/timeline.jsx',
```

- [ ] **Step 2: สร้าง entry `timeline.jsx`**

สร้าง `resources/js/entries/timeline.jsx`:

```jsx
import { createRoot } from 'react-dom/client';
import Timeline from '../islands/timeline/Timeline';

// mount island ตารางการใช้รถ
const el = document.getElementById('timeline');
if (el) {
  createRoot(el).render(<Timeline {...JSON.parse(el.dataset.props || '{}')} />);
}
```

- [ ] **Step 3: สร้าง `helpers.js` (util วันที่ + สี + label)**

สร้าง `resources/js/islands/timeline/helpers.js`:

```js
// สี/label ของสถานะการจอง (ตัด rejected/cancelled ออกก่อนถึง client แล้ว)
export const STATUS_META = {
  pending:          { label: 'รออนุมัติ',            bg: '#fdf0e0', fg: '#e08a1e' },
  approved:         { label: 'อนุมัติแล้ว',           bg: '#e7f4ee', fg: '#0c8b87' },
  cancel_requested: { label: 'อนุมัติแล้ว (รอยกเลิก)', bg: '#e7f4ee', fg: '#0c8b87' },
  completed:        { label: 'เสร็จสิ้นแล้ว',          bg: '#eef1f3', fg: '#8a97a2' },
};

export const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// หัวคอลัมน์ปฏิทิน เริ่มวันจันทร์
export const TH_DOW = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];

// เติม 0 หน้าเลข 1 หลัก
const p2 = (n) => (n < 10 ? '0' + n : '' + n);

// Date -> 'YYYY-MM-DD' (เวลาท้องถิ่น)
export function ymd(d) {
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
}

// 'YYYY-MM-DD HH:MM:SS' -> 'HH:MM'
export function hhmm(dt) {
  return String(dt).slice(11, 16);
}

// 'YYYY-MM-DD HH:MM:SS' -> Date (local)
export function parseDT(dt) {
  return new Date(String(dt).replace(' ', 'T'));
}

// คืน [firstCellDate, lastCellDate] ของ grid เดือน (6 แถว x 7 วัน, เริ่มจันทร์)
export function monthGridRange(year, month) {
  const first = new Date(year, month, 1);
  const dow = (first.getDay() + 6) % 7; // จันทร์=0 ... อาทิตย์=6
  const start = new Date(year, month, 1 - dow);
  const end = new Date(start);
  end.setDate(start.getDate() + 41);
  return [start, end];
}

// booking b คาบเกี่ยววันที่ dayStr ('YYYY-MM-DD') ไหม (เทียบเฉพาะวันที่)
export function overlapsDay(b, dayStr) {
  const s = String(b.start_at).slice(0, 10);
  const e = String(b.end_at).slice(0, 10);
  return s <= dayStr && dayStr <= e;
}

// ข้อความสั้นบนป้าย: รถขับเอง = รุ่นรถ · รถอื่นๆ = รถที่กรอก/‘รถจัดหา’
export function bookingLabel(b) {
  if (b.booking_type === 'self') {
    return b.car_model || 'รถขับเอง';
  }
  return b.ext_driver_vehicle || 'รถจัดหา';
}
```

- [ ] **Step 4: สร้าง `MonthGrid.jsx`**

สร้าง `resources/js/islands/timeline/MonthGrid.jsx`:

```jsx
import { STATUS_META, TH_DOW, ymd, hhmm, monthGridRange, overlapsDay, bookingLabel } from './helpers';

// ปฏิทินรายเดือน — grid 7x6, แต่ละวันโชว์ป้ายการจองสูงสุด 3 + "+N"
// props: year, month (0-based), bookings, today (Date), onSelectDay(dateStr), onOpenDetail(booking)
export default function MonthGrid({ year, month, bookings, today, onSelectDay, onOpenDetail }) {
  const [start] = monthGridRange(year, month);
  const todayStr = ymd(today);

  // สร้าง 42 ช่อง
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = ymd(d);
    const inMonth = d.getMonth() === month;
    const dayBookings = bookings
      .filter((b) => overlapsDay(b, dateStr))
      .sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));
    cells.push({ dateStr, day: d.getDate(), inMonth, isToday: dateStr === todayStr, dayBookings });
  }

  return (
    <div>
      {/* หัวคอลัมน์วัน */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {TH_DOW.map((h) => (
          <div key={h} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#8a97a2', padding: '9px 0' }}>{h}</div>
        ))}
      </div>

      {/* ช่องวัน */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid #eef1f3', borderRadius: 10, overflow: 'hidden' }}>
        {cells.map((c) => (
          <div
            key={c.dateStr}
            onClick={() => onSelectDay(c.dateStr)}
            style={{
              minHeight: 96,
              borderRight: '1px solid #f2f4f6',
              borderBottom: '1px solid #f2f4f6',
              padding: 6,
              background: c.inMonth ? '#fff' : '#fafbfc',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: c.inMonth ? (c.isToday ? '#0c8b87' : '#1f2a33') : '#c2cad1', marginBottom: 4 }}>
              {c.day}
            </div>
            {c.dayBookings.slice(0, 3).map((b) => {
              const meta = STATUS_META[b.status] || STATUS_META.pending;
              return (
                <div
                  key={b.id}
                  onClick={(e) => { e.stopPropagation(); onOpenDetail(b); }}
                  title={`${hhmm(b.start_at)}–${hhmm(b.end_at)} ${bookingLabel(b)}`}
                  style={{
                    background: meta.bg,
                    color: meta.fg,
                    fontSize: 11,
                    lineHeight: 1.5,
                    borderRadius: 5,
                    padding: '1px 5px',
                    marginBottom: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {hhmm(b.start_at)}–{hhmm(b.end_at)} {bookingLabel(b)}
                </div>
              );
            })}
            {c.dayBookings.length > 3 && (
              <div style={{ fontSize: 11, color: '#8a97a2', fontWeight: 600 }}>+{c.dayBookings.length - 3}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: สร้าง `Timeline.jsx` (container — เฉพาะมุมมองรายเดือนก่อน)**

สร้าง `resources/js/islands/timeline/Timeline.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react';
import { STATUS_META, TH_MONTHS, ymd, monthGridRange } from './helpers';
import MonthGrid from './MonthGrid';

// container หน้าตารางการใช้รถ — จัดการ view/เดือน/fetch/modal
// props: role ('admin'|'user'|'driver'), endpoint (URL JSON)
export default function Timeline({ role, endpoint }) {
  const today = new Date();
  const [view, setView] = useState('month');           // 'month' | 'day'
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(ymd(today)); // 'YYYY-MM-DD'
  const [data, setData] = useState({ bookings: [], cars: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);      // booking สำหรับ modal

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  // ดึงข้อมูลของช่วง grid เดือนที่ดู
  const load = useCallback(() => {
    const [gs, ge] = monthGridRange(year, month);
    setLoading(true);
    fetch(`${endpoint}?from=${ymd(gs)}&to=${ymd(ge)}`, { headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((json) => setData({ bookings: json.bookings || [], cars: json.cars || [] }))
      .finally(() => setLoading(false));
  }, [endpoint, year, month]);

  useEffect(() => { load(); }, [load]);

  // เปลี่ยนเดือน
  const shiftMonth = (dir) => setCursor(new Date(year, month + dir, 1));

  // แตะวัน -> ไปมุมมองรายวัน
  const selectDay = (dateStr) => { setSelectedDay(dateStr); setView('day'); };

  const openDetail = (b) => setSelected(b);

  const tabStyle = (on) => ({
    padding: '7px 16px',
    borderRadius: 8,
    border: '1px solid ' + (on ? '#0c8b87' : '#e3e9ec'),
    background: on ? '#0c8b87' : '#fff',
    color: on ? '#fff' : '#54616c',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'inherit',
  });

  return (
    <div style={{ background: '#fff', border: '1px solid #eef1f3', borderRadius: 14, padding: 18 }}>
      {/* แถบเครื่องมือ: toggle view + นำทางเดือน */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView('month')} style={tabStyle(view === 'month')}>รายเดือน</button>
          <button onClick={() => setView('day')} style={tabStyle(view === 'day')}>รายวัน</button>
        </div>
        {view === 'month' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => shiftMonth(-1)} style={navBtn}>‹</button>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2a33', minWidth: 140, textAlign: 'center' }}>
              {TH_MONTHS[month]} {year + 543}
            </div>
            <button onClick={() => shiftMonth(1)} style={navBtn}>›</button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9aa7b2' }}>กำลังโหลด...</div>
      ) : view === 'month' ? (
        <>
          <MonthGrid
            year={year}
            month={month}
            bookings={data.bookings}
            today={today}
            onSelectDay={selectDay}
            onOpenDetail={openDetail}
          />
          <Legend />
        </>
      ) : (
        <div style={{ padding: 40, textAlign: 'center', color: '#9aa7b2' }}>
          (มุมมองรายวัน — Task 3)
        </div>
      )}

      {/* modal รายละเอียด — Task 4 */}
    </div>
  );
}

const navBtn = {
  width: 30,
  height: 30,
  border: '1px solid #e3e9ec',
  borderRadius: 7,
  background: '#fff',
  color: '#54616c',
  cursor: 'pointer',
  fontSize: 18,
  lineHeight: 1,
  fontFamily: 'inherit',
};

// legend สีสถานะใต้ปฏิทิน
function Legend() {
  const items = [STATUS_META.approved, STATUS_META.pending, STATUS_META.completed];
  return (
    <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
      {items.map((m) => (
        <span key={m.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#54616c' }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: m.bg, border: `1px solid ${m.fg}` }} />
          {m.label}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: build สำเร็จ ไม่มี error · เห็น chunk `timeline-*.js` ใน output

- [ ] **Step 7: Checkpoint (E2E มุมมองรายเดือน)**

1. `npm run build` แล้วเปิดเบราว์เซอร์ login แต่ละ role → ไปหน้าตารางการใช้รถ
2. ยืนยัน: ปฏิทินเดือนปัจจุบันแสดง · ป้ายการจองสีถูก (เขียว=อนุมัติ, ส้ม=รออนุมัติ, เทา=เสร็จสิ้น) · เกิน 3 ป้ายเห็น "+N"
3. กด `‹`/`›` เปลี่ยนเดือน → fetch ใหม่ ป้ายเปลี่ยนตามเดือน
4. legend แสดงใต้ปฏิทิน
5. driver เห็นเฉพาะงานตัวเอง · user เห็น self ทุกคน + other ตัวเอง

Expected: มุมมองรายเดือนทำงานครบทั้ง 3 role

---

### Task 3: Frontend island — มุมมองรายวัน (grid รถ + ลิสต์งาน driver)

**Files:**
- Create: `resources/js/islands/timeline/DayGrid.jsx`
- Create: `resources/js/islands/timeline/DriverDayList.jsx`
- Modify: `resources/js/islands/timeline/Timeline.jsx` (แทน placeholder รายวันด้วยของจริง)

**Interfaces:**
- Consumes: `data.bookings`, `data.cars`, `selectedDay`, `role`, `openDetail` จาก `Timeline.jsx`
- Produces: constant `DAY_START = 6`, `DAY_END = 20` (ช่วงแกนเวลา) ใช้ภายใน DayGrid

- [ ] **Step 1: สร้าง `DayGrid.jsx` (admin/user — แถวต่อรถขับเอง)**

สร้าง `resources/js/islands/timeline/DayGrid.jsx`:

```jsx
import { STATUS_META, hhmm, parseDT, overlapsDay, bookingLabel } from './helpers';

const DAY_START = 6;   // แกนเวลาเริ่ม 06:00
const DAY_END = 20;    // แกนเวลาจบ 20:00
const SPAN = DAY_END - DAY_START;

// แปลง Date -> ชั่วโมงทศนิยม (clamp ให้อยู่ในช่วง 06:00–20:00 ของวัน dayStr)
function clampHour(d, dayStr, isEnd) {
  const day = new Date(dayStr + 'T00:00:00');
  const diffDays = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - day) / 86400000);
  let h = d.getHours() + d.getMinutes() / 60 + diffDays * 24; // ชั่วโมงเทียบต้นวัน dayStr
  if (h < DAY_START) h = DAY_START;
  if (h > DAY_END) h = DAY_END;
  return h;
}

// มุมมองรายวัน — แถว = รถขับเองแต่ละคัน, แถบการจอง self วางตามเวลา
// props: cars, bookings, dayStr, onOpenDetail
export default function DayGrid({ cars, bookings, dayStr, onOpenDetail }) {
  const ticks = [6, 8, 10, 12, 14, 16, 18, 20];

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 640 }}>
        {/* แกนเวลา */}
        <div style={{ display: 'flex' }}>
          <div style={{ width: 150, flexShrink: 0 }} />
          <div style={{ position: 'relative', flex: 1, height: 22 }}>
            {ticks.map((t) => (
              <span key={t} style={{ position: 'absolute', left: `${((t - DAY_START) / SPAN) * 100}%`, transform: 'translateX(-50%)', fontSize: 11.5, color: '#9aa7b2', fontWeight: 600 }}>
                {(t < 10 ? '0' + t : t) + ':00'}
              </span>
            ))}
          </div>
        </div>

        {/* แถวรถ */}
        {cars.map((car) => {
          const maint = car.status === 'maintenance';
          const bars = maint ? [] : bookings.filter(
            (b) => b.booking_type === 'self' && String(b.car_id) === String(car.id) && overlapsDay(b, dayStr),
          );
          return (
            <div key={car.id} style={{ display: 'flex', alignItems: 'stretch', borderTop: '1px solid #f2f4f6' }}>
              <div style={{ width: 150, flexShrink: 0, padding: '10px 8px', fontSize: 13, color: maint ? '#b0b9c0' : '#1f2a33' }}>
                <div style={{ fontWeight: 600 }}>{car.model}</div>
                <div style={{ fontSize: 11, color: '#9aa7b2' }}>{car.plate}{maint ? ' · ซ่อมบำรุง' : ''}</div>
              </div>
              <div style={{ position: 'relative', flex: 1, minHeight: 46, background: maint ? '#f7f8f9' : '#fff' }}>
                {ticks.map((t) => (
                  <div key={t} style={{ position: 'absolute', top: 0, bottom: 0, left: `${((t - DAY_START) / SPAN) * 100}%`, width: 1, background: '#f2f4f6' }} />
                ))}
                {bars.map((b) => {
                  const sh = clampHour(parseDT(b.start_at), dayStr, false);
                  const eh = clampHour(parseDT(b.end_at), dayStr, true);
                  const meta = STATUS_META[b.status] || STATUS_META.pending;
                  return (
                    <div
                      key={b.id}
                      onClick={() => onOpenDetail(b)}
                      title={`${hhmm(b.start_at)}–${hhmm(b.end_at)} ${bookingLabel(b)}`}
                      style={{
                        position: 'absolute',
                        top: 7,
                        height: 32,
                        left: `${((sh - DAY_START) / SPAN) * 100}%`,
                        width: `${Math.max((eh - sh) / SPAN * 100, 2)}%`,
                        background: meta.bg,
                        color: meta.fg,
                        border: `1px solid ${meta.fg}`,
                        borderRadius: 6,
                        fontSize: 11,
                        padding: '2px 6px',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        cursor: 'pointer',
                      }}
                    >
                      {hhmm(b.start_at)}–{hhmm(b.end_at)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {cars.length === 0 && (
          <div style={{ padding: 30, textAlign: 'center', color: '#9aa7b2' }}>ไม่มีรถขับเองในระบบ</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: สร้าง `DriverDayList.jsx` (driver — ลิสต์งานวันนั้น)**

สร้าง `resources/js/islands/timeline/DriverDayList.jsx`:

```jsx
import { STATUS_META, hhmm, overlapsDay } from './helpers';

// มุมมองรายวันของคนขับ — ลิสต์งานของวันนั้น (การ์ดเรียงตามเวลา)
// props: bookings, dayStr, onOpenDetail
export default function DriverDayList({ bookings, dayStr, onOpenDetail }) {
  const jobs = bookings
    .filter((b) => overlapsDay(b, dayStr))
    .sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));

  if (jobs.length === 0) {
    return <div style={{ padding: 30, textAlign: 'center', color: '#9aa7b2' }}>ไม่มีงานในวันนี้</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {jobs.map((b) => {
        const meta = STATUS_META[b.status] || STATUS_META.pending;
        return (
          <div
            key={b.id}
            onClick={() => onOpenDetail(b)}
            style={{ border: '1px solid #eef1f3', borderLeft: `4px solid ${meta.fg}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontWeight: 700, color: '#1f2a33' }}>{hhmm(b.start_at)}–{hhmm(b.end_at)}</div>
              <span style={{ fontSize: 12, color: meta.fg, background: meta.bg, borderRadius: 6, padding: '2px 8px' }}>{meta.label}</span>
            </div>
            <div style={{ fontSize: 13, color: '#54616c', marginTop: 4 }}>{b.location}</div>
            <div style={{ fontSize: 12, color: '#9aa7b2', marginTop: 2 }}>ผู้จอง: {b.requester_name || '-'} · {b.people} คน</div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: เชื่อมมุมมองรายวันเข้า `Timeline.jsx`**

ใน `Timeline.jsx` เพิ่ม import ใต้ `import MonthGrid ...`:

```jsx
import DayGrid from './DayGrid';
import DriverDayList from './DriverDayList';
```

แทนที่ block placeholder รายวัน (`<div ...>(มุมมองรายวัน — Task 3)</div>`) ด้วย:

```jsx
        <div>
          {/* หัวข้อวันที่ที่เลือก */}
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2a33', marginBottom: 12 }}>
            วันที่ {selectedDay}
          </div>
          {role === 'driver' ? (
            <DriverDayList bookings={data.bookings} dayStr={selectedDay} onOpenDetail={openDetail} />
          ) : (
            <DayGrid cars={data.cars} bookings={data.bookings} dayStr={selectedDay} onOpenDetail={openDetail} />
          )}
        </div>
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build สำเร็จ ไม่มี error

- [ ] **Step 5: Checkpoint (E2E มุมมองรายวัน)**

1. `npm run build` แล้ว login แต่ละ role → หน้าตารางการใช้รถ → กดแท็บ "รายวัน" หรือแตะวันในปฏิทิน
2. **admin/user:** เห็นแถวรถขับเองแต่ละคัน · แถบการจองวางตรงตำแหน่งเวลา · รถ maintenance เป็นแถวเทาไม่มีแถบ
3. สร้าง booking ข้ามวัน + booking นอกช่วง (เช่น 05:00–22:00) → ยืนยันแถบถูก clamp อยู่ในกรอบ 06:00–20:00
4. **driver:** เห็นเป็นลิสต์การ์ดงานของวันนั้น (ไม่ใช่ grid)
5. วันที่ไม่มีงาน → ข้อความว่าง ("ไม่มีงานในวันนี้" / "ไม่มีรถขับเองในระบบ")

Expected: มุมมองรายวันถูกต้องทั้ง admin/user (grid) และ driver (ลิสต์)

---

### Task 4: Frontend island — modal รายละเอียด (read-only) + เก็บงาน

**Files:**
- Create: `resources/js/islands/timeline/DetailModal.jsx`
- Modify: `resources/js/islands/timeline/Timeline.jsx` (render modal เมื่อ `selected` ไม่ null)

**Interfaces:**
- Consumes: `selected` (booking|null), `setSelected` จาก `Timeline.jsx`

- [ ] **Step 1: สร้าง `DetailModal.jsx`**

สร้าง `resources/js/islands/timeline/DetailModal.jsx`:

```jsx
import { STATUS_META, hhmm } from './helpers';

// modal รายละเอียดการจอง (อ่านอย่างเดียว) — ไม่มีปุ่มจัดการ
// props: booking, onClose
export default function DetailModal({ booking, onClose }) {
  if (!booking) return null;
  const meta = STATUS_META[booking.status] || STATUS_META.pending;
  const typeLabel = booking.booking_type === 'self' ? 'รถขับเอง' : 'รถอื่นๆ (จัดหาโดย Admin)';

  // ชื่อรถ/คนขับ ตามประเภท
  const carText = booking.booking_type === 'self'
    ? [booking.car_model, booking.car_plate].filter(Boolean).join(' · ') || '-'
    : (booking.ext_driver_vehicle || '-');
  const driverText = booking.driver_type === 'company'
    ? (booking.driver_name || '-')
    : booking.driver_type === 'external'
      ? (booking.ext_driver_name || '-') + (booking.ext_driver_phone ? ` (${booking.ext_driver_phone})` : '')
      : 'ไม่มีคนขับ';

  const rows = [
    ['ผู้จอง', booking.requester_name || '-'],
    ['แผนก', booking.dept_name || '-'],
    ['ตำแหน่ง', booking.position_name || '-'],
    ['ประเภท', typeLabel],
    ['สถานที่', booking.location || '-'],
    ['ช่วงเวลา', `${String(booking.start_at).slice(0, 10)} ${hhmm(booking.start_at)} – ${String(booking.end_at).slice(0, 10)} ${hhmm(booking.end_at)}`],
    ['จำนวนคน', `${booking.people} คน`],
    ['รถ', carText],
    ['คนขับ', driverText],
    ['หมายเหตุ', booking.purpose || '-'],
    ['หมายเหตุ Admin', booking.admin_note || '-'],
  ];

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,32,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2a33' }}>รายละเอียดการจอง {booking.booking_code}</div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, color: '#9aa7b2', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: meta.fg, background: meta.bg, borderRadius: 6, padding: '3px 10px', fontWeight: 600 }}>{meta.label}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
              <div style={{ width: 110, flexShrink: 0, color: '#9aa7b2' }}>{k}</div>
              <div style={{ color: '#1f2a33', wordBreak: 'break-word' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: render modal ใน `Timeline.jsx`**

เพิ่ม import ใต้ `import DriverDayList ...`:

```jsx
import DetailModal from './DetailModal';
```

แทนที่คอมเมนต์ `{/* modal รายละเอียด — Task 4 */}` ด้วย:

```jsx
      <DetailModal booking={selected} onClose={() => setSelected(null)} />
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build สำเร็จ ไม่มี error · เห็น chunk `timeline-*.js`

- [ ] **Step 4: Checkpoint (E2E เต็มรูปแบบ ทั้ง 3 role)**

1. `npm run build` · เปิด XAMPP · login แต่ละ role
2. **มุมมองรายเดือน:** กดป้ายการจอง → เปิด modal เห็นครบ (ผู้จอง/แผนก/ตำแหน่ง/ประเภท/สถานที่/ช่วงเวลา/จำนวนคน/รถ/คนขับ/หมายเหตุ) · ไม่มีปุ่มจัดการ · กด × / คลิกนอก modal ปิดได้
3. **มุมมองรายวัน:** กดแถบ (admin/user) หรือการ์ด (driver) → เปิด modal เดียวกัน
4. **สี:** completed แสดงเทาจาง · rejected/cancelled ไม่โผล่เลย
5. **Scoping ยืนยันอีกครั้ง:** admin เห็นทุกคำขอ · user เห็น self ทุกคน + other ตัวเอง (กด modal ของคนอื่นเห็นชื่อ/แผนก/ตำแหน่งได้) · driver เห็นเฉพาะงานตัวเอง
6. เปลี่ยนเดือน/สลับ view ไปมา → ไม่มี error, ข้อมูลตรง

Expected: หน้าตารางการใช้รถทำงานครบตามสเปกทั้ง 3 role · ไม่มี console error

---

## Self-Review (ผู้เขียนแผนตรวจเอง)

**Spec coverage:**
- §2 island เดียว + logic รวมศูนย์ → Task 1 (`listForTimeline`) + Task 2 (island) ✓
- §3 scoping ต่อ role → Task 1 Step 1 (เงื่อนไข role) + verify Step 10 ✓
- §3 สถานะ+สี (ซ่อน rejected/cancelled, completed เทาจาง) → Task 1 `whereIn`, Task 2 `STATUS_META`, Task 4 Step 4.4 ✓
- §4.1 รายเดือน (pill สูงสุด 3 + "+N", legend, นำทางเดือน, แตะวัน→รายวัน, driver เฉพาะตัวเอง) → Task 2 ✓
- §4.2 รายวัน (grid 06:00–20:00, maintenance เทา, clamp ข้ามวัน/นอกช่วง; driver=ลิสต์) → Task 3 ✓
- §5 modal read-only ครบฟิลด์ → Task 4 ✓
- §6 ไฟล์/route/view/vite → Task 1 + Task 2 Step 1 ✓
- §7 edge cases (ข้ามวัน/นอกช่วง/empty/GET ไม่ต้อง CSRF) → Task 3 Step 5, Task 2 empty state ✓
- §9 YAGNI (ไม่มี drag/สัปดาห์/export/realtime) → ไม่มี task ทำ ✓

**Placeholder scan:** ไม่มี TBD/TODO · โค้ดครบทุก step (Task 2/3 placeholder ใน Timeline.jsx เป็น scaffolding ชั่วคราวที่ Task ถัดไปแทนที่จริง ไม่ใช่ placeholder ค้าง)

**Type consistency:** helper signatures (`ymd`, `hhmm`, `parseDT`, `monthGridRange`, `overlapsDay`, `bookingLabel`, `STATUS_META`, `TH_MONTHS`, `TH_DOW`) นิยามใน Task 2 Step 3 · ใช้ตรงกันใน MonthGrid/DayGrid/DriverDayList/DetailModal · `listForTimeline(role, userId, from, to)` ตรงกันทั้ง 3 controller · props `{role, endpoint}` ตรงกัน view↔entry↔Timeline ✓
