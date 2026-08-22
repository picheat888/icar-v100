<?php

return [
    // {code} = booking code · {name} = user name · {role} = role name
    'booking_new'        => 'New booking request from {name}',
    'booking_approved'   => 'Request {code} has been approved',
    'booking_rejected'   => 'Request {code} was rejected',
    'booking_cancelled'  => 'Request {code} was cancelled by an Admin',
    'booking_expired'    => 'Request {code} expired and was cancelled automatically',
    'booking_edited_admin' => 'An Admin changed the vehicle/driver of request {code}',
    'booking_edited_user'  => '{name} edited request {code}',
    'cancel_requested'   => '{name} requested to cancel request {code}',
    'cancel_confirmed'   => 'Cancellation of request {code} is confirmed',
    'car_returned'       => '{name} returned the vehicle ({code})',
    'driver_assigned'    => 'A driver has been assigned to request {code}',
    'job_new'            => 'You have been assigned a new job ({code})',
    'job_cancelled'      => 'Your assigned job ({code}) was cancelled',
    'member_new'         => 'New member registered: {name}',
    'member_approved'    => 'Your account has been approved (role: {role})',
    'member_rejected'    => 'Your account has been disabled - please contact an administrator',
];
