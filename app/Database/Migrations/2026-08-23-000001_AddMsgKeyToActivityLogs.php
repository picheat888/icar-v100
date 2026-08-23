<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * activity_logs เก็บ msg_key + params เพิ่ม - ประกอบข้อความตอนอ่านตามภาษาผู้อ่าน
 * คอลัมน์ action ยังเขียนข้อความอังกฤษไว้เหมือนเดิม แถวเก่าจึงอ่านได้ต่อ
 * และไฟล์ CSV ที่ export ออกไปยังอ่านออกแม้คีย์ภาษาจะถูกเปลี่ยนภายหลัง
 */
class AddMsgKeyToActivityLogs extends Migration
{
    public function up()
    {
        $this->forge->addColumn('activity_logs', [
            'msg_key' => ['type' => 'VARCHAR', 'constraint' => 60, 'null' => true, 'after' => 'role'],
            'params'  => ['type' => 'TEXT', 'null' => true, 'after' => 'msg_key'],   // JSON
        ]);
        $this->db->query('CREATE INDEX activity_logs_msg_key ON activity_logs (msg_key)');
    }

    public function down()
    {
        $this->db->query('DROP INDEX activity_logs_msg_key ON activity_logs');
        $this->forge->dropColumn('activity_logs', ['msg_key', 'params']);
    }
}
