import { useState, useEffect } from 'react';
import { getCsrf, setCsrf } from '../lib/csrf';
import { t } from '../lib/i18n';

const lockIcon = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
);
const eye = (open) => open
  ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9aa7b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
  : <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9aa7b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.5 0-10-8-10-8a18.4 18.4 0 0 1 5.06-5.94M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" /></svg>;

/**
 * Popup บังคับเปลี่ยนรหัสผ่าน - เด้งครอบทั้งแอปสำหรับ User ที่ถูกตั้ง force_reset
 * ปิด/กดนอก/Esc ไม่ได้ · 2 ช่อง (รหัสใหม่ + ยืนยัน) ไม่ถามรหัสเดิม
 * props: endpoint (URL บันทึกรหัสใหม่), logoutUrl
 */
export default function ForcePasswordResetModal({ endpoint, logoutUrl = '/logout' }) {
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // ล็อกไม่ให้ scroll พื้นหลัง + กัน Esc ระหว่างเปิด popup
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') e.stopPropagation(); };
    window.addEventListener('keydown', onKey, true);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey, true); };
  }, []);

  const submit = async () => {
    setError('');
    if (newPass.length < 8) { setError(t('pwreset.err_min_length')); return; }
    if (newPass !== confirm) { setError(t('pwreset.err_mismatch')); return; }
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'X-CSRF-TOKEN': getCsrf(), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams({ newPass, confirmPass: confirm }).toString(),
      });
      const d = await res.json().catch(() => ({}));
      // error ที่ไม่ใช่ JSON (500/CSRF หมดอายุ) → reload รับ token+state ใหม่
      if (!res.ok && !d.csrf) { window.location.reload(); return; }
      if (d.csrf) setCsrf(d.csrf);
      if (res.ok && d.ok) { window.location.reload(); return; }  // สำเร็จ → รีเฟรช flag หาย popup ไม่เด้งอีก
      setError(d.message || t('common.err'));
    } catch { setError(t('pwreset.err_network')); } finally { setBusy(false); }
  };

  return (
    <div className="fr-overlay">
      <div className="fr-modal">
        {/* ไอคอน */}
        <div className="icon-box fr-icon">{lockIcon}</div>
        <h2 className="title">{t('pwreset.title')}</h2>
        <p className="subtext fr-subtitle">{t('pwreset.subtitle_line1')}<br />{t('pwreset.subtitle_line2')}</p>

        {error && <div className="alert-error fr-err">{error}</div>}

        <div className="fr-fields">
          <label className="form-label">{t('pwreset.new_pass_label')}</label>
          <div className="field">
            <input type={show ? 'text' : 'password'} value={newPass} onChange={(e) => setNewPass(e.target.value)}
              placeholder={t('pwreset.pass_placeholder')} autoComplete="new-password"
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} className="form-input" />
            <button type="button" onClick={() => setShow((s) => !s)} className="field-eye fr-eye" tabIndex={-1}>{eye(show)}</button>
          </div>

          <label className="form-label">{t('pwreset.confirm_pass_label')}</label>
          <div className="field">
            <input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder={t('pwreset.confirm_pass_placeholder')} autoComplete="new-password"
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} className="form-input" />
          </div>
        </div>

        <button onClick={submit} disabled={busy} className="btn-primary btn-block fr-submit">
          {busy ? t('pwreset.saving_busy') : t('pwreset.submit_btn')}
        </button>

        {/* ทางออกเดียว: ออกจากระบบ */}
        <a href={logoutUrl} className="fr-logout-link">{t('pwreset.logout_link')}</a>
      </div>
    </div>
  );
}
