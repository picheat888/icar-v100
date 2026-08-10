# ระบบแจ้งเตือน (กระดิ่ง 🔔) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่มระบบแจ้งเตือนแบบกระดิ่งใน header (ใช้ร่วมทุก role) + สร้างแจ้งเตือนอัตโนมัติตาม event ตามสเปก `docs/superpowers/specs/2026-07-14-notifications-design.md`

**Architecture:** ตาราง `notifications` (2 สถานะ seen/read) → `NotificationModel` → `NotificationController` (ใต้ `filter:session`) → island `NotificationBell.jsx` ใน `templates/header.php` (badge + dropdown + poll 60วิ + load-more) · สร้างแจ้งเตือน inline ใน controller ที่เกิด event

**Tech Stack:** PHP 8.2 + CodeIgniter 4 + Shield · React (islands) + Vite + Tailwind · MariaDB

## Global Constraints

- **ไม่มี git repo** — ข้าม `git commit`; ปลาย task ใช้ "Checkpoint" (รัน verify) แทน
- **โหมด prod build** (`.env vite.dev=false`) — แก้ React ต้อง `npm run build` ทุกครั้ง
- **เพิ่ม island = ต้องเพิ่ม entry ใน `vite.config.js` `rollupOptions.input`**
- **badge** = จำนวน `seen_at IS NULL` · **ไฮไลต์แถว** = `read_at IS NULL`
- POST endpoint แนบ CSRF ผ่าน header `X-CSRF-TOKEN` (อ่านจาก `<meta name="csrf">`) + `X-Requested-With: XMLHttpRequest` · action คืน `csrf` ใหม่ใน JSON ให้ island อัปเดต
- **ข้าม self**: แจ้งเตือนที่ผู้รับเป็น "admin ทุกคน" ต้องข้าม `auth()->id()` · แจ้งเตือนที่ผู้รับเป็น "ผู้ขอ" ต้องข้ามถ้าผู้ขอ = admin ผู้ก่อ event
- แจ้งเตือนสร้าง**หลัง**อัปเดต DB สำเร็จ (ก่อน return)
- คอมเมนต์ทุก function เป็นภาษาไทย · `php -l` ผ่านทุกไฟล์ · รันคำสั่งจาก root `C:\xampp\htdocs\icar-v100`

---

### Task 1: ตาราง `notifications` + `NotificationModel`

**Files:**
- Create: `app/Database/Migrations/2026-07-14-000001_CreateNotifications.php`
- Create: `app/Models/NotificationModel.php`

**Interfaces:**
- Produces (Task 2 & 4 ใช้): `NotificationModel::push(int $userId, string $type, string $message, ?string $link = null): void` · `pushToAdmins(string $type, string $message, ?string $link = null, ?int $excludeUserId = null): void` · `listFor(int $userId, int $limit, int $offset): array` · `totalFor(int $userId): int` · `unseenCount(int $userId): int` · `markAllSeen(int $userId): void` · `markRead(int $userId, int $id): void` · `markAllRead(int $userId): void`

- [ ] **Step 1: สร้าง migration**

สร้าง `app/Database/Migrations/2026-07-14-000001_CreateNotifications.php`:

```php
<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * ตาราง notifications — แจ้งเตือนรายผู้ใช้ (2 สถานะ: seen=badge, read=ไฮไลต์)
 */
class CreateNotifications extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'user_id'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'type'       => ['type' => 'VARCHAR', 'constraint' => 50],
            'message'    => ['type' => 'VARCHAR', 'constraint' => 255],
            'link'       => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'seen_at'    => ['type' => 'DATETIME', 'null' => true],
            'read_at'    => ['type' => 'DATETIME', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey(['user_id', 'seen_at']);
        $this->forge->addKey(['user_id', 'created_at']);
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE');

        $this->forge->createTable('notifications', true, ['ENGINE' => 'InnoDB']);
    }

    public function down()
    {
        $this->forge->dropTable('notifications', true);
    }
}
```

- [ ] **Step 2: รัน migrate**

Run: `php spark migrate`
Expected: `Migrated: ...CreateNotifications` (ไม่มี error)

- [ ] **Step 3: สร้าง `NotificationModel`**

สร้าง `app/Models/NotificationModel.php`:

