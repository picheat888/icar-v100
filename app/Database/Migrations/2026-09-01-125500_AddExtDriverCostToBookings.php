<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddExtDriverCostToBookings extends Migration
{
    // เพิ่มค่าใช้จ่ายจริงของคนขับภายนอก (บาท) - Admin กรอกตอนอนุมัติ
    public function up()
    {
        $this->forge->addColumn('bookings', [
            'ext_driver_cost' => [
                // จำนวนเงินต้องเป็น DECIMAL ไม่ใช่ FLOAT (FLOAT ปัดเศษเพี้ยนตอนรวมยอด)
                'type'       => 'DECIMAL',
                'constraint' => '10,2',
                'unsigned'   => true,
                'null'       => true,   // รถขับเอง/คนขับบริษัท ไม่มีค่านี้
                'after'      => 'ext_driver_vehicle',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('bookings', 'ext_driver_cost');
    }
}
