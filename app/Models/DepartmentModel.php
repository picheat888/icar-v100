<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Model ตาราง departments (แผนก)
 */
class DepartmentModel extends Model
{
    protected $table         = 'departments';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields  = ['name'];
    protected $useTimestamps = true;

    protected $validationRules = [
        'name' => 'required|max_length[150]|is_unique[departments.name,id,{id}]',
    ];
}
