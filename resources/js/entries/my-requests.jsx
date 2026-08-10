import { createRoot } from 'react-dom/client';
import MyRequests from '../islands/MyRequests';

// mount island คำขอของฉัน
const el = document.getElementById('my-requests');
if (el) {
  createRoot(el).render(<MyRequests {...JSON.parse(el.dataset.props || '{}')} />);
}
