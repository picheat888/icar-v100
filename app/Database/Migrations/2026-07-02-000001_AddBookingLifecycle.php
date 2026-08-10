<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * เพิ่มวงจรสถานะการจอง: cancel_requested / cancelled / completed + เวลาคืนรถจริง
 */
class AddBookingLifecycle extends Migration
{
    public function up()
    {
        // ขยาย enum status (คงค่าเดิม + เพิ่มใหม่)
        $this->db->query("ALTER TABLE bookings MODIFY status ENUM('pending','approved','rejected','cancel_requested','cancelled','completed') NOT NULL DEFAULT 'pending'");

        // เวลาคืนรถจริง (กดปุ่มคืนรถ)
        if (! $this->db->fieldExists('returned_at', 'bookings')) {
            $this->forge->addColumn('bookings', [
                'returned_at' => ['type' => 'DATETIME', 'null' => true, 'after' => 'ext_driver_vehicle'],
            ]);
        }
    }

    public function down()
    {
        if ($this->db->fieldExists('returned_at', 'bookings')) {
            $this->forge->dropColumn('bookings', 'returned_at');
        }
        $this->db->query("ALTER TABLE bookings MODIFY status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'");
    }
}
