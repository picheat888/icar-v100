import { createRoot } from 'react-dom/client';
import ForcePasswordResetModal from '../islands/ForcePasswordResetModal';

// mount popup บังคับเปลี่ยนรหัส (เรนเดอร์เฉพาะเมื่อ header.php ใส่ div นี้ = user ถูกตั้ง force_reset)
const el = document.getElementById('force-reset-modal');
if (el) createRoot(el).render(<ForcePasswordResetModal {...JSON.parse(el.dataset.props || '{}')} />);
