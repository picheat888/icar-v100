# เช็กลิสต์ตรวจด้วยตา — หลังรื้อ inline style (branch `refactor/islands-inline-style`)

งานรื้อ inline style 674 จุดออกจาก `app/Views` และ React islands ทำเสร็จแล้ว 36 commit
**ทุก task ตรวจด้วย static analysis + build เท่านั้น — ยังไม่มีใครเปิดเบราว์เซอร์ดูสักหน้า**

การรวม UI ให้ใช้ค่ามาตรฐานเดียว (Phase 0 D1–D7) **ตั้งใจให้บางหน้าหน้าตาขยับ** — รายการด้านล่างคือสิ่งที่คาดว่าจะเปลี่ยน
ถ้าเจออะไรนอกเหนือจากนี้ = ปัญหา

## วิธีตรวจ

```bash
npm run build          # .env ตั้ง vite.dev = false
# หรือ npm run dev + ตั้ง vite.dev = true
```
เปิดทั้ง **desktop · 720px · 480px** ทุกหน้า

---

## ลำดับความสำคัญ 1 — จุดที่เคยพังจริงและเพิ่งแก้

| หน้า | ต้องเห็นอะไร |
|---|---|
| `/driver` | **แถบหัวข้อวันในตาราง (เดสก์ท็อป) ตัวอักษรต้องเป็น teal เข้ม ไม่ใช่เทา** · พื้นแถบ teal อ่อน · เส้นบน/ล่างสี teal อ่อน |
| `/my-requests` | เหมือนกัน — แถบหัวข้อวันต้องเป็น teal |

> เคยพัง: `.tbl td` (specificity สูงกว่า) กิน `color`/`padding`/`font-size`/`border-bottom` ของแถบวัน
> แก้ด้วยการเติม `.tbl ` นำหน้า selector 7 ตัว — **ต้องยืนยันด้วยตาว่ากลับมาถูก**

---

## ลำดับ 2 — หน้าที่ซับซ้อนสุด / ประวัติพลาดมากสุด

**`/admin/requests`** (137 จุด · แตกเป็น 2 task · เคยพลาด 2 รอบ)
- แถบกลุ่มวัน · คอลัมน์เวลา
- **ป้ายสถานะต้องมีสีพื้นทุกอัน** (เคยหายทั้งหน้าเพราะ CSS ถูกคอมเมนต์กลืน)
- กดจริง: อนุมัติ · ปฏิเสธ · **มอบหมายคนขับครบ 3 แบบ** (รถขับเอง / รถอื่น+คนขับบริษัท / คนขับภายนอก)
- drawer รายละเอียดทั้ง 5 โหมด · ปุ่มตอน busy (cursor)

---

## ลำดับ 3 — หน้าตาขยับตามที่ตั้งใจ (ยืนยันว่ายังอ่านออก/ใช้งานได้)

### ตารางทุกหน้า (D1/D2)
| | เดิม | ตอนนี้ |
|---|---|---|
| หัวตาราง | พื้นเทา `#e6eaef` (CarsManager · DriverJobs) | **พื้นขาว** ทุกหน้า · `12.5px/700` |
| ช่องตาราง | 11–13px padding · font 13.5–14px | `12px 16px` · `13.5px` |
| ขอบกล่องตาราง | `#e3e8ec` | `#e7ebee` (อ่อนลง) |

→ ตรวจ `/admin/vehicles` · `/driver` · `/admin/members` · `/admin/requests` · `/admin/activity-log` · `/admin/departments`
**จุดเสี่ยง:** หัวตารางขาวอาจกลืนกับพื้นการ์ด

### ป้ายสถานะการจอง (D4 + การตัดสินใจระหว่างทาง)
| สถานะ | เดิม | ตอนนี้ |
|---|---|---|
| `approved` | เขียวเข้ม `#16855a` (MyRequests) | **teal `#0c8b87`** ทุกหน้า |
| `cancel_requested` | เขียว (timeline) / อำพัน (Dashboard) | **อำพัน** ทุกหน้า |
| `completed` | teal (MyRequests) / เทา (อื่น ๆ) | **เทา** ทุกหน้า |

→ ตรวจ `/timeline` · `/driver/timeline` · `/admin/timeline` · `/admin` · `/my-requests` · `/admin/requests`

