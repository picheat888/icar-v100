<?php

namespace Config;

use CodeIgniter\Config\Filters as BaseFilters;
use CodeIgniter\Filters\Cors;
use CodeIgniter\Filters\CSRF;
use CodeIgniter\Filters\DebugToolbar;
use CodeIgniter\Filters\ForceHTTPS;
use CodeIgniter\Filters\Honeypot;
use CodeIgniter\Filters\InvalidChars;
use CodeIgniter\Filters\PageCache;
use CodeIgniter\Filters\PerformanceMetrics;
use CodeIgniter\Filters\SecureHeaders;
use App\Filters\AccountStatusFilter;
use App\Filters\ForcePasswordResetGuard;
use App\Filters\LocaleFilter;
use App\Filters\ThrottleFilter;

class Filters extends BaseFilters
{
    /**
     * Configures aliases for Filter classes to
     * make reading things nicer and simpler.
     *
     * @var array<string, class-string|list<class-string>>
     *
     * [filter_name => classname]
     * or [filter_name => [classname1, classname2, ...]]
     */
    public array $aliases = [
        'csrf'          => CSRF::class,
        'toolbar'       => DebugToolbar::class,
        'honeypot'      => Honeypot::class,
        'invalidchars'  => InvalidChars::class,
        'secureheaders' => SecureHeaders::class,
        'cors'          => Cors::class,
        'forcehttps'    => ForceHTTPS::class,
        'pagecache'     => PageCache::class,
        'performance'   => PerformanceMetrics::class,
        'accountstatus' => AccountStatusFilter::class,
        'forcepwreset'  => ForcePasswordResetGuard::class,
        'locale'        => LocaleFilter::class,
        'throttle'      => ThrottleFilter::class,
    ];

    /**
     * List of special required filters.
     *
     * The filters listed here are special. They are applied before and after
     * other kinds of filters, and always applied even if a route does not exist.
     *
     * Filters set by default provide framework functionality. If removed,
     * those functions will no longer work.
     *
     * @see https://codeigniter.com/user_guide/incoming/filters.html#provided-filters
     *
     * @var array{before: list<string>, after: list<string>}
     */
    public array $required = [
        'before' => [
            'forcehttps', // Force Global Secure Requests
            'pagecache',  // Web Page Caching
        ],
        'after' => [
            'pagecache',   // Web Page Caching
            'performance', // Performance Metrics
            'toolbar',     // Debug Toolbar
        ],
    ];

    /**
     * List of filter aliases that are always
     * applied before and after every request.
     *
     * @var array{
     *     before: array<string, array{except: list<string>|string}>|list<string>,
     *     after: array<string, array{except: list<string>|string}>|list<string>
     * }
     */
    public array $globals = [
        'before' => [
            // ตั้ง locale จาก cookie 'lang' ก่อน filter อื่นทำงาน (ต้องมาก่อน csrf)
            'locale',
            // 'honeypot',
            // ตีกลับ request ที่มีไบต์ไม่ใช่ UTF-8 หรืออักขระควบคุม (ยกเว้น \r \n \t)
            'invalidchars',
            // CSRF (session-based) - ฟอร์มใช้ csrf_field() · island แนบ X-CSRF-TOKEN header + อัปเดต token จาก response
            'csrf',
            // เช็คสถานะบัญชีทุก request ยกเว้นหน้า auth (กันคนถูกปิดใช้งานระหว่างล็อกอินอยู่)
            'accountstatus' => ['except' => ['login', 'login/*', 'register', 'register/*', 'logout', 'auth/*']],
            // บังคับเปลี่ยนรหัส (force_reset=1): บล็อกการเปลี่ยนข้อมูลจนกว่าจะตั้งรหัสใหม่ผ่าน popup
            // ยกเว้นหน้า auth + endpoint บันทึกรหัสใหม่ (ไม่งั้นบันทึกไม่ได้)
            'forcepwreset'  => ['except' => ['login', 'login/*', 'register', 'register/*', 'logout', 'auth/*', 'force-reset-password']],
        ],
        'after' => [
            // 'honeypot',
            // ส่ง security header พื้นฐานทุก response (X-Frame-Options: SAMEORIGIN กัน clickjacking,
            // X-Content-Type-Options: nosniff, Referrer-Policy: same-origin) - ไม่มี HSTS จึงใช้ได้บน http
            'secureheaders',
        ],
    ];

    /**
     * List of filter aliases that works on a
     * particular HTTP method (GET, POST, etc.).
     *
     * Example:
     * 'POST' => ['foo', 'bar']
     *
     * If you use this, you should disable auto-routing because auto-routing
     * permits any HTTP method to access a controller. Accessing the controller
     * with a method you don't expect could bypass the filter.
     *
     * @var array<string, list<string>>
     */
    public array $methods = [];

    /**
     * List of filter aliases that should run on any
     * before or after URI patterns.
     *
     * Example:
     * 'isLoggedIn' => ['before' => ['account/*', 'profiles/*']]
     *
     * @var array<string, array<string, list<string>>>
     */
    public array $filters = [];
}
