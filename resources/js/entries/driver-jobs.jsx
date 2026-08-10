import { createRoot } from 'react-dom/client';
import DriverJobs from '../islands/DriverJobs';

// mount island งานของฉัน (Driver)
const el = document.getElementById('driver-jobs');
if (el) {
  createRoot(el).render(<DriverJobs {...JSON.parse(el.dataset.props || '{}')} />);
}
