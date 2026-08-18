<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Model ตาราง cars - รถขับเอง (self) + รถจัดหาโดย Admin (other)
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
        return self::withExistingImage($this->where('car_type', $type)->orderBy('id', 'DESC')->findAll());
    }

    // ล้างค่า image ของแถวที่ไฟล์ไม่มีอยู่จริง - กัน UI โชว์รูปแตก (ไฟล์อยู่ writable/uploads/cars)
    public static function withExistingImage(array $rows): array
    {
        foreach ($rows as &$r) {
            $name = basename((string) ($r['image'] ?? ''));
            if ($name === '' || ! is_file(WRITEPATH . 'uploads/cars/' . $name)) {
                $r['image'] = null;
            }
        }

        return $rows;
    }
}
