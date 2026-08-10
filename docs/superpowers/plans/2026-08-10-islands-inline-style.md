# แผนรื้อ inline style ออกจาก React islands

> **สำหรับ agent:** ใช้ `superpowers:subagent-driven-development` หรือ `superpowers:executing-plans` รันทีละ task · step ใช้ checkbox `- [ ]`

**Goal:** ย้าย inline style 674 จุดใน `resources/js/**/*.jsx` ไปเป็น semantic class ใน `resources/css/style.css` ต่อจากงานฝั่ง view ที่เสร็จแล้ว โดยหน้าตาเปลี่ยนเฉพาะจุดที่ตัดสินใจให้เปลี่ยน

**Architecture:** ใช้แนวเดียวกับที่ทำกับ `app/Views` — semantic class + design token ใน `style.css` ไฟล์เดียว · ต่างกันตรงที่ island เดียวกันมี UI ซ้ำกันแต่หน้าตาไม่ตรงกัน (ตาราง/ช่องกรอก/ป้ายสถานะ) จึงต้อง **ตัดสินใจค่ามาตรฐานก่อน** แล้วค่อยย้าย · ส่วนที่เป็น React ซ้ำ (toast, pager) ยกขึ้นไปเป็น component ใน `resources/js/lib/`

**Tech Stack:** React 19 + Vite 7 + Tailwind CSS v4 (ใช้แค่ preflight + `@source`) · CodeIgniter 4 เรนเดอร์หน้า

---

## Global Constraints

- CSS เขียน **1 property ต่อบรรทัด** (CLAUDE.md §6)
- คอมเมนต์ภาษาไทย บอกว่าโค้ดทำอะไร ไม่เล่าประวัติการแก้ (CLAUDE.md §12)
- CSS ทั้งหมดอยู่ใน `resources/css/style.css` ไฟล์เดียว มีสารบัญด้านบน · `app.css` เก็บแค่ Tailwind entry + `:root` token + base element
- ห้ามเพิ่ม entry ใน `vite.config.js` (ไม่มี island ใหม่)
- ใช้ token ที่มีอยู่เสมอ (`--teal` `--teal-hover` `--teal-soft` `--ink-strong` `--ink` `--muted` `--text` `--text-soft` `--text-faint` `--border` `--border-card` `--line` `--hover-bg` `--danger` `--danger-soft` `--bg`) · สีที่ใช้ ≥3 ที่แต่ยังไม่มี token ให้เพิ่มใน `:root` ของ `app.css`
- ใช้ component ที่มีอยู่แล้วใน `style.css` §1 ก่อนสร้างใหม่: `.brand` `.icon-box` `.pill` `.btn-primary` `.btn-ghost` `.form-label` `.form-input` `.field` `.alert-error` `.alert-success` `.card` `.title` `.subtext`
- **โปรเจกต์นี้ไม่ใช่ git repo** → ไม่มี step commit · ใช้ "checkpoint" (build + ดูหน้าจริง) แทน
- **ไม่มี test runner ฝั่ง JS** (`package.json` มีแค่ `dev` / `build`) → ตรวจด้วย `npm run build` + `grep` + เปิดหน้าจริง · ไม่ต้องติดตั้ง Vitest (snapshot ของ inline style จะ fail ทุกอันโดยตั้งใจอยู่แล้ว ไม่ช่วยอะไร)

---

## ขอบเขต

| ไฟล์ | บรรทัด | `style={{` |
|---|---|---|
| `islands/RequestsManager.jsx` | 614 | 137 |
| `islands/BookingForm.jsx` | 434 | 79 |
| `islands/MembersManager.jsx` | 460 | 63 |
| `islands/MyRequests.jsx` | 350 | 61 |
| `islands/CarsManager.jsx` | 242 | 38 |
| `islands/DriverJobs.jsx` | 164 | 35 |
| `islands/Dashboard.jsx` | 268 | 33 |
| `islands/timeline/DayGrid.jsx` | – | 27 |
| `islands/ActivityLog.jsx` | 155 | 26 |
| `islands/MasterData.jsx` | 206 | 24 |
| `islands/NotificationBell.jsx` | 177 | 15 |
| `islands/timeline/MonthGrid.jsx` · `Timeline.jsx` | – | 13 + 13 |
| `islands/timeline/DetailModal.jsx` | – | 11 |
| `islands/ForcePasswordResetModal.jsx` | 100 | 9 |
| `islands/timeline/DriverDayList.jsx` | – | 8 |
| `lib/Pager.jsx` · `lib/Alert.jsx` | – | 4 + 2 |
| **รวม** | **~3,400** | **674** |

**นอกขอบเขต:** `app/Views/errors/*` · `welcome_message.php` · `resources/js/lib/{csrf,date,i18n}.js` (ไม่มี style)

