<?php

namespace App\Database\Seeds;

use App\Models\UserProfileModel;
use CodeIgniter\Database\Seeder;
use CodeIgniter\Shield\Entities\User;
use CodeIgniter\Shield\Models\UserModel;

/**
 * ข้อมูลทดลองย้อนหลัง 30 เดือน - ทั้งรถขับเอง คนขับบริษัท และคนขับภายนอกที่มีค่าใช้จ่าย
 * สร้างผู้ขอ/คนขับ/รถ ที่ยังไม่มีให้ก่อน แล้วจึงสร้างคำขอจอง
 * ล้างคำขอของบัญชี demo ทิ้งก่อนทุกครั้ง รันซ้ำกี่รอบก็ได้ผลเท่าเดิม
 * รัน: php spark db:seed DemoBookingsSeeder
 */
class DemoBookingsSeeder extends Seeder
{
    // ช่วงข้อมูล: 30 เดือน นับย้อนจากเดือนก่อนหน้าเดือนปัจจุบัน
    private const MONTHS = 30;

    // จำนวนคำขอต่อเดือน (สุ่มในช่วงนี้)
    private const PER_MONTH_MIN = 8;
    private const PER_MONTH_MAX = 14;

    // จำนวนงานคนขับภายนอกขั้นต่ำต่อเดือน - ทุกเดือนต้องมีค่าใช้จ่ายให้รายงานอ่าน
    private const EXT_MIN_PER_MONTH = 2;

    // ผู้ขอ: [username, emp_id, full_name, department_id, position_id]
    private const REQUESTERS = [
        ['demo.somsak',  'EMP-1001', 'สมศักดิ์ วงศ์ทอง',   1,  1],
        ['demo.malee',   'EMP-1002', 'มาลี ศรีสุข',        4,  1],
        ['demo.wichai',  'EMP-1003', 'วิชัย ตั้งมั่น',      5,  1],
        ['demo.pensri',  'EMP-1004', 'เพ็ญศรี ใจดี',       15, 1],
        ['demo.anucha',  'EMP-1005', 'อนุชา พูนผล',       16, 1],
        ['demo.suree',   'EMP-1006', 'สุรีย์ แสงเดือน',     9,  1],
        ['demo.thanong', 'EMP-1007', 'ทนง มีชัย',         17, 1],
        ['demo.kanda',   'EMP-1008', 'กานดา รุ่งเรือง',     6,  1],
    ];

    // คนขับของบริษัท: [username, emp_id, full_name]
    private const DRIVERS = [
        ['demo.somsri', 'DRV-1001', 'สมศรี ขับคล่อง'],
        ['demo.narong', 'DRV-1002', 'ณรงค์ ถนัดทาง'],
    ];

    // รถในระบบ: [car_type, model, plate, seats]
    private const CARS = [
        ['self',  'Toyota Vios',       '3คค 9012', 4],
        ['self',  'Honda City',        '4งง 3456', 4],
        ['other', 'Toyota Commuter',   '5จจ 7890', 15],
        ['other', 'Toyota Hiace',      '6ฉฉ 2345', 12],
        ['other', 'Nissan Urvan',      '7ชช 6789', 14],
    ];

    // คนขับภายนอก: [ชื่อ, เบอร์, ที่นั่ง, รถที่ใช้]
    private const EXT_DRIVERS = [
        ['ธนพล เช่ารถดี',     '0812345678', 10, 'Toyota Commuter (ฮก 1234)'],
        ['ประยุทธ์ ทัวร์',     '0823456789', 15, 'Hyundai H-1 (ฮข 5678)'],
        ['สุชาติ รถเช่าภาคกลาง', '0834567890', 7,  'Toyota Fortuner (ฮค 9012)'],
        ['วีระ ขนส่งด่วน',     '0845678901', 12, 'Toyota Hiace (ฮง 3456)'],
        ['บริษัท เอ็มทรานส์',   '0856789012', 20, 'Isuzu Bus (ฮจ 7890)'],
    ];

