import { useState, useEffect, useCallback, useRef } from 'react';
import { getCsrf, setCsrf } from '../lib/csrf';
import { t } from '../lib/i18n';
import { useToast } from '../lib/Toast';
import Modal from '../lib/Modal';
import ConfirmDialog from '../lib/ConfirmDialog';
import DonePopup from '../lib/DonePopup';
import { TrashIcon } from '../lib/icons';

// key ข้อความสถานะ + สี pill - ต้องเรียก t() ตอน render ไม่ใช่ตอน module โหลด
const CAR_STATUS = {
  available:   ['car.status_available', 'green'],
  maintenance: ['car.status_maintenance', 'amber'],
};

const emptyForm = (type) => ({ id: 0, car_type: type, model: '', plate: '', seats: '', status: 'available', driver_id: '', note: '', image: '', imageFile: null });

/**
 * จัดการรถ - แท็บ รถบริษัท(self, การ์ด) / รถจัดหา(other, ตาราง) + เพิ่ม/แก้ไข/ลบ + อัปโหลดรูป
 * props: endpoints {data, save, delete}, baseUrl
 */
export default function CarsManager({ endpoints, baseUrl = '' }) {
  const [self, setSelf] = useState([]);
  const [other, setOther] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [tab, setTab] = useState('self');
  const [loadErr, setLoadErr] = useState(false);
  const [modal, setModal] = useState(null);
  const [confirmCar, setConfirmCar] = useState(null);   // รถที่รอยืนยันการลบ
  const [done, setDone] = useState(false);              // ลบสำเร็จ -> โชว์ป็อปอัป "ลบเสร็จสิ้น"
  const { showToast, ToastView } = useToast();
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

  // กลับมาที่แท็บนี้ -> ดึงข้อมูลใหม่ (ข้ามถ้ามีโมดัล/ป็อปอัปเปิดอยู่)
  useEffect(() => {
    const onVisible = () => { if (!document.hidden && !modal && !confirmCar && !done) load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load, modal, confirmCar, done]);

  // ส่งฟอร์ม (multipart - รองรับไฟล์รูป)
  // silentOk = true -> ไม่ต้องขึ้น toast ตอนสำเร็จ (ใช้กับการลบที่มีป็อปอัป "ลบเสร็จสิ้น" อยู่แล้ว)
  const postForm = async (url, fd, silentOk = false) => {
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
      // คนอื่นเปลี่ยนข้อมูลนี้ไปแล้ว (เช่น รถถูกลบไปก่อน) -> ปิดโมดัล ดึงข้อมูลใหม่ แล้วบอกด้วย toast
      if (d.conflict) {
        setModal(null);
        setConfirmCar(null);
        load();
        showToast(`${d.message} - ${t('common.conflict_refreshed')}`);
        return false;
      }
      if (!d.ok || !silentOk) showToast(d.message || (d.ok ? t('common.success') : t('common.err')));
      if (d.ok) { load(); return true; }
      return false;
    } finally { setBusy(false); busyRef.current = false; }
  };

  const save = async () => {
    const f = modal.form;
    // คนขับประจำ 1:1 - กันเลือกคนขับที่ผูกกับรถคันอื่นอยู่แล้ว (ยกเว้นคันที่กำลังแก้)
    if (f.car_type === 'other' && f.driver_id) {
      const clash = other.find((c) => String(c.default_driver_id) === String(f.driver_id) && String(c.id) !== String(f.id));
      if (clash) return showToast(`${t('car.driver_taken_pre')}${clash.model}${clash.plate ? ` (${clash.plate})` : ''}${t('car.driver_taken_post')}`);
    }
    // ทะเบียนห้ามซ้ำกับรถที่ยังใช้งานอยู่ (ยกเว้นคันที่กำลังแก้) - รถจัดหาที่เว้นทะเบียนว่างไม่ต้องตรวจ
    const plate = String(f.plate || '').trim().toLowerCase();
    if (plate) {
      const taken = [...self, ...other].find((c) => String(c.plate || '').trim().toLowerCase() === plate && String(c.id) !== String(f.id));
      if (taken) return showToast(`${t('car.plate_taken_pre')}${taken.model}${t('car.plate_taken_post')}`);
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

  // กดปุ่มลบ -> เปิดป็อปอัปยืนยัน (ยังไม่ลบ)
  const del = (car) => setConfirmCar(car);

  // กดยืนยันในป็อปอัป -> ลบจริง แล้วโชว์ "ลบเสร็จสิ้น" 1.5 วินาที ก่อนกลับสู่หน้ารายการรถ
  const doDelete = async () => {
    const fd = new FormData();
    fd.append('id', confirmCar.id);
    const ok = await postForm(endpoints.delete, fd, true);
    setConfirmCar(null);   // ปิดป็อปอัปเสมอ - ถ้าลบไม่ได้ (เช่น รถมีการจองค้าง) toast จะแจ้งเหตุผลแทน
    if (ok) {
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    }
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
        <div className="alert-error">
          {t('common.load_err')}
        </div>
      )}
      {/* แท็บ */}
      <div className="cm-toolbar">
        <div className="seg cm-segwrap">
          <button onClick={() => setTab('self')} className={`seg-btn${tab === 'self' ? ' seg-btn--active' : ''}`}>{t('car.tab_self')}</button>
          <button onClick={() => setTab('other')} className={`seg-btn${tab === 'other' ? ' seg-btn--active' : ''}`}>{t('car.tab_other')}</button>
        </div>
        <div className="cm-actions">
          <button onClick={openAdd} className="btn-primary">
            + {tab === 'self' ? t('car.add_self') : t('car.add_other')}
          </button>
        </div>
      </div>

      {/* การ์ด - ใช้ layout เดียวกันทั้งรถขับเอง (self) และรถอื่นๆ (other) */}
      <div className="car-grid">
        {list.length === 0 && <Empty text={tab === 'self' ? t('car.empty_self') : t('car.empty_other')} />}
        {list.map((c) => {
          const [sl, sc] = CAR_STATUS[c.status] || CAR_STATUS.available;
          return (
            <div key={c.id} className="car-card">
              <div className="car-card-img">
                {c.image
                  ? <img src={baseUrl + c.image} alt={c.model} className="car-photo" />
                  : <CarIcon />}
              </div>
              <div className="car-card-body">
                <div className="cm-card-head">
                  <div className="cm-card-title">{c.model}</div>
                  <span className={`pill pill--sm pill--${sc} cm-card-pill`}>{t(sl)}</span>
                </div>
                <div className="cm-card-row">
                  <span className="cm-card-plate">{c.plate || '-'}</span>
                  <span className="cm-seat-tag">{t('car.seats_count', { n: c.seats })}</span>
                </div>
                {c.car_type === 'other' && (
                  <div className="cm-card-driver">
                    <div>{t('car.driver_label')}{c.default_driver_name || '-'}</div>
                    {c.note && <div className="cm-card-note">{c.note}</div>}
                  </div>
                )}
                <div className="cm-card-actions">
                  <button onClick={() => openEdit(c)} className="cm-mini-btn cm-mini-btn--edit">{t('common.edit')}</button>
                  <button onClick={() => del(c)} className="cm-mini-btn cm-mini-btn--delete">{t('common.delete')}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* โมดัล เพิ่ม/แก้ไข */}
      {modal && (
        <Modal title={modal.isEdit ? (modal.form.car_type === 'other' ? t('car.title_edit_other') : t('car.title_edit_self')) : (modal.form.car_type === 'other' ? t('car.add_other') : t('car.add_self'))} onClose={() => setModal(null)} bodyClass="cm-modal-body">
          <label className="form-label">{t('car.model_label')} <span className="cm-required">*</span></label>
          <input value={modal.form.model} onChange={(e) => setForm({ model: e.target.value })} placeholder={t('car.model_placeholder')} className="form-input form-input--sm cm-field-mb" />
          <div className="cm-grid2">
            <div><label className="form-label">{t('car.plate_label')}{modal.form.car_type === 'self' && <span className="cm-required"> *</span>}</label><input value={modal.form.plate} onChange={(e) => setForm({ plate: e.target.value })} placeholder={modal.form.car_type === 'other' ? t('car.optional_placeholder') : t('car.plate_example_placeholder')} className="form-input form-input--sm" /></div>
            <div><label className="form-label">{t('car.seats_label')}</label><input type="number" min="0" value={modal.form.seats} onChange={(e) => setForm({ seats: e.target.value })} placeholder="0" className="form-input form-input--sm" /></div>
          </div>
          <label className="form-label">{t('car.status_label')}</label>
          <select value={modal.form.status} onChange={(e) => setForm({ status: e.target.value })} className="form-input form-input--sm cm-select cm-field-mb">
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
                <label className="form-label">{t('car.regular_driver_label')}</label>
                <select value={modal.form.driver_id} onChange={(e) => setForm({ driver_id: e.target.value })} className="form-input form-input--sm cm-select cm-field-mb">
                  <option value="">{t('car.no_driver_option')}</option>
                  {drivers.map((d) => {
                    const taken = takenBy[String(d.id)];   // ถ้าผูกกับรถคันอื่นแล้ว = เลือกไม่ได้
                    return <option key={d.id} value={d.id} disabled={!!taken}>{(d.name || t('car.user_hash', { n: d.id })) + (taken ? `${t('car.bound_pre')}${taken}${t('car.bound_post')}` : '')}</option>;
                  })}
                </select>
                <label className="form-label">{t('car.note_label')}</label>
                <input value={modal.form.note} onChange={(e) => setForm({ note: e.target.value })} placeholder={t('car.note_placeholder')} className="form-input form-input--sm cm-field-mb" />
              </>
            );
          })()}

          <label className="form-label">{t('car.image_label')}</label>
          <input type="file" accept="image/*" onChange={(e) => setForm({ imageFile: e.target.files[0] || null })} className="form-input form-input--sm cm-file-input" />
          {modal.form.image && !modal.form.imageFile && (
            <img src={baseUrl + modal.form.image} alt="" className="cm-preview-img" />
          )}

          <div className="cm-modal-footer">
            <button onClick={() => setModal(null)} className="cm-btn-cancel">{t('common.cancel')}</button>
            <button onClick={save} disabled={busy} className={`btn-primary${busy ? ' cm-btn-busy' : ''}`}>{t('common.save')}</button>
          </div>
        </Modal>
      )}

      {/* ป็อปอัปยืนยันการลบรถ */}
      {confirmCar && (
        <ConfirmDialog
          tone="danger"
          icon={TrashIcon}
          title={t('car.confirm_delete_title')}
          okText={busy ? t('car.deleting_busy') : t('car.confirm_delete_btn')}
          onOk={doDelete}
          onCancel={() => setConfirmCar(null)}
          busy={busy}
        >
          {t('car.confirm_delete_pre')}
          <b className="confirm-code">{confirmCar.model}{confirmCar.plate ? ` (${confirmCar.plate})` : ''}</b>
          {t('car.confirm_delete_post')}
          <br />
          {t('car.confirm_delete_note')}
        </ConfirmDialog>
      )}

      {/* ป็อปอัปแจ้งลบสำเร็จ - โชว์ 1.5 วินาทีแล้วกลับสู่หน้ารายการรถ */}
      {done && <DonePopup title={t('car.deleted_title')} sub={t('car.deleted_sub')} />}

      <ToastView />
    </div>
  );
}

function Empty({ text }) {
  return <div className="empty-card cm-empty">{text}</div>;
}
function CarIcon() {
  return <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#c5ced5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13l1.6-4.7A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.3L21 13v5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H6.5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><circle cx="7" cy="16" r="1" /><circle cx="17" cy="16" r="1" /></svg>;
}