---

## Phase 0 — ตัดสินใจค่ามาตรฐาน (ต้องเคาะก่อนเริ่ม Task 1)

UI เดียวกันตอนนี้หน้าตาไม่ตรงกัน ต้องเลือกค่าเดียว มิฉะนั้นรวบไม่ได้

### D1 · หัวตาราง (`th`)

| island | พื้น | เส้นล่าง | จัด | ขนาด/น้ำหนัก/สี |
|---|---|---|---|---|
| MasterData | `#fff` | `2px #e7ebee` | left | 12.5 / 700 / `#3d4852` |
| MembersManager | `#fff` | `2px #e7ebee` | center | 12.5 / 700 / `#3d4852` |
| MyRequests | – | `2px #e7ebee` | center | 12.5 / 700 / `#3d4852` |
| CarsManager | `#e6eaef` | `2px #cfd6dd` | left | 12.5 / 700 / `#3d4852` |
| DriverJobs | `#e6eaef` | `2px #cfd6dd` | center | 12.5 / 700 / `#3d4852` |
| RequestsManager | `#fafbfc` | `1px #eceff1` | left | **12 / 600 / `#8a97a2`** |

**เสนอ:** พื้น `#fff` · เส้นล่าง `2px var(--border)` · `12.5px / 700 / #3d4852` (เสียงข้างมาก 3 จาก 6)
**ผลกระทบ:** CarsManager + DriverJobs หัวตารางเปลี่ยนจากเทาเป็นขาว · RequestsManager หัวตารางเข้มขึ้นชัด

### D2 · ช่องตาราง (`td`)

padding ปัจจุบัน: `11px 16px` · `12px 14px` · `12px 16px` · `13px 14px` · `13px 16px` — สี `#37434d` (4 ที่) vs `#6b7884` (2 ที่)

**เสนอ:** `12px 16px` · `13.5px` · `var(--text)` · เส้นล่าง `1px var(--hover-bg)`
**ผลกระทบ:** MembersManager กับ CarsManager ตัวอักษรเข้มขึ้น (`#6b7884` → `#37434d`)

### D3 · ช่องกรอกใน island (`inp`)

ปัจจุบัน padding `9px 12px` / `10px 13px` / `11px 13px` · fontSize `14` / `14.5` · radius `8` · border `1px #d8dee3`
`style.css` มี `.form-input` อยู่แล้ว แต่เป็น padding `12px 14px` / radius `9` / `15px` (ของหน้า server-rendered — ใหญ่กว่า)

**เสนอ:** เพิ่ม `.form-input--sm` = padding `11px 13px` · radius `8px` · `14px` แล้วให้ island ใช้ `class="form-input form-input--sm"`
**ผลกระทบ:** ActivityLog ช่องสูงขึ้น 2px · CarsManager/RequestsManager ตัวอักษรเล็กลง 0.5px

### D4 · ป้ายสถานะ (`badge`)

ปัจจุบัน padding `3px 11px` (3 ที่) / `4px 12px` / `4px 13px` (2 ที่) · fontSize `12.5` (4 ที่) / `12`

**เสนอ:** ใช้ `.pill` ที่มีอยู่ + `.pill--sm` = padding `3px 11px` / `12.5px` แล้วเพิ่มสีสถานะเป็น modifier:

```
.pill--green  #e7f4ee / #16855a   อนุมัติ · เสร็จสิ้น
.pill--amber  #fdf0e0 / #9a5a12   รออนุมัติ
.pill--red    var(--danger-soft) / var(--danger)   ปฏิเสธ · ยกเลิก
.pill--teal   (มีแล้ว)            กำลังใช้งาน
.pill--gray   (มีแล้ว)            ทั่วไป
.pill--orange (มีแล้ว)            badge นับเลข
```
**ผลกระทบ:** Dashboard + DriverJobs + MyRequests ป้ายเตี้ยลง 1-2px

### D5 · การ์ดขาว (คือ B-1 ที่ค้างไว้)

`.card` `.empty-card` `.filter-card` `.car-card` + กล่องตารางที่ island เขียน inline (`0 1px 2px + 0 12px 26px -10px`)

**เสนอ:** 3 ระดับเป็น token — `--card-shadow-flat` / `--card-shadow` / `--card-shadow-hover` · ขอบใช้ `var(--border)` ทั้งหมด (ลบ `--border-card` ทิ้ง) · radius `16px`
**ผลกระทบ:** `.card` (หน้า profile/register/สมัครสำเร็จ) แบนลง · `.empty-card` + `.reg-card` มนขึ้น 2px · การ์ด island ขอบอ่อนลงเล็กน้อย

