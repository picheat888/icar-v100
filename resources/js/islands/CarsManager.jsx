import { useState, useEffect, useCallback, useRef } from 'react';
import { getCsrf, setCsrf } from '../lib/csrf';
import { t } from '../lib/i18n';
import { useToast } from '../lib/Toast';
import Modal from '../lib/Modal';
import ConfirmDialog from '../lib/ConfirmDialog';
import DonePopup from '../lib/DonePopup';
import { TrashIcon } from '../lib/icons';
import Icon from '../lib/Icon';
import { SkelCardItems } from '../lib/Skeleton';
import Spinner from '../lib/Spinner';

// key ข้อความสถานะ + สี pill - ต้องเรียก t() ตอน render ไม่ใช่ตอน module โหลด
const CAR_STATUS = {
  available:   ['car.status_available', 'green'],
  maintenance: ['car.status_maintenance', 'amber'],
};

const MAX_MODEL = 100;
const MAX_PLATE = 30;
const MIN_SEATS = 1;
const MAX_SEATS = 40;
const MAX_IMAGE = 2 * 1024 * 1024;   // ไบต์
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PLATE_OK = /^[\u0E00-\u0E7FA-Za-z0-9 -]+$/;

const emptyForm = (type) => ({ id: 0, car_type: type, model: '', plate: '', seats: '', status: 'available', driver_id: '', note: '', image: '', imageFile: null, removeImage: false });

