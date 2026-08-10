import { createRoot } from 'react-dom/client';
import RequestsManager from '../islands/RequestsManager';

// mount island จัดการคำขอจองรถ
const el = document.getElementById('requests-manager');
if (el) {
  createRoot(el).render(<RequestsManager {...JSON.parse(el.dataset.props || '{}')} />);
}
