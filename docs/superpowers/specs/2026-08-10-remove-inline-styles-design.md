# รื้อ inline style ออกจาก `app/Views` → `resources/css/style.css`

วันที่: 2026-08-10

## เป้าหมาย

ย้าย CSS ที่ฝังอยู่ใน view (`style="..."` และ `<style>` block) ออกมาไว้ในไฟล์ CSS ที่ Vite build
โดยหน้าตาและพฤติกรรมของทุกหน้าต้องเหมือนเดิม 100% — งานนี้เป็น refactor ล้วน ไม่เปลี่ยนดีไซน์

## สภาพปัจจุบัน

inline style ใน `app/Views` มี **167 จุด กระจาย 19 ไฟล์** (นับรวมไฟล์ default ของ CI4)
CSS ของระบบตอนนี้อยู่ที่ `resources/css/app.css` ไฟล์เดียว (Tailwind entry + design tokens + component class
ของ React island เช่น `.filter-card`, `.car-card`, `.dash-*`) โหลดผ่าน `vite_css()` ใน `templates/shell.php`

## ขอบเขต

### ไฟล์ที่ต้องรื้อ (14 ไฟล์)

| ไฟล์ | `style=` | `<style>` block |
|---|---|---|
| `templates/header.php` | 22 | ✓ |
| `templates/sidebar.php` | 12 | ✓ |
| `templates/shell.php` | 5 | – |
| `templates/scripts.php` | 2 | ✓ |
| `templates/footer.php` | 1 | – |
| `templates/lang_switch.php` | 2 | – |
| `templates/_coming_soon.php` | 4 | – |
| `auth/login.php` | 41 | ✓ |
| `auth/register.php` | 51 | ✓ |
| `auth/register_success.php` | 8 | – |
| `profile/index.php` | 3 | ✓ |
| `profile/change_password.php` | 1 | ✓ |
| `user/book/index.php` | 1 | – |
| `admin/master/activity_log.php` | 4 | – |

### ไฟล์ที่ไม่แตะ

- `app/Views/errors/html/*` และ `app/Views/welcome_message.php` — ไฟล์ default ของ CI4
  หน้า error ต้องแสดงผลได้แม้ตอน CSS bundle โหลดไม่สำเร็จ จึงต้อง self-contained
- React island (`resources/js/islands/*.jsx`) — มี inline style เยอะ แต่รอบนี้ทำเฉพาะ view
- CSS ของ island ที่อยู่ใน `app.css` ปัจจุบัน (`.filter-card`, `.car-card`, `.book-card`, `.dash-*`,
  `.tl-bar`, `.md-row`, `.icar-*` ~330 บรรทัด) — **ยังคงอยู่ที่ `app.css` ตามเดิม**
  (ทางเลือกที่ยังไม่ตัดสินใจ: ย้ายไป `parts/islands.css` เพื่อให้ `app.css` เหลือแค่ tokens + `@import`
  เป็นการย้ายล้วน ไม่แก้ค่า — ทำได้ในรอบถัดไปถ้าต้องการ)

## โครงสร้างไฟล์ CSS

```
resources/css/
├── app.css                 Tailwind entry + design tokens (:root) + base (body/input/button)
│                             @import "tailwindcss";
│                             @import "./style.css";        ← เพิ่มบรรทัดนี้
│                             @source "../../app/Views/**/*.php";
│
└── style.css               ★ CSS ของหน้า view ทั้งหมด — ไฟล์เดียว มีสารบัญด้านบน
      1. Components         .brand .btn-* .form-* .field-* .alert-* .card .empty-*
      2. Shell              .app-* .nav-* .hdr-* .lang-* .sidebar-backdrop
      3. Auth               .login-* .reg-* .rs-*
      4. Profile            .pf-* .cp-*
      5. Pages              .book-back
```

`style.css` เป็นไฟล์เดียว ไม่แตกเป็นไฟล์ย่อย — แบ่งด้วยหัวข้อคอมเมนต์ตามสารบัญที่อยู่ด้านบนไฟล์

