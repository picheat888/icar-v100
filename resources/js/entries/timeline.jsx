import { createRoot } from 'react-dom/client';
import Timeline from '../islands/timeline/Timeline';

// mount island ตารางการใช้รถ
const el = document.getElementById('timeline');
if (el) {
  createRoot(el).render(<Timeline {...JSON.parse(el.dataset.props || '{}')} />);
}
