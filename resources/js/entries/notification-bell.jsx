import { createRoot } from 'react-dom/client';
import NotificationBell from '../islands/NotificationBell';

// mount กระดิ่งแจ้งเตือนใน header
const el = document.getElementById('notification-bell');
if (el) {
  createRoot(el).render(<NotificationBell {...JSON.parse(el.dataset.props || '{}')} />);
}