```php
<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Model ตาราง notifications — แจ้งเตือนรายผู้ใช้
 */
class NotificationModel extends Model
{
    protected $table         = 'notifications';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = true;
    protected $allowedFields = ['user_id', 'type', 'message', 'link', 'seen_at', 'read_at'];

    // สร้างแจ้งเตือน 1 แถวให้ผู้ใช้คนหนึ่ง
    public function push(int $userId, string $type, string $message, ?string $link = null): void
    {
        $this->insert([
            'user_id' => $userId,
            'type'    => $type,
            'message' => $message,
            'link'    => $link,
        ]);
    }

    // สร้างแจ้งเตือนให้ admin ทุกคน (ข้าม excludeUserId ถ้ากำหนด — กันแจ้งตัวเอง)
    public function pushToAdmins(string $type, string $message, ?string $link = null, ?int $excludeUserId = null): void
    {
        $rows = $this->db->table('auth_groups_users')
            ->select('user_id')
            ->where('group', 'admin')
            ->get()->getResultArray();

        foreach ($rows as $row) {
            $uid = (int) $row['user_id'];
            if ($excludeUserId !== null && $uid === $excludeUserId) {
                continue;
            }
            $this->push($uid, $type, $message, $link);
        }
    }

    // รายการแจ้งเตือนของผู้ใช้ (ใหม่ก่อน) แบ่งหน้า
    public function listFor(int $userId, int $limit, int $offset): array
    {
        return $this->where('user_id', $userId)
            ->orderBy('id', 'DESC')
            ->findAll($limit, $offset);
    }

    // จำนวนแจ้งเตือนทั้งหมดของผู้ใช้ (ไว้คำนวณ hasMore)
    public function totalFor(int $userId): int
    {
        return $this->where('user_id', $userId)->countAllResults();
    }

    // จำนวนที่ยังไม่เห็น (คุม badge)
    public function unseenCount(int $userId): int
    {
        return $this->where('user_id', $userId)->where('seen_at', null)->countAllResults();
    }

    // ทำเครื่องหมาย "เห็นแล้ว" ทั้งหมด (ตอนเปิด dropdown)
    public function markAllSeen(int $userId): void
    {
        $this->set('seen_at', date('Y-m-d H:i:s'))
            ->where('user_id', $userId)
            ->where('seen_at', null)
            ->update();
    }

    // ทำเครื่องหมาย "อ่านแล้ว" 1 รายการ (เฉพาะของผู้ใช้นั้น)
    public function markRead(int $userId, int $id): void
    {
        $this->set('read_at', date('Y-m-d H:i:s'))
            ->where('user_id', $userId)
            ->where('id', $id)
            ->where('read_at', null)
            ->update();
    }

    // ทำเครื่องหมาย "อ่านแล้ว" ทั้งหมด
    public function markAllRead(int $userId): void
    {
        $this->set('read_at', date('Y-m-d H:i:s'))
            ->where('user_id', $userId)
            ->where('read_at', null)
            ->update();
    }
}
```

Run: `php -l app/Models/NotificationModel.php`
Expected: `No syntax errors detected`

- [ ] **Step 4: Checkpoint (ทดสอบ model จริงกับ DB)**

สร้าง spark command ชั่วคราว `app/Commands/E2eNotify.php`:

```php
<?php

namespace App\Commands;

use App\Models\NotificationModel;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

/** ทดสอบ NotificationModel ชั่วคราว — ลบทิ้งหลังทดสอบ */
class E2eNotify extends BaseCommand
{
    protected $group       = 'Testing';
    protected $name        = 'e2e:notify';
    protected $description  = 'ทดสอบ push/pushToAdmins/seen/read/count';

    public function run(array $params)
    {
        $m   = new NotificationModel();
        $uid = 11; // user ทดสอบ (somchai)

        $before = $m->totalFor($uid);
        $m->push($uid, 'test', 'ทดสอบ push #1', site_url('my-requests'));
        $m->push($uid, 'test', 'ทดสอบ push #2', null);
        CLI::write('push 2 -> total เพิ่ม: ' . ($m->totalFor($uid) - $before), 'green');
        CLI::write('unseen: ' . $m->unseenCount($uid));

        // fan-out admin (exclude uid 1) — admin ทุกคนยกเว้น 1 ควรได้
        $m->pushToAdmins('test', 'ทดสอบ fan-out (exclude 1)', site_url('admin/requests'), 1);
        CLI::write('หลัง pushToAdmins exclude=1 : ตรวจ db:table ว่า user_id=1 ไม่ได้แถวนี้');

        // seen -> unseen ควรเป็น 0
        $m->markAllSeen($uid);
        CLI::write('หลัง markAllSeen unseen: ' . $m->unseenCount($uid) . ' (ควร 0)');

        // read 1 อันล่าสุด
        $latest = $m->listFor($uid, 1, 0)[0] ?? null;
        if ($latest) {
            $m->markRead($uid, (int) $latest['id']);
            $chk = $m->find((int) $latest['id']);
            CLI::write('markRead id=' . $latest['id'] . ' read_at=' . ($chk['read_at'] ?? 'NULL') . ' (ควรมีเวลา)');
        }
        CLI::write('ลบ test rows ด้วยมือถ้าต้องการ: DELETE FROM notifications WHERE type="test"', 'yellow');
    }
}
```