    // ปลายทางที่ใช้บ่อย: [สถานที่, จำนวนวันเดินทาง]
    private const TRIPS = [
        ['สำนักงานใหญ่ กรุงเทพฯ', 1],
        ['นิคมอุตสาหกรรมอมตะนคร ชลบุรี', 1],
        ['ศูนย์กระจายสินค้า ลำพูน', 2],
        ['โรงงานสาขาระยอง', 1],
        ['ท่าเรือแหลมฉบัง', 1],
        ['สนามบินสุวรรณภูมิ', 1],
        ['ศูนย์ประชุมไบเทค บางนา', 1],
        ['สาขาเชียงใหม่', 3],
        ['สาขาหาดใหญ่ สงขลา', 3],
        ['ตรวจโรงงานคู่ค้า นครปฐม', 1],
        ['อบรมนอกสถานที่ พัทยา', 2],
        ['ส่งเอกสารกรมสรรพากร', 1],
    ];

    // วัตถุประสงค์การเดินทาง
    private const PURPOSES = [
        'ประชุมกับลูกค้า',
        'ตรวจสอบคุณภาพวัตถุดิบ',
        'ส่งเอกสารและรับใบกำกับภาษี',
        'อบรมพนักงานประจำปี',
        'ตรวจรับสินค้าเข้าคลัง',
        'เข้าร่วมงานแสดงสินค้า',
        'ติดตามงานซ่อมบำรุงเครื่องจักร',
        'ตรวจความปลอดภัยพื้นที่ผลิต',
        'เจรจาต่อรองราคากับผู้ขาย',
        'ประสานงานขนส่งสินค้า',
    ];

    public function run()
    {
        // กันรันบน production - ข้อมูลทดลองห้ามหลุดขึ้นระบบจริง
        if (ENVIRONMENT === 'production') {
            echo "DemoBookingsSeeder ถูกข้าม: ห้ามสร้างข้อมูลทดลองบน production\n";

            return;
        }

        mt_srand(20260902);   // ผลลัพธ์เหมือนกันทุกครั้งที่รัน

        $removed    = $this->clearPrevious();
        $requesters = $this->ensureUsers(self::REQUESTERS, 'user');
        $drivers    = $this->ensureUsers(self::DRIVERS, 'driver');
        [$selfCars, $otherCars] = $this->ensureCars();
        $adminId    = $this->adminId();

        $rows = $this->buildBookings($requesters, $drivers, $selfCars, $otherCars, $adminId);

        $this->db->table('bookings')->insertBatch($rows);
        // รหัสคำขอผูกกับ id ตามระบบจริง (BK-xxxx) - เติมหลังรู้ id
        $this->db->query("UPDATE bookings SET booking_code = CONCAT('BK-', LPAD(id, 4, '0')) WHERE booking_code LIKE 'TMP-%'");

        $this->summary($rows, $removed);
    }

    // ล้างคำขอของบัญชี demo ที่สร้างไว้รอบก่อน - ข้อมูลของผู้ใช้จริงไม่ถูกแตะ
    private function clearPrevious(): int
    {
        $ids = array_column(
            $this->db->table('users')->select('id')->like('username', 'demo.', 'after')->get()->getResultArray(),
            'id'
        );

        if ($ids === []) {
            return 0;
        }

        $this->db->table('bookings')->whereIn('requester_id', $ids)->delete();

        return $this->db->affectedRows();
    }

    // สร้างบัญชีที่ยังไม่มี แล้วคืน id ทั้งชุด
    private function ensureUsers(array $list, string $group): array
    {
        $users    = new UserModel();
        $profiles = new UserProfileModel();
        $ids      = [];

        foreach ($list as $row) {
            [$username, $empId, $fullName] = $row;
            $user = $users->findByCredentials(['username' => $username]);

            if (! $user) {
                $users->save(new User([
                    'username' => $username,
                    'email'    => $username . '@icar.local',
                    'password' => '123',   // รหัสผ่านสำหรับ dev เท่านั้น
                ]));
                $user = $users->findById($users->getInsertID());
                $user->addGroup($group);
                $user->activate();
            }

            if (! $profiles->findByUserId($user->id)) {
                $profiles->insert([
                    'user_id'       => $user->id,
                    'emp_id'        => $empId,
                    'full_name'     => $fullName,
                    'department_id' => $row[3] ?? null,
                    'position_id'   => $row[4] ?? null,
                    'status'        => 'approved',
                ]);
            }

            $ids[] = (int) $user->id;
        }

        return $ids;
    }

