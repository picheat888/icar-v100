import { createRoot } from 'react-dom/client';
import MembersManager from '../islands/MembersManager';

// mount island จัดการสมาชิกลง <div id="members-manager">
const el = document.getElementById('members-manager');
if (el) {
  createRoot(el).render(<MembersManager {...JSON.parse(el.dataset.props || '{}')} />);
}