Run:
```bash
php spark migrate && php spark e2e:notify
```
Expected: total เพิ่ม 2 · unseen ตรง · markAllSeen → unseen 0 · markRead → read_at มีเวลา · `php spark db:table auth_groups_users` เทียบว่า admin คนอื่น (ไม่ใช่ uid 1) ได้แถว fan-out

ลบ command + test rows หลังตรวจ:
```bash
rm app/Commands/E2eNotify.php
php spark db:table notifications --limit-rows 50   # (ดู/ลบ row type=test ตามต้องการ)
```

Expected: ไฟล์ command ถูกลบ · โปรเจกต์คืนสภาพเดิม

---

### Task 2: `NotificationController` + routes

**Files:**
- Create: `app/Controllers/NotificationController.php`
- Modify: `app/Config/Routes.php` (เพิ่ม 4 route ในกลุ่ม `filter:session`)

**Interfaces:**
- Consumes: `NotificationModel` (Task 1)
- Produces (Task 3 ใช้): `GET notifications/data?offset=N` → `{ items:[{id,type,message,link,isRead,created_at}], unseenCount:int, hasMore:bool }` · `POST notifications/seen|read|read-all` → `{ ok:true, csrf }` (read รับ `id`)

- [ ] **Step 1: สร้าง `NotificationController`**

สร้าง `app/Controllers/NotificationController.php`:

```php
<?php

namespace App\Controllers;

use App\Models\NotificationModel;

/**
 * แจ้งเตือน (กระดิ่ง) — ใช้ร่วมทุก role ที่ล็อกอิน (ใต้ filter session)
 */
class NotificationController extends BaseController
{
    private const PAGE = 10;   // จำนวนต่อหน้า

    // JSON: รายการล่าสุด + จำนวนยังไม่เห็น + มีเก่ากว่านี้ไหม
    public function data()
    {
        $userId = (int) auth()->id();
        $offset = max(0, (int) $this->request->getGet('offset'));
        $m      = new NotificationModel();

        $items = array_map(static fn ($n) => [
            'id'         => (int) $n['id'],
            'type'       => $n['type'],
            'message'    => $n['message'],
            'link'       => $n['link'],
            'isRead'     => $n['read_at'] !== null,
            'created_at' => $n['created_at'],
        ], $m->listFor($userId, self::PAGE, $offset));

        return $this->response->setJSON([
            'items'       => $items,
            'unseenCount' => $m->unseenCount($userId),
            'hasMore'     => ($offset + self::PAGE) < $m->totalFor($userId),
        ]);
    }

    // เปิด dropdown -> เห็นแล้วทั้งหมด (เคลียร์ badge)
    public function seen()
    {
        (new NotificationModel())->markAllSeen((int) auth()->id());

        return $this->response->setJSON(['ok' => true, 'csrf' => csrf_hash()]);
    }

    // กดรายการ -> อ่านแล้ว 1 อัน
    public function read()
    {
        (new NotificationModel())->markRead((int) auth()->id(), (int) $this->request->getPost('id'));

        return $this->response->setJSON(['ok' => true, 'csrf' => csrf_hash()]);
    }

    // อ่านทั้งหมด
    public function readAll()
    {
        (new NotificationModel())->markAllRead((int) auth()->id());

        return $this->response->setJSON(['ok' => true, 'csrf' => csrf_hash()]);
    }
}
```

Run: `php -l app/Controllers/NotificationController.php`
Expected: `No syntax errors detected`

- [ ] **Step 2: เพิ่ม routes**

ใน `app/Config/Routes.php` หาบล็อกกลุ่มโปรไฟล์:

```php
// ===== โปรไฟล์/รหัสผ่าน: ใช้ร่วมทุก role (แค่ต้องล็อกอิน) =====
$routes->group('', ['filter' => 'session'], static function ($routes) {
    $routes->get('profile',          'ProfileController::index');           // ข้อมูลส่วนตัว
    $routes->get('change-password',  'ProfileController::changePassword');  // ฟอร์มเปลี่ยนรหัสผ่าน
    $routes->post('change-password', 'ProfileController::updatePassword');  // บันทึกรหัสผ่านใหม่
});
```

