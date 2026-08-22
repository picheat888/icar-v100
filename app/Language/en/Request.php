<?php

return [
    // Not found / status blocks the action
    'err_already_handled'    => 'This request has already been handled',
    'err_assign_blocked'     => 'A driver cannot be assigned to this request',
    'err_assign_changed'     => 'A driver cannot be assigned - the status has changed',
    'err_not_cancel_req'     => 'This request has no pending cancellation',
    'err_cancel_blocked'     => 'This request can no longer be cancelled - it is already closed',
    'err_edit_blocked'       => 'This request can no longer be edited - it is already closed',
    'err_edit_changed'       => 'This request can no longer be edited - the status has changed',

    // Vehicle
    'err_car_missing'        => 'The vehicle for this request no longer exists, so it cannot be approved',
    'err_car_maint_approve'  => 'This vehicle is under maintenance, so it cannot be approved',
    'err_car_maint'          => 'This vehicle is under maintenance',
    'err_seats_approve'      => 'More passengers than the vehicle has seats ({0} maximum), so it cannot be approved',
    'err_seats_given'        => 'More passengers than the seats entered for this vehicle ({0} maximum)',

    // Driver
    'err_driver_req'         => 'Select a driver first - a company driver or an external one',
    'err_driver_busy'        => 'This driver already has a job during that time',
    'err_not_a_driver'       => 'The selected user is not a company driver',
    'err_ext_name_req'       => "Enter the external driver's name",
    'err_ext_phone_format'   => "The external driver's phone number must be exactly 10 digits",

    // Required reasons
    'err_reject_reason_req'  => 'Enter a reason for rejecting the request',
    'err_cancel_reason_req'  => 'Enter a reason for cancelling the booking',

    // Success
    'approved'               => 'Request approved',
    'driver_assigned'        => 'Driver assigned',
    'rejected'               => 'Request rejected',
    'cancel_confirmed'       => 'Cancellation confirmed',
    'saved'                  => 'Vehicle and driver saved',
];
