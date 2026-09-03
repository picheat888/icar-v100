<?php

return [
    // Report header
    'cost_title'    => 'External Driver Cost Summary Report',
    // ว่างไว้เมื่ออ่านเป็นอังกฤษ - บรรทัดใต้หัวเรื่องมีไว้กำกับชื่ออังกฤษให้ฉบับภาษาไทย
    'cost_title_en' => '',
    'range_label'   => 'Date range',
    'range_all'     => 'All time',
    'scope_label'   => 'Include',
    'baht'          => 'THB',

    // Scope counted into the report - must match rpt.scope_* on the React side
    'scope_both'     => 'Approved + completed',
    'scope_approved' => 'Approved only (not finished)',
    'scope_done'     => 'Completed only',

    // Stat cards
    'kpi_total' => 'Total cost (THB)',
    'kpi_count' => 'Bookings',
    'kpi_avg'   => 'Average per booking',
    'kpi_max'   => 'Highest single cost',
    'kpi_days'  => 'Days with bookings',
    'unit_items' => 'entries',
    'unit_days'  => 'days',

    // Charts
    'chart_by_requester' => 'Cost by requester (THB)',
    'chart_by_driver'    => 'Cost by external driver (THB)',
    'chart_by_day'       => 'Daily cost (THB)',
    'chart_by_month'     => 'Monthly cost (THB)',
    'chart_by_month_recent' => 'Monthly cost - last {n} months (THB)',
    'center_total'       => 'Total',
    'chart_avg'          => 'Average',
    'others'             => 'Others',

    // Detail table
    'table_title'    => 'Booking details',
    'col_code'       => 'Booking code',
    'col_requester'  => 'Requester / Department',
    'col_ext_driver' => 'External driver',
    'col_vehicle'    => 'Vehicle used',
    'col_start'      => 'Start',
    'col_end'        => 'End',
    'col_paid'       => 'Actual paid (THB)',
    'foot_total'     => '{n} entries',

    // Observations box - {pct} share · {who} requester · {code} booking code · {amount} money · {n} day count · {date} date
    'notes_title' => 'Summary and observations',
    'note_share'  => 'Most of the spend ({pct}%) comes from bookings by {who}; entry {code} is the highest at {amount} THB',
    'note_days'   => 'Bookings span {n} working days, with {date} being the highest-spend day',
    'note_advice' => 'Review whether the service usage is appropriate and plan bookings ahead to keep costs under control',

    // ===== Usage summary report =====
    'usage_title' => 'Car Booking Usage Summary Report',
    // ว่างไว้เมื่ออ่านเป็นอังกฤษ - บรรทัดใต้หัวเรื่องมีไว้กำกับชื่ออังกฤษให้ฉบับภาษาไทย
    'usage_title_en' => '',
    'usage_scope'    => 'All requests in the selected range',
    'usage_count'    => 'Records',

    // Department bucket for requests whose requester has no department
    'unspecified' => 'Unspecified',

    // Stat cards
    'ukpi_total' => 'Total requests',

    // Status groups - rejected also covers cancelled, so the four groups add up to the total
    'ust_completed' => 'Completed',
    'ust_approved'  => 'Approved',
    'ust_pending'   => 'Awaiting approval',
    'ust_dropped'   => 'Rejected / cancelled',

    // Booking types
    'utype_self'  => 'Self-drive',
    'utype_other' => 'Other / rented',

    // Chart and table titles
    'uchart_status'       => 'Requests by status',
    'uchart_dept'         => 'Usage by department',
    'uchart_dept_top'     => 'Usage by department - top {n} (requests)',
    'uchart_type'         => 'Booking type share',
    'uchart_month'        => 'Monthly booking trend',
    'uchart_month_recent' => 'Monthly booking trend - last {n} months',
    'utbl_requesters'     => 'Top 10 requesters',
    'utbl_vehicles'       => 'Top 10 Most booked vehicles',

    // Top table columns
    'ucol_rank'    => 'Rank',
    'ucol_user'    => 'Requester',
    'ucol_dept'    => 'Department',
    'ucol_vehicle' => 'Vehicle used',
    'ucol_type'    => 'Type',
    'ucol_times'   => 'Bookings',

    // Observation boxes
    'uinsight_title' => 'Note',

    // Observations - {pct} share · {n} count · {who} department · {name} vehicle · {month} month
    'unote_done'         => 'Completion rate {pct}%',
    'unote_dropped'      => 'Requests rejected or cancelled {pct}%',
    'unote_pending'      => '{n} requests are still awaiting approval',
    'unote_dept_top'     => '{who} is the heaviest user at {pct}% of all bookings',
    'unote_dept_count'   => '{n} departments used the system in this period',
    'unote_req_top3'     => 'The top three requesters account for {pct}% of all bookings',
    'unote_req_advice'   => 'Plan vehicle usage ahead together with the most frequent requesters',
    'unote_veh_top'      => 'The most booked vehicle is {name} with {n} bookings',
    'unote_veh_advice'   => 'Schedule maintenance and condition checks for the most heavily used vehicles',
    'unote_type'         => 'Self-drive accounts for {self}% and other or rented vehicles for {other}% of all bookings',
    'unote_month_peak'   => '{month} had the highest volume at {n} requests',
    'unote_month_advice' => 'Align vehicle and staff allocation with the busiest booking periods',

    // Report footer
    'page_no'    => 'Page {PAGENO} of {nbpg}',
    'printed_on' => 'Report generated on {date}',

    // No data in the selected range
    'empty' => 'No data in the selected date range',
];
