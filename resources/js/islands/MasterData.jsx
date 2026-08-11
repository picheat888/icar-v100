import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getCsrf, setCsrf } from '../lib/csrf';
import { t } from '../lib/i18n';
import { useToast } from '../lib/Toast';
import Table from '../lib/Table';
import Pager from '../lib/Pager';

const PAGE_SIZE = 10;

const editIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
const trashIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
);
const okIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const xIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);

/**
 * จัดการ แผนก หรือ ตำแหน่ง — ตาราง + ค้นหา/เพิ่ม/แก้ไข/ลบ/เรียง/แบ่งหน้า
 * props: endpoints {data, add, update, delete}, only ('dept' | 'position')
 */
export default function MasterData({ endpoints, only = 'dept' }) {
  const type  = only === 'position' ? 'position' : 'dept';
  const label = type === 'position' ? t('master.type_position') : t('master.type_dept');

  const [items, setItems] = useState([]);
  const [loadErr, setLoadErr] = useState(false);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const { showToast, ToastView } = useToast();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false); // กันดับเบิลคลิกยิงซ้ำ (sync ref, ไม่รอ state update)

  const load = useCallback(() => {
    setLoadErr(false);
    fetch(endpoints.data, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => setItems(type === 'position' ? (d.positions || []) : (d.departments || [])))
      .catch(() => setLoadErr(true));
  }, [endpoints.data, type]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, sortDir]);

  const post = async (url, body) => {
    if (busyRef.current) return false; // กันดับเบิลคลิกยิงซ้ำ
    busyRef.current = true;
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'X-CSRF-TOKEN': getCsrf(), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams(body).toString(),
      });
      const d = await res.json().catch(() => ({}));
      // error ที่ไม่ใช่ JSON (500/CSRF หมดอายุ) → token หลุด sync, reload รับ token+state ใหม่
      if (!res.ok && !d.csrf) { window.location.reload(); return false; }
      if (d.csrf) setCsrf(d.csrf);
      showToast(d.message || (d.ok ? t('common.success') : t('common.err')));
      if (d.ok) { load(); return true; }
      return false;
    } finally { setBusy(false); busyRef.current = false; }
  };

  const add = () => {
    const v = newValue.trim();
    if (!v || busy) return;
    post(endpoints.add, { type, name: v }).then((ok) => { if (ok) setNewValue(''); });
  };
  const del = (it) => { if (window.confirm(t('master.confirm_delete', { name: it.name }))) post(endpoints.delete, { type, id: it.id }); };
  const startEdit = (it) => { setEditingId(it.id); setEditValue(it.name); };
  const cancelEdit = () => { setEditingId(null); setEditValue(''); };
  const saveEdit = (it) => {
    const v = editValue.trim();
    if (!v || busy) return;
    post(endpoints.update, { type, id: it.id, name: v }).then((ok) => { if (ok) cancelEdit(); });
  };

  // ค้นหา -> เรียง -> แบ่งหน้า
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  }, [items, search]);
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => (sortDir === 'asc' ? 1 : -1) * a.name.localeCompare(b.name, 'th'));
    return arr;
  }, [filtered, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const curPage    = Math.min(page, totalPages);
  const start      = (curPage - 1) * PAGE_SIZE;
  const pageItems  = sorted.slice(start, start + PAGE_SIZE);

  return (
    <div>
      {loadErr && (
        <div className="alert-error alert-error--sm">
          {t('common.load_err')}
        </div>
      )}
      {/* toolbar: ค้นหา + เพิ่ม (การ์ดขาวลอยเด่น เข้าชุดกับกล่องตารางด้านล่าง) */}
      <div className="filter-card">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('master.search_placeholder', { label })}
          className="form-input form-input--sm md-input--search" />
        <div className="md-add-group">
          <input value={newValue} onChange={(e) => setNewValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder={t('master.add_placeholder', { label })} maxLength={150} className="form-input form-input--sm md-input--add" />
          <button onClick={add} disabled={busy}
            className={`btn-primary md-add-btn${busy ? ' is-busy' : ''}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>{t('master.add_btn')}
          </button>
        </div>
      </div>

      {/* ตาราง */}
      <Table footer={<Pager page={curPage} totalPages={totalPages} total={sorted.length} perPage={PAGE_SIZE} onPage={setPage} inCard />}>
        <thead><tr>
          <th className="md-th-no">{t('master.col_no')}</th>
          <th className="md-th-name" onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}>
            {t('master.col_name', { label })} <span className="md-sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>
          </th>
          <th className="md-th-manage ta-r">{t('master.col_manage')}</th>
        </tr></thead>
        <tbody>
          {pageItems.length === 0 && (
            <tr><td colSpan={3} className="tbl-empty">{search ? t('master.not_found_search') : t('master.empty')}</td></tr>
          )}
          {pageItems.map((it, i) => (
            <tr key={it.id} className="md-row">
              <td className="md-td-no">{start + i + 1}</td>
              <td className="md-td-name">
                {editingId === it.id ? (
                  <input value={editValue} autoFocus onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(it); if (e.key === 'Escape') cancelEdit(); }}
                    maxLength={150}
                    className="form-input form-input--sm md-edit-input" />
                ) : it.name}
              </td>
              <td className="md-td-manage ta-r">
                {editingId === it.id ? (
                  <div className="md-actions">
                    <button onClick={() => saveEdit(it)} disabled={busy} title={t('common.save')} className="icon-btn icon-btn--green">{okIcon}</button>
                    <button onClick={cancelEdit} title={t('common.cancel')} className="icon-btn icon-btn--gray">{xIcon}</button>
                  </div>
                ) : (
                  <div className="md-actions">
                    <button onClick={() => startEdit(it)} title={t('common.edit')} className="icon-btn">{editIcon}</button>
                    <button onClick={() => del(it)} title={t('common.delete')} className="icon-btn icon-btn--red">{trashIcon}</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <ToastView />
    </div>
  );
}
