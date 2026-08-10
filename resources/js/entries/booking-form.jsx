import { createRoot } from 'react-dom/client';
import BookingForm from '../islands/BookingForm';

// mount island ฟอร์มจองรถ
const el = document.getElementById('booking-form');
if (el) {
  createRoot(el).render(<BookingForm {...JSON.parse(el.dataset.props || '{}')} />);
}
