<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Psr\Log\LoggerInterface;

/**
 * BaseController provides a convenient place for loading components
 * and performing functions that are needed by all your controllers.
 *
 * Extend this class in any new controllers:
 * ```
 *     class Home extends BaseController
 * ```
 *
 * For security, be sure to declare any new methods as protected or private.
 */
abstract class BaseController extends Controller
{
    /**
     * Be sure to declare properties for any property fetch you initialized.
     * The creation of dynamic property is deprecated in PHP 8.2.
     */

    // protected $session;

    /**
     * helper ที่โหลดให้ทุก controller ใช้ได้ - vite (vite_asset), form, url
     *
     * @var list<string>
     */
    protected $helpers = ['vite', 'form', 'url', 'format', 'activity'];

    /**
     * @return void
     */
    public function initController(RequestInterface $request, ResponseInterface $response, LoggerInterface $logger)
    {
        // Load here all helpers you want to be available in your controllers that extend BaseController.
        // Caution: Do not put the this below the parent::initController() call below.
        // $this->helpers = ['form', 'url'];

        // Caution: Do not edit this line.
        parent::initController($request, $response, $logger);

        // Preload any models, libraries, etc, here.
        // $this->session = service('session');
    }

    /**
     * กันเปิด endpoint JSON ตรงจาก browser (ไม่ใช่ AJAX และไม่รับ JSON) -> เด้งกลับหน้าหลัก
     * ป้องกันโชว์ JSON ดิบ (เช่น redirect หลัง login ค้างมาที่ endpoint นี้ หรือเปิด URL ตรง)
     * ใช้ในเมธอด data JSON: if ($r = $this->blockDirectAccess()) return $r;
     * (island ทุกตัวส่ง Accept: application/json จึงไม่ถูกบล็อก แม้บางตัวไม่ส่ง X-Requested-With เช่น Timeline)
     */
    protected function blockDirectAccess()
    {
        if (! $this->request->isAJAX()
            && ! str_contains($this->request->getHeaderLine('Accept'), 'application/json')) {
            return redirect()->to('/');
        }

        return null;
    }
}
