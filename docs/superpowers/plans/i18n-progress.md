# i18n Batch 1 — Progress Ledger

Plan: `docs/superpowers/plans/2026-08-07-i18n.md` · No-git project (track here + task list)

**Pre-flight adjustment:** language file `Auth` → **`Account`** (เลี่ยงชน namespace `Auth` ของ Shield). CI4 4.7 มี en-fallback (Language.php:123-128) → Shield ยังทำงานปกติที่ locale=th.

## Zero-impact rules (ส่งให้ทุก implementer)
- default locale = `th` → ทุก `lang()`/`t()` ต้องคืนข้อความ**ไทยเดิมเป๊ะ** (byte-identical) กับที่ hardcode อยู่ตอนนี้
- islands/หน้า ที่ยังไม่แตะ ต้องทำงานเหมือนเดิม ห้ามพัง
- ห้ามใช้ namespace `Auth` (ของ Shield) — ใช้ `Account`

## Status
- [x] Task 1: Locale config + LocaleFilter + route
- [x] Task 2: Language files (Nav/Common/Page/Account)
- [x] Task 3: meta locale + sidebar
- [x] Task 4: pageTitle/subtitle
- [x] Task 5: language switcher
- [x] Task 6: login/register + validation
- [x] Task 7: JS i18n + Dashboard
- [x] Task 8: acceptance + PLAN.md

## BATCH 2 (เสร็จ) — แปล islands + hero + วันที่ + หน้า PHP ที่เหลือ
ทำแบบ delegate extraction ต่อ island (th byte-identical) + verify build/grep/parity ต่อไฟล์:
- islands ครบ: RequestsManager(81 keys) · MembersManager(45) · CarsManager(31) · MasterData(13) · ActivityLog(8) · Timeline 7 ไฟล์(26) · MyRequests(40) · DriverJobs(17) · BookingForm(37) · NotificationBell/Pager/ForceReset(22)
- common.* pre-seeded (15 action words) · แต่ละ subagent จับ+แก้ `t` shadowing (typeLabel param ฯลฯ)
- hero login/register + demo accounts → Account.php (+16) · `<title>` tags → lang
- **date localization**: date.js + Dashboard/timeline/BookingForm/ActivityLog เดือน/วัน locale-aware (Thai array `_TH` คงเดิม + เพิ่ม `_EN`, เลือกตาม currentLocale) — node-verified th เดิมเป๊ะ
- หน้า PHP ที่เหลือ: profile/index, change_password, register_success, book back → Profile.php(27) + reuse · `_coming_soon` partial
- Google Maps 3 สตริงใน RequestsManager เก็บครบ (req.map_*)
- **FINAL VERIFY (all green):** npm run build ผ่าน · JS locales th/en 371/371 parity, no dup, key set ตรง 100% · PHP lang Account/Page/Nav/Common/Profile parity + no dup + php -l clean · grep sweep: ไม่มี UI Thai ตกค้าง (เหลือแค่คอมเมนต์ + _TH date arrays โดยตั้งใจ) · LangResolveTest ผ่าน
- **ยังค้าง (นอกสโคป/dead code):** admin/master/activity_log.php (dead — MasterController::activityLog ไม่มี route) · date FORMAT order คงแบบไทย (แค่สลับชื่อเดือน/วัน) · demo 'Admin' label เป็นภาษากลาง

## Log
- IMPORTANT (จาก Task 2): `lang()` อ่าน locale จาก `service('language')` ไม่ใช่ request. Real request ทำงานถูกเพราะ Language service ถูกสร้างหลัง LocaleFilter. เสริม insurance: LocaleFilter เรียก `service('language')->setLocale($lang)` ด้วยแล้ว. Test ต้องใช้ `service('language')->setLocale()` (ไม่ใช่ request).
- Task 7: complete (review clean, spec ✅). i18n.js (t + {n} interp) + th/en.json (33 key parity) + Dashboard.jsx t(). build ผ่าน. เดือน/parseDt คงไทย (batch 2).
- Task 6: complete (review clean, spec ✅). form panel login/register + validation client(I18N_ERR)/server ครบ. RE_NAME คงเดิม. key parity 57. hero/เดโม/title คงไทย (batch 2).
- FINAL REVIEW (opus): พร้อม deploy ✅ ไม่มี blocker. Important=header dropdown half-translated → แก้แล้ว (header.php ใช้ lang(Nav.profile/logout/role_*) + เพิ่ม 4 key Nav th/en, th เดิมเป๊ะ). + fix <html lang> dynamic (shell/login/register).
- Automated verify: php -l ทุกไฟล์ผ่าน · route lang/(:segment) มีจริง · LangResolveTest 3/3 · build artifacts ครบ. LocaleTest ยิง route ติด Shield+session/sqlite ใน test env (pre-existing, ไม่กระทบ prod — AccountStatusFilter:20 guest-safe ยืนยันจากโค้ด).
- BATCH 2 (ค้าง): islands อื่น (Requests/Members/Cars/Master/ActivityLog/Timeline/MyRequests/DriverJobs/Booking/NotificationBell) · hero login/register · เดโมบัญชี · วันที่/เดือนไทยใน Dashboard · profile/change-password/book pages.
- Task 5: complete (review clean, spec ✅). lang_switch.php + วางใน header/login/register. ยังไม่ได้เทสต์ pixel ในเบราว์เซอร์ (เช็คใน Task 8).
- Task 6 scope decision: แปลเฉพาะ "แผงฟอร์ม" ของ login/register (th byte-identical) + validation. hero/bullets/เดโม/copyright/title-tag = decorative → ปล่อยไทย batch 2. register 'Username' label เป็นภาษากลาง คงไว้. Account.php ขยายเป็น full form keys + split keys (terms_pre/link/post, reg_hint_pre/post).
- Task 4: complete (review clean, spec ✅, ยืนยันด้วย Routes.php). 13 จุด/9 controllers → lang(Page.*). Page.php แก้ให้ตรงข้อความจริง + เพิ่ม calendar_sub_driver/dept_sub/position_sub (รวม 21 key). dead code (Dashboard/User\PageController placeholders, MasterController activityLog) ไม่แตะ.
- Task 3: complete (review clean, spec ✅). sidebar 11 label → lang(Nav.*), meta locale ใน shell.php. aria-label เมนูย่อยอยู่นอกสโคป (ปล่อยไทย).
- Task 4 planning: routes ชี้ controller จริง → page() placeholder ใน Dashboard/User\PageController เป็น dead code (SKIP). subtitle จริงไม่ตรง Page.php ร่างเดิม → Task 4 แก้ Page.php ให้ตรงข้อความจริง + เพิ่ม key calendar_sub_driver/dept_sub/position_sub. Live occurrences 12 จุด mapping ชัดเจนแล้ว.
- Task 2: complete (review clean, spec ✅, test 3/3 ยืนยันโดย reviewer). key parity th↔en ครบทุกคู่. ไม่มี Auth.php.
- Task 1: complete (review clean, spec ✅). Minor (ยกไป final review): SUPPORTED const ซ้ำ 2 ที่ (LocaleFilter+LocaleController) ไม่อ่านจาก config; ใช้ $_COOKIE แทน $request->getCookie. Env note: ext-sqlite3 ปิดใน php.ini → Feature test ที่ยิง route ต้อง override DB env (pre-existing, ไม่เกี่ยวงานนี้).
