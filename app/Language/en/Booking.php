<?php

return [
    // Trip details
    'err_location_req' => 'Please enter the destination',
    'err_location_max' => 'The destination is too long (255 characters maximum)',
    'err_purpose_req'  => 'Please state the purpose of the trip',
    'err_map_scheme'   => 'The map link must start with http:// or https://',
    'err_map_max'      => 'The map link is too long (500 characters maximum)',

    // Date and time
    'err_time_req'   => 'Please select both the start and end date-time',
    'err_time_order' => 'The end time must be after the start time',
    'err_time_past'  => 'You cannot book a date-time in the past - please choose a future one',

    // Passengers · {0} = number of seats in the vehicle
    'err_people_int'  => 'The number of passengers must be a whole number',
    'err_people_min'  => 'There must be at least 1 passenger',
    'err_people_max'  => 'Too many passengers (999 maximum)',

    // Vehicle
    'err_car_unavail' => 'This vehicle is not available',

    // Request state
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
    'cancel_sent'   => 'Cancellation request sent - awaiting Admin confirmation',
    'returned'      => 'Vehicle returned - it is available for booking again',
];
