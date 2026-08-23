<?php
/**
 * Sidebar - แถบเมนูซ้าย กรองรายการตาม role (admin / user / driver)
 * รับ: $role (string), $active (string คีย์เพจที่กำลังเปิด)
 * อ้างอิงดีไซน์ docs/mockuo-master (แบรนด์ iCar BOOKING ตรงกับหน้า login)
 */
$role   = $role   ?? 'user';
$active = $active ?? '';

// ไอคอนของแต่ละเมนู - ชุดกลางที่ resources/icons.json
helper('icon');
$icons = [
    'dashboard'  => icon('dashboard', 19),
    'timeline'   => icon('calendar', 19),
    'book'       => icon('car', 19),
    'myRequests' => icon('my-requests', 19),
    'myJobs'     => icon('my-jobs', 19),
    'members'    => icon('members', 19),
    'requests'   => icon('bookings', 19),
    'vehicles'   => icon('car', 19),
    'master'     => icon('master', 19),
    'log'        => icon('log', 19),
];

// เมนูแต่ละ role: [key, label, url]
$menus = [
    'admin' => [
        ['dashboard',  lang('Nav.dashboard'),  site_url('admin')],
        ['timeline',   lang('Nav.calendar'),   site_url('admin/timeline')],
        ['myRequests', lang('Nav.myRequests'), site_url('my-requests')],
        // จัดการสมาชิก = ลิงก์ไปหน้ารายการสมาชิก + มีเมนูย่อย (แผนก / ตำแหน่ง)
        ['members',    lang('Nav.users'),      site_url('admin/members'), [
            ['dept',     lang('Nav.dept'),     site_url('admin/departments')],
            ['position', lang('Nav.position'), site_url('admin/positions')],
        ]],
        ['requests',   lang('Nav.bookings'),   site_url('admin/requests')],
        ['vehicles',   lang('Nav.cars'),       site_url('admin/vehicles')],
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

// badge งานค้าง (วงกลมส้ม) - ส่งมาจาก layout admin เป็น ['requests'=>n, 'members'=>n]
// เรนเดอร์ span ไว้เสมอ (ซ่อนเมื่อเป็น 0) เพื่อให้ island อัปเดตตัวเลขเองได้หลังทำรายการ
// โดยอ้างอิงผ่าน data-badge - ดู lib/navBadge.js
$badges = $badges ?? [];
$badgeHtml = static function (string $key) use ($badges): string {
    $n    = (int) ($badges[$key] ?? 0);
    $hide = $n > 0 ? '' : ' nav-badge--hide';

    return '<span class="pill pill--orange nav-badge' . $hide . '" data-badge="' . $key . '">'
        . ($n > 99 ? '99+' : $n) . '</span>';
};
?>
<aside class="app-sidebar" data-open="false" data-collapsed="false">
  <!-- แบรนด์ -->
  <div class="nav-brandwrap">
    <div class="brand brand--sm nav-brandrow">
      <img src="<?= base_url('logo-1.png') ?>" alt="" class="brand-logo">
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
            <button type="button" class="nav-caret-btn nav-label" aria-label="<?= esc(lang('Nav.toggle_submenu'), 'attr') ?>">
              <?= icon('chevron-down', 15, 'nav-caret', 2.2) ?>
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
      <?= icon('logout', 19) ?>
      <span class="nav-label"><?= esc(lang('Nav.logout')) ?></span>
    </a>
  </div>
</aside>
