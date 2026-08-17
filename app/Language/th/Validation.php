<?php

// ข้อความ validate ภาษาไทย - เขียนทับของ CI4 เฉพาะกฎที่ระบบนี้ใช้จริง
// key ไหนไม่มีที่นี่ CI4 จะถอยไปใช้ภาษาอังกฤษให้เอง (Language::getLine ข้อ 4)
return [
    'required'      => 'กรุณากรอก{field}',
    'max_length'    => '{field}ต้องยาวไม่เกิน {param} ตัวอักษร',
    'min_length'    => '{field}ต้องยาวอย่างน้อย {param} ตัวอักษร',
    'exact_length'  => '{field}ต้องยาว {param} ตัวอักษรพอดี',
    'matches'       => '{field}ไม่ตรงกับ{param}',
    'differs'       => '{field}ต้องไม่ซ้ำกับ{param}',
    'regex_match'   => 'รูปแบบของ{field}ไม่ถูกต้อง',
    'alpha_numeric' => '{field}ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษและตัวเลข',
    'numeric'       => '{field}ต้องเป็นตัวเลขเท่านั้น',
    'integer'       => '{field}ต้องเป็นจำนวนเต็ม',
    'in_list'       => '{field}ต้องเป็นค่าใดค่าหนึ่งใน: {param}',
    'valid_email'   => '{field}ต้องเป็นอีเมลที่ถูกต้อง',
    'greater_than'  => '{field}ต้องมากกว่า {param}',
    'less_than'     => '{field}ต้องน้อยกว่า {param}',

    // ไฟล์อัปโหลด (รูปรถ)
    'uploaded' => '{field}ไม่ใช่ไฟล์ที่อัปโหลดถูกต้อง',
    'max_size' => '{field}มีขนาดใหญ่เกินกำหนด',
    'is_image' => '{field}ไม่ใช่ไฟล์รูปภาพที่ถูกต้อง',
];
