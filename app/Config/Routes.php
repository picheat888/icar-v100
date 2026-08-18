<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */

// '/' จัดเส้นทางตาม role (ดูใน Home::index) - Shield redirect หลัง login มาที่นี่
$routes->get('/', 'Home::index');

// override auth ก่อน Shield - CI4 ยึด route ที่นิยาม "ก่อน" เป็นหลัก (ตัวหลังที่ซ้ำจะถูกข้าม)
// Register: สร้างโปรไฟล์ status=pending ไม่ auto-login · Login: เพิ่มด่านตรวจสถานะอนุมัติ
// filter throttle: จำกัดจำนวนครั้งต่อ IP ต่อนาที (login 10, register 5) กัน brute force + สแปมสมัคร
$routes->get('register',         'Auth\RegisterController::index',   ['as' => 'register']);
$routes->post('register',        'Auth\RegisterController::attempt', ['filter' => 'throttle:register']);
$routes->get('register/success', 'Auth\RegisterController::success');
$routes->post('login',           'Auth\LoginController::loginAction', ['filter' => 'throttle:login']);

// เส้นทาง auth ที่เหลือของ Shield (login GET view, logout, auth-actions)
// except magic-link: ระบบล็อกอินด้วย username/password เท่านั้น ไม่ได้ใช้อีเมลจริง
// จึงไม่เปิด endpoint ที่ล็อกอินได้โดยข้ามด่านตรวจสถานะอนุมัติใน Auth\LoginController
service('auth')->routes($routes, ['except' => ['magic-link']]);

// สลับภาษา - guest เข้าถึงได้ (ไม่อยู่ใต้ filter auth ใดๆ)
$routes->get('lang/(:segment)', 'LocaleController::set/$1');

// ===== หลังบ้าน: /admin/... (เฉพาะกลุ่ม admin) =====
$routes->group('admin', ['filter' => 'group:admin'], static function ($routes) {
    $routes->get('/',         'Admin\DashboardController::index');     // ภาพรวมระบบ
    $routes->get('dashboard/data', 'Admin\DashboardController::data'); // JSON สรุป dashboard
    $routes->get('timeline',  'Admin\DashboardController::timeline');  // ตารางการใช้รถ
    $routes->get('timeline/data', 'Admin\DashboardController::timelineData'); // JSON ตารางการใช้รถ

    // จัดการสมาชิก (หน้า + JSON endpoint ของ island)
    $routes->get('members',          'Admin\MemberController::index');
    $routes->get('members/data',     'Admin\MemberController::data');
    $routes->post('members/create',  'Admin\MemberController::create');
    $routes->post('members/approve', 'Admin\MemberController::approve');
    $routes->post('members/reject',  'Admin\MemberController::reject');
    $routes->post('members/update',  'Admin\MemberController::update');

    // จัดการคำขอจองรถ (หน้า + JSON endpoint ของ island)
    $routes->get('requests',         'Admin\RequestController::index');
    $routes->get('requests/data',    'Admin\RequestController::data');
    $routes->post('requests/approve', 'Admin\RequestController::approve');
    $routes->post('requests/reject',  'Admin\RequestController::reject');
    $routes->post('requests/confirm-cancel', 'Admin\RequestController::confirmCancel');
    $routes->post('requests/assign-driver',  'Admin\RequestController::assignDriver');
    $routes->post('requests/cancel',  'Admin\RequestController::cancel');
    $routes->post('requests/update',  'Admin\RequestController::update');
    // จัดการรถ (หน้า + JSON endpoint ของ island)
    $routes->get('vehicles',         'Admin\CarController::index');
    $routes->get('vehicles/data',    'Admin\CarController::data');
    $routes->post('vehicles/save',   'Admin\CarController::save');
    $routes->post('vehicles/delete', 'Admin\CarController::delete');

    // แผนก/ตำแหน่ง (เมนูย่อยใต้จัดการสมาชิก) + JSON endpoint ของ island
    $routes->get('departments', 'Admin\MasterController::departments');
    $routes->get('positions',   'Admin\MasterController::positions');
    // ประวัติการใช้งาน (เมนูย่อยใต้ข้อมูลหลัก) - หน้า + JSON + Export CSV
    $routes->get('activity-log',        'Admin\ActivityLogController::index');
    $routes->get('activity-log/data',   'Admin\ActivityLogController::data');
    $routes->get('activity-log/export', 'Admin\ActivityLogController::export');
    $routes->get('master',         'Admin\MasterController::index');   // redirect เข้ากันกับลิงก์เก่า
    $routes->get('master/data',    'Admin\MasterController::data');
    $routes->post('master/add',    'Admin\MasterController::add');
    $routes->post('master/update', 'Admin\MasterController::update');
    $routes->post('master/delete', 'Admin\MasterController::delete');
});