    // สร้างรถที่ยังไม่มี แล้วคืน id แยกตามประเภท [รถขับเอง, รถอื่น ๆ]
    private function ensureCars(): array
    {
        $table = $this->db->table('cars');
        $now   = date('Y-m-d H:i:s');

        foreach (self::CARS as [$type, $model, $plate, $seats]) {
            $exists = $this->db->table('cars')->where('plate', $plate)->countAllResults();
            if ($exists === 0) {
                $table->insert([
                    'car_type'   => $type,
                    'model'      => $model,
                    'plate'      => $plate,
                    'seats'      => $seats,
                    'status'     => 'available',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        $pick = static fn (array $carRows) => array_map(static fn ($c) => (int) $c['id'], $carRows);

        return [
            $pick($this->db->table('cars')->select('id')->where('car_type', 'self')->where('deleted_at', null)->get()->getResultArray()),
            $pick($this->db->table('cars')->select('id')->where('car_type', 'other')->where('deleted_at', null)->get()->getResultArray()),
        ];
    }

    // id ของ admin คนแรก - ใช้เป็นผู้อนุมัติ
    private function adminId(): ?int
    {
        $row = $this->db->query(
            "SELECT u.id FROM users u JOIN auth_groups_users g ON g.user_id = u.id WHERE g.`group` = 'admin' ORDER BY u.id LIMIT 1"
        )->getRowArray();

        return $row ? (int) $row['id'] : null;
    }

    // ประกอบแถวคำขอจองทั้ง 30 เดือน
    private function buildBookings(array $requesters, array $drivers, array $selfCars, array $otherCars, ?int $adminId): array
    {
        $rows = [];
        $n    = 0;

        for ($back = self::MONTHS; $back >= 1; $back--) {
            $month     = strtotime("first day of -{$back} month");
            $daysInMon = (int) date('t', $month);
            $count     = mt_rand(self::PER_MONTH_MIN, self::PER_MONTH_MAX);
            $kinds     = $this->monthKinds($count);

            for ($i = 0; $i < $count; $i++) {
                [$location, $days] = self::TRIPS[mt_rand(0, count(self::TRIPS) - 1)];

                $day     = mt_rand(1, $daysInMon);
                $startHr = mt_rand(6, 10);
                $endHr   = $startHr + mt_rand(5, 9);
                $start   = date('Y-m-d', mktime(0, 0, 0, (int) date('n', $month), $day, (int) date('Y', $month)));
                $startAt = sprintf('%s %02d:%02d:00', $start, $startHr, mt_rand(0, 1) * 30);
                $endAt   = date('Y-m-d H:i:s', strtotime($startAt) + (($days - 1) * 86400) + (($endHr - $startHr) * 3600));

                $row = [
                    'booking_code' => 'TMP-' . (++$n),
                    'requester_id' => $requesters[mt_rand(0, count($requesters) - 1)],
                    'location'     => $location,
                    'start_at'     => $startAt,
                    'end_at'       => $endAt,
                    'purpose'      => self::PURPOSES[mt_rand(0, count(self::PURPOSES) - 1)],
                    'people'       => mt_rand(1, 9),
                    'status'       => $this->rollStatus(),
                    'created_at'   => date('Y-m-d H:i:s', strtotime($startAt) - mt_rand(2, 12) * 86400),
                    'updated_at'   => $endAt,
                ];

                $rows[] = array_merge(
                    $row,
                    $this->vehicleOf($kinds[$i], $days, $selfCars, $otherCars, $drivers),
                    $this->rollApproval($row, $adminId),
                );
            }
        }

        return $rows;
    }

    // สถานะของงานที่ผ่านมาแล้ว - ส่วนใหญ่เสร็จสิ้น เหลือปฏิเสธ/ยกเลิกบางส่วน
    private function rollStatus(): string
    {
        $roll = mt_rand(1, 100);

        if ($roll <= 85) {
            return 'completed';
        }

        return $roll <= 93 ? 'rejected' : 'cancelled';
    }

    // สุ่มชนิดรถของทั้งเดือน - รถขับเอง 55% คนขับบริษัท 18% คนขับภายนอก 27%
    private function monthKinds(int $count): array
    {
        $kinds = [];

        for ($i = 0; $i < $count; $i++) {
            $roll    = mt_rand(1, 100);
            $kinds[] = $roll <= 55 ? 'self' : ($roll <= 73 ? 'company' : 'external');
        }

        // เดือนไหนสุ่มไม่ติดคนขับภายนอก บังคับเติมให้ครบขั้นต่ำ
        $ext = count(array_keys($kinds, 'external', true));
        for ($i = 0; $ext < self::EXT_MIN_PER_MONTH; $i++) {
            if ($kinds[$i] !== 'external') {
                $kinds[$i] = 'external';
                $ext++;
            }
        }

        return $kinds;
    }

    // ข้อมูลรถและคนขับตามชนิดที่กำหนด - รถขับเอง / คนขับบริษัท / คนขับภายนอกพร้อมค่าใช้จ่าย
    private function vehicleOf(string $kind, int $days, array $selfCars, array $otherCars, array $drivers): array
    {
        $blank = [
            'car_id'             => null,
            'driver_id'          => null,
            'ext_driver_name'    => null,
            'ext_driver_phone'   => null,
            'ext_driver_seats'   => null,
            'ext_driver_vehicle' => null,
            'ext_driver_cost'    => null,
        ];
        // รถขับเอง
        if ($kind === 'self') {
            return array_merge($blank, [
                'booking_type' => 'self',
                'driver_type'  => 'none',
                'car_id'       => $selfCars[mt_rand(0, count($selfCars) - 1)],
            ]);
        }

        // รถอื่น ๆ + คนขับบริษัท
        if ($kind === 'company') {
            return array_merge($blank, [
                'booking_type' => 'other',
                'driver_type'  => 'company',
                'car_id'       => $otherCars[mt_rand(0, count($otherCars) - 1)],
                'driver_id'    => $drivers[mt_rand(0, count($drivers) - 1)],
            ]);
        }

        // รถอื่น ๆ + คนขับภายนอก (มีค่าใช้จ่ายจ่ายจริง)
        [$name, $phone, $seats, $vehicle] = self::EXT_DRIVERS[mt_rand(0, count(self::EXT_DRIVERS) - 1)];

        return array_merge($blank, [
            'booking_type'       => 'other',
            'driver_type'        => 'external',
            'ext_driver_name'    => $name,
            'ext_driver_phone'   => $phone,
            'ext_driver_seats'   => $seats,
            'ext_driver_vehicle' => $vehicle,
            'ext_driver_cost'    => $this->rollCost($days),
        ]);
    }

    // ค่าจ้างคนขับภายนอก - คิดตามจำนวนวัน บวกค่าน้ำมัน/ทางด่วนแบบเศษสตางค์
    private function rollCost(int $days): string
    {
        $perDay = mt_rand(1800, 4500);
        $extra  = mt_rand(0, 250000) / 100;

        return number_format($days * $perDay + $extra, 2, '.', '');
    }

    // ผู้อนุมัติและเวลาอนุมัติ - เฉพาะงานที่ไม่ถูกปฏิเสธ
    private function rollApproval(array $row, ?int $adminId): array
    {
        if ($row['status'] === 'rejected') {
            return ['approved_by' => null, 'approved_at' => null, 'returned_at' => null, 'admin_note' => null, 'map_link' => null];
        }

        $returned = $row['status'] === 'completed' && mt_rand(1, 100) <= 60
            ? date('Y-m-d H:i:s', strtotime($row['end_at']) + mt_rand(0, 90) * 60)
            : null;

        return [
            'approved_by' => $adminId,
            'approved_at' => date('Y-m-d H:i:s', strtotime($row['start_at']) - mt_rand(6, 72) * 3600),
            'returned_at' => $returned,
            'admin_note'  => null,
            'map_link'    => null,
        ];
    }

    // สรุปผลที่สร้างให้ดูบน CLI
    private function summary(array $rows, int $removed): void
    {
        $ext  = array_filter($rows, static fn ($r) => $r['driver_type'] === 'external');
        $cost = array_sum(array_map(static fn ($r) => (float) $r['ext_driver_cost'], $ext));

        if ($removed > 0) {
            printf("ล้างข้อมูลทดลองเดิม %d รายการ\n", $removed);
        }

        printf(
            "สร้างคำขอจอง %d รายการ (%d เดือน)\n  - รถขับเอง %d\n  - คนขับบริษัท %d\n  - คนขับภายนอก %d รวมค่าใช้จ่าย %s บาท\n",
            count($rows),
            self::MONTHS,
            count(array_filter($rows, static fn ($r) => $r['driver_type'] === 'none')),
            count(array_filter($rows, static fn ($r) => $r['driver_type'] === 'company')),
            count($ext),
            number_format($cost, 2)
        );
    }
}
