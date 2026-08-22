<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * คำขอที่รอ JSON (island/poller) และยังไม่ได้ล็อกอิน -> ตอบ 401 JSON
 * ต้องมาก่อน filter ของ Shield ที่จะ redirect 302 ไปหน้า login
 */
class AjaxAuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if (! $this->wantsJson($request) || auth()->loggedIn()) {
            return null;
        }

        return service('response')
            ->setStatusCode(401)
            ->setJSON(['ok' => false, 'message' => lang('Common.err_signed_out')]);
    }

    // island แนบ X-Requested-With + Accept: application/json มาทุกครั้ง
    private function wantsJson(RequestInterface $request): bool
    {
        return $request->isAJAX()
            || str_contains($request->getHeaderLine('Accept'), 'application/json');
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null): void
    {
    }
}
