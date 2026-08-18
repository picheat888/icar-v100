<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * index (user_id, read_at) ให้ query นับ badge - badge นับแถวที่ read_at IS NULL
 */
class AddNotificationsReadIndex extends Migration
{
    public function up()
    {
        $this->db->query('CREATE INDEX notifications_user_id_read_at ON notifications (user_id, read_at)');
    }

    public function down()
    {
        $this->db->query('DROP INDEX notifications_user_id_read_at ON notifications');
    }
}
