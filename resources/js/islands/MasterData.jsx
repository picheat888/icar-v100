import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getCsrf, setCsrf } from '../lib/csrf';
import { t } from '../lib/i18n';

const TEAL = '#0c8b87';
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

const th = { textAlign: 'left', padding: '12px 16px', fontSize: 12.5, fontWeight: 700, color: '#3d4852', background: '#fff', borderBottom: '2px solid #e7ebee', letterSpacing: 0.2, whiteSpace: 'nowrap' };
const td = { padding: '11px 16px', fontSize: 14, color: '#37434d', borderBottom: '1px solid #f4f6f7' };
const iconBtn = (bg, c) => ({ flex: 'none', width: 30, height: 30, border: 'none', borderRadius: 7, background: bg, color: c, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' });
const inp = { padding: '10px 13px', border: '1px solid #d8dee3', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', background: '#fff' };

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
  const [toast, setToast] = useState('');
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

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2800); };

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
        <div style={{ padding: '10px 14px', marginBottom: 12, background: '#fbecea', color: '#9a3b34', borderRadius: 8, fontSize: 13 }}>
          {t('common.load_err')}
        </div>
      )}
      {/* toolbar: ค้นหา + เพิ่ม (การ์ดขาวลอยเด่น เข้าชุดกับกล่องตารางด้านล่าง) */}
      <div className="filter-card">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('master.search_placeholder', { label })}
          style={{ ...inp, flex: '1 1 240px', minWidth: 0 }} />
        <div style={{ display: 'flex', gap: 9, flex: '1 1 260px', minWidth: 0 }}>
          <input value={newValue} onChange={(e) => setNewValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder={t('master.add_placeholder', { label })} maxLength={150} style={{ ...inp, flex: 1, minWidth: 0 }} />
          <button onClick={add} disabled={busy}
            style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, background: TEAL, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>{t('master.add_btn')}
          </button>
        </div>
      </div>

      {/* ตาราง */}
      <div style={{ background: '#fff', border: '1px solid #e3e8ec', borderRadius: 16, boxShadow: '0 1px 2px rgba(17,24,39,.05), 0 12px 26px -10px rgba(17,24,39,.16)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={{ ...th, width: 56, whiteSpace: 'nowrap' }}>{t('master.col_no')}</th>
              <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}>
                {t('master.col_name', { label })} <span style={{ color: '#0c8b87' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
              </th>
              <th style={{ ...th, textAlign: 'right', width: 96, whiteSpace: 'nowrap' }}>{t('master.col_manage')}</th>
            </tr></thead>
            <tbody>
              {pageItems.length === 0 && (
                <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: '#9aa7b2', padding: 26 }}>{search ? t('master.not_found_search') : t('master.empty')}</td></tr>
              )}
              {pageItems.map((it, i) => (
                <tr key={it.id} className="md-row">
                  <td style={{ ...td, color: '#9aa7b2' }}>{start + i + 1}</td>
                  <td style={{ ...td, wordBreak: 'break-word', fontWeight: 600, color: '#1f2a33' }}>
                    {editingId === it.id ? (
                      <input value={editValue} autoFocus onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(it); if (e.key === 'Escape') cancelEdit(); }}
                        maxLength={150}
                        style={{ ...inp, width: '100%', maxWidth: 320, padding: '7px 10px', border: '1px solid #0c8b87' }} />
                    ) : it.name}
                  </td>
                  <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {editingId === it.id ? (
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button onClick={() => saveEdit(it)} disabled={busy} title={t('common.save')} style={iconBtn('#e7f4ee', '#16855a')}>{okIcon}</button>
                        <button onClick={cancelEdit} title={t('common.cancel')} style={iconBtn('#f1f3f5', '#6b7884')}>{xIcon}</button>
                      </div>
                    ) : (
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button onClick={() => startEdit(it)} title={t('common.edit')} style={iconBtn('#eef2f4', '#37434d')}>{editIcon}</button>
                        <button onClick={() => del(it)} title={t('common.delete')} style={iconBtn('#fbecea', '#c0392b')}>{trashIcon}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* แบ่งหน้า */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderTop: '1px solid #f0f3f5', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: '#9aa7b2' }}>
            {sorted.length === 0 ? t('master.no_items') : t('master.showing_range', { start: start + 1, end: Math.min(start + PAGE_SIZE, sorted.length), total: sorted.length })}
          </span>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <PgBtn label="‹" disabled={curPage <= 1} onClick={() => setPage(curPage - 1)} />
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PgBtn key={p} label={String(p)} active={p === curPage} onClick={() => setPage(p)} />
            ))}
            <PgBtn label="›" disabled={curPage >= totalPages} onClick={() => setPage(curPage + 1)} />
          </div>
        </div>
      </div>

      {toast && <div style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', background: '#1f2a33', color: '#fff', padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, boxShadow: '0 8px 30px rgba(0,0,0,.2)', zIndex: 200 }}>{toast}</div>}
    </div>
  );
}

// ปุ่มหน้า pagination
function PgBtn({ label, active, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        minWidth: 32, height: 32, padding: '0 8px', border: '1px solid ' + (active ? '#0c8b87' : '#e3e9ec'),
        borderRadius: 7, fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
        background: active ? '#0c8b87' : '#fff', color: active ? '#fff' : (disabled ? '#c5ced5' : '#37434d'),
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}>{label}</button>
  );
}