// ===== โปรไฟล์/รหัสผ่าน: ใช้ร่วมทุก role (แค่ต้องล็อกอิน) =====
$routes->group('', ['filter' => 'session'], static function ($routes) {
    $routes->get('profile',          'ProfileController::index');           // ข้อมูลส่วนตัว
    $routes->get('change-password',  'ProfileController::changePassword');  // ฟอร์มเปลี่ยนรหัสผ่าน
    $routes->post('change-password', 'ProfileController::updatePassword');  // บันทึกรหัสผ่านใหม่
    $routes->post('force-reset-password', 'ProfileController::forceReset'); // บันทึกรหัสใหม่จาก popup บังคับเปลี่ยนรหัส

    // รูปรถ - ไฟล์อยู่นอก webroot จึงต้องผ่าน controller (ทุก role ที่ล็อกอินดูได้)
    $routes->get('car-image/(:num)', 'CarImageController::show/$1');

    // แจ้งเตือน (กระดิ่ง) - ทุก role ที่ล็อกอิน
    $routes->get('notifications/data',      'NotificationController::data');
    $routes->post('notifications/read',     'NotificationController::read');
    $routes->post('notifications/read-all', 'NotificationController::readAll');
});

// ===== จองรถ + คำขอของฉัน: เฉพาะ admin กับ user (driver จองไม่ได้) =====
$routes->group('', ['filter' => 'group:admin,user'], static function ($routes) {
    // จองรถ (admin เข้าจากหน้าจัดการรถ · user เข้าจากเมนูจองรถ)
    $routes->get('book',              'User\BookingController::index');
    $routes->get('book/availability', 'User\BookingController::availability');
    $routes->post('book',             'User\BookingController::store');
    // คำขอของฉัน - ดู/ยกเลิก/คืนรถ ของตัวเอง (controller กรองด้วย requester_id ตัวเอง)
    $routes->get('my-requests',         'User\BookingController::myRequests');
    $routes->get('my-requests/data',    'User\BookingController::myData');
    $routes->post('my-requests/cancel', 'User\BookingController::cancel');
    $routes->post('my-requests/return', 'User\BookingController::returnCar');
});

// ===== หน้าผู้ใช้: /... (เฉพาะกลุ่ม user) =====
$routes->group('', ['filter' => 'group:user'], static function ($routes) {
    // ตารางการใช้รถ (หน้า + JSON endpoint ของ island)
    $routes->get('timeline',      'User\PageController::timeline');
    $routes->get('timeline/data', 'User\PageController::timelineData');
});

// ===== หน้าคนขับ: /driver/... (เฉพาะกลุ่ม driver) =====
$routes->group('driver', ['filter' => 'group:driver'], static function ($routes) {
    $routes->get('/',         'Driver\PageController::index');     // งานของฉัน
    $routes->get('timeline',  'Driver\PageController::timeline');  // ตารางการใช้รถ
    $routes->get('timeline/data', 'Driver\PageController::timelineData'); // JSON ตารางการใช้รถ
});
