import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getCsrf, setCsrf } from '../lib/csrf';
import { t } from '../lib/i18n';
import { useToast } from '../lib/Toast';
import { setNavBadge } from '../lib/navBadge';
import Table from '../lib/Table';
import Modal from '../lib/Modal';

// ป้ายสถานะสมาชิก (pending/approved/rejected) - คนละชุดกับสถานะการจอง
const STATUS_LABEL = {
  approved: t('status.approved'),
  pending: t('status.pending'),
  rejected: t('status.rejected'),
};
const STATUS_PILL = {
  approved: 'pill--green',
  pending: 'pill--gray',
  rejected: 'pill--red',
};
const ROLES = [
  { v: 'user', label: t('mem.role_user') },
  { v: 'driver', label: t('mem.role_driver_full') },
  { v: 'admin', label: 'Admin' },
];
const roleLabel = (r) => ({ user: t('mem.role_user'), driver: t('mem.role_driver'), admin: 'Admin' }[r] || '-');

/**
 * จัดการสมาชิก - ตาราง + ฟิลเตอร์ + โมดัล อนุมัติ/แก้ไข
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
  const { showToast, ToastView } = useToast();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false); // กันดับเบิลคลิกยิงซ้ำ (sync ref, ไม่รอ state update)

  // โหลดรายชื่อสมาชิก
  const load = useCallback(() => {
    setLoading(true);
    setLoadErr(false);
    fetch(endpoints.data, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => {
        const list = d.members || [];
        setRows(list);
        // sync badge "สมาชิกรออนุมัติ" บน sidebar (นับเหมือน admin_nav_badges())
        setNavBadge('members', list.filter((m) => m.status === 'pending').length);
      })
      .finally(() => setLoading(false))
      .catch(() => setLoadErr(true));
  }, [endpoints.data]);

  useEffect(() => { load(); }, [load]);

  // กลับมาที่แท็บนี้ -> ดึงข้อมูลใหม่ (ข้ามถ้ามีโมดัลเปิดอยู่)
  useEffect(() => {
    const onVisible = () => { if (!document.hidden && !modal) load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load, modal]);

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
      // คนอื่นเปลี่ยนข้อมูลสมาชิกคนนี้ไปแล้ว -> ปิดโมดัล ดึงข้อมูลใหม่ แล้วบอกด้วย toast
      if (d.conflict) {
        setModal(null);
        load();
        showToast(`${d.message} - ${t('common.conflict_refreshed')}`);
        return false;
      }
      if (!res.ok || !d.ok) { showToast(d.message || t('common.err')); return false; }
      showToast(d.message || t('common.success'));
      load();
      return true;
    } finally { setBusy(false); busyRef.current = false; }
  };

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

  // ปุ่มจัดการของสมาชิกแต่ละคน (ใช้ร่วมทั้งตาราง + การ์ด) - kind บอกสี (success=อนุมัติ, danger=ปฏิเสธ)
  const actionsFor = (m) => {
    const list = [];
    // pending: ตัดสินใจ อนุมัติ/ปฏิเสธ (คนละเรื่องกับ toggle เปิด/ปิดใช้งาน)
    if (m.status === 'pending') {
      list.push({ key: 'ap', label: t('common.approve'), kind: 'success', onClick: () => setModal({ type: 'approve', member: m, level: m.role || 'user' }) });
      list.push({ key: 're', label: t('common.reject'), kind: 'danger', onClick: () => setModal({ type: 'reject', member: m }) });
    }
    return list;
  };

  // ปุ่มแก้ไข - ไอคอนดินสออย่างเดียว (tooltip "แก้ไข") · large = ปุ่มใหญ่ขึ้นสำหรับการ์ดมือถือ
  const editBtn = (m, large) => (
    <button type="button" onClick={() => openEdit(m, setModal)} title={t('common.edit')} aria-label={t('common.edit')}
      className={large ? 'mm-edit-btn mm-edit-btn--lg' : 'mm-edit-btn'}>{EDIT_ICON}</button>
  );

  // Toggle เปิด/ปิดใช้งาน - approved = เปิด(เขียว) · rejected = ปิด(เทา) · กดแล้วเปิดหน้ายืนยัน
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
        <div className="alert-error mm-alert">
          {t('common.load_err')}
        </div>
      )}
      {/* ฟิลเตอร์ */}
      <div className="filter-card">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t('mem.search_placeholder')} className="form-input form-input--sm mm-input--search" />
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="form-input form-input--sm mm-filter-select">
          <option value="all">{t('mem.all_status')}</option>
          <option value="pending">{t('status.pending')}</option>
          <option value="approved">{t('status.approved')}</option>
          <option value="rejected">{t('status.rejected')}</option>
        </select>
        <select value={fRole} onChange={(e) => setFRole(e.target.value)} className="form-input form-input--sm mm-filter-select">
          <option value="all">{t('mem.all_roles')}</option>
          <option value="user">{t('mem.role_user')}</option>
          <option value="driver">{t('mem.role_driver')}</option>
          <option value="admin">Admin</option>
        </select>
        <select value={fDept} onChange={(e) => setFDept(e.target.value)} className="form-input form-input--sm mm-filter-select">
          <option value="all">{t('mem.all_depts')}</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {loading && <div className="mm-loading">{t('common.loading')}</div>}
      {!loading && filtered.length === 0 && (
        <div className="empty-card mm-empty">{t('mem.not_found')}</div>
      )}

      {/* มือถือ/แท็บเล็ต: การ์ด */}
      {!loading && filtered.length > 0 && narrow && (
        <div className="mm-cards-grid">
          {filtered.map((m) => {
            const stLabel = STATUS_LABEL[m.status] || STATUS_LABEL.pending;
            const stPill = STATUS_PILL[m.status] || STATUS_PILL.pending;
            return (
              <div key={m.user_id} className="mm-card">
                <div className="mm-card-head">
                  <div className="mm-card-name">
                    <div className="mm-card-fullname">{m.full_name}</div>
                    <div className="mm-card-empid">{m.emp_id}</div>
                  </div>
                  <div className="mm-card-badges">
                    <span className={`pill pill--sm ${stPill}`}>{stLabel}</span>
                    <span className="pill pill--sm pill--gray">{roleLabel(m.role)}</span>
                  </div>
                </div>
                <div className="mm-card-info">
                  {[[t('mem.dept_label'), m.dept || '-'], [t('mem.position_label'), m.position || '-'], [t('mem.phone_label'), m.phone || '-']].map(([k, v]) => (
                    <div key={k} className="mm-card-info-row">
                      <span className="mm-card-info-label">{k}</span><span className="mm-card-info-value">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mm-card-actions">
                  {activeToggle(m)}
                  {actionsFor(m).map((a) => (
                    <button key={a.key} onClick={a.onClick} className={`mm-mini-btn mm-mini-btn--${a.kind}`}>{a.label}</button>
                  ))}
                  {editBtn(m, true)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* เดสก์ท็อป: ตาราง */}
      {!loading && filtered.length > 0 && !narrow && (
        <div className="mm-table-wrap">
          <Table center>
            <thead><tr>
              {[t('mem.col_emp_id'), t('mem.col_full_name'), t('mem.dept_label'), t('mem.position_label'), t('mem.phone_label'), t('mem.col_status'), t('mem.col_role')].map((h) => (
                <th key={h}>{h}</th>
              ))}
              <th>{t('mem.col_active')}</th>
              <th>{t('mem.col_manage')}</th>
            </tr></thead>
            <tbody>
              {filtered.map((m) => {
                const stLabel = STATUS_LABEL[m.status] || STATUS_LABEL.pending;
                const stPill = STATUS_PILL[m.status] || STATUS_PILL.pending;
                return (
                  <tr key={m.user_id}>
                    <td className="mm-td-empid">{m.emp_id}</td>
                    <td>{m.full_name}</td>
                    <td>{m.dept || '-'}</td>
                    <td>{m.position || '-'}</td>
                    <td>{m.phone || '-'}</td>
                    <td>
                      <span className={`pill pill--sm ${stPill}`}>{stLabel}</span>
                    </td>
                    <td>
                      <span className="pill pill--sm pill--gray">{roleLabel(m.role)}</span>
                    </td>
                    <td>
                      {activeToggle(m) || '-'}
                    </td>
                    <td>
                      <div className="mm-td-actions">
                        {actionsFor(m).map((a) => (
                          <button key={a.key} onClick={a.onClick} className={`mm-act-btn mm-act-btn--${a.kind}`}>{a.label}</button>
                        ))}
                        {editBtn(m)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      {/* โมดัล */}
      {modal?.type === 'approve' && (
        <Modal title={modal.member.status === 'rejected' ? t('mem.title_enable') : t('mem.title_approve')} onClose={() => setModal(null)} bodyClass="mm-modal-body">
          <div className="mm-member-box">
            <div className="mm-member-box-name">{modal.member.full_name}</div>
            <div className="mm-member-box-sub">{modal.member.emp_id} · {modal.member.dept || '-'} · {modal.member.position || '-'}</div>
          </div>
          <label className="form-label">{t('mem.select_role_label')}</label>
          <select value={modal.level} onChange={(e) => setModal({ ...modal, level: e.target.value })} className="form-input form-input--sm mm-select">
            {ROLES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
          </select>
          <Foot onClose={() => setModal(null)} onOk={doApprove} okText={modal.member.status === 'rejected' ? t('mem.confirm_enable') : t('mem.confirm_approve')} okKind="success" busy={busy} />
        </Modal>
      )}

      {modal?.type === 'reject' && (
        <Modal title={modal.member.status === 'approved' ? t('mem.title_disable') : t('mem.title_reject')} onClose={() => setModal(null)} bodyClass="mm-modal-body">
          <p className="mm-reject-text">
            {modal.member.status === 'approved'
              ? <>{t('mem.confirm_disable_pre')}<b>{modal.member.full_name}</b>{t('mem.confirm_disable_post', { n: modal.member.emp_id })}<br />{t('mem.confirm_disable_note')}</>
              : <>{t('mem.confirm_reject_pre')}<b>{modal.member.full_name}</b>{t('mem.confirm_reject_post', { n: modal.member.emp_id })}</>}
          </p>
          <Foot onClose={() => setModal(null)} onOk={doReject} okText={modal.member.status === 'approved' ? t('mem.confirm_disable_btn') : t('mem.confirm_reject_btn')} okKind="danger" busy={busy} />
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal title={t('mem.title_edit')} onClose={() => setModal(null)} bodyClass="mm-modal-body" lockBackdrop>
          <div className="seg mm-tabs">
            <button onClick={() => setModal({ ...modal, tab: 'info' })} className={modal.tab === 'info' ? 'seg-btn seg-btn--active' : 'seg-btn'}>{t('mem.tab_info')}</button>
            <button onClick={() => setModal({ ...modal, tab: 'password' })} className={modal.tab === 'password' ? 'seg-btn seg-btn--active' : 'seg-btn'}>{t('mem.tab_password')}</button>
          </div>

          {modal.tab === 'info' ? (
            <Edit form={modal.form} set={(form) => setModal({ ...modal, form })} departments={departments} positions={positions} pending={modal.member.status === 'pending'} username={modal.member.username} />
          ) : (
            <EditPass form={modal.form} set={(form) => setModal({ ...modal, form })} />
          )}
          <Foot onClose={() => setModal(null)} onOk={doSaveEdit} okText={t('common.save')} okKind="teal" busy={busy} />
        </Modal>
      )}

      <ToastView />
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
      {/* Username สำหรับเข้าสู่ระบบ - อ่านอย่างเดียว (ไว้ให้ admin บอกผู้ใช้กรณีลืม) */}
      <label className="form-label">{t('mem.username_label')}</label>
      <input value={username || '-'} readOnly className="form-input form-input--sm mm-field-mb" />
      <label className="form-label">{t('mem.col_full_name')}</label>
      <input value={form.name} onChange={(e) => u('name', e.target.value)} className="form-input form-input--sm mm-field-mb" />
      <div className="mm-form-grid">
        <div>
          <label className="form-label">{t('mem.dept_label')}</label>
          <select value={form.dept} onChange={(e) => u('dept', e.target.value)} className="form-input form-input--sm mm-select">
            <option value="">{t('mem.not_specified_option')}</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">{t('mem.position_label')}</label>
          <select value={form.position} onChange={(e) => u('position', e.target.value)} className="form-input form-input--sm mm-select">
            <option value="">{t('mem.not_specified_option')}</option>
            {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <label className="form-label">{t('mem.phone_full_label')}</label>
      <input value={form.phone} onChange={(e) => u('phone', e.target.value)} className="form-input form-input--sm mm-field-mb" />
      <label className="form-label">{t('mem.role_level_label')}</label>
      <select value={form.level} onChange={(e) => u('level', e.target.value)} className="form-input form-input--sm mm-select">
        {ROLES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
      </select>
      {pending && <div className="mm-pending-note">{t('mem.pending_note')}</div>}
    </>
  );
}

// ===== ฟอร์มแก้ไข (แท็บรหัสผ่าน) =====
function EditPass({ form, set }) {
  const u = (k, v) => set({ ...form, [k]: v });
  return (
    <>
      <label className="form-label">{t('mem.new_pass_label')}</label>
      <input type="password" value={form.newPass} onChange={(e) => u('newPass', e.target.value)} placeholder={t('mem.pass_placeholder')} className="form-input form-input--sm mm-field-mb" />
      <label className="mm-checkbox-row">
        <input type="checkbox" checked={form.forceReset} onChange={(e) => u('forceReset', e.target.checked)} className="mm-checkbox" />
        <span className="mm-checkbox-label">{t('mem.force_reset_label')}<br /><span className="mm-checkbox-hint">{t('mem.force_reset_hint')}</span></span>
      </label>
      <div className="mm-pass-note">{t('mem.pass_optional_note')}</div>
    </>
  );
}

// ปุ่มท้ายโมดัล - okKind: success(อนุมัติ) / danger(ปฏิเสธ) / teal(บันทึก)
function Foot({ onClose, onOk, okText, okKind, busy }) {
  return (
    <div className="mm-modal-foot">
      <button onClick={onClose} className="mm-foot-btn mm-foot-btn--cancel">{t('common.cancel')}</button>
      <button onClick={onOk} disabled={busy} className={`mm-foot-btn mm-foot-btn--ok mm-foot-btn--${okKind}`}>{okText}</button>
    </div>
  );
}

const EDIT_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);

// Toggle switch เปิด/ปิดใช้งาน - เขียว=เปิด(เลื่อนขวา) · เทา=ปิด(เลื่อนซ้าย) · locked = โชว์แต่กดไม่ได้
function Toggle({ on, disabled, onClick, title }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      title={title}
      aria-label={title}
      aria-pressed={on}
      disabled={disabled}
      className={on ? 'mm-toggle is-on' : 'mm-toggle'}
    >
      <span className={on ? 'mm-toggle-knob is-on' : 'mm-toggle-knob'} />
    </button>
  );
}
