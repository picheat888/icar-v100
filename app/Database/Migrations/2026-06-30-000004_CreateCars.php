<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * ตาราง cars — ข้อมูลรถทั้งระบบ รวมรถขับเอง (self) และรถจัดหาโดย Admin (other)
 */
class CreateCars extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                  => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'car_type'            => ['type' => 'ENUM', 'constraint' => ['self', 'other'], 'default' => 'self'],
            'model'               => ['type' => 'VARCHAR', 'constraint' => 150],
            'plate'               => ['type' => 'VARCHAR', 'constraint' => 30],
            'seats'               => ['type' => 'SMALLINT', 'unsigned' => true, 'default' => 0],
            'status'              => ['type' => 'ENUM', 'constraint' => ['available', 'maintenance'], 'default' => 'available'],
            'default_driver_id'   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'default_driver_name' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'note'                => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'image'               => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_at'          => ['type' => 'DATETIME', 'null' => true],
            'updated_at'          => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'          => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('car_type');
        $this->forge->addKey('plate');
        $this->forge->addKey('status');

        // คนขับประจำ (รถอื่น ๆ) → users.id; ลบ user แล้ว set null
        $this->forge->addForeignKey('default_driver_id', 'users', 'id', 'SET NULL', 'SET NULL');

        $this->forge->createTable('cars', true, ['ENGINE' => 'InnoDB']);
    }

    public function down()
    {
        $this->forge->dropTable('cars', true);
    }
}
