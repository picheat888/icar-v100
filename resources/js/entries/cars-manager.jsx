import { createRoot } from 'react-dom/client';
import CarsManager from '../islands/CarsManager';

// mount island จัดการรถลง <div id="cars-manager">
const el = document.getElementById('cars-manager');
if (el) {
  createRoot(el).render(<CarsManager {...JSON.parse(el.dataset.props || '{}')} />);
}
