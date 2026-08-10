<?php

declare(strict_types=1);

/**
 * This file is part of CodeIgniter Shield.
 *
 * (c) CodeIgniter Foundation <admin@codeigniter.com>
 *
 * For the full copyright and license information, please view
 * the LICENSE file that was distributed with this source code.
 */

namespace Config;

use CodeIgniter\Shield\Config\AuthGroups as ShieldAuthGroups;

class AuthGroups extends ShieldAuthGroups
{
    /**
     * --------------------------------------------------------------------
     * Default Group
     * --------------------------------------------------------------------
     * The group that a newly registered user is added to.
     */
    public string $defaultGroup = 'user';

    /**
     * --------------------------------------------------------------------
     * Groups
     * --------------------------------------------------------------------
     * An associative array of the available groups in the system, where the keys
     * are the group names and the values are arrays of the group info.
     *
     * Whatever value you assign as the key will be used to refer to the group
     * when using functions such as:
     *      $user->addGroup('superadmin');
     *
     * @var array<string, array<string, string>>
     *
     * @see https://codeigniter4.github.io/shield/quick_start_guide/using_authorization/#change-available-groups for more info
     */
    public array $groups = [
        // Admin: จัดการทั้งระบบ (สมาชิก, รถ, คำขอ, ตาราง)
        'admin' => [
            'title'       => 'Admin',
            'description' => 'ผู้ดูแลระบบ จัดการสมาชิก รถ คำขอจอง และตารางการใช้งาน',
        ],
        // User: พนักงานทั่วไป จองรถ + ดูตาราง
        'user' => [
            'title'       => 'User',
            'description' => 'พนักงานทั่วไป มีสิทธิ์จองรถและตรวจสอบตารางการจอง',
        ],
        // Driver: คนขับ ดูเฉพาะงานที่ได้รับมอบหมาย
        'driver' => [
            'title'       => 'Driver',
            'description' => 'คนขับรถ ดูเฉพาะงานที่ได้รับมอบหมาย',
        ],
    ];

    /**
     * --------------------------------------------------------------------
     * Permissions
     * --------------------------------------------------------------------
     * The available permissions in the system.
     *
     * If a permission is not listed here it cannot be used.
     */
    public array $permissions = [
        'admin.access'    => 'เข้าถึงหลังบ้าน (Admin area)',
        'members.manage'  => 'จัดการสมาชิก (อนุมัติ/แก้ไข/กำหนดสิทธิ์)',
        'cars.manage'     => 'จัดการข้อมูลรถ',
        'bookings.manage' => 'จัดการคำขอจองรถ (อนุมัติ/ปฏิเสธ/มอบหมาย)',
        'bookings.create' => 'สร้างคำขอจองรถ',
        'driver.access'   => 'เข้าถึงหน้างานของคนขับ',
    ];

    /**
     * --------------------------------------------------------------------
     * Permissions Matrix
     * --------------------------------------------------------------------
     * Maps permissions to groups.
     *
     * This defines group-level permissions.
     */
    public array $matrix = [
        'admin' => [
            'admin.*',
            'members.manage',
            'cars.manage',
            'bookings.manage',
            'bookings.create',
        ],
        'user' => [
            'bookings.create',
        ],
        'driver' => [
            'driver.access',
        ],
    ];
}