เพิ่ม 4 บรรทัดก่อนปีกกาปิดกลุ่ม (หลัง `change-password` POST):

```php
    // แจ้งเตือน (กระดิ่ง) — ทุก role ที่ล็อกอิน
    $routes->get('notifications/data',      'NotificationController::data');
    $routes->post('notifications/seen',     'NotificationController::seen');
    $routes->post('notifications/read',     'NotificationController::read');
    $routes->post('notifications/read-all', 'NotificationController::readAll');
```

Run: `php -l app/Config/Routes.php`
Expected: `No syntax errors detected`

- [ ] **Step 3: Checkpoint (routes โหลด)**

Run: `php spark routes | grep -i notifications`
Expected: เห็น 4 route (`notifications/data` GET, `notifications/seen`/`read`/`read-all` POST) filter `session`

---

### Task 3: island `NotificationBell` + mount ใน header + vite entry

**Files:**
- Modify: `vite.config.js` (เพิ่ม entry `notification-bell`)
- Create: `resources/js/entries/notification-bell.jsx`
- Create: `resources/js/islands/NotificationBell.jsx`
- Modify: `app/Views/templates/header.php` (mount bell ซ้ายของโปรไฟล์)

**Interfaces:**
- Consumes: endpoints (Task 2) · props `{ endpoints: { data, seen, read, readAll } }`; CSRF อ่านจาก `<meta name="csrf">`

- [ ] **Step 1: เพิ่ม entry ใน `vite.config.js`**

ใน `rollupOptions.input` (หลัง `'timeline': ...`) เพิ่ม:

```js
        'notification-bell': 'resources/js/entries/notification-bell.jsx',
```

- [ ] **Step 2: สร้าง entry**

สร้าง `resources/js/entries/notification-bell.jsx`:

```jsx
import { createRoot } from 'react-dom/client';
import NotificationBell from '../islands/NotificationBell';

// mount กระดิ่งแจ้งเตือนใน header
const el = document.getElementById('notification-bell');
if (el) {
  createRoot(el).render(<NotificationBell {...JSON.parse(el.dataset.props || '{}')} />);
}
```

- [ ] **Step 3: สร้าง island `NotificationBell.jsx`**

สร้าง `resources/js/islands/NotificationBell.jsx`:

```jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { thDateTime } from '../lib/date';

const TEAL = '#0c8b87';

// อ่าน CSRF ล่าสุดจาก meta
function getCsrf() {
  const el = document.querySelector('meta[name="csrf"]');
  return el ? el.getAttribute('content') : '';
}
// อัปเดต CSRF ลง meta (หลัง action คืนค่าใหม่)
function setCsrf(v) {
  const el = document.querySelector('meta[name="csrf"]');
  if (el && v) el.setAttribute('content', v);
}

// กระดิ่งแจ้งเตือน — badge + dropdown + poll 60วิ + load-more
export default function NotificationBell({ endpoints }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unseen, setUnseen] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  // GET รายการ (offset 0 = แทนที่, มากกว่านั้น = ต่อท้าย)
  const fetchPage = useCallback((offset, append) => {
    setLoading(true);
    return fetch(`${endpoints.data}?offset=${offset}`, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => {
        setUnseen(d.unseenCount || 0);
        setHasMore(!!d.hasMore);
        setItems((prev) => (append ? [...prev, ...(d.items || [])] : (d.items || [])));
      })
      .finally(() => setLoading(false));
  }, [endpoints.data]);

  // POST helper (แนบ CSRF + อัปเดต meta)
  const post = useCallback((url, body) => {
    const form = new URLSearchParams(body || {});
    return fetch(url, {
      method: 'POST',
      headers: { 'X-CSRF-TOKEN': getCsrf(), 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      credentials: 'same-origin',
      body: form.toString(),
    }).then((r) => r.json()).then((d) => { setCsrf(d.csrf); return d; });
  }, []);

  // โหลดครั้งแรก + poll ทุก 60 วิ (อัปเดต badge; ถ้าไม่ได้เปิดอยู่ให้รีเฟรชหน้าแรกด้วย)
  useEffect(() => {
    fetchPage(0, false);
    const id = setInterval(() => { if (!open) fetchPage(0, false); }, 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  // ปิด dropdown เมื่อคลิกนอกกล่อง
  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // สลับเปิด/ปิด — ตอนเปิด: โหลดหน้าแรกใหม่ + เห็นแล้วทั้งหมด (badge=0)
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      fetchPage(0, false);
      post(endpoints.seen).then(() => setUnseen(0));
    }
  };

  // กดรายการ -> อ่านแล้ว + ไปลิงก์
  const onItem = (n) => {
    post(endpoints.read, { id: n.id });
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    if (n.link) window.location = n.link;
  };

  // อ่านทั้งหมด
  const onReadAll = () => {
    post(endpoints.readAll);
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
  };

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      {/* ปุ่มกระดิ่ง + badge */}
      <button type="button" onClick={toggle}
        style={{ position: 'relative', width: 42, height: 42, borderRadius: 10, border: '1px solid #e7ebee', background: '#fff', color: '#37434d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
        {unseen > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: '#e5484d', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unseen > 99 ? '99+' : unseen}
          </span>
        )}
      </button>

      {/* dropdown */}
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 52, width: 340, maxWidth: '90vw', background: '#fff', border: '1px solid #e7ebee', borderRadius: 12, boxShadow: '0 8px 30px rgba(31,42,51,.12)', zIndex: 90, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #f0f3f5' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1f2a33' }}>การแจ้งเตือน</span>
            <button type="button" onClick={onReadAll} style={{ border: 'none', background: 'none', color: TEAL, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>อ่านทั้งหมด</button>
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {items.length === 0 && !loading && (
              <div style={{ padding: 30, textAlign: 'center', color: '#9aa7b2', fontSize: 13 }}>ยังไม่มีการแจ้งเตือน</div>
            )}
            {items.map((n) => (
              <div key={n.id} onClick={() => onItem(n)}
                style={{ padding: '11px 14px', borderBottom: '1px solid #f4f6f7', cursor: 'pointer', background: n.isRead ? '#fff' : '#eef7f6' }}>
                <div style={{ fontSize: 13.5, color: '#1f2a33', lineHeight: 1.4 }}>{n.message}</div>
                <div style={{ fontSize: 11.5, color: '#9aa7b2', marginTop: 3 }}>{thDateTime(n.created_at)}</div>
              </div>
            ))}
            {hasMore && (
              <button type="button" onClick={() => fetchPage(items.length, true)} disabled={loading}
                style={{ width: '100%', padding: '11px 0', border: 'none', borderTop: '1px solid #f0f3f5', background: '#fff', color: TEAL, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {loading ? 'กำลังโหลด...' : 'ดูเพิ่มเติม'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: mount bell ใน `header.php`**

ใน `app/Views/templates/header.php` หา comment `<!-- โปรไฟล์ -->` และ `<div style="position:relative;">` (เปิดบล็อกโปรไฟล์) — ครอบด้วย wrapper + แทรก bell ก่อนหน้า โดยแทนที่:

```php
  <!-- โปรไฟล์ -->
  <div style="position:relative;">
```

ด้วย:

```php
  <!-- ขวา: กระดิ่งแจ้งเตือน + โปรไฟล์ -->
  <div style="display:flex;align-items:center;gap:12px;">
    <?php
    $notiProps = ['endpoints' => [
        'data'    => site_url('notifications/data'),
        'seen'    => site_url('notifications/seen'),
        'read'    => site_url('notifications/read'),
        'readAll' => site_url('notifications/read-all'),
    ]];
    ?>
    <div id="notification-bell" data-props='<?= esc(json_encode($notiProps), 'attr') ?>'></div>
    <?= vite_asset('resources/js/entries/notification-bell.jsx') ?>

  <!-- โปรไฟล์ -->
  <div style="position:relative;">
```

จากนั้นหา **ปีกกาปิดของบล็อกโปรไฟล์เดิม** (ท้ายไฟล์ ก่อน `</header>`) — เดิมเป็น:

```php
    </div>
  </div>
</header>
```

เพิ่มปิด wrapper อีก 1 ชั้น (บล็อก "ขวา") เป็น:

```php
    </div>
  </div>
  </div>