**การโหลด:** ไม่ต้องแก้ `vite.config.js`, `vite_helper.php`, หรือ `<head>` ของ layout ใด ๆ
เพราะ `style.css` เข้าไปอยู่ใน bundle เดียวกับ `app.css` และหน้า `login` / `register` / `register_success`
ที่มี `<head>` ของตัวเองก็เรียก `vite_css()` อยู่แล้ว

## ระบบตั้งชื่อ class

ใช้ semantic class (ไม่ใช่ Tailwind utility) ต่อยอดจากชื่อที่มีอยู่แล้วในโค้ด — ชื่อเดิมทั้งหมดคงไว้

| prefix | พื้นที่ | ตัวอย่าง |
|---|---|---|
| `app-` | โครง shell | `.app-root` `.app-main` `.app-content` `.app-footer` |
| `nav-` | sidebar | `.nav-brand` `.nav-item` `.nav-badge` |
| `hdr-` | header | `.hdr-burger` `.hdr-avatar` `.hdr-menu` `.hdr-menu-item` |
| `lang-` | ตัวสลับภาษา | `.lang-switch` `.lang-btn` `.lang-btn.active` |
| `login-` `reg-` | หน้า auth | `.login-hero` `.reg-input` |
| `pf-` `cp-` | profile | `.pf-card` `.cp-modal` |
| ไม่มี prefix | component ร่วม | `.btn-primary` `.form-input` `.alert-error` `.card` |

**เปลี่ยนชื่อ 1 จุด:** `header.php` ใช้ `.pf-item` / `.pf-logout` (เมนู dropdown) ซึ่งชนความหมายกับ
`.pf-*` ของหน้า profile → เปลี่ยนเป็น `.hdr-menu-item` / `.hdr-menu-logout`
(ต้องแก้ทั้ง markup ใน `header.php` — ไม่มีที่อื่นอ้างถึง 2 class นี้)

## component ที่รวบมาใช้ร่วม

รวบเฉพาะที่ CSS ซ้ำกันเป๊ะอยู่แล้ว ส่วนที่ขนาด/สีต่างกันจริงให้แยก class ตามหน้า

| class ใหม่ | รวบจาก |
|---|---|
| `.alert-error` | `login.php:90`, `register.php:92`, `.pf-err`, `.cp-err` |
| `.alert-success` | `profile/index.php:66` |
| `.btn-primary` | `login.php:105`, `register.php:183`, `.pf-btn`, `.cp-save`, `register_success.php:24` |
| `.btn-ghost` | `register.php:188`, `.cp-cancel`, `user/book/index.php` (ปุ่มย้อนกลับ) |
| `.form-input` / `.form-label` | input ใน `login.php`, `.reg-input`/`.reg-label`, `.pf-input`, `.cp-input` |
| `.field` / `.field-eye` | `.pf-eye` + `.cp-eye` (CSS เหมือนกันเป๊ะ) |
| `.card` | `.pf-card`, การ์ดฟอร์มใน `register.php`, การ์ดใน `register_success.php` |
| `.empty-card` `.empty-icon` `.empty-title` `.empty-sub` | `_coming_soon.php` + `admin/master/activity_log.php` |
| `.brand` + modifier | `sidebar.php:93` (`--sm` 36px), `login.php:41` (`--md` 40px), `login.php:76` (`--lg` 44px), `register.php:36` (`--lg --on-teal`) |

`.brand--on-teal` คือแบบที่วางบนพื้น teal — ไอคอนพื้น `rgba(255,255,255,.14)` และตัวอักษรสีขาว
ต่างจากแบบปกติที่ไอคอนเป็น gradient teal และตัวอักษร `#21215c`

## inline style ที่มาจาก PHP / JS

| ที่ | เดิม | ใหม่ |
|---|---|---|
| `lang_switch.php` | PHP ต่อ string `background:#0c8b87` ตาม locale | `.lang-btn` + `.lang-btn.active` |
| `header.php:102,106` | `color:<?= $cur==='th' ? ... ?>` | `.hdr-menu-item.active` |
| `scripts.php` JS | `pfMenu.style.display = 'block'/'none'` | toggle class `.is-open` (CSS ซ่อน `.hdr-menu` เป็น default) |
| `login.php:106`, `register.php:184` | `onmouseover="this.style.background=..."` | CSS `:hover` (ลบ attribute ทิ้ง) |
| `register.php` JS `sync()` | `btn.style.background/cursor/boxShadow` ตอน disable | CSS `#regSubmit:disabled` |
| `register.php` JS `apply()` | `input.style.borderColor = '#c0392b'` | toggle class `.is-invalid` |

