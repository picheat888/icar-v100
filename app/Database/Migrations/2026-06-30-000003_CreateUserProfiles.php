<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * ตาราง user_profiles — ข้อมูลพนักงาน (1:1 กับ users) + สถานะอนุมัติสมาชิก
 */
class CreateUserProfiles extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'user_id'       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'emp_id'        => ['type' => 'VARCHAR', 'constraint' => 50],
            'full_name'     => ['type' => 'VARCHAR', 'constraint' => 150],
            'department_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'position_id'   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'phone'         => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => true],
            'status'        => ['type' => 'ENUM', 'constraint' => ['pending', 'approved', 'rejected'], 'default' => 'pending'],
            'created_at'    => ['type' => 'DATETIME', 'null' => true],
            'updated_at'    => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('user_id');   // 1:1 กับ users
        $this->forge->addUniqueKey('emp_id');
        $this->forge->addKey('status');

        // FK: ลบ user แล้วลบ profile ตาม / ลบ dept/position แล้ว set null
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('department_id', 'departments', 'id', 'SET NULL', 'SET NULL');
        $this->forge->addForeignKey('position_id', 'positions', 'id', 'SET NULL', 'SET NULL');

        $this->forge->createTable('user_profiles', true, ['ENGINE' => 'InnoDB']);
    }

    public function down()
    {
        $this->forge->dropTable('user_profiles', true);
    }
}
