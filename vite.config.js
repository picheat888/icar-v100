import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// ตั้งค่า Vite: build ไฟล์ React + Tailwind ลง public/build พร้อม manifest ให้ CI4 อ่าน
// base: โหมด dev (serve) เสิร์ฟที่ root '/' ให้ตรงกับ vite_helper, โหมด build ใช้ '/build/'
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === 'serve' ? '/' : '/build/',
  // ปิด publicDir: ค่า default ของ Vite คือ 'public' ซึ่งเป็น web root ของ CI4
  // ถ้าไม่ปิด Vite จะก๊อป public/ ทั้งโฟลเดอร์ (index.php, .htaccess, uploads/) ลง outDir ทุกครั้งที่ build
  publicDir: false,
  build: {
    outDir: 'public/build',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        // ★ เพิ่มทีละบรรทัดเมื่อมี island ใหม่
        'app-css': 'resources/css/app.css',
        'dashboard': 'resources/js/entries/dashboard.jsx',
        'members-manager': 'resources/js/entries/members-manager.jsx',
        'master-data': 'resources/js/entries/master-data.jsx',
        'cars-manager': 'resources/js/entries/cars-manager.jsx',
        'booking-form': 'resources/js/entries/booking-form.jsx',
        'my-requests': 'resources/js/entries/my-requests.jsx',
        'requests-manager': 'resources/js/entries/requests-manager.jsx',
        'timeline': 'resources/js/entries/timeline.jsx',
        'notification-bell': 'resources/js/entries/notification-bell.jsx',
        'force-reset-modal': 'resources/js/entries/force-reset-modal.jsx',
        'activity-log': 'resources/js/entries/activity-log.jsx',
        'driver-jobs': 'resources/js/entries/driver-jobs.jsx',
      },
    },
  },
  server: {
    origin: 'http://localhost:5173',
    // อนุญาต CORS ให้หน้าเว็บที่เสิร์ฟจาก Apache (คนละ origin กับ Vite dev) โหลด asset ได้
    cors: {
      origin: [
        'http://icar.ink-connect.com',
        /^http:\/\/localhost(:\d+)?$/,
        /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      ],
    },
  },
}));
