<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * ตาราง bookings - คำขอจองรถ ครอบคลุมทั้งวงจร ขอ → อนุมัติ/ปฏิเสธ → มอบหมายรถ+คนขับ → คืนรถ
 */
class CreateBookings extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'               => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'booking_code'     => ['type' => 'VARCHAR', 'constraint' => 20],
            'requester_id'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'booking_type'     => ['type' => 'ENUM', 'constraint' => ['self', 'other'], 'default' => 'self'],
            'location'         => ['type' => 'VARCHAR', 'constraint' => 255],
            'start_at'         => ['type' => 'DATETIME'],
            'end_at'           => ['type' => 'DATETIME'],
            'people'           => ['type' => 'SMALLINT', 'unsigned' => true, 'default' => 1],
            'purpose'          => ['type' => 'TEXT', 'null' => true],
            'map_link'         => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'car_id'           => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'status'           => ['type' => 'ENUM', 'constraint' => ['pending', 'approved', 'rejected', 'cancel_requested', 'cancelled', 'completed'], 'default' => 'pending'],
            'driver_type'      => ['type' => 'ENUM', 'constraint' => ['none', 'company', 'external'], 'default' => 'none'],
            'driver_id'        => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'ext_driver_name'  => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'ext_driver_phone' => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => true],
            'ext_driver_seats' => ['type' => 'SMALLINT', 'unsigned' => true, 'null' => true],
            'ext_driver_vehicle' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'returned_at'      => ['type' => 'DATETIME', 'null' => true],   // เวลาคืนรถจริง
            'admin_note'       => ['type' => 'TEXT', 'null' => true],
            'approved_by'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'approved_at'      => ['type' => 'DATETIME', 'null' => true],
            'created_at'       => ['type' => 'DATETIME', 'null' => true],
            'updated_at'       => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'       => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('booking_code');
        $this->forge->addKey('status');
        $this->forge->addKey('booking_type');
        $this->forge->addKey('start_at');
        $this->forge->addKey('end_at');

        // FK: ผู้ขอ / รถ / คนขับ(บริษัท) / ผู้อนุมัติ
        $this->forge->addForeignKey('requester_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('car_id', 'cars', 'id', 'SET NULL', 'SET NULL');
        $this->forge->addForeignKey('driver_id', 'users', 'id', 'SET NULL', 'SET NULL');
        $this->forge->addForeignKey('approved_by', 'users', 'id', 'SET NULL', 'SET NULL');

        $this->forge->createTable('bookings', true, ['ENGINE' => 'InnoDB']);
    }

    public function down()
    {
        $this->forge->dropTable('bookings', true);
    }
}