### D6 · ปุ่มแบ่งหน้า

มี 2 แบบ:

| | `lib/Pager.jsx` (MyRequests · RequestsManager) | `PgBtn` ใน `MasterData.jsx` |
|---|---|---|
| ขนาด | `minWidth 36` · `height 36` · `padding 0 11px` | `minWidth 32` · `height 32` · `padding 0 8px` |
| radius / font | `8` / `13.5px` | `7` / `13px` |
| ขอบ | `#e2e7ea` · active `#0a716e` | `#e3e9ec` · active `#0c8b87` |
| ตัวอักษร | `#54616c` · disabled `#c2cad0` | `#37434d` · disabled `#c5ced5` |
| ตำแหน่ง | ลอยใต้ตาราง (`margin-top: 16`) | อยู่ในการ์ดตาราง (`border-top` + padding) |

**เสนอ:** ยึดแบบ `lib/Pager.jsx` (เป็นตัวกลางอยู่แล้ว) แล้วลบ `PgBtn` ทิ้ง · ทำ 2 ตำแหน่ง: `.pager` (ลอยใต้ตาราง) กับ `.pager--incard` (อยู่ในการ์ด)
**ผลกระทบ:** ปุ่มแบ่งหน้าหน้า `/admin/departments` `/admin/positions` ใหญ่ขึ้น 4px และ active เปลี่ยนเป็น teal เข้ม

### D7 · กล่อง error (`lib/Alert.jsx`)

`Alert.jsx` มีสีของตัวเอง ต่างจาก `.alert-error` ใน `style.css`:

| | `.alert-error` | `Alert.jsx` |
|---|---|---|
| ขอบ | `#f3cfca` | `#f0c8c3` |
| ตัวอักษร | `var(--danger)` `#c0392b` | `#a5352b` |
| radius / font | `8` / `14px` | `10` / `13.5px` |

**เสนอ:** ให้ `Alert.jsx` ใช้ `.alert-error` + modifier `.alert-error--icon` (flex + gap สำหรับไอคอน)
**ผลกระทบ:** กล่อง error ใน RequestsManager ขอบ/ตัวอักษรเข้มขึ้นเล็กน้อย · มุมคมขึ้น 2px · ตัวอักษรใหญ่ขึ้น 0.5px

> **ถ้ายังไม่อยากเคาะ D5 ตอนนี้** ให้ข้าม Task 18 ไปก่อนได้ ไม่กระทบ Task อื่น

---

## โครงสร้างไฟล์หลังทำเสร็จ

```
resources/css/
├── app.css       Tailwind entry + :root token + base element (body/input/button/::placeholder)
└── style.css     CSS ทั้งหมด — สารบัญด้านบน
                    1. Components   (มีแล้ว) + .tbl .icon-btn .toast .pager .form-input--sm .pill--*
                    2. Shell        (มีแล้ว)
                    3. Auth         (มีแล้ว)
                    4. Profile      (มีแล้ว)
                    5. Pages        (มีแล้ว)
                    6. Islands      ★ ใหม่ — CSS ที่ย้ายมาจาก app.css + ของแต่ละ island

resources/js/lib/
├── Alert.jsx     (มีแล้ว)
├── Pager.jsx     (มีแล้ว — ทำให้ทุก island ใช้ตัวนี้)
├── Toast.jsx     ★ ใหม่ — แทน toast ที่เขียนซ้ำ 7 island
└── Table.jsx     ★ ใหม่ — <Table> ครอบ .tbl + กล่องการ์ด + scroll แนวนอน
```

---

## Task 1: ย้าย CSS ของ island จาก `app.css` → `style.css` §6

ย้ายล้วน ไม่แก้ค่า — ให้ CSS อยู่ไฟล์เดียวก่อนเริ่มงานจริง

**Files:**
- Modify: `resources/css/app.css` (ลบบรรทัด 60–330 ส่วน component ของ island)
- Modify: `resources/css/style.css` (เพิ่ม §6)

**Interfaces:**
- Produces: `style.css` §6 มี `.icar-alert-icon` `.icar-drawer*` `.dash-*` `.filter-card` `.md-row` `.car-card*` `.car-grid` `.car-photo` `.book-card*` `.book-grid` `.book-select-btn` `.tl-bar` ครบตามเดิม

- [ ] **Step 1:** จด baseline ขนาด bundle

```bash
npm run build 2>&1 | grep app-css
# จดตัวเลข kB ไว้เทียบตอนจบ
```

- [ ] **Step 2:** ตัด block ตั้งแต่คอมเมนต์ `/* ===== แถบเตือน Dashboard...` จนจบไฟล์ `app.css` ไปวางท้าย `style.css` ใต้หัวข้อใหม่

