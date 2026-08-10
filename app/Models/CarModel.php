<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Model ตาราง cars — รถขับเอง (self) + รถจัดหาโดย Admin (other)
 */
class CarModel extends Model
{
    protected $table          = 'cars';
    protected $primaryKey     = 'id';
    protected $returnType     = 'array';
    protected $useSoftDeletes = true;
    protected $useTimestamps  = true;
    protected $allowedFields  = [
        'car_type',
        'model',
        'plate',
        'seats',
        'status',
        'default_driver_id',
        'default_driver_name',
        'note',
        'image',
    ];

    // ดึงรถตามประเภท (self / other)
    public function byType(string $type): array
    {
        return $this->where('car_type', $type)->orderBy('id', 'DESC')->findAll();
    }
}
