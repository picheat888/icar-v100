<?php

return [
    // Permission / not found
    'err_bad_role'        => 'Invalid role',
    'err_not_found'       => 'Member not found',
    'err_profile_missing' => 'Member profile not found',

    // Guards
    'err_last_admin_demote' => 'Cannot remove the role of the last remaining Admin',
    'err_last_admin_off'    => 'Cannot disable the last remaining Admin',
    'err_self_off'          => 'You cannot disable your own account',
    'err_self_role'         => 'You cannot change the role of your own account',
    'err_driver_jobs_off'   => 'This driver still has assigned jobs - finish or reassign them before disabling the account',
    'err_driver_jobs_role'  => 'This driver still has assigned jobs - finish or reassign them before changing the role',

    // Editing
    'err_name_req'  => 'Please enter the full name',
    'err_dept_bad'  => 'Invalid department',
    'err_pos_bad'   => 'Invalid position',

    // Success
    'added'    => 'Member added',
    'approved' => 'Member approved',
    'rejected' => 'Member rejected',
    'saved'    => 'Member details saved',
];