```css
/* ==========================================================================
   6. ISLANDS — component ของ React island (resources/js/islands/)
   ========================================================================== */
```

- [ ] **Step 3:** เติมบรรทัดสารบัญด้านบน `style.css`

```
   6. Islands      component ของ React island
```

- [ ] **Step 4:** ตรวจว่า `app.css` เหลือแค่ font import + `@import "tailwindcss"` + `@import "./style.css"` + `@source` + `:root` + base element (`body` `input,select,textarea,button` `button` `input:focus` `::placeholder`)

- [ ] **Step 5:** verify — ขนาด bundle ต้องเท่าเดิม (±0.05 kB) เพราะเป็นการย้ายล้วน

```bash
npm run build 2>&1 | grep app-css
grep -c 'icar-alert-icon\|dash-stats\|filter-card\|car-card\|tl-bar' resources/css/style.css   # ต้อง > 0
grep -c 'filter-card' resources/css/app.css                                                     # ต้อง = 0
```

- [ ] **Step 6: Checkpoint** — เปิด `/admin` (การ์ดสรุป + แถบเตือน) · `/admin/vehicles` (การ์ดรถ) · `/admin/timeline` (แถบจอง) · `/book` (การ์ดเลือกรถ) ต้องเหมือนเดิมทุกจุด

---

## Task 2: สร้างชั้น component ร่วมใน `style.css` §1

เขียน CSS ตามที่เคาะใน Phase 0 — ยังไม่มี island ไหนใช้ จึงยังไม่มีอะไรเปลี่ยน

**Files:**
- Modify: `resources/css/style.css` (§1 Components + สารบัญ)
- Modify: `resources/css/app.css` (`:root` — เพิ่ม token ที่ขาด)

**Interfaces:**
- Produces: `.tbl` `.tbl--center` `.tbl-wrap` `.icon-btn` (+ `--green --red --gray --neutral`) `.toast` `.pager` `.pager-btn` `.form-input--sm` `.pill--sm` `.pill--green` `.pill--amber` `.pill--red`

- [ ] **Step 1:** เพิ่ม token ที่ขาดใน `:root` ของ `app.css`

```css
  /* หัวตาราง */
  --th-text: #3d4852;

  /* สถานะ */
  --success: #16855a;
  --success-soft: #e7f4ee;
  --warn: #9a5a12;
  --warn-soft: #fdf0e0;

  /* เงาการ์ด */
  --card-shadow-flat: 0 1px 2px rgba(17, 24, 39, .05);
  --card-shadow: 0 1px 2px rgba(17, 24, 39, .05), 0 12px 26px -10px rgba(17, 24, 39, .16);
  --card-shadow-hover: 0 4px 10px rgba(17, 24, 39, .08), 0 18px 38px -12px rgba(17, 24, 39, .22);
```

- [ ] **Step 2:** เพิ่มตาราง (§1.11) ตาม D1 + D2

```css
/* ----- 1.11 ตาราง ----- */
/* กล่องครอบ: การ์ดขาว + เลื่อนแนวนอนได้บนจอแคบ */
.tbl-wrap {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

.tbl-scroll {
  overflow-x: auto;
}

.tbl {
  width: 100%;
  border-collapse: collapse;
}

.tbl th {
  text-align: left;
  padding: 12px 16px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--th-text);
  background: #fff;
  border-bottom: 2px solid var(--border);
  letter-spacing: .2px;
  white-space: nowrap;
}

.tbl td {
  padding: 12px 16px;
  font-size: 13.5px;
  color: var(--text);
  border-bottom: 1px solid var(--hover-bg);
}

/* ตารางที่จัดกึ่งกลางทุกคอลัมน์ */
.tbl--center th,
.tbl--center td {
  text-align: center;
}

/* บังคับการจัดของคอลัมน์เดี่ยว */
.ta-l { text-align: left; }
.ta-c { text-align: center; }
.ta-r { text-align: right; }

/* แถวว่าง (ไม่พบข้อมูล) */
.tbl-empty {
  text-align: center;
  color: var(--text-faint);
  padding: 26px;
}
```

- [ ] **Step 3:** เพิ่มปุ่มไอคอนในตาราง (§1.12)

```css
/* ----- 1.12 ปุ่มไอคอนในตาราง ----- */
.icon-btn {
  flex: none;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 7px;
  background: #eef2f4;
  color: var(--text);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-btn--green {
  background: var(--success-soft);
  color: var(--success);
}

.icon-btn--red {
  background: var(--danger-soft);
  color: var(--danger);
}

.icon-btn--gray {
  background: #f1f3f5;
  color: #6b7884;
}
```

- [ ] **Step 4:** เพิ่ม toast + pager (§1.13, §1.14)

