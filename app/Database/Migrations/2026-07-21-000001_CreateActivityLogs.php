<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * ตาราง activity_logs - บันทึกกิจกรรมการใช้งานระบบ (audit log)
 * เก็บ snapshot ชื่อ/บทบาท ณ ตอนนั้น เพราะผู้ใช้อาจถูกแก้/ลบภายหลัง (log ต้องคงเดิม)
 */
class CreateActivityLogs extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'user_id'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'actor_name' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'role'       => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'action'     => ['type' => 'VARCHAR', 'constraint' => 255],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('created_at');   // ใช้ค้นตามช่วงวันที่
        $this->forge->addKey('user_id');
        // ลำดับพารามิเตอร์คือ onUpdate ก่อน onDelete
        // แก้ id ผู้ใช้ -> log ตามไปด้วย · ลบผู้ใช้ -> คง log ไว้ (user_id = NULL)
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'SET NULL');

        $this->forge->createTable('activity_logs', true, ['ENGINE' => 'InnoDB']);
    }

    public function down()
    {
        $this->forge->dropTable('activity_logs', true);
    }
}
