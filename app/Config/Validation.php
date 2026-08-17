<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;
use CodeIgniter\Shield\Authentication\Passwords\ValidationRules as PasswordRules;
use CodeIgniter\Validation\StrictRules\CreditCardRules;
use CodeIgniter\Validation\StrictRules\FileRules;
use CodeIgniter\Validation\StrictRules\FormatRules;
use CodeIgniter\Validation\StrictRules\Rules;

class Validation extends BaseConfig
{
    // --------------------------------------------------------------------
    // Setup
    // --------------------------------------------------------------------

    /**
     * Stores the classes that contain the
     * rules that are available.
     *
     * @var list<string>
     */
    public array $ruleSets = [
        Rules::class,
        FormatRules::class,
        FileRules::class,
        CreditCardRules::class,
        // กฎ strong_password[] ของ Shield (composition / dictionary / ไม่ใกล้เคียงข้อมูลส่วนตัว)
        PasswordRules::class,
    ];

    /**
     * Specifies the views that are used to display the
     * errors.
     *
     * @var array<string, string>
     */
    public array $templates = [
        'list'   => 'CodeIgniter\Validation\Views\list',
        'single' => 'CodeIgniter\Validation\Views\single',
    ];

    // --------------------------------------------------------------------
    // Rules
    // --------------------------------------------------------------------

    /**
     * กฎ validate หน้า login ของ Shield (อ่านผ่าน setting('Validation.login'))
     * ระบบล็อกอินด้วย username จึง validate ฟิลด์ username แทน email
     */
    public array $login = [
        'username' => [
            'label' => 'Auth.username',
            'rules' => 'required|max_length[30]',
        ],
        'password' => [
            'label' => 'Auth.password',
            'rules' => 'required',
        ],
    ];
}
