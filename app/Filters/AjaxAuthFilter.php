<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * คำขอที่รอ JSON (island/poller) และยังไม่ได้ล็อกอิน -> ตอบ 401 JSON
 * ต้องมาก่อน csrf และก่อน filter ของ Shield ที่จะ redirect 302 ไปหน้า login
 */
class AjaxAuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if (! $this->wantsJson($request)) {
            return null;
        }

        // ไม่มีทั้ง cookie เซสชันและ cookie จำฉันไว้ = ยังไม่ล็อกอินแน่นอน ตอบกลับโดยไม่แตะ session
        // (remember-me ล็อกอินได้โดยไม่มี ci_session จึงต้องเช็คด้วย ไม่งั้นจะตัดคนกลุ่มนั้นทิ้ง)
        $hasSession  = $request->getCookie(config('Session')->cookieName) !== null;
        $hasRemember = $request->getCookie(setting('Auth.sessionConfig')['rememberCookieName'] ?? 'remember') !== null;
        if (! $hasSession && ! $hasRemember) {
            return $this->deny();
        }

        return auth()->loggedIn() ? null : $this->deny();
    }

    // island แนบ X-Requested-With + Accept: application/json มาทุกครั้ง
    private function wantsJson(RequestInterface $request): bool
    {
        return $request->isAJAX()
            || str_contains($request->getHeaderLine('Accept'), 'application/json');
    }

    private function deny(): ResponseInterface
    {
        return service('response')
            ->setStatusCode(401)
            ->setJSON(['ok' => false, 'message' => lang('Common.err_signed_out')]);
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null): void
    {
    }
}