### ปุ่ม / ช่องกรอก / แบ่งหน้า
- ปุ่มหลักใหญ่ขึ้น (`12px 26px` · radius 9 · 14.5px) **และได้ hover ที่บางปุ่มเดิมไม่มี**
- ช่องกรอกใน island เป็น `11px 13px` · radius 8 · 14px
- **แบ่งหน้า: ซ่อนตัวเองเมื่อมีหน้าเดียว** และย่อเลขหน้าด้วย `…` เมื่อหน้าเยอะ (เดิมโชว์ทุกหน้าเสมอ)
- **toast ย้ายจากบนจอไปล่างจอ** (`top:20px` → `bottom:28px`) ทุกหน้าที่มี toast

### การ์ดขาว (D5)
- `/profile` · `/register` · หน้าสมัครสำเร็จ → **เงาแบนลง**
- `/register` การ์ดฟอร์ม → มุมมนขึ้น 2px
- การ์ด placeholder ("กำลังพัฒนา") → มุมมนขึ้น 2px

---

## ลำดับ 4 — ช่องว่างที่ใหญ่ที่สุด: จอแคบ

**การ์ดมือถือกับ media query ทั้งหมดไม่เคยถูกเปิดดูเลยสักครั้ง** — static analysis ตรวจให้ไม่ได้

ตรวจที่ **720px และ 480px**:
- `/admin/requests` · `/my-requests` · `/driver` · `/admin/members` · `/admin/activity-log` (มุมมองการ์ดแทนตาราง)
- `/admin/vehicles` · `/book` (การ์ดรถแนวนอนบนมือถือ)
- sidebar เป็น drawer (< 860px) · header ซ่อนชื่อผู้ใช้ (< 640px) · ตัวสลับภาษาย้ายเข้าเมนูโปรไฟล์

---

## ลำดับ 5 — หน้าที่เหลือ

`/book` (ปฏิทินว่าง + datetime picker) · `/admin` Dashboard · `/timeline` ทั้ง 3 role ·
`/login` `/register` · `/profile` `/change-password` · กระดิ่งแจ้งเตือน (ทุก role) ·
popup บังคับเปลี่ยนรหัส (ต้อง login ด้วยบัญชีที่ถูกตั้ง force reset)

---

## งานที่ค้างไว้โดยตั้งใจ (ไม่บล็อก merge)

จาก final whole-branch review — เป็นงานปรับปรุงต่อ ไม่ใช่ regression:

1. ~~**เพิ่ม design token อีก 4–5 ตัว**~~ — ✅ ทำแล้ว (commit `4b67e7b`) เพิ่ม 12 token แทน hex 126 จุด
   เทาอ่อน 5 เฉดรวบเหลือ `--surface` + `--surface-soft` · ตอนนี้ hex ที่ใช้ ≥3 ครั้งเหลือแค่ `#fff`
2. ~~**รวบ pattern ที่ยังซ้ำข้าม island**~~ — ✅ ทำแล้ว (commit `b33a472`) ยกขึ้น §1.16 โมดัล/drawer + §1.17 แถบสลับ
   ลบกฎซ้ำ 39 rule · สลับ className 56 จุดใน 10 island
3. ~~**หัว drawer 2 ขนาดไม่ตรงกัน**~~ — ✅ รวมเป็น `.modal-head` (`22px 26px`) + `.modal-title` (18px) ทุกหน้าแล้ว
4. **ตำแหน่ง pager ไม่ตรงกัน** — `/my-requests` อยู่ในการ์ด · `/admin/requests` ลอยใต้ตาราง (ติดข้อจำกัดโครงสร้าง)
5. `.book-card` ยังไม่เข้าชุดการ์ดกลาง (เป็น pattern ต่างจริง — ยืนยันแล้ว)
6. ตัวที่ **ตั้งใจไม่รวบ** เพราะต่างกันจริง: `STATUS_LABEL` ของ `RequestsManager` (3 กลุ่มสถานะฝั่ง admin)
   กับ `MembersManager` (สถานะสมาชิก คนละโดเมน) · `CAR_STATUS` (รูปค่าต่างกัน) · `typeLabel` (คนละ i18n key) · `Empty` (markup ต่างกัน)

---

## จุดที่ inline style เหลือไว้โดยตั้งใจ — อย่ารื้อ

- `resources/js/islands/timeline/DayGrid.jsx` **8 จุด** — `left`/`width` เป็น % คำนวณจากเวลาจองบนแกนเวลาต่อเนื่อง
- `resources/js/lib/Alert.jsx` **1 จุด** — `style` prop ที่เป็น API ของ component
