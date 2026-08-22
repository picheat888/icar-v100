<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * ตาราง notifications - แจ้งเตือนรายผู้ใช้ (2 สถานะ: seen=badge, read=ไฮไลต์)
 * เก็บ msg_key + params ไม่เก็บข้อความสำเร็จรูป - ประกอบข้อความตอนอ่านตามภาษาผู้อ่าน
 * ไฟล์นี้ถูกแก้ไขหลังถูก migrate ไปแล้วครั้งหนึ่ง - โครงสร้างจริงมาจากการรื้อฐานข้อมูลใหม่ทั้งหมด ไม่ใช่จากการรัน migrate ทับของเดิม
 */
class CreateNotifications extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'user_id'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'type'       => ['type' => 'VARCHAR', 'constraint' => 50],
            'msg_key'    => ['type' => 'VARCHAR', 'constraint' => 60],
            'params'     => ['type' => 'TEXT', 'null' => true],   // JSON
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
