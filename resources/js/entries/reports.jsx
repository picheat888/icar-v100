import { createRoot } from 'react-dom/client';
import Reports from '../islands/Reports';

// mount island โมดูลรายงาน
const el = document.getElementById('reports');
if (el) {
  createRoot(el).render(<Reports {...JSON.parse(el.dataset.props || '{}')} />);
}