// ตรวจฟอร์มฝั่งหน้าจอ - คืน { ชื่อช่อง: ข้อความ } เรียงตามลำดับช่องในฟอร์ม (server ตรวจซ้ำอีกชั้น)
const validateForm = (f) => {
  const e = {};
  const model = f.model.trim();
  if (model === '') {
    e.model = t('car.err_model_req');
  } else if (model.length > MAX_MODEL) {
    e.model = t('car.err_model_max', { n: MAX_MODEL });
  }

  const plate = f.plate.trim();
  if (f.car_type === 'self' && plate === '') {
    e.plate = t('car.err_plate_req');
  } else if (plate !== '' && (plate.length < 2 || plate.length > MAX_PLATE)) {
    e.plate = t('car.err_plate_len', { n: MAX_PLATE });
  } else if (plate !== '' && ! PLATE_OK.test(plate)) {
    e.plate = t('car.err_plate_chars');
  }

  const seats = Number(f.seats);
  if (String(f.seats).trim() === '') {
    e.seats = t('car.err_seats_req');
  } else if (! Number.isInteger(seats) || seats < MIN_SEATS || seats > MAX_SEATS) {
    e.seats = t('car.err_seats_range', { min: MIN_SEATS, max: MAX_SEATS });
  }

  return e;
};

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
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirmCar, setConfirmCar] = useState(null);   // รถที่รอยืนยันการลบ
  const [done, setDone] = useState(false);              // ลบสำเร็จ -> โชว์ป็อปอัป "ลบเสร็จสิ้น"
  const { showToast, ToastView } = useToast();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false); // กันดับเบิลคลิกยิงซ้ำ (sync ref, ไม่รอ state update)
  const [errs, setErrs] = useState({});       // ข้อความผิดพลาดรายช่องในฟอร์ม
  const [preview, setPreview] = useState(''); // URL ชั่วคราวของรูปที่เพิ่งเลือกจากเครื่อง
  const fileRef = useRef(null);

  const load = useCallback(() => {
    setLoadErr(false);
    fetch(endpoints.data, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => { setSelf(d.self || []); setOther(d.other || []); setDrivers(d.drivers || []); })
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  }, [endpoints.data]);

  useEffect(() => { load(); }, [load]);

  // กลับมาที่แท็บนี้ -> ดึงข้อมูลใหม่ (ข้ามถ้ามีโมดัล/ป็อปอัปเปิดอยู่)
  useEffect(() => {
    const onVisible = () => { if (!document.hidden && !modal && !confirmCar && !done) load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load, modal, confirmCar, done]);

  // รูปที่เพิ่งเลือกจากเครื่อง - สร้าง URL ชั่วคราวไว้แสดง แล้วคืนหน่วยความจำเมื่อเปลี่ยน/ปิด
  useEffect(() => {
    const file = modal?.form.imageFile;
    if (! file) {
      setPreview('');

      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [modal?.form.imageFile]);

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
    // ผิดตรงไหนขึ้นข้อความใต้ช่องนั้น แล้วโฟกัสช่องแรกที่ผิด
    const found = validateForm(f);
    if (Object.keys(found).length > 0) {
      setErrs(found);
      document.getElementById('cm-' + Object.keys(found)[0])?.focus();

      return;
    }
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
    if (f.removeImage) {
      fd.append('remove_image', '1');
    }
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

  const openAdd = () => { setErrs({}); setModal({ isEdit: false, form: emptyForm(tab) }); };
  const openEdit = (car) => {
    setErrs({});
    setModal({
      isEdit: true,
      form: { id: car.id, car_type: car.car_type, model: car.model || '', plate: car.plate || '', seats: car.seats || '', status: car.status || 'available', driver_id: car.default_driver_id || '', note: car.note || '', image: car.image || '', imageFile: null, removeImage: false },
    });
  };
  const setForm = (patch) => {
    setModal((m) => ({ ...m, form: { ...m.form, ...patch } }));
    setErrs((e) => {
      const next = { ...e };
      Object.keys(patch).forEach((k) => delete next[k]);

      return next;
    });
  };

  // เลือกไฟล์รูป - ตรวจชนิด/ขนาดตั้งแต่ในหน้าจอ ไม่ต้องรอ server ตอบ
  const pickImage = (file) => {
    const reject = (msg) => {
      if (fileRef.current) {
        fileRef.current.value = '';
      }
      setModal((m) => ({ ...m, form: { ...m.form, imageFile: null } }));
      setErrs((e) => ({ ...e, image: msg }));
    };

    if (! file) {
      setForm({ imageFile: null });

      return;
    }
    if (! IMAGE_TYPES.includes(file.type)) {
      reject(t('car.err_image_type'));

      return;
    }
    if (file.size > MAX_IMAGE) {
      reject(t('car.err_image_size'));

      return;
    }
    setForm({ imageFile: file, removeImage: false });
  };

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
            <Icon name="plus" size={18} />{tab === 'self' ? t('car.add_self') : t('car.add_other')}
          </button>
        </div>
      </div>

      {/* การ์ด - ใช้ layout เดียวกันทั้งรถขับเอง (self) และรถอื่นๆ (other) */}
      <div className="car-grid" aria-busy={loading}>
        {loading && <SkelCardItems count={6} lines={3} />}
        {!loading && list.length === 0 && <Empty text={tab === 'self' ? t('car.empty_self') : t('car.empty_other')} />}
        {!loading && list.map((c) => {
          const [sl, sc] = CAR_STATUS[c.status] || CAR_STATUS.available;
          return (
            <div key={c.id} className="car-card">
              <div className="car-card-img">
                {c.image
                  ? <img src={baseUrl + 'car-image/' + c.id} alt={c.model} className="car-photo" />
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
                  <button onClick={() => openEdit(c)} className="cm-mini-btn cm-mini-btn--edit"><Icon name="pencil" size={14} />{t('common.edit')}</button>
                  <button onClick={() => del(c)} className="cm-mini-btn cm-mini-btn--delete"><Icon name="trash" size={14} />{t('common.delete')}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* โมดัล เพิ่ม/แก้ไข */}
      {modal && (
        <Modal
          title={`${modal.isEdit
            ? (modal.form.car_type === 'other' ? t('car.title_edit_other') : t('car.title_edit_self'))
            : (modal.form.car_type === 'other' ? t('car.add_other') : t('car.add_self'))}${modal.isEdit && modal.form.model ? ` - ${modal.form.model}${modal.form.plate ? ` (${modal.form.plate})` : ''}` : ''}`}
          onClose={() => setModal(null)}
          bodyClass="cm-modal-body"
          lockBackdrop
        >
          <label className="form-label" htmlFor="cm-model">{t('car.model_label')} <span className="cm-required">*</span></label>
          <input id="cm-model" value={modal.form.model} onChange={(e) => setForm({ model: e.target.value })} maxLength={MAX_MODEL} placeholder={t('car.model_placeholder')} required aria-invalid={!! errs.model} aria-describedby={errs.model ? 'cm-model-err' : undefined} className={`form-input form-input--sm${errs.model ? ' form-input--bad' : ''} cm-field-mb`} />
          {errs.model && <div id="cm-model-err" className="cm-err" role="alert">{errs.model}</div>}

          <div className="cm-grid2">
            <div>
              <label className="form-label" htmlFor="cm-plate">{t('car.plate_label')}{modal.form.car_type === 'self' && <span className="cm-required"> *</span>}</label>
              <input id="cm-plate" value={modal.form.plate} onChange={(e) => setForm({ plate: e.target.value })} maxLength={MAX_PLATE} placeholder={modal.form.car_type === 'other' ? t('car.optional_placeholder') : t('car.plate_example_placeholder')} required={modal.form.car_type === 'self'} aria-invalid={!! errs.plate} aria-describedby={errs.plate ? 'cm-plate-err' : undefined} className={`form-input form-input--sm${errs.plate ? ' form-input--bad' : ''}`} />
              {errs.plate && <div id="cm-plate-err" className="cm-err" role="alert">{errs.plate}</div>}
            </div>
            <div>
              <label className="form-label" htmlFor="cm-seats">{t('car.seats_label')} <span className="cm-required">*</span></label>
              <input id="cm-seats" type="number" min={MIN_SEATS} max={MAX_SEATS} value={modal.form.seats} onChange={(e) => setForm({ seats: e.target.value })} placeholder={t('car.seats_placeholder')} required aria-invalid={!! errs.seats} aria-describedby={errs.seats ? 'cm-seats-err' : 'cm-seats-hint'} className={`form-input form-input--sm${errs.seats ? ' form-input--bad' : ''}`} />
              {errs.seats
                ? <div id="cm-seats-err" className="cm-err" role="alert">{errs.seats}</div>
                : <div id="cm-seats-hint" className="cm-hint">{t('car.seats_hint', { min: MIN_SEATS, max: MAX_SEATS })}</div>}
            </div>
          </div>

          <label className="form-label" htmlFor="cm-status">{t('car.status_label')}</label>
          <select id="cm-status" value={modal.form.status} onChange={(e) => setForm({ status: e.target.value })} className="form-input form-input--sm form-select cm-select cm-field-mb">
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
                <label className="form-label" htmlFor="cm-driver">{t('car.regular_driver_label')}</label>
                <select id="cm-driver" value={modal.form.driver_id} onChange={(e) => setForm({ driver_id: e.target.value })} className="form-input form-input--sm form-select cm-select cm-field-mb">
                  <option value="">{t('car.no_driver_option')}</option>
                  {drivers.map((d) => {
                    const taken = takenBy[String(d.id)];   // ถ้าผูกกับรถคันอื่นแล้ว = เลือกไม่ได้
                    return <option key={d.id} value={d.id} disabled={!! taken}>{(d.name || t('car.user_hash', { n: d.id })) + (taken ? `${t('car.bound_pre')}${taken}${t('car.bound_post')}` : '')}</option>;
                  })}
                </select>
                <label className="form-label" htmlFor="cm-note">{t('car.note_label')}</label>
                <input id="cm-note" value={modal.form.note} onChange={(e) => setForm({ note: e.target.value })} maxLength={255} placeholder={t('car.note_placeholder')} className="form-input form-input--sm cm-field-mb" />
              </>
            );
          })()}

          <label className="form-label" htmlFor="cm-image">{t('car.image_label')}</label>
          <div className="cm-file-row">
            <input id="cm-image" ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(e) => pickImage(e.target.files[0] || null)} aria-invalid={!! errs.image} aria-describedby={errs.image ? 'cm-image-err' : 'cm-image-hint'} className="cm-file-native" />
            <label htmlFor="cm-image" className="cm-file-btn"><Icon name="image" size={15} />{t('car.image_choose')}</label>
            <span className="cm-file-name">{modal.form.imageFile ? modal.form.imageFile.name : t('car.image_none')}</span>
          </div>
          {errs.image
            ? <div id="cm-image-err" className="cm-err" role="alert">{errs.image}</div>
            : <div id="cm-image-hint" className="cm-hint">{t('car.image_hint')}</div>}

          {/* รูปที่เพิ่งเลือก · รูปเดิมที่บันทึกไว้ · หรือรูปเดิมที่สั่งลบไว้รอบันทึก */}
          {(preview || modal.form.image) && (
            <div className="cm-preview">
              {modal.form.removeImage && ! preview ? (
                <>
                  <span className="cm-preview-label">{t('car.image_will_remove')}</span>
                  <button type="button" onClick={() => setForm({ removeImage: false })} className="cm-img-btn">{t('car.image_undo')}</button>
                </>
              ) : (
                <>
                  <img src={preview || baseUrl + 'car-image/' + modal.form.id} alt={preview ? t('car.image_new') : t('car.image_current')} className="cm-preview-img" />
                  <span className="cm-preview-label">{preview ? t('car.image_new') : t('car.image_current')}</span>
                  {preview ? (
                    <button type="button" onClick={() => { if (fileRef.current) { fileRef.current.value = ''; } setForm({ imageFile: null }); }} className="cm-img-btn">{t('car.image_undo_pick')}</button>
                  ) : (
                    <button type="button" onClick={() => setForm({ removeImage: true })} className="cm-img-btn cm-img-btn--danger"><Icon name="trash" size={13} />{t('car.image_remove')}</button>
                  )}
                </>
              )}
            </div>
          )}

          <div className="cm-modal-footer">
            <button type="button" onClick={() => setModal(null)} className="cm-btn-cancel"><Icon name="close" size={16} />{t('common.cancel')}</button>
            <button type="button" onClick={save} disabled={busy} className={`btn-primary${busy ? ' cm-btn-busy' : ''}`}>{busy ? <Spinner /> : <Icon name="check" size={17} />}{busy ? t('car.saving_busy') : t('common.save')}</button>
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
