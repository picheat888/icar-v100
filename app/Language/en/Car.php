<?php

return [
    // Vehicle details
    'err_model_req'      => 'Please enter the vehicle model',
    'err_model_max'      => 'Use {0} characters or fewer',
    'err_plate_req'      => 'Please enter the licence plate',
    'err_plate_len'      => 'Plate must be 2-{0} characters',
    'err_plate_chars'    => 'Plate may contain only Thai/English letters, digits, spaces and hyphens (-)',
    'err_plate_dupe'     => 'Plate "{0}" is already used by "{1}"',
    'err_note_max'       => 'Note must be {0} characters or fewer',
    'err_seats_range'    => 'Seats must be between {0} and {1}',
    'err_driver_taken'   => 'This driver is already assigned to "{0}" (one driver per vehicle)',

    // Not found
    'err_not_found'      => 'Vehicle not found',
    'err_not_found_edit' => 'Vehicle not found - it may have been deleted',

    // Image upload
    'err_upload_type'    => 'Upload jpg, png or webp only, up to 2 MB · HEIC from iPhone is not supported - set Settings > Camera > Formats to "Most Compatible", or convert to jpg first',
    'err_upload_dir'     => 'The server cannot write to the upload folder - ask an administrator to check permissions on writable/uploads/cars',
    'err_upload_save'    => 'Could not save the image file - contact an administrator',

    // Delete
    'err_delete_active'  => 'Cannot delete - this vehicle has {0} booking(s) still open. Cancel or finish them first',

    // Success
    'saved'              => 'Vehicle saved',
    'added'              => 'Vehicle added',
    'deleted'            => 'Vehicle deleted',
];