**ผลพลอยได้:** media query ใน `header.php` / `scripts.php` ปัจจุบันต้องใช้ `!important` เพราะสู้กับ inline style
(`.app-sidebar{width:250px !important}`, `.app-header{padding:0 12px !important}`) — พอ inline หายไป
`!important` ทั้งหมดในสองไฟล์นี้ตัดทิ้งได้ (~12 จุด)

## ลำดับงาน

| รอบ | ทำอะไร | หน้าที่ต้องตรวจ |
|---|---|---|
| **A** | สร้าง `style.css` + `parts/` (4 ไฟล์ว่าง) + เขียน `components.css` · แก้ `app.css` เพิ่ม `@import "./style.css"` | build ผ่าน · ทุกหน้ายังเหมือนเดิม (ยังไม่มี view ไหนถูกแก้) |
| **B** | `templates/` ทั้ง 7 ไฟล์ → `shell.css` | `/admin`, `/timeline`, `/driver` · ทดสอบ: ยุบ/ขยาย sidebar, drawer จอแคบ + คลิกฉากหลังปิด, กาง/พับเมนูย่อย, เมนูโปรไฟล์, สลับภาษา, badge งานค้าง |
| **C** | `auth/` 3 ไฟล์ → `auth.css` | `/login` (ปุ่มบัญชีทดลอง, error box), `/register` (validate 3 ช่อง + ปุ่ม disable + checkbox), หน้าสมัครสำเร็จ |
| **D** | `profile/` 2 ไฟล์ + `user/book/index.php` + `admin/master/activity_log.php` → `profile.css` | `/profile` (ปุ่มลูกตา, เปลี่ยนรหัส), `/change-password` (modal + ปิดด้วย ESC/คลิกนอก), `/book`, `/admin/activity-log` |

## วิธีตรวจสอบ

ทุกรอบต้องผ่านทั้ง 3 ข้อ:

1. `npm run build` สำเร็จ ไม่มี error
2. `grep -c 'style=' <ไฟล์ที่ทำในรอบนั้น>` ต้องได้ 0 และไม่เหลือ `<style>` block
   (ยกเว้น attribute ของ SVG เช่น `fill` / `stroke` ซึ่งไม่ใช่ `style=`)
3. เปิดหน้าจริงตามตารางข้างบน เทียบสายตากับ `docs/mockuo-master/screenshots/`
   ทั้ง desktop / tablet / mobile — ต้องไม่ต่างจากเดิม

## ความเสี่ยงและการรับมือ

| ความเสี่ยง | การรับมือ |
|---|---|
| inline style มี specificity สูงสุด พอกลายเป็น class อาจโดน Tailwind preflight ทับ | `style.css` ถูก `@import` หลัง `tailwindcss` และเป็น rule แบบ unlayered จึงชนะ `@layer base` เสมอ — pattern เดียวกับ `.filter-card` / `.car-card` ที่ใช้อยู่แล้ว |
| ตัด `!important` แล้ว responsive พัง | ตัดเฉพาะจุดที่พิสูจน์ได้ว่ามีไว้สู้ inline style เท่านั้น และตรวจที่ breakpoint 860px / 720px / 640px / 560px ทุกรอบ |
| ลืมแก้ markup ที่อ้าง class เดิม (`.pf-item`) | grep ทั้งโปรเจกต์ (รวม `.jsx`) ก่อนเปลี่ยนชื่อทุกครั้ง |
| React island เรนเดอร์ทับ class ที่ย้ายมา | island ใช้ class คนละชุด (`.filter-card`, `.car-card`, …) ที่ยังอยู่ใน `app.css` ไม่ทับกัน |

## นอกขอบเขต

- ไม่เปลี่ยนดีไซน์ สี ขนาด ระยะห่าง ใด ๆ
- ไม่แตะ React island
- ไม่แตะหน้า error / welcome ของ CI4
- ไม่ย้าย CSS ของ island ที่อยู่ใน `app.css` (ทำได้ในรอบถัดไป)
