<?php

/**
 * Vite helper — เชื่อม CodeIgniter 4 เข้ากับ Vite
 *
 * โหมด dev (vite.dev=true): ชี้ asset ไปที่ Vite dev server (มี HMR)
 * โหมด prod (vite.dev=false): อ่าน public/build/.vite/manifest.json แล้วชี้ไปไฟล์ที่ build แล้ว
 */

if (! function_exists('vite_dev_preamble')) {
    /**
     * คืน tag ตั้งต้นของโหมด dev (@vite/client + React Refresh preamble) — ปล่อยครั้งเดียวต่อหน้า
     *
     * preamble จำเป็นเพราะ HTML เรนเดอร์โดย CI4 ไม่ใช่ Vite ตัว Vite จึงฉีด runtime ของ
     * @vitejs/plugin-react ให้เองไม่ได้ ถ้าขาดไฟล์ .jsx ทุกไฟล์จะ throw ($RefreshSig$ is not defined)
     */
    function vite_dev_preamble(string $devServer): string
    {
        static $emitted = false;
        if ($emitted) {
            return '';
        }
        $emitted = true;

        return <<<HTML
            <script type="module">
                import RefreshRuntime from '{$devServer}/@react-refresh'
                RefreshRuntime.injectIntoGlobalHook(window)
                window.\$RefreshReg\$ = () => {}
                window.\$RefreshSig\$ = () => (type) => type
                window.__vite_plugin_react_preamble_installed__ = true
            </script>
            <script type="module" src="{$devServer}/@vite/client"></script>

            HTML;
    }
}

if (! function_exists('vite_asset')) {
    /**
     * คืน <script>/<link> tag ของ entry ที่ระบุ (path อิงจาก root ของโปรเจกต์)
     * เช่น vite_asset('resources/js/entries/booking-table.jsx')
     */
    function vite_asset(string $entry): string
    {
        $isDev     = env('vite.dev', false) === true || env('vite.dev') === 'true';
        $devServer = rtrim((string) env('vite.server', 'http://localhost:5173'), '/');

        // dev: โหลดตรงจาก Vite dev server พร้อม react refresh
        if ($isDev) {
            $tags = vite_dev_preamble($devServer);
            $tags .= '<script type="module" src="' . $devServer . '/' . ltrim($entry, '/') . '"></script>';

            return $tags;
        }

        // prod: อ่าน manifest หา path จริงของไฟล์ที่ build แล้ว
        $manifestPath = FCPATH . 'build/.vite/manifest.json';
        if (! is_file($manifestPath)) {
            return '<!-- vite manifest not found: run `npm run build` -->';
        }

        $manifest = json_decode((string) file_get_contents($manifestPath), true) ?? [];
        $key      = ltrim($entry, '/');
        if (! isset($manifest[$key])) {
            return '<!-- vite entry not found in manifest: ' . esc($key) . ' -->';
        }

        $tags  = '';
        $chunk = $manifest[$key];

        // โหลดไฟล์ CSS ที่ผูกกับ entry นี้
        foreach ($chunk['css'] ?? [] as $css) {
            $tags .= '<link rel="stylesheet" href="' . base_url('build/' . $css) . '">' . "\n";
        }

        // ไฟล์ JS หลักของ entry
        if (! empty($chunk['file'])) {
            $file = $chunk['file'];
            // ถ้าเป็นไฟล์ CSS ล้วน (เช่น app-css) ให้ทำเป็น link แทน
            if (str_ends_with($file, '.css')) {
                $tags .= '<link rel="stylesheet" href="' . base_url('build/' . $file) . '">' . "\n";
            } else {
                $tags .= '<script type="module" src="' . base_url('build/' . $file) . '"></script>' . "\n";
            }
        }

        return $tags;
    }
}

if (! function_exists('vite_css')) {
    /**
     * โหลด Tailwind CSS หลัก (entry 'resources/css/app.css')
     * เรียกใน <head> ของ layout
     */
    function vite_css(): string
    {
        return vite_asset('resources/css/app.css');
    }
}
