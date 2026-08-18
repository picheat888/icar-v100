import { createRoot } from 'react-dom/client';
import ForcePasswordResetModal from '../islands/ForcePasswordResetModal';

// mount popup บังคับเปลี่ยนรหัส (มี div เฉพาะ user ที่ถูกตั้ง force_reset)
const el = document.getElementById('force-reset-modal');
if (el) createRoot(el).render(<ForcePasswordResetModal {...JSON.parse(el.dataset.props || '{}')} />);
