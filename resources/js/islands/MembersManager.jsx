import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getCsrf, setCsrf } from '../lib/csrf';
import { t } from '../lib/i18n';

// แผนที่ป้ายสถานะ -> [ข้อความ, สีพื้น, สีตัวอักษร]
const STATUS = {
  approved: [t('status.approved'), '#e7f4ee', '#16855a'],
  pending:  [t('status.pending'), '#eef1f4', '#5b6b7a'],
  rejected: [t('status.rejected'), '#fbecea', '#c0392b'],
};
const ROLES = [
  { v: 'user', label: t('mem.role_user') },
  { v: 'driver', label: t('mem.role_driver_full') },
  { v: 'admin', label: 'Admin' },
];
const roleLabel = (r) => ({ user: t('mem.role_user'), driver: t('mem.role_driver'), admin: 'Admin' }[r] || '-');

const inp = {
  padding: '10px 13px', border: '1px solid #d8dee3', borderRadius: 8,
  fontSize: 14, outline: 'none', background: '#fff', fontFamily: 'inherit',
};

/**
 * จัดการสมาชิก — ตาราง + ฟิลเตอร์ + โมดัล อนุมัติ/แก้ไข
 * props: endpoints {data, approve, reject, update}, departments[], positions[]
 */
export default function MembersManager({ endpoints, departments = [], positions = [], currentUserId = null }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [search, setSearch] = useState('');
  const [fStatus, setFStatus] = useState('all');
  const [fRole, setFRole] = useState('all');
  const [fDept, setFDept] = useState('all');
  const [modal, setModal] = useState(null);     // {type:'approve'|'reject'|'edit', member, ...}
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false); // กันดับเบิลคลิกยิงซ้ำ (sync ref, ไม่รอ state update)

  // โหลดรายชื่อสมาชิก
  const load = useCallback(() => {
    setLoading(true);
    setLoadErr(false);
    fetch(endpoints.data, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => setRows(d.members || []))
      .finally(() => setLoading(false))
      .catch(() => setLoadErr(true));
  }, [endpoints.data]);

  useEffect(() => { load(); }, [load]);

  // toast หายเองใน ~2.8 วิ
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2800); };

  // ยิง POST พร้อม CSRF header แล้วอัปเดต token จาก response
  const post = async (url, body) => {
    if (busyRef.current) return false; // กันดับเบิลคลิกยิงซ้ำ
    busyRef.current = true;
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CSRF-TOKEN': getCsrf(), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams(body).toString(),
      });
      const d = await res.json().catch(() => ({}));
      // error ที่ไม่ใช่ JSON (500/CSRF หมดอายุ) → token หลุด sync, reload รับ token+state ใหม่
      if (!res.ok && !d.csrf) { window.location.reload(); return false; }
      if (d.csrf) setCsrf(d.csrf);
      if (!res.ok || !d.ok) { showToast(d.message || t('common.err')); return false; }
      showToast(d.message || t('common.success'));
      load();
      return true;
    } finally { setBusy(false); busyRef.current = false; }
  };

  // กรองรายการตามฟิลเตอร์
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((m) => {
      if (fStatus !== 'all' && m.status !== fStatus) return false;
      if (fRole !== 'all' && m.role !== fRole) return false;
      if (fDept !== 'all' && String(m.department_id || '') !== String(fDept)) return false;
      if (q && ![m.full_name, m.emp_id, m.dept].some((x) => (x || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, search, fStatus, fRole, fDept]);

  // จำนวน admin ที่ใช้งานอยู่ (ไว้กันปิด admin คนสุดท้าย)
  const activeAdmins = useMemo(
    () => rows.filter((r) => r.role === 'admin' && r.status === 'approved').length,
    [rows],
  );
  // ปิดการใช้งานได้ไหม: ไม่ใช่ตัวเอง + ไม่ใช่ admin คนสุดท้าย
  const canDisable = (m) =>
    String(m.user_id) !== String(currentUserId) && !(m.role === 'admin' && activeAdmins <= 1);

  // ===== actions =====
  const doApprove = async () => {
    if (await post(endpoints.approve, { user_id: modal.member.user_id, level: modal.level })) setModal(null);
  };
  const doReject = async () => {
    if (await post(endpoints.reject, { user_id: modal.member.user_id })) setModal(null);
  };
  const doSaveEdit = async () => {
    const f = modal.form;
    if (await post(endpoints.update, {
      user_id: modal.member.user_id, name: f.name, dept: f.dept, position: f.position,
      phone: f.phone, level: f.level, newPass: f.newPass, forceReset: f.forceReset ? 1 : '',
    })) setModal(null);
  };

  // มือถือ/แท็บเล็ต (<=1024px) แสดงการ์ด · เดสก์ท็อปแสดงตาราง
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // ปุ่มจัดการของสมาชิกแต่ละคน (ใช้ร่วมทั้งตาราง + การ์ด)
  const actionsFor = (m) => {
    const list = [];
    // pending: ตัดสินใจ อนุมัติ/ปฏิเสธ (คนละเรื่องกับ toggle เปิด/ปิดใช้งาน)
    if (m.status === 'pending') {
      list.push({ key: 'ap', label: t('common.approve'), bg: '#16855a', color: '#fff', onClick: () => setModal({ type: 'approve', member: m, level: m.role || 'user' }) });
      list.push({ key: 're', label: t('common.reject'), bg: '#c0392b', color: '#fff', onClick: () => setModal({ type: 'reject', member: m }) });
    }
    return list;
  };

  // ปุ่มแก้ไข — ไอคอนดินสออย่างเดียว (tooltip "แก้ไข")
  const editBtn = (m) => (
    <button type="button" onClick={() => openEdit(m, setModal)} title={t('common.edit')} aria-label={t('common.edit')} style={editIconBtn}>{EDIT_ICON}</button>
  );

  // Toggle เปิด/ปิดใช้งาน — approved = เปิด(เขียว) · rejected = ปิด(เทา) · กดแล้วเปิดหน้ายืนยัน/เลือกสิทธิ์ (คงขั้นตอนเดิม)
  const activeToggle = (m) => {
    if (m.status !== 'approved' && m.status !== 'rejected') return null;
    const on = m.status === 'approved';
    const locked = on && !canDisable(m);   // approved ที่ปิดไม่ได้ (บัญชีตัวเอง / admin คนสุดท้าย)
    return (
      <Toggle on={on} disabled={locked} title={on ? t('mem.toggle_disable') : t('mem.toggle_enable')}
        onClick={() => (on ? setModal({ type: 'reject', member: m }) : setModal({ type: 'approve', member: m, level: m.role || 'user' }))} />
    );
  };

  return (
    <div>
      {loadErr && (
        <div style={{ padding: '10px 14px', marginBottom: 12, background: '#fbecea', color: '#9a3b34', borderRadius: 8, fontSize: 13 }}>
          {t('common.load_err')}
        </div>
      )}
      {/* ฟิลเตอร์ */}
      <div className="filter-card">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t('mem.search_placeholder')} style={{ ...inp, flex: 1, minWidth: 240 }} />
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={{ ...inp, cursor: 'pointer', color: '#37434d' }}>
          <option value="all">{t('mem.all_status')}</option>
          <option value="pending">{t('status.pending')}</option>
          <option value="approved">{t('status.approved')}</option>
          <option value="rejected">{t('status.rejected')}</option>
        </select>
        <select value={fRole} onChange={(e) => setFRole(e.target.value)} style={{ ...inp, cursor: 'pointer', color: '#37434d' }}>
          <option value="all">{t('mem.all_roles')}</option>
          <option value="user">{t('mem.role_user')}</option>
          <option value="driver">{t('mem.role_driver')}</option>
          <option value="admin">Admin</option>
        </select>
        <select value={fDept} onChange={(e) => setFDept(e.target.value)} style={{ ...inp, cursor: 'pointer', color: '#37434d' }}>
          <option value="all">{t('mem.all_depts')}</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {loading && <div style={{ color: '#9aa7b2', padding: 20 }}>{t('common.loading')}</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #e7ebee', borderRadius: 12, padding: 40, textAlign: 'center', color: '#9aa7b2' }}>{t('mem.not_found')}</div>
      )}

      {/* มือถือ/แท็บเล็ต: การ์ด */}
      {!loading && filtered.length > 0 && narrow && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtered.map((m) => {
            const [stLabel, stBg, stColor] = STATUS[m.status] || STATUS.pending;
            return (
              <div key={m.user_id} style={{ background: '#fff', border: '1px solid #e7ebee', borderRadius: 12, padding: '15px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2a33', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.full_name}</div>
                    <div style={{ fontSize: 12.5, color: '#9aa7b2', marginTop: 2 }}>{m.emp_id}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flex: 'none' }}>
                    <span style={badge(stBg, stColor)}>{stLabel}</span>
                    <span style={badge('#eef2f4', '#5b6b7a')}>{roleLabel(m.role)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '11px 0', borderTop: '1px solid #f4f6f7', borderBottom: '1px solid #f4f6f7', margin: '11px 0' }}>
                  {[[t('mem.dept_label'), m.dept || '-'], [t('mem.position_label'), m.position || '-'], [t('mem.phone_label'), m.phone || '-']].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
                      <span style={{ color: '#9aa7b2' }}>{k}</span><span style={{ color: '#37434d', fontWeight: 500, textAlign: 'right' }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                  {activeToggle(m)}
                  {actionsFor(m).map((a) => (
                    <button key={a.key} onClick={a.onClick} style={{ flex: 1, background: a.bg, color: a.color, border: 'none', borderRadius: 8, padding: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{a.label}</button>
                  ))}
                  <button type="button" onClick={() => openEdit(m, setModal)} title={t('common.edit')} aria-label={t('common.edit')} style={{ ...editIconBtn, width: 40, height: 40 }}>{EDIT_ICON}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* เดสก์ท็อป: ตาราง */}
      {!loading && filtered.length > 0 && !narrow && (
        <div style={{ background: '#fff', border: '1px solid #e3e8ec', borderRadius: 16, boxShadow: '0 1px 2px rgba(17,24,39,.05), 0 12px 26px -10px rgba(17,24,39,.16)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 840 }}>
              <thead><tr>
                {[t('mem.col_emp_id'), t('mem.col_full_name'), t('mem.dept_label'), t('mem.position_label'), t('mem.phone_label'), t('mem.col_status'), t('mem.col_role')].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
                <th style={th}>{t('mem.col_manage')}</th>
              </tr></thead>
              <tbody>
                {filtered.map((m) => {
                  const [stLabel, stBg, stColor] = STATUS[m.status] || STATUS.pending;
                  return (
                    <tr key={m.user_id}>
                      <td style={{ ...td, fontWeight: 600, color: '#37434d' }}>{m.emp_id}</td>
                      <td style={{ ...td, color: '#37434d' }}>{m.full_name}</td>
                      <td style={td}>{m.dept || '-'}</td>
                      <td style={td}>{m.position || '-'}</td>
                      <td style={td}>{m.phone || '-'}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <span style={badge(stBg, stColor)}>{stLabel}</span>
                      </td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <span style={badge('#eef2f4', '#5b6b7a')}>{roleLabel(m.role)}</span>
                      </td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                          {activeToggle(m)}
                          {actionsFor(m).map((a) => (
                            <button key={a.key} onClick={a.onClick} style={{ ...actBtn(a.bg, a.color), marginLeft: 0 }}>{a.label}</button>
                          ))}
                          {editBtn(m)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* โมดัล */}
      {modal?.type === 'approve' && (
        <Modal title={modal.member.status === 'rejected' ? t('mem.title_enable') : t('mem.title_approve')} onClose={() => setModal(null)}>
          <div style={{ background: '#f6f8f9', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2a33' }}>{modal.member.full_name}</div>
            <div style={{ fontSize: 13.5, color: '#6b7884', marginTop: 3 }}>{modal.member.emp_id} · {modal.member.dept || '-'} · {modal.member.position || '-'}</div>
          </div>
          <label style={lbl}>{t('mem.select_role_label')}</label>
          <select value={modal.level} onChange={(e) => setModal({ ...modal, level: e.target.value })} style={{ ...inp, width: '100%', cursor: 'pointer' }}>
            {ROLES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
          </select>
          <Foot onClose={() => setModal(null)} onOk={doApprove} okText={modal.member.status === 'rejected' ? t('mem.confirm_enable') : t('mem.confirm_approve')} okBg="#16855a" busy={busy} />
        </Modal>
      )}

      {modal?.type === 'reject' && (
        <Modal title={modal.member.status === 'approved' ? t('mem.title_disable') : t('mem.title_reject')} onClose={() => setModal(null)}>
          <p style={{ fontSize: 14.5, color: '#54616c', lineHeight: 1.6, margin: '4px 0 8px' }}>
            {modal.member.status === 'approved'
              ? <>{t('mem.confirm_disable_pre')}<b>{modal.member.full_name}</b>{t('mem.confirm_disable_post', { n: modal.member.emp_id })}<br />{t('mem.confirm_disable_note')}</>
              : <>{t('mem.confirm_reject_pre')}<b>{modal.member.full_name}</b>{t('mem.confirm_reject_post', { n: modal.member.emp_id })}</>}
          </p>
          <Foot onClose={() => setModal(null)} onOk={doReject} okText={modal.member.status === 'approved' ? t('mem.confirm_disable_btn') : t('mem.confirm_reject_btn')} okBg="#c0392b" busy={busy} />
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal title={t('mem.title_edit')} onClose={() => setModal(null)} lockBackdrop>
          <div style={{ display: 'flex', background: '#eef2f4', borderRadius: 9, padding: 4, gap: 4, marginBottom: 20 }}>
            <button onClick={() => setModal({ ...modal, tab: 'info' })} style={tabBtn(modal.tab === 'info')}>{t('mem.tab_info')}</button>
            <button onClick={() => setModal({ ...modal, tab: 'password' })} style={tabBtn(modal.tab === 'password')}>{t('mem.tab_password')}</button>
          </div>

          {modal.tab === 'info' ? (
            <Edit form={modal.form} set={(form) => setModal({ ...modal, form })} departments={departments} positions={positions} pending={modal.member.status === 'pending'} username={modal.member.username} />
          ) : (
            <EditPass form={modal.form} set={(form) => setModal({ ...modal, form })} />
          )}
          <Foot onClose={() => setModal(null)} onOk={doSaveEdit} okText={t('common.save')} okBg="#0c8b87" busy={busy} />
        </Modal>
      )}

      {/* toast */}
      {toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', background: '#1f2a33', color: '#fff', padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, boxShadow: '0 8px 30px rgba(0,0,0,.2)', zIndex: 200 }}>{toast}</div>
      )}
    </div>
  );
}

// เปิดโมดัลแก้ไข พร้อม prefill ฟอร์ม
function openEdit(m, setModal) {
  setModal({
    type: 'edit', member: m, tab: 'info',
    form: { name: m.full_name || '', dept: m.department_id || '', position: m.position_id || '', phone: m.phone || '', level: m.role || 'user', newPass: '', forceReset: !!m.force_reset },
  });
}

// ===== ฟอร์มแก้ไข (แท็บข้อมูล) =====
function Edit({ form, set, departments, positions, pending, username }) {
  const u = (k, v) => set({ ...form, [k]: v });
  return (
    <>
      {/* Username สำหรับเข้าสู่ระบบ — อ่านอย่างเดียว (ไว้ให้ admin บอกผู้ใช้กรณีลืม) */}
      <label style={lbl}>{t('mem.username_label')}</label>
      <input value={username || '-'} readOnly style={{ ...inp, width: '100%', marginBottom: 16, background: '#f4f6f7', color: '#6b7884', cursor: 'default' }} />
      <label style={lbl}>{t('mem.col_full_name')}</label>
      <input value={form.name} onChange={(e) => u('name', e.target.value)} style={{ ...inp, width: '100%', marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div>
          <label style={lbl}>{t('mem.dept_label')}</label>
          <select value={form.dept} onChange={(e) => u('dept', e.target.value)} style={{ ...inp, width: '100%', cursor: 'pointer' }}>
            <option value="">{t('mem.not_specified_option')}</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>{t('mem.position_label')}</label>
          <select value={form.position} onChange={(e) => u('position', e.target.value)} style={{ ...inp, width: '100%', cursor: 'pointer' }}>
            <option value="">{t('mem.not_specified_option')}</option>
            {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <label style={lbl}>{t('mem.phone_full_label')}</label>
      <input value={form.phone} onChange={(e) => u('phone', e.target.value)} style={{ ...inp, width: '100%', marginBottom: 16 }} />
      <label style={lbl}>{t('mem.role_level_label')}</label>
      <select value={form.level} onChange={(e) => u('level', e.target.value)} style={{ ...inp, width: '100%', cursor: 'pointer' }}>
        {ROLES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
      </select>
      {pending && <div style={{ marginTop: 9, fontSize: 12.5, color: '#9aa7b2' }}>{t('mem.pending_note')}</div>}
    </>
  );
}

// ===== ฟอร์มแก้ไข (แท็บรหัสผ่าน) =====
function EditPass({ form, set }) {
  const u = (k, v) => set({ ...form, [k]: v });
  return (
    <>
      <label style={lbl}>{t('mem.new_pass_label')}</label>
      <input type="password" value={form.newPass} onChange={(e) => u('newPass', e.target.value)} placeholder={t('mem.pass_placeholder')} style={{ ...inp, width: '100%', marginBottom: 16 }} />
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', background: '#f6f8f9', borderRadius: 9, padding: '13px 14px' }}>
        <input type="checkbox" checked={form.forceReset} onChange={(e) => u('forceReset', e.target.checked)} style={{ width: 17, height: 17, marginTop: 1, accentColor: '#0c8b87', cursor: 'pointer', flex: 'none' }} />
        <span style={{ fontSize: 13.5, color: '#37434d', lineHeight: 1.5 }}>{t('mem.force_reset_label')}<br /><span style={{ fontSize: 12, color: '#9aa7b2' }}>{t('mem.force_reset_hint')}</span></span>
      </label>
      <div style={{ marginTop: 14, fontSize: 12.5, color: '#9aa7b2' }}>{t('mem.pass_optional_note')}</div>
    </>
  );
}

// ===== โมดัลครอบ =====
function Modal({ title, onClose, children, lockBackdrop }) {
  return (
    // lockBackdrop = กดพื้นที่ว่างข้างนอกไม่ปิด (กันเผลอปิดจนข้อมูลหาย) — ปิดได้เฉพาะ X / ยกเลิก
    <div onClick={lockBackdrop ? undefined : onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(31,42,51,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 480, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ padding: '22px 26px', borderBottom: '1px solid #f0f3f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1f2a33' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aa7b2', padding: 4, display: 'flex' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div style={{ padding: '24px 26px' }}>{children}</div>
      </div>
    </div>
  );
}

// ปุ่มท้ายโมดัล
function Foot({ onClose, onOk, okText, okBg, busy }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 18, borderTop: '1px solid #f0f3f5' }}>
      <button onClick={onClose} style={{ background: '#f1f3f5', color: '#54616c', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('common.cancel')}</button>
      <button onClick={onOk} disabled={busy} style={{ background: okBg, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 26px', fontSize: 14.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: 'inherit' }}>{okText}</button>
    </div>
  );
}

// ===== styles =====
const th = { textAlign: 'center', padding: '12px 16px', fontSize: 12.5, fontWeight: 700, color: '#3d4852', background: '#fff', borderBottom: '2px solid #e7ebee', letterSpacing: 0.2, whiteSpace: 'nowrap' };
const td = { padding: '13px 16px', fontSize: 13.5, color: '#6b7884', borderBottom: '1px solid #f4f6f7', whiteSpace: 'nowrap', textAlign: 'center' };
const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#54616c', marginBottom: 6 };
const badge = (bg, c) => ({ background: bg, color: c, borderRadius: 999, padding: '3px 11px', fontSize: 12.5, fontWeight: 600 });
const actBtn = (bg, c) => ({ background: bg, color: c, border: 'none', borderRadius: 7, padding: '6px 13px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginLeft: 6, fontFamily: 'inherit' });

// ไอคอนดินสอ (ปุ่มแก้ไข)
const EDIT_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
// ปุ่มไอคอน (แก้ไข) — กล่องสี่เหลี่ยมพื้นเทาอ่อน มีขอบ
const editIconBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: '#f4f7f8', color: '#54616c', border: '1px solid #e3e9ec', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', flex: 'none' };

// Toggle switch เปิด/ปิดใช้งาน — เขียว=เปิด(เลื่อนขวา) · เทา=ปิด(เลื่อนซ้าย) · locked = โชว์แต่กดไม่ได้
function Toggle({ on, disabled, onClick, title }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      title={title}
      aria-label={title}
      aria-pressed={on}
      disabled={disabled}
      style={{
        position: 'relative',
        width: 42,
        height: 23,
        borderRadius: 999,
        border: 'none',
        padding: 0,
        flex: 'none',
        background: on ? '#16855a' : '#c5ced5',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background .18s',
        verticalAlign: 'middle',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2.5,
        left: on ? 21.5 : 2.5,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,.28)',
        transition: 'left .18s',
      }} />
    </button>
  );
}
const tabBtn = (active) => ({ flex: 1, padding: '9px', border: 'none', borderRadius: 7, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: active ? '#fff' : 'transparent', color: active ? '#0c8b87' : '#6b7884', boxShadow: active ? '0 1px 3px rgba(0,0,0,.08)' : 'none' });
