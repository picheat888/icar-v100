import { createRoot } from 'react-dom/client';
import MasterData from '../islands/MasterData';

// mount island ข้อมูลหลักลง <div id="master-data">
const el = document.getElementById('master-data');
if (el) {
  createRoot(el).render(<MasterData {...JSON.parse(el.dataset.props || '{}')} />);
}
