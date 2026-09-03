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

    // Report footer
    'page_no'    => 'Page {PAGENO} of {nbpg}',
    'printed_on' => 'Report generated on {date}',

    // No data in the selected range
    'empty' => 'No data in the selected date range',
];
