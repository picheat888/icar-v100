import { useState, useEffect, useCallback, useRef } from 'react';
import { getCsrf, setCsrf } from '../lib/csrf';
import { t } from '../lib/i18n';

const TEAL = '#0c8b87';
// เก็บ key ข้อความสถานะไว้ ใช้ t() แปลตอน render (ไม่แปลตอน module โหลด)
const CAR_STATUS = {
  available:   ['car.status_available', '#e7f4ee', '#16855a'],
  maintenance: ['car.status_maintenance', '#fde7d6', '#b5701a'],
};
const seg = (active) => ({
  flex: 1, padding: '9px', border: 'none', borderRadius: 7, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  background: active ? '#fff' : 'transparent', color: active ? TEAL : '#6b7884', boxShadow: active ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
});
const inp = { width: '100%', padding: '11px 13px', border: '1px solid #d8dee3', borderRadius: 8, fontSize: 14.5, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#54616c', marginBottom: 6 };
const badge = (bg, c) => ({ background: bg, color: c, borderRadius: 999, padding: '3px 11px', fontSize: 12.5, fontWeight: 600 });

const emptyForm = (type) => ({ id: 0, car_type: type, model: '', plate: '', seats: '', status: 'available', driver_id: '', note: '', image: '', imageFile: null });

/**
 * จัดการรถ — แท็บ รถบริษัท(self, การ์ด) / รถจัดหา(other, ตาราง) + เพิ่ม/แก้ไข/ลบ + อัปโหลดรูป
 * props: endpoints {data, save, delete}, baseUrl
 */
export default function CarsManager({ endpoints, baseUrl = '' }) {
  const [self, setSelf] = useState([]);
  const [other, setOther] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [tab, setTab] = useState('self');
  const [loadErr, setLoadErr] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false); // กันดับเบิลคลิกยิงซ้ำ (sync ref, ไม่รอ state update)

  const load = useCallback(() => {
    setLoadErr(false);
    fetch(endpoints.data, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => { setSelf(d.self || []); setOther(d.other || []); setDrivers(d.drivers || []); })
      .catch(() => setLoadErr(true));
  }, [endpoints.data]);

  useEffect(() => { load(); }, [load]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2800); };

  // ส่งฟอร์ม (multipart — รองรับไฟล์รูป)
  const postForm = async (url, fd) => {
    if (busyRef.current) return false; // กันดับเบิลคลิกยิงซ้ำ
    busyRef.current = true;
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'X-CSRF-TOKEN': getCsrf(), 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
        body: fd,
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

  const save = async () => {
    const f = modal.form;
    // คนขับประจำ 1:1 — กันเลือกคนขับที่ผูกกับรถคันอื่นอยู่แล้ว (ยกเว้นคันที่กำลังแก้)
    if (f.car_type === 'other' && f.driver_id) {
      const clash = other.find((c) => String(c.default_driver_id) === String(f.driver_id) && String(c.id) !== String(f.id));
      if (clash) return showToast(`${t('car.driver_taken_pre')}${clash.model}${clash.plate ? ` (${clash.plate})` : ''}${t('car.driver_taken_post')}`);
    }
    const fd = new FormData();
    fd.append('id', f.id || '');
    fd.append('car_type', f.car_type);
    fd.append('model', f.model);
    fd.append('plate', f.plate);
    fd.append('seats', f.seats || 0);
    fd.append('status', f.status);
    if (f.car_type === 'other') { fd.append('driver_id', f.driver_id || ''); fd.append('note', f.note || ''); }
    if (f.imageFile) fd.append('image', f.imageFile);
    if (await postForm(endpoints.save, fd)) setModal(null);
  };

  const del = (car) => {
    if (!window.confirm(`${t('car.confirm_delete_pre')}${car.model}${car.plate ? ` (${car.plate})` : ''}${t('car.confirm_delete_post')}`)) return;
    const fd = new FormData();
    fd.append('id', car.id);
    postForm(endpoints.delete, fd);
  };

  const openAdd = () => setModal({ isEdit: false, form: emptyForm(tab) });
  const openEdit = (car) => setModal({
    isEdit: true,
    form: { id: car.id, car_type: car.car_type, model: car.model || '', plate: car.plate || '', seats: car.seats || '', status: car.status || 'available', driver_id: car.default_driver_id || '', note: car.note || '', image: car.image || '', imageFile: null },
  });
  const setForm = (patch) => setModal((m) => ({ ...m, form: { ...m.form, ...patch } }));

  const list = tab === 'self' ? self : other;   // รายการที่จะแสดงตามแท็บ

  return (
    <div>
      {loadErr && (
        <div style={{ padding: '10px 14px', marginBottom: 12, background: '#fbecea', color: '#9a3b34', borderRadius: 8, fontSize: 13 }}>
          {t('common.load_err')}
        </div>
      )}
      {/* แท็บ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: '#eef2f4', borderRadius: 9, padding: 4, gap: 4, maxWidth: 420, flex: 1, minWidth: 260 }}>
          <button onClick={() => setTab('self')} style={seg(tab === 'self')}>{t('car.tab_self')}</button>
          <button onClick={() => setTab('other')} style={seg(tab === 'other')}>{t('car.tab_other')}</button>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={openAdd} style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            + {tab === 'self' ? t('car.add_self') : t('car.add_other')}
          </button>
        </div>
      </div>

      {/* การ์ด — ใช้ layout เดียวกันทั้งรถขับเอง (self) และรถอื่นๆ (other) */}
      <div className="car-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {list.length === 0 && <Empty text={tab === 'self' ? t('car.empty_self') : t('car.empty_other')} />}
        {list.map((c) => {
          const [sl, sb, sc] = CAR_STATUS[c.status] || CAR_STATUS.available;
          return (
            <div key={c.id} className="car-card">
              <div className="car-card-img" style={{ height: 140, flexShrink: 0, background: '#f3f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.image
                  ? <img src={baseUrl + c.image} alt={c.model} className="car-photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <CarIcon />}
              </div>
              <div className="car-card-body" style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontSize: 16.5, fontWeight: 700, color: '#1f2a33', lineHeight: 1.25 }}>{c.model}</div>
                  <span style={{ ...badge(sb, sc), flex: 'none' }}>{t(sl)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: '#37434d' }}>{c.plate || '-'}</span>
                  <span style={{ background: '#eef2f4', color: '#54616c', borderRadius: 6, padding: '2px 9px', fontSize: 12, fontWeight: 600 }}>{t('car.seats_count', { n: c.seats })}</span>
                </div>
                {c.car_type === 'other' && (
                  <div style={{ fontSize: 12.5, color: '#6b7884', marginTop: 6, lineHeight: 1.5 }}>
                    <div>{t('car.driver_label')}{c.default_driver_name || '-'}</div>
                    {c.note && <div style={{ color: '#9aa7b2' }}>{c.note}</div>}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 14 }}>
                  <button onClick={() => openEdit(c)} style={miniBtn('#f4f7f8', '#37434d', true)}>{t('common.edit')}</button>
                  <button onClick={() => del(c)} style={miniBtn('#fbecea', '#c0392b', false)}>{t('common.delete')}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* โมดัล เพิ่ม/แก้ไข */}
      {modal && (
        <Modal title={modal.isEdit ? (modal.form.car_type === 'other' ? t('car.title_edit_other') : t('car.title_edit_self')) : (modal.form.car_type === 'other' ? t('car.add_other') : t('car.add_self'))} onClose={() => setModal(null)}>
          <label style={lbl}>{t('car.model_label')} <span style={{ color: '#c0392b' }}>*</span></label>
          <input value={modal.form.model} onChange={(e) => setForm({ model: e.target.value })} placeholder={t('car.model_placeholder')} style={{ ...inp, marginBottom: 14 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div><label style={lbl}>{t('car.plate_label')}{modal.form.car_type === 'self' && <span style={{ color: '#c0392b' }}> *</span>}</label><input value={modal.form.plate} onChange={(e) => setForm({ plate: e.target.value })} placeholder={modal.form.car_type === 'other' ? t('car.optional_placeholder') : t('car.plate_example_placeholder')} style={inp} /></div>
            <div><label style={lbl}>{t('car.seats_label')}</label><input type="number" min="0" value={modal.form.seats} onChange={(e) => setForm({ seats: e.target.value })} placeholder="0" style={inp} /></div>
          </div>
          <label style={lbl}>{t('car.status_label')}</label>
          <select value={modal.form.status} onChange={(e) => setForm({ status: e.target.value })} style={{ ...inp, marginBottom: 14, cursor: 'pointer' }}>
            <option value="available">{t('car.status_available')}</option>
            <option value="maintenance">{t('car.status_maintenance')}</option>
          </select>

          {modal.form.car_type === 'other' && (() => {
            // คนขับที่ถูกผูกเป็นคนขับประจำของรถคันอื่นแล้ว (ยกเว้นคันที่กำลังแก้) -> ชื่อรถ (ไว้ปิดเลือกใน dropdown)
            const takenBy = {};
            other.forEach((c) => {
              if (c.default_driver_id && String(c.id) !== String(modal.form.id)) {
                takenBy[String(c.default_driver_id)] = `${c.model}${c.plate ? ` (${c.plate})` : ''}`;
              }
            });
            return (
              <>
                <label style={lbl}>{t('car.regular_driver_label')}</label>
                <select value={modal.form.driver_id} onChange={(e) => setForm({ driver_id: e.target.value })} style={{ ...inp, marginBottom: 14, cursor: 'pointer' }}>
                  <option value="">{t('car.no_driver_option')}</option>
                  {drivers.map((d) => {
                    const taken = takenBy[String(d.id)];   // ถ้าผูกกับรถคันอื่นแล้ว = เลือกไม่ได้
                    return <option key={d.id} value={d.id} disabled={!!taken}>{(d.name || t('car.user_hash', { n: d.id })) + (taken ? `${t('car.bound_pre')}${taken}${t('car.bound_post')}` : '')}</option>;
                  })}
                </select>
                <label style={lbl}>{t('car.note_label')}</label>
                <input value={modal.form.note} onChange={(e) => setForm({ note: e.target.value })} placeholder={t('car.note_placeholder')} style={{ ...inp, marginBottom: 14 }} />
              </>
            );
          })()}

          <label style={lbl}>{t('car.image_label')}</label>
          <input type="file" accept="image/*" onChange={(e) => setForm({ imageFile: e.target.files[0] || null })} style={{ ...inp, marginBottom: 6, padding: 8 }} />
          {modal.form.image && !modal.form.imageFile && (
            <img src={baseUrl + modal.form.image} alt="" style={{ width: 90, height: 60, objectFit: 'cover', borderRadius: 6, marginTop: 4 }} />
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22, paddingTop: 18, borderTop: '1px solid #f0f3f5' }}>
            <button onClick={() => setModal(null)} style={{ background: '#f1f3f5', color: '#54616c', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('common.cancel')}</button>
            <button onClick={save} disabled={busy} style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 26px', fontSize: 14.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: 'inherit' }}>{t('common.save')}</button>
          </div>
        </Modal>
      )}

      {toast && <div style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', background: '#1f2a33', color: '#fff', padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, boxShadow: '0 8px 30px rgba(0,0,0,.2)', zIndex: 200 }}>{toast}</div>}
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ gridColumn: '1 / -1', background: '#fff', border: '1px solid #e7ebee', borderRadius: 12, padding: 40, textAlign: 'center', color: '#9aa7b2', fontSize: 14 }}>{text}</div>;
}
function CarIcon() {
  return <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#c5ced5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13l1.6-4.7A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.3L21 13v5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H6.5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><circle cx="7" cy="16" r="1" /><circle cx="17" cy="16" r="1" /></svg>;
}
function Modal({ title, onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(31,42,51,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: 20 }}>
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

const th = { textAlign: 'left', padding: '12px 16px', fontSize: 12.5, fontWeight: 700, color: '#3d4852', background: '#e6eaef', borderBottom: '2px solid #cfd6dd', letterSpacing: 0.2, whiteSpace: 'nowrap' };
const td = { padding: '13px 16px', fontSize: 13.5, color: '#6b7884', borderBottom: '1px solid #f4f6f7', whiteSpace: 'nowrap' };
const miniBtn = (bg, c, border) => ({ background: bg, color: c, border: border ? '1px solid #e3e9ec' : 'none', borderRadius: 7, padding: '6px 13px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' });
