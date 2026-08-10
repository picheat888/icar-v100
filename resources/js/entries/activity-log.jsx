import { createRoot } from 'react-dom/client';
import ActivityLog from '../islands/ActivityLog';

// mount ประวัติการใช้งาน (ตาราง log + ฟิลเตอร์วันที่ + Export CSV)
const el = document.getElementById('activity-log');
if (el) createRoot(el).render(<ActivityLog {...JSON.parse(el.dataset.props || '{}')} />);
