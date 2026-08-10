<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Model ตาราง positions (ตำแหน่ง)
 */
class PositionModel extends Model
{
    protected $table         = 'positions';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields  = ['name'];
    protected $useTimestamps = true;

    protected $validationRules = [
        'name' => 'required|max_length[150]|is_unique[positions.name,id,{id}]',
    ];
}
