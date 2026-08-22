<?php

return [
    // Profile page (profile/index.php + ProfileController::index)
    'title'                 => 'Profile',
    'subtitle'               => 'Account and employee details',
    'member_since'           => 'Member since',
    'section_personal'       => 'Personal Information',
    'section_personal_sub'   => 'Information shown in the system (managed by the admin)',
    'admin_managed_note'     => 'This information is set by the system administrator',

    // Account status (computed in the view - not currently rendered)
    'status_approved'        => 'Approved',
    'status_pending'         => 'Pending approval',
    'status_rejected'        => 'Rejected',

    // Change password form (shared by profile/index.php + profile/change_password.php + ProfileController::changePassword)
    'change_password_title'      => 'Change Password',
    'change_password_subtitle'   => 'Set a new password for your account',
    'change_password_sub_index'  => 'Enter your current password before setting a new one',
    'change_password_modal_sub'  => 'Enter your current password, then set a new one',
    'cur_password_label'         => 'Current Password',
    'cur_password_ph'            => 'Enter your current password',
    'new_password_label'         => 'New Password',
    'new_password_ph'            => 'At least 8 characters',
    'confirm_password_label'     => 'Confirm New Password',
    'confirm_password_ph_short'  => 'Enter it again',
    'confirm_password_ph_full'   => 'Re-enter the new password',
    'change_password_btn'        => 'Change Password',
    'save_new_password_btn'      => 'Save New Password',

    // Registration success page (auth/register_success.php)
    'reg_success_title'          => 'Registration Submitted',
    'reg_success_line1'          => 'Please wait for the admin to approve your account.',
    'reg_success_line2'          => 'You will be able to sign in once your account is approved.',
    'reg_success_status'         => 'Account status: Pending approval',
    'reg_success_back_login'     => 'Back to sign in',

    // Change-password messages
    'pw_min'          => 'The new password must be at least 8 characters long',
    'pw_max'          => 'The password is too long (72 characters maximum)',
    'pw_mismatch'     => 'The new password and its confirmation do not match',
    'pw_cur_wrong'    => 'The current password is incorrect',
    'pw_changed'      => 'Your password has been changed',
    'pw_changed_json' => 'Password changed',
    'pw_no_permit'    => 'You are not allowed to perform this action',
    // Field names substituted into {field} in validation rules
    'field_cur_pass'     => 'Current password',
    'field_new_pass'     => 'New password',
    'field_confirm_pass' => 'New password confirmation',
];