</header>
```

> หมายเหตุ: wrapper "ขวา" เปิด 1 `<div>` ครอบ bell + โปรไฟล์ จึงต้องปิดเพิ่ม 1 `</div>` ก่อน `</header>`

Run: `php -l app/Views/templates/header.php`
Expected: `No syntax errors detected`

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build สำเร็จ · เห็น chunk `notification-bell-*.js`

- [ ] **Step 6: Checkpoint**

- `php -l app/Views/templates/header.php` ผ่าน · `npm run build` ผ่าน (มี `notification-bell` chunk)
- (เบราว์เซอร์) เปิดหน้าใดก็ได้หลัง login → เห็นไอคอนกระดิ่งข้างเมนูโปรไฟล์ · กดแล้ว dropdown เปิด (ยังว่างจนกว่าจะมี event ใน Task 4)

---

### Task 4: hook สร้างแจ้งเตือนเข้า event (6 controller / 10 event)

**Files:**
- Modify: `app/Controllers/Auth/RegisterController.php`
- Modify: `app/Controllers/User/BookingController.php` (store / cancel / returnCar)
- Modify: `app/Controllers/Admin/RequestController.php` (approve / reject / confirmCancel / cancel / update / assignDriver)

**Interfaces:**
- Consumes: `NotificationModel::push()` / `pushToAdmins()` (Task 1) · `UserProfileModel::findByUserId()` (มีอยู่)

- [ ] **Step 1: RegisterController — แจ้ง admin เมื่อมีสมาชิกใหม่**

ใน `attempt()` แทนที่บรรทัดสุดท้าย `return redirect()->to('register/success');` ด้วย:

```php
        // แจ้ง Admin ทุกคนว่ามีสมาชิกลงทะเบียนใหม่
        (new \App\Models\NotificationModel())->pushToAdmins(
            'member_new',
            'มีสมาชิกลงทะเบียนใหม่: ' . $req->getPost('name'),
            site_url('admin/members')
        );

        // ไม่ login — ไปหน้าแจ้งผลรออนุมัติ
        return redirect()->to('register/success');
```

Run: `php -l app/Controllers/Auth/RegisterController.php`
Expected: `No syntax errors detected`

- [ ] **Step 2: BookingController::store — แจ้ง admin เมื่อมีคำขอจองใหม่**

ใน `store()` แทนที่ท้ายเมธอด:

```php
        $bookings->update($id, ['booking_code' => $bookings->makeCode($id)]);
        $db->transCommit();

        return $this->ok('ส่งคำขอจองรถเรียบร้อย รอ Admin อนุมัติ', $this->afterBookUrl());
```

ด้วย:

```php
        $bookings->update($id, ['booking_code' => $bookings->makeCode($id)]);
        $db->transCommit();

        // แจ้ง Admin ทุกคน (ข้ามผู้ก่อถ้าเป็น admin จองเอง)
        $me   = (int) auth()->id();
        $name = (new \App\Models\UserProfileModel())->findByUserId($me)['full_name'] ?? auth()->user()->username;
        (new \App\Models\NotificationModel())->pushToAdmins('booking_new', 'มีคำขอจองรถใหม่จาก ' . $name, site_url('admin/requests'), $me);

        return $this->ok('ส่งคำขอจองรถเรียบร้อย รอ Admin อนุมัติ', $this->afterBookUrl());
```

- [ ] **Step 3: BookingController::cancel — แจ้ง admin เมื่อขอยกเลิก (approved → cancel_requested)**

ใน `cancel()` หา branch `approved` แล้วแทนที่:

```php
            $bookings->update($id, ['status' => 'cancel_requested']);

            return $this->ok('ส่งคำขอยกเลิกแล้ว รอ Admin ยืนยัน');
```

ด้วย:

```php
            $bookings->update($id, ['status' => 'cancel_requested']);

            // แจ้ง Admin ว่ามีคำขอยกเลิก
            $me   = (int) auth()->id();
            $name = (new \App\Models\UserProfileModel())->findByUserId($me)['full_name'] ?? auth()->user()->username;
            (new \App\Models\NotificationModel())->pushToAdmins('cancel_requested', $name . ' ขอยกเลิกคำขอ ' . $booking['booking_code'], site_url('admin/requests'), $me);

            return $this->ok('ส่งคำขอยกเลิกแล้ว รอ Admin ยืนยัน');
```

- [ ] **Step 4: BookingController::returnCar — แจ้ง admin เมื่อมีคนคืนรถ**

ใน `returnCar()` แทนที่:

```php
        $bookings->update($id, ['status' => 'completed', 'returned_at' => date('Y-m-d H:i:s')]);

        return $this->ok('คืนรถเรียบร้อย รถพร้อมให้จองอีกครั้ง');
```

ด้วย:

```php
        $bookings->update($id, ['status' => 'completed', 'returned_at' => date('Y-m-d H:i:s')]);

        // แจ้ง Admin ว่ามีคนคืนรถ
        $me   = (int) auth()->id();
        $name = (new \App\Models\UserProfileModel())->findByUserId($me)['full_name'] ?? auth()->user()->username;
        (new \App\Models\NotificationModel())->pushToAdmins('car_returned', $name . ' คืนรถแล้ว (' . $booking['booking_code'] . ')', site_url('admin/requests'), $me);

        return $this->ok('คืนรถเรียบร้อย รถพร้อมให้จองอีกครั้ง');
