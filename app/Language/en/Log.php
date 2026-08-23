<?php

return [
    // Column headers of the exported CSV file
    'csv_time'   => 'Time',
    'csv_user'   => 'User',
    'csv_role'   => 'Role',
    'csv_action' => 'Action',

    // Action type filter
    'type_auth'    => 'Sign in',
    'type_member'  => 'Members',
    'type_car'     => 'Cars',
    'type_master'  => 'Departments & positions',
    'type_booking' => 'Bookings',

    // {code} = booking code · {name} = person or item name · {role} = role name · {car} = model (plate)
    // Sign in / register
    'signed_in'  => 'Signed in',
    'registered' => 'Registered: {name}',

    // Members
    'member_added'    => 'Added member {name} (role: {role})',
    'member_approved' => 'Approved member {name} (role: {role})',
    'member_rejected' => 'Rejected/disabled member {name}',
    'member_updated'  => 'Updated member {name}',

    // Cars
    'car_added'   => 'Added car {car}',
    'car_updated' => 'Updated car {car}',
    'car_deleted' => 'Deleted car {car}',

    // Departments
    'dept_added'   => 'Added department {name}',
    'dept_renamed' => 'Renamed department {name} to {to}',
    'dept_deleted' => 'Deleted department {name}',

    // Positions
    'position_added'   => 'Added position {name}',
    'position_renamed' => 'Renamed position {name} to {to}',
    'position_deleted' => 'Deleted position {name}',

    // Bookings - by the requester
    'booking_submitted_self'   => 'Submitted booking request {code} (self-drive)',
    'booking_submitted_other'  => 'Submitted booking request {code} (admin-arranged vehicle)',
    'booking_updated'          => 'Updated request {code}',
    'booking_cancelled'        => 'Cancelled request {code}',
    'booking_cancel_requested' => 'Requested cancellation of request {code}',
    'booking_returned'         => 'Returned vehicle for {code}',

    // Bookings - by an admin
    'booking_approved'           => 'Approved request {code}',
    'booking_driver_assigned'    => 'Assigned driver to request {code}',
    'booking_rejected'           => 'Rejected request {code}',
    'booking_cancel_confirmed'   => 'Confirmed cancellation of request {code}',
    'booking_cancelled_by_admin' => 'Cancelled request {code} (by admin)',
    'booking_vehicle_changed'    => 'Changed vehicle/driver for request {code}',
];