```css
/* ----- 1.13 Toast แจ้งผล (ลอยกลางล่าง) ----- */
.toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  background: var(--ink-strong);
  color: #fff;
  padding: 11px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 8px 30px rgba(0, 0, 0, .2);
  z-index: 200;
}

/* ----- 1.14 แบ่งหน้า (ตาม D6 — ยึดแบบ lib/Pager.jsx) ----- */
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

/* วางอยู่ในการ์ดตาราง — มีเส้นคั่นบนแทนระยะห่าง */
.pager--incard {
  margin-top: 0;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
}

.pager-range {
  font-size: 13px;
  color: var(--muted);
}

.pager-btns {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.pager-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 11px;
  border: 1px solid #e2e7ea;
  border-radius: 8px;
  background: #fff;
  color: var(--text-soft);
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}

.pager-btn.active {
  border-color: var(--teal-hover);
  background: var(--teal-hover);
  color: #fff;
}

.pager-btn:disabled {
  color: #c2cad0;
  cursor: default;
}

/* จุดไข่ปลาคั่นเลขหน้า */
.pager-gap {
  min-width: 24px;
  text-align: center;
  color: var(--text-faint);
}
```

- [ ] **Step 5:** เพิ่ม `.form-input--sm` ต่อท้าย §1.5 (ตาม D3) และสี `.pill` ตาม D4 ต่อท้าย §1.3

```css
/* ขนาดเล็ก — ใช้ในตาราง/ฟิลเตอร์ของ island */
.form-input--sm {
  padding: 11px 13px;
  border-radius: 8px;
  font-size: 14px;
}
```

```css
.pill--sm {
  padding: 3px 11px;
  font-size: 12.5px;
}

.pill--green {
  background: var(--success-soft);
  color: var(--success);
}

.pill--amber {
  background: var(--warn-soft);
  color: var(--warn);
}

.pill--red {
  background: var(--danger-soft);
  color: var(--danger);
}
```

- [ ] **Step 6:** เพิ่ม modifier ของกล่อง error ต่อท้าย §1.6 (ตาม D7)

```css
/* แบบมีไอคอนนำหน้า — ระยะห่างล่างให้ผู้เรียกคุมเอง */
.alert-error--icon {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  line-height: 1.5;
  margin-bottom: 0;
}
```

- [ ] **Step 7:** อัปเดตสารบัญด้านบน `style.css` ให้ครบ 1.11–1.14

- [ ] **Step 8:** verify

```bash
npm run build 2>&1 | grep -E "error|app-css|built in"
CSS=$(ls -t public/build/assets/app-css-*.css | head -1)
grep -o '\.tbl{[^}]*}\|\.icon-btn{[^}]*}\|\.toast{[^}]*}\|\.pager-btn{[^}]*}' "$CSS"
```

- [ ] **Step 9: Checkpoint** — ยังไม่มี island ไหนใช้ class ใหม่ → ทุกหน้าต้องเหมือนเดิม 100%

---

## Task 3: สร้าง `lib/Toast.jsx` + `lib/Table.jsx` · ล้าง `lib/Pager.jsx` + `lib/Alert.jsx`

**Files:**
- Create: `resources/js/lib/Toast.jsx`
- Create: `resources/js/lib/Table.jsx`
- Modify: `resources/js/lib/Pager.jsx` (4 inline style)
- Modify: `resources/js/lib/Alert.jsx` (2 inline style)

**Interfaces:**
- Consumes: class จาก Task 2 — `.tbl-wrap` `.tbl-scroll` `.tbl` `.tbl--center` `.toast` `.pager` `.pager--incard` `.pager-range` `.pager-btns` `.pager-btn` `.pager-gap` `.alert-error--icon`
- Produces:
  - `useToast(ms = 2800): { toast: string, showToast: (msg: string) => void, ToastView: () => JSX|null }`
  - `<Table center?: boolean, footer?: JSX, children>` → เรนเดอร์ `.tbl-wrap > .tbl-scroll > table.tbl`
  - `<Pager page, totalPages, total, perPage, onPage, inCard?: boolean>` → **signature เดิมคงไว้ทุกตัว** เพิ่มแค่ `inCard` (ใส่ `.pager--incard`)
  - `<Alert children, style?>` → **signature เดิมคงไว้** (prop `style` ยังใช้ส่ง margin ได้)

- [ ] **Step 1:** เขียน `lib/Toast.jsx`

```jsx
import { useState, useCallback } from 'react';

/**
 * Toast แจ้งผล — ลอยกลางล่าง หายเองใน 2.8 วินาที
 * ใช้: const { showToast, ToastView } = useToast();  แล้ววาง <ToastView /> ท้าย component
 */
export function useToast(ms = 2800) {
  const [toast, setToast] = useState('');

  const showToast = useCallback((m) => {
    setToast(m);
    setTimeout(() => setToast(''), ms);
  }, [ms]);

  const ToastView = useCallback(
    () => (toast ? <div className="toast">{toast}</div> : null),
    [toast],
  );

  return { toast, showToast, ToastView };
}
```

