import { useState, useEffect } from 'react';
import { getCsrf, setCsrf } from '../lib/csrf';
import { t } from '../lib/i18n';

const TEAL = '#0c8b87';

// ไอคอนกุญแจ (วงกลม teal)
const lockIcon = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
);
// ไอคอนตา (เปิด/ปิด)
const eye = (open) => open
  ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9aa7b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
  : <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9aa7b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.5 0-10-8-10-8a18.4 18.4 0 0 1 5.06-5.94M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" /></svg>;

const label = { display: 'block', fontSize: 13, fontWeight: 600, color: '#54616c', marginBottom: 7 };

/**
 * Popup บังคับเปลี่ยนรหัสผ่าน — เด้งครอบทั้งแอปสำหรับ User ที่ถูกตั้ง force_reset
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

  const inpWrap = { position: 'relative', marginBottom: 16 };
  const inp = { width: '100%', padding: '12px 42px 12px 14px', border: '1px solid #d8dee3', borderRadius: 9, fontSize: 15, color: '#243039', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const eyeBtn = { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,25,.62)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 420, maxWidth: '100%', boxShadow: '0 24px 70px rgba(0,0,0,.3)', padding: '32px 32px 26px', textAlign: 'center' }}>
        {/* ไอคอน */}
        <div style={{ width: 60, height: 60, borderRadius: 16, background: `linear-gradient(145deg,${TEAL},#0a5f5c)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 8px 20px rgba(12,139,135,.32)' }}>{lockIcon}</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: '#1f2a33' }}>{t('pwreset.title')}</h2>
        <p style={{ fontSize: 14, color: '#7a8794', margin: '0 0 22px', lineHeight: 1.55 }}>{t('pwreset.subtitle_line1')}<br />{t('pwreset.subtitle_line2')}</p>

        {error && <div style={{ background: '#fbecea', color: '#c0392b', border: '1px solid #f3cfca', borderRadius: 8, padding: '10px 13px', fontSize: 13.5, marginBottom: 16, fontWeight: 500, textAlign: 'left' }}>{error}</div>}

        <div style={{ textAlign: 'left' }}>
          <label style={label}>{t('pwreset.new_pass_label')}</label>
          <div style={inpWrap}>
            <input type={show ? 'text' : 'password'} value={newPass} onChange={(e) => setNewPass(e.target.value)}
              placeholder={t('pwreset.pass_placeholder')} autoComplete="new-password"
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} style={inp} />
            <button type="button" onClick={() => setShow((s) => !s)} style={eyeBtn} tabIndex={-1}>{eye(show)}</button>
          </div>

          <label style={label}>{t('pwreset.confirm_pass_label')}</label>
          <div style={inpWrap}>
            <input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder={t('pwreset.confirm_pass_placeholder')} autoComplete="new-password"
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} style={inp} />
          </div>
        </div>

        <button onClick={submit} disabled={busy}
          style={{ width: '100%', marginTop: 8, background: TEAL, color: '#fff', border: 'none', borderRadius: 9, padding: 13, fontSize: 15.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(12,139,135,.28)' }}>
          {busy ? t('pwreset.saving_busy') : t('pwreset.submit_btn')}
        </button>

        {/* ทางออกเดียว: ออกจากระบบ */}
        <a href={logoutUrl} style={{ display: 'inline-block', marginTop: 16, fontSize: 13.5, color: '#9aa7b2', textDecoration: 'none' }}>{t('pwreset.logout_link')}</a>
      </div>
    </div>
  );
}
