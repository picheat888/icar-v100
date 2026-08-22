<?php

return [
    // Trip details
    'err_location_req' => 'Please enter the destination',
    'err_purpose_req'  => 'Please state the purpose of the trip',
    'err_map_scheme'   => 'The map link must start with http:// or https://',
    'err_map_max'      => 'The map link is too long (500 characters maximum)',

    // Date and time
    'err_time_req'   => 'Please select both the start and end date-time',
    'err_time_order' => 'The end time must be after the start time',
    'err_time_past'  => 'You cannot book a date-time in the past - please choose a future one',

    // Passengers · {0} = number of seats in the vehicle
    'err_people_min'  => 'There must be at least 1 passenger',
    'err_people_max'  => 'Too many passengers (999 maximum)',
    'err_people_over' => 'More passengers than the vehicle has seats ({0} maximum)',

    // Vehicle
    'err_car_req'    => 'Please select a valid vehicle',
    'err_car_unavail' => 'This vehicle is not available',
    'err_car_clash'  => 'This vehicle is already booked for that time range',

    // Request state
    'err_not_found'    => 'Request not found',
    'err_edit_pending' => 'Only requests still awaiting approval can be edited',
    'err_edit_done'    => 'This request has already been processed and cannot be edited',
    'err_cancel_late'  => 'The trip has already started - it can no longer be cancelled',
    'err_cancel_no'    => 'This request cannot be cancelled',
    'err_return_no'    => 'This request cannot be returned',
    'err_return_early' => 'The trip has not started yet',
    'err_return_ended' => 'The trip has already ended',
    'err_save'         => 'Could not save the request - please try again',

    // Success
    'sent'          => 'Booking request sent - awaiting Admin approval',
    'saved'         => 'Changes saved',
    'cancelled'     => 'Request cancelled',
    'cancel_sent'   => 'Cancellation request sent - awaiting Admin confirmation',
    'returned'      => 'Vehicle returned - it is available for booking again',
];