- [ ] **Step 2:** เขียน `lib/Table.jsx`

```jsx
/**
 * กล่องตาราง — การ์ดขาว + เลื่อนแนวนอนบนจอแคบ
 * center: จัดทุกคอลัมน์กึ่งกลาง · footer: แถบแบ่งหน้าใต้ตาราง
 */
export default function Table({ center = false, footer, children }) {
  return (
    <div className="tbl-wrap">
      <div className="tbl-scroll">
        <table className={center ? 'tbl tbl--center' : 'tbl'}>{children}</table>
      </div>
      {footer}
    </div>
  );
}
```

- [ ] **Step 3:** แทน `lib/Pager.jsx` ทั้งไฟล์ (ตรรกะเลขหน้าเดิมทุกบรรทัด เปลี่ยนแค่ style → class + เพิ่ม prop `inCard`)

```jsx
import { t } from './i18n';

// ตัวควบคุมแบ่งหน้า (pagination) — สรุปช่วงที่แสดง + ปุ่ม ก่อนหน้า/1,2,3…/ถัดไป (ย่อด้วย … เมื่อหน้าเยอะ)
// ใช้ร่วมกันหลาย island · inCard = วางอยู่ในการ์ดตาราง (มีเส้นคั่นบนแทนระยะห่าง)
export default function Pager({ page, totalPages, total, perPage, onPage, inCard = false }) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  // สร้างเลขหน้า: หน้าแรก/สุดท้ายเสมอ + หน้ารอบ ๆ ปัจจุบัน, ที่เหลือย่อเป็น …
  const nums = [];
  const win = 1;
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || (n >= page - win && n <= page + win)) nums.push(n);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <div className={inCard ? 'pager pager--incard' : 'pager'}>
      <div className="pager-range">{t('pager.range', { from, to, total })}</div>
      <div className="pager-btns">
        <button className="pager-btn" onClick={() => onPage(page - 1)} disabled={page <= 1}>{t('pager.prev')}</button>
        {nums.map((n, i) => n === '…'
          ? <span key={`e${i}`} className="pager-gap">…</span>
          : <button key={n} className={n === page ? 'pager-btn active' : 'pager-btn'} onClick={() => onPage(n)}>{n}</button>)}
        <button className="pager-btn" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>{t('pager.next')}</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4:** แทน `lib/Alert.jsx` ทั้งไฟล์ (ตาม D7)

```jsx
// กล่องแจ้งเตือน error มาตรฐานของระบบ — พื้นแดงอ่อน + ไอคอนเตือน เต็มความกว้าง
// ใช้ซ้ำได้ทุก island: <Alert>ข้อความ</Alert> · ไม่มีข้อความ = ไม่เรนเดอร์
export default function Alert({ children, style }) {
  if (!children) return null;

  return (
    <div role="alert" className="alert-error alert-error--icon" style={style}>
      <svg className="alert-error-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div>{children}</div>
    </div>
  );
}
```

เพิ่มใน `style.css` ต่อจาก `.alert-error--icon`:

```css
.alert-error-icon {
  flex: none;
  margin-top: 1px;
}
```

- [ ] **Step 5:** verify

```bash
npm run build 2>&1 | grep -E "error|built in"
grep -c 'style={{' resources/js/lib/Pager.jsx resources/js/lib/Alert.jsx   # Pager = 0 · Alert = 0
```

- [ ] **Step 6: Checkpoint** — เปิด `/my-requests` กับ `/admin/requests` (2 หน้าที่ใช้ `lib/Pager` + `lib/Alert`) · แถบแบ่งหน้าต้องเหมือนเดิมเป๊ะ · กล่อง error เปลี่ยนตามที่ระบุใน D7 เท่านั้น

---

## Task 4–17: ย้ายทีละ island

ทำ **เรียงจากเล็กไปใหญ่** เพื่อให้ชั้น component ถูกพิสูจน์บนไฟล์ที่เสี่ยงน้อยก่อน

| Task | ไฟล์ | `style={{` | หน้าที่ต้องเปิดดู |
|---|---|---|---|
| 4 | `ForcePasswordResetModal.jsx` | 9 | login ด้วยบัญชีที่ถูกตั้ง force reset |
| 5 | `timeline/DriverDayList.jsx` + `DetailModal.jsx` | 19 | `/driver/timeline` · คลิกแถบจองดูรายละเอียด |
| 6 | `timeline/Timeline.jsx` + `MonthGrid.jsx` | 26 | `/timeline` สลับมุมมองเดือน/วัน |
| 7 | `timeline/DayGrid.jsx` | 27 | `/admin/timeline` มุมมองรายวัน |
| 8 | `NotificationBell.jsx` | 15 | กระดิ่งบน header ทุก role |
| 9 | `MasterData.jsx` | 24 | `/admin/departments` · `/admin/positions` |
| 10 | `ActivityLog.jsx` | 26 | `/admin/activity-log` |
| 11 | `Dashboard.jsx` | 33 | `/admin` |
| 12 | `DriverJobs.jsx` | 35 | `/driver` |
| 13 | `CarsManager.jsx` | 38 | `/admin/vehicles` เพิ่ม/แก้/ลบ/อัปโหลดรูป |
| 14 | `MyRequests.jsx` | 61 | `/my-requests` |
| 15 | `MembersManager.jsx` | 63 | `/admin/members` อนุมัติ/ปฏิเสธ/แก้ไข |
| 16 | `BookingForm.jsx` | 79 | `/book` เลือกรถ + modal + ปฏิทินว่าง |
| 17 | `RequestsManager.jsx` | 137 | `/admin/requests` อนุมัติ + มอบหมายคนขับ 3 แบบ |

**ทุก task ทำ 6 step เหมือนกัน:**

- [ ] **Step 1:** อ่านไฟล์ทั้งไฟล์ก่อนแก้ (CLAUDE.md §9)

- [ ] **Step 2:** ไล่ `style={{...}}` ทีละจุด แล้วแทนด้วยลำดับนี้
  1. ตรงกับ component ที่มีอยู่ไหม (`.btn-primary` `.form-input` `.pill` `.icon-box` `.card` `.title` `.subtext` `.tbl` `.icon-btn` `.toast` `.pager`) → ใช้เลย
  2. เป็น layout เฉพาะจุด → ตั้ง class ใหม่ prefix ตามชื่อ island (`.mm-` MembersManager · `.rq-` RequestsManager · `.bk-` BookingForm · `.cm-` CarsManager · `.dj-` DriverJobs · `.dash-` Dashboard · `.md-` MasterData · `.al-` ActivityLog · `.nb-` NotificationBell · `.tl-` timeline) เขียนลง `style.css` §6
  3. ค่าที่คำนวณตอน runtime (ความกว้าง % ของแถบ timeline, ตำแหน่ง `left`) → **ปล่อยเป็น inline style ต่อไป** พร้อมคอมเมนต์บอกว่าทำไม

- [ ] **Step 3:** ลบ `const th/td/inp/badge/iconBtn` ระดับโมดูลของไฟล์นั้นทิ้ง แล้วใช้ class แทน

- [ ] **Step 4:** เปลี่ยนไปใช้ของกลางจาก Task 3
  - toast ของตัวเอง → `const { showToast, ToastView } = useToast();` แล้ววาง `<ToastView />` ท้าย component (7 island: ActivityLog · CarsManager · Dashboard · MasterData · MembersManager · MyRequests · RequestsManager)
  - pagination ของตัวเอง → `<Pager page={curPage} totalPages={totalPages} total={sorted.length} perPage={PAGE_SIZE} onPage={setPage} inCard />` แล้วลบ `function PgBtn` ทิ้ง (MasterData)
  - ตาราง → ครอบด้วย `<Table center={...} footer={<Pager … inCard />}>`
  - กล่อง error ที่เขียนเอง → `<Alert>` จาก `lib/Alert`

- [ ] **Step 5:** verify

```bash
npm run build 2>&1 | grep -E "error|built in"
grep -c 'style={{' resources/js/islands/<FILE>.jsx   # ต้องเหลือ 0 หรือเฉพาะค่า runtime ที่คอมเมนต์ไว้
```

- [ ] **Step 6: Checkpoint** — เปิดหน้าตามตาราง ทดสอบทั้ง desktop / จอแคบ 720px / มือถือ 480px · ถ้าเป็นหน้าที่มี action (อนุมัติ/ลบ/อัปโหลด) ต้องกดจริงให้ครบ

---

## Task 18: รวมสูตรการ์ดขาว (D5 / B-1)

ทำ **หลัง** island เสร็จหมด เพราะ `.book-card` เดิมคุมหน้าตาจาก inline style ใน `BookingForm.jsx`

**Files:**
- Modify: `resources/css/style.css` (§1.7 `.card` · §1.8 `.empty-card` · §3 `.reg-card` `.rs-card` · §6 `.filter-card` `.car-card` `.book-card`)
- Modify: `resources/css/app.css` (`:root` — ลบ `--border-card`)

- [ ] **Step 1:** เปลี่ยน `.card` ใช้ `box-shadow: var(--card-shadow-flat)` · `.empty-card` ใช้ `var(--card-shadow-flat)` + `border-radius: 16px`
- [ ] **Step 2:** ลบ `box-shadow` + `border-radius` override ออกจาก `.reg-card` และ `.rs-card`
- [ ] **Step 3:** เปลี่ยน `.filter-card` `.car-card` `.tbl-wrap` ใช้ `var(--card-shadow)` · `.car-card:hover` ใช้ `var(--card-shadow-hover)`
- [ ] **Step 4:** แทน `var(--border-card)` ด้วย `var(--border)` ทุกจุด แล้วลบ token `--border-card` ออกจาก `:root`
- [ ] **Step 5:** verify

```bash
npm run build 2>&1 | grep -E "error|app-css|built in"
grep -c 'border-card' resources/css/*.css    # ต้อง = 0
```

- [ ] **Step 6: Checkpoint** — เปิด `/profile` `/register` หน้าสมัครสำเร็จ `/admin/vehicles` `/admin/members` `/admin/timeline` `/book` เทียบกับ `docs/mockuo-master/screenshots/`

---

## Task 19: ตรวจรอบสุดท้าย

- [ ] **Step 1:** ไม่มี inline style เหลือนอกจากค่า runtime

```bash
grep -rn 'style={{' resources/js | grep -v 'runtime'
grep -rn 'style="\|<style' app/Views --include=*.php | grep -v 'Views/errors/' | grep -v welcome_message
```

- [ ] **Step 2:** ไม่มี `const th/td/inp/badge` ค้าง

```bash
grep -rn "^const \(th\|td\|inp\|badge\|iconBtn\) *=" resources/js
```

- [ ] **Step 3:** ทุก island ที่มี toast/pager ใช้ตัวกลาง

```bash
grep -rln "setTimeout(() => setToast" resources/js/islands    # ต้องว่าง
grep -rn "function PgBtn" resources/js                        # ต้องว่าง
```

- [ ] **Step 4:** build + จดขนาด bundle เทียบกับ baseline ที่จดไว้ใน Task 1 Step 1

```bash
npm run build 2>&1 | grep app-css
```

- [ ] **Step 5:** อัปเดต `CLAUDE.md` — เพิ่มบรรทัดว่า CSS ทั้งหมดอยู่ที่ `resources/css/style.css` (สารบัญ 6 หมวด) และ `app.css` เหลือแค่ token + base

- [ ] **Step 6: Checkpoint สุดท้าย** — เดินทุกหน้าใน 3 role (admin / user / driver) ทั้ง desktop / tablet / mobile

---

## ความเสี่ยง

| ความเสี่ยง | การรับมือ |
|---|---|
| Tailwind ตัด class ที่โผล่เฉพาะใน `.jsx` ทิ้ง | `@source` ปัจจุบันสแกนแค่ `app/Views/**/*.php` — **class ของเราเป็น CSS ที่เขียนเองใน `style.css` ไม่ใช่ utility ของ Tailwind จึงไม่โดนตัด** · แต่ถ้าอนาคตมีคนใช้ utility ของ Tailwind ใน `.jsx` ต้องเพิ่ม `@source "../../resources/js/**/*.jsx"` |
| class ชื่อชนกันระหว่าง island | บังคับ prefix ตาม Step 2 ของ Task 4–17 |
| ตาราง 6 แบบรวมเป็น 1 แล้วบางหน้าอ่านยากลง | D1/D2 ระบุชัดว่าหน้าไหนเปลี่ยนยังไง · checkpoint ทุก task บังคับเปิดดูจริง |
| RequestsManager 137 จุด ใหญ่เกินไปสำหรับ task เดียว | ถ้าทำแล้วรู้สึกยาว ให้แตกเป็น 17a (ตาราง+ฟิลเตอร์) กับ 17b (modal อนุมัติ/มอบหมายคนขับ) |
| ค่าที่คำนวณ runtime (ความกว้างแถบ timeline) ย้ายไม่ได้ | Step 2 ข้อ 3 อนุญาตให้คงเป็น inline พร้อมคอมเมนต์ — ไม่ใช่ความล้มเหลว |

---

## ประมาณการ

| ช่วง | Task | หน่วยงาน |
|---|---|---|
| เตรียม | 1–3 | ย้าย CSS + สร้างชั้นร่วม + component React 3 ตัว |
| ย้าย island | 4–17 | 14 task · 674 → ~0 inline style |
| ปิดงาน | 18–19 | รวมการ์ด + ตรวจรอบสุดท้าย |

**Task ที่หนักสุด:** 17 (RequestsManager 137) · 16 (BookingForm 79) · 15 (MembersManager 63)
