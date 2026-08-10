import { createRoot } from 'react-dom/client';
import Dashboard from '../islands/Dashboard';

// mount dashboard (การ์ดสรุป + คำขอล่าสุด + สมาชิกรออนุมัติ)
const el = document.getElementById('dashboard');
if (el) createRoot(el).render(<Dashboard {...JSON.parse(el.dataset.props || '{}')} />);
