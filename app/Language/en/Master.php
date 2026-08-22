<?php

return [
    // Singular data-type names, substituted into {0} in the messages below
    'type_dept'     => 'department',
    'type_position' => 'position',

    // {0} = data type name · {1} = number of employees
    'err_name_req'  => 'Please enter the {0} name',
    'err_name_max'  => 'The {0} name is too long (150 characters maximum)',
    'err_dupe'      => 'This {0} already exists',
    'err_not_found' => 'Could not find that {0}',
    'err_in_use'    => 'Cannot delete - {1} employee(s) still belong to this {0}. Move them out first',
    'added'         => 'The {0} was added',
    'saved'         => 'The {0} was saved',
    'deleted'       => 'The {0} was deleted',
];
