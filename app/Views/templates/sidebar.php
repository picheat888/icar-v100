<?php
/**
 * Sidebar — แถบเมนูซ้าย กรองรายการตาม role (admin / user / driver)
 * รับ: $role (string), $active (string คีย์เพจที่กำลังเปิด)
 * อ้างอิงดีไซน์ docs/mockuo-master (แบรนด์ iCar BOOKING ตรงกับหน้า login)
 */
$role   = $role   ?? 'user';
$active = $active ?? '';

// ไอคอน SVG ของแต่ละเมนู (key => svg)
$icons = [
    'dashboard'  => '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>',
    'timeline'   => '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="7" y1="13" x2="9" y2="13"/><line x1="13" y1="13" x2="17" y2="13"/><line x1="7" y1="17" x2="11" y2="17"/></svg>',
    'book'       => '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l1.6-4.7A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.3L21 13v5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H6.5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><circle cx="7" cy="16" r="1"/><circle cx="17" cy="16" r="1"/></svg>',
    'myRequests' => '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/></svg>',
    'myJobs'     => '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="3" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="21" y2="12"/></svg>',
    'members'    => '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    'requests'   => '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    'vehicles'   => '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l1.6-4.7A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.3L21 13v5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H6.5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><circle cx="7" cy="16" r="1"/><circle cx="17" cy="16" r="1"/></svg>',
    'master'     => '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18"/><path d="M3 12h18"/><path d="M3 17h18"/><circle cx="7" cy="7" r="1.4" fill="currentColor"/><circle cx="13" cy="12" r="1.4" fill="currentColor"/><circle cx="9" cy="17" r="1.4" fill="currentColor"/></svg>',
    'log'        => '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>',
];

// เมนูแต่ละ role: [key, label, url]
$menus = [
    'admin' => [
        ['dashboard',  lang('Nav.dashboard'),  site_url('admin')],
        ['timeline',   lang('Nav.calendar'),   site_url('admin/timeline')],
        // จัดการสมาชิก = ลิงก์ไปหน้ารายการสมาชิก + มีเมนูย่อย (แผนก / ตำแหน่ง)
        ['members',    lang('Nav.users'),      site_url('admin/members'), [
            ['dept',     lang('Nav.dept'),     site_url('admin/departments')],
            ['position', lang('Nav.position'), site_url('admin/positions')],
        ]],
        ['requests',   lang('Nav.bookings'),   site_url('admin/requests')],
        ['vehicles',   lang('Nav.cars'),       site_url('admin/vehicles')],
        ['myRequests', lang('Nav.myRequests'), site_url('my-requests')],
        ['log',        lang('Nav.log'),        site_url('admin/activity-log')],
    ],
    'user' => [
        // "จองรถ" ย้ายไปเป็นปุ่มมุมบนขวาของหน้าตารางการใช้รถ (Timeline island)
        ['timeline',   lang('Nav.calendar'),   site_url('timeline')],
        ['myRequests', lang('Nav.myRequests'), site_url('my-requests')],
    ],
    'driver' => [
        ['timeline',   lang('Nav.calendar'),   site_url('driver/timeline')],
        ['myJobs',     lang('Nav.myJobs'),     site_url('driver')],
    ],
];
$items = $menus[$role] ?? $menus['user'];

// badge งานค้าง (วงกลมส้ม) — ส่งมาจาก layout admin เป็น ['requests'=>n, 'members'=>n]
$badges = $badges ?? [];
$badgeHtml = static function (string $key) use ($badges): string {
    $n = (int) ($badges[$key] ?? 0);
    return $n > 0 ? '<span class="pill pill--orange nav-badge">' . ($n > 99 ? '99+' : $n) . '</span>' : '';
};
?>
<aside class="app-sidebar" data-open="false" data-collapsed="false">
  <!-- แบรนด์ -->
  <div class="nav-brandwrap">
    <div class="brand brand--sm nav-brandrow">
      <div class="icon-box brand-icon">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l1.6-4.7A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.3L21 13v5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H6.5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><circle cx="7" cy="16" r="1"/><circle cx="17" cy="16" r="1"/></svg>
      </div>
      <div class="brand-text nav-brandtext">
        <div class="brand-name">iCar</div>
        <div class="brand-sub">BOOKING</div>
      </div>
    </div>
  </div>

  <!-- เมนู (กรองตาม role) -->
  <nav class="nav-menu">
    <?php foreach ($items as $item): ?>
      <?php
        $key      = $item[0];
        $label    = $item[1];
        $url      = $item[2];
        $children = $item[3] ?? null;
      ?>
      <?php if ($children): ?>
        <?php
          $childKeys = array_column($children, 0);
          $open      = ($active === $key) || in_array($active, $childKeys, true);
        ?>
        <div class="nav-group" data-open="<?= $open ? 'true' : 'false' ?>">
          <div class="nav-parent-row<?= $active === $key ? ' active' : '' ?>">
            <!-- กดที่ชื่อ = ไปหน้ารายการสมาชิกทันที -->
            <a href="<?= esc($url, 'attr') ?>" class="nav-item<?= $active === $key ? ' active' : '' ?>">
              <?= $icons[$key] ?? '' ?><span class="nav-label"><?= esc($label) ?></span><?= $badgeHtml($key) ?>
            </a>
            <!-- ปุ่มลูกศร = กาง/พับเมนูย่อย -->
            <button type="button" class="nav-caret-btn nav-label" aria-label="สลับเมนูย่อย">
              <svg class="nav-caret" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
          <div class="nav-sub">
            <?php foreach ($children as [$ck, $cl, $curl]): ?>
              <a href="<?= esc($curl, 'attr') ?>" class="nav-subitem<?= $active === $ck ? ' active' : '' ?>"><span class="nav-label"><?= esc($cl) ?></span></a>
            <?php endforeach; ?>
          </div>
        </div>
      <?php else: ?>
        <a href="<?= esc($url, 'attr') ?>" class="nav-item<?= $active === $key ? ' active' : '' ?>">
          <?= $icons[$key] ?? '' ?><span class="nav-label"><?= esc($label) ?></span><?= $badgeHtml($key) ?>
        </a>
      <?php endif; ?>
    <?php endforeach; ?>
  </nav>

  <!-- ออกจากระบบ -->
  <div class="nav-footer">
    <a href="<?= url_to('logout') ?>" class="nav-logout">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      <span class="nav-label"><?= esc(lang('Nav.logout')) ?></span>
    </a>
  </div>
</aside>