```

Run: `php -l app/Controllers/User/BookingController.php`
Expected: `No syntax errors detected`

- [ ] **Step 5: RequestController — เพิ่ม use + helper แจ้งผู้ขอ**

ใน `app/Controllers/Admin/RequestController.php` เพิ่มใต้ `use App\Models\CarModel;`:

```php
use App\Models\NotificationModel;
```

เพิ่ม private helper ก่อน `// ===== helper ตอบ JSON` (ท้ายคลาส):

```php
    // แจ้งผู้ขอ (ข้ามถ้าผู้ขอ = admin คนที่กำลังทำรายการ — กันแจ้งตัวเอง)
    private function notifyRequester(array $b, string $type, string $message): void
    {
        if ((int) $b['requester_id'] === (int) auth()->id()) {
            return;
        }
        (new NotificationModel())->push((int) $b['requester_id'], $type, $message, site_url('my-requests'));
    }

    // แจ้งคนขับบริษัท (ถ้ามี driver_id)
    private function notifyDriver(?int $driverId, string $type, string $message): void
    {
        if (! $driverId) {
            return;
        }
        (new NotificationModel())->push($driverId, $type, $message, site_url('driver'));
    }
```

- [ ] **Step 6: RequestController::approve — แจ้งผู้ขอ + คนขับ**

ใน `approve()` แทนที่:

```php
        $bookings->update($id, $data);

        return $this->ok('อนุมัติคำขอเรียบร้อย');
```

ด้วย:

```php
        $bookings->update($id, $data);

        $this->notifyRequester($b, 'booking_approved', 'คำขอ ' . $b['booking_code'] . ' ได้รับการอนุมัติแล้ว');
        if (($data['driver_type'] ?? '') === 'company' && ! empty($data['driver_id'])) {
            $this->notifyDriver((int) $data['driver_id'], 'job_new', 'คุณได้รับมอบหมายงานใหม่ (' . $b['booking_code'] . ')');
        }

        return $this->ok('อนุมัติคำขอเรียบร้อย');
```

- [ ] **Step 7: RequestController::assignDriver — แจ้งผู้ขอ + คนขับ**

ใน `assignDriver()` แทนที่:

```php
        $bookings->update($id, $assign);

        return $this->ok('มอบหมายคนขับเรียบร้อย');
```

ด้วย:

```php
        $bookings->update($id, $assign);

        $this->notifyRequester($b, 'driver_assigned', 'คำขอ ' . $b['booking_code'] . ' ได้รับมอบหมายคนขับแล้ว');
        if (($assign['driver_type'] ?? '') === 'company' && ! empty($assign['driver_id'])) {
            $this->notifyDriver((int) $assign['driver_id'], 'job_new', 'คุณได้รับมอบหมายงานใหม่ (' . $b['booking_code'] . ')');
        }

        return $this->ok('มอบหมายคนขับเรียบร้อย');
```

- [ ] **Step 8: RequestController::reject — แจ้งผู้ขอ**

ใน `reject()` แทนที่ `return $this->ok('ปฏิเสธคำขอแล้ว');` ด้วย:

```php
        $this->notifyRequester($b, 'booking_rejected', 'คำขอ ' . $b['booking_code'] . ' ถูกปฏิเสธ');

        return $this->ok('ปฏิเสธคำขอแล้ว');
```

- [ ] **Step 9: RequestController::confirmCancel — แจ้งผู้ขอ + คนขับ**

ใน `confirmCancel()` แทนที่ `return $this->ok('ยืนยันการยกเลิกแล้ว');` ด้วย:

```php
        $this->notifyRequester($b, 'cancel_confirmed', 'ยืนยันการยกเลิกคำขอ ' . $b['booking_code'] . ' แล้ว');
        if ($b['driver_type'] === 'company') {
            $this->notifyDriver($b['driver_id'] ? (int) $b['driver_id'] : null, 'job_cancelled', 'งานที่ได้รับมอบหมาย (' . $b['booking_code'] . ') ถูกยกเลิก');
        }

        return $this->ok('ยืนยันการยกเลิกแล้ว');
```

- [ ] **Step 10: RequestController::cancel — แจ้งผู้ขอ + คนขับ**

ใน `cancel()` แทนที่ `return $this->ok('ยกเลิกคำขอแล้ว');` ด้วย:

```php
        $this->notifyRequester($b, 'booking_cancelled', 'คำขอ ' . $b['booking_code'] . ' ถูกยกเลิกโดย Admin');
        if ($b['driver_type'] === 'company') {
            $this->notifyDriver($b['driver_id'] ? (int) $b['driver_id'] : null, 'job_cancelled', 'งานที่ได้รับมอบหมาย (' . $b['booking_code'] . ') ถูกยกเลิก');
        }

        return $this->ok('ยกเลิกคำขอแล้ว');
```

- [ ] **Step 11: RequestController::update — แจ้งผู้ขอ + คนขับใหม่**

ใน `update()` แทนที่:

```php
        $bookings->update($id, $data);

        return $this->ok('บันทึกการแก้ไขคำขอแล้ว');
```

ด้วย:

```php
        $bookings->update($id, $data);

        $this->notifyRequester($b, 'booking_edited', 'Admin แก้ไขรายละเอียดคำขอ ' . $b['booking_code']);
        if (($data['driver_type'] ?? '') === 'company' && ! empty($data['driver_id'])) {
            $this->notifyDriver((int) $data['driver_id'], 'job_new', 'คุณได้รับมอบหมายงานใหม่ (' . $b['booking_code'] . ')');
        }

        return $this->ok('บันทึกการแก้ไขคำขอแล้ว');
```

Run: `php -l app/Controllers/Admin/RequestController.php`
Expected: `No syntax errors detected`

- [ ] **Step 12: Checkpoint (php -l + browser E2E)**

Run: `php -l app/Controllers/Auth/RegisterController.php app/Controllers/User/BookingController.php app/Controllers/Admin/RequestController.php`
Expected: ทุกไฟล์ "No syntax errors detected"

> หมายเหตุ: event hook สร้างแจ้งเตือนเป็น side-effect ของ controller (ต้องมี auth+CSRF) จึงตรวจผ่านเบราว์เซอร์จริง — ส่วน logic ที่ reusable (pushToAdmins fan-out/exclude, seen/read/count) ทดสอบตรงไปแล้วใน Task 1 Step 4

Browser E2E (login สลับ role ผ่าน XAMPP):
1. login user (`somchai`) → จองรถ → login `admin` เห็นกระดิ่ง badge +1 "มีคำขอจองรถใหม่จาก ..." · กด → ไป `/admin/requests`
2. admin อนุมัติคำขอนั้นแบบมอบคนขับบริษัท → user เห็น "อนุมัติแล้ว" · คนขับ (`prasert`) เห็น "งานใหม่"
3. reject / คืนรถ / สมัครสมาชิกใหม่ → ผู้รับถูกคน
4. เปิด dropdown → badge=0 · กดรายการ → ไฮไลต์หาย + ไปหน้าถูก · "อ่านทั้งหมด" เคลียร์ไฮไลต์ · "ดูเพิ่มเติม" โหลดเก่าต่อ (ถ้ามี > 10)
5. ตรวจ DB: `php spark db:table notifications --limit-rows 20` — แถวเกิดกับ `user_id` ถูกคน · admin จองเอง **ไม่**มีแถวถึงตัวเอง (exclude self)

---

## Self-Review (ผู้เขียนแผนตรวจเอง)

**Spec coverage:**
- §3 schema (2 สถานะ + FK + index) → Task 1 ✓
- §4 model methods (push/pushToAdmins/list/total/unseen/markSeen/markRead/markAllRead) → Task 1 ✓
- §5 controller + routes (data/seen/read/readAll ใต้ session) → Task 2 ✓
- §6 island (badge/poll60/เปิด→seen/กด→read+link/ดูเพิ่มเติม/อ่านทั้งหมด) → Task 3 ✓
- §7 event 10 อัน + ข้าม self → Task 4 (Step 1-11 ครบทุกแถวในตาราง §7 รวม #4 คืนรถ, #9 แก้ไข) ✓
- §9 YAGNI (ไม่ทำ realtime/หน้าแยก) → ไม่มี task ทำ ✓

**Placeholder scan:** ไม่มี TBD/TODO · โค้ดครบทุก step

**Type consistency:** `push($userId,$type,$message,$link)` / `pushToAdmins($type,$message,$link,$exclude)` ใช้ตรงกันทุก hook · endpoints keys (`data/seen/read/readAll`) ตรงกัน controller↔routes↔header props↔island · `notifyRequester($b,$type,$msg)`/`notifyDriver($driverId,$type,$msg)` นิยาม Step 5 ใช้ Step 6-11 ตรงกัน · island อ่าน `{id,type,message,link,isRead,created_at}` ตรงกับ controller `data()` ✓
