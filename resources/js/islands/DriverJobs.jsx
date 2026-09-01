import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { fmtDate, fmtDateTime, weekdayName, rangeLines } from '../lib/date';
import { t } from '../lib/i18n';
import { isSafeUrl } from '../lib/url';
import { CloseIcon, CalIcon } from '../lib/icons';
import Icon from '../lib/Icon';
import Table from '../lib/Table';
import useModalFocus from '../lib/useModalFocus';

/**
 * งานของฉัน (Driver) - ตาราง (เดสก์ท็อป) / การ์ด (มือถือ) + คลิกแถวเปิด drawer รายละเอียด
 * props: jobs[] (คำขอ approved ที่มอบหมายให้คนขับคนนี้ · ส่งตรงจาก controller ไม่ต้องมี endpoint)
 */
export default function DriverJobs({ jobs = [] }) {
  const [detail, setDetail] = useState(null);   // งานที่เปิดดูรายละเอียด
  const [narrow, setNarrow] = useState(false);
  const boxRef = useRef(null);   // กล่อง drawer - ใช้ขังโฟกัส

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const on = () => setNarrow(mq.matches); on();
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
  }, []);

  // Esc ปิด · Tab วนอยู่ใน drawer · ปิดแล้วคืนโฟกัสให้แถวที่กดเปิด
  useModalFocus(boxRef, () => setDetail(null), { enabled: !! detail, focusBox: true });

  // จัดกลุ่มงานตามวันใช้รถ (start_at) - วันล่าสุดอยู่บน
  const groups = useMemo(() => {
    const map = [];
    [...jobs]
      .sort((a, b) => (b.start_at || '').localeCompare(a.start_at || '') || (+b.id - +a.id))
      .forEach((b) => {
        const key = (b.start_at || '').slice(0, 10);
        let g = map.find((x) => x.key === key);
        if (!g) { g = { key, rows: [] }; map.push(g); }
        g.rows.push(b);
      });
    return map;
  }, [jobs]);

  if (jobs.length === 0) {
    return <div className="empty-card dj-empty">{t('driver.empty')}</div>;
  }

  return (
    <div>
      {narrow ? (
        /* มือถือ: การ์ดจัดกลุ่มตามวัน (แตะดูรายละเอียด) */
        <div className="dj-groups">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="dj-day-badge">{CalIcon}{fmtDate(g.key)} {weekdayName(g.key)}</div>
              <div className="dj-cards">
                {g.rows.map((b) => (
                  <div key={b.id} onClick={() => setDetail(b)} className="dj-card">
                    <div className="dj-card-head">
                      <span className="dj-card-code">{b.booking_code}</span>
                      <span className="pill pill--sm pill--green">{t('driver.assigned')}</span>
                    </div>
                    <div className="dj-card-loc">{b.location}</div>
                    <div className="dj-card-meta">{b.requester_name || '-'} · {t('driver.people_count', { n: b.people })}</div>
                    <div className="dj-card-meta dj-card-meta--time">{(() => { const [l1, l2] = rangeLines(b.start_at, b.end_at); return `${l1} ${l2}`; })()}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* เดสก์ท็อป: ตาราง */
        <div className="dj-table-wrap">
          <Table center>
            <thead><tr>
              <th>{t('driver.col_code')}</th>
              <th>{t('driver.destination')}</th>
              <th>{t('driver.passenger')}</th>
              <th>{t('driver.col_count')}</th>
              <th>{t('driver.time_range')}</th>
              <th>{t('driver.col_status')}</th>
            </tr></thead>
            <tbody>
              {groups.map((g) => (
                <Fragment key={g.key}>
                  <tr>
                    <td colSpan={6} className="dj-group-cell ta-l">
                      <span className="dj-group-label">{CalIcon}{fmtDate(g.key)} {weekdayName(g.key)}</span>
                    </td>
                  </tr>
                  {g.rows.map((b) => (
                    <tr key={b.id} onClick={() => setDetail(b)} className="dj-row">
                      <td className="dj-td-code">{b.booking_code}</td>
                      <td className="dj-td-loc">{b.location}</td>
                      <td>{b.requester_name || '-'}</td>
                      <td>{b.people}</td>
                      <td className="dj-td-time">{(() => { const [l1, l2] = rangeLines(b.start_at, b.end_at); return (<><div>{l1}</div><div>{l2}</div></>); })()}</td>
                      <td><span className="pill pill--sm pill--green">{t('driver.assigned')}</span></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* drawer รายละเอียดงาน (เลื่อนจากขวา) */}
      {detail && (() => {
        const b = detail;
        return (
          <div onClick={() => setDetail(null)} className="icar-drawer-backdrop">
            <div
              ref={boxRef}
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
              className="icar-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={`${t('driver.detail_heading')} ${b.booking_code}`}
            >
              <div className="dj-head">
                <div className="icon-box icon-box--teal dj-head-icon"><Icon name="car" size={20} /></div>
                <div className="dj-head-main">
                  <h3 className="dj-head-title">{t('driver.detail_heading')}</h3>
                  <div className="dj-head-code">{b.booking_code}</div>
                </div>
                <span className="pill pill--sm pill--green">{t('driver.assigned')}</span>
                <button onClick={() => setDetail(null)} className="modal-close" aria-label={t('common.close')}>{CloseIcon}</button>
              </div>
              <div className="dj-drawer-body">
                <div className="dj-fields">
                  <div className="dj-sec-title">{t('driver.sec_passenger')}</div>
                  <div className="dj-row">
                    <div className="dj-label">{t('mem.col_full_name')}</div>
                    <div className="dj-value">{b.requester_name || '-'}</div>
                  </div>
                  <div className="dj-row">
                    <div className="dj-label">{t('driver.dept_label')}</div>
                    <div className="dj-value">{b.dept_name || '-'}</div>
                  </div>
                  <div className="dj-row">
                    <div className="dj-label">{t('mem.phone_full_label')}</div>
                    <div className="dj-value">{b.requester_phone || '-'}</div>
                  </div>
                  <div className="dj-row">
                    <div className="dj-label">{t('driver.passenger_count_label')}</div>
                    <div className="dj-value">{t('driver.people_count', { n: b.people })}</div>
                  </div>

                  <div className="dj-sec-title">{t('req.sec_trip')}</div>
                  <div className="dj-row">
                    <div className="dj-label">{t('driver.destination')}</div>
                    <div className="dj-value">
                      {b.location || '-'}
                      {/* ลิงก์แผนที่อยู่ใต้ปลายทางที่มันอ้างถึง (กันลิงก์ไม่ปลอดภัย) */}
                      {b.map_link && (isSafeUrl(b.map_link)
                        ? <a href={b.map_link} target="_blank" rel="noopener" className="dj-map-link"><Icon name="map-pin" size={13} />{t('driver.open_maps')}</a>
                        : <span className="dj-map-link dj-map-link--invalid">{t('driver.invalid_map_link')}</span>)}
                    </div>
                  </div>
                  <div className="dj-row">
                    <div className="dj-label">{t('req.start_label')}</div>
                    <div className="dj-value">{fmtDateTime(b.start_at)}</div>
                  </div>
                  <div className="dj-row">
                    <div className="dj-label">{t('req.end_label')}</div>
                    <div className="dj-value">{fmtDateTime(b.end_at)}</div>
                  </div>
                  {b.purpose && (
                    <div className="dj-row">
                      <div className="dj-label">{t('driver.purpose_label')}</div>
                      <div className="dj-value">{b.purpose}</div>
                    </div>
                  )}
                  {b.ext_driver_vehicle && (
                    <div className="dj-row">
                      <div className="dj-label">{t('driver.vehicle_used_label')}</div>
                      <div className="dj-value">{b.ext_driver_vehicle}</div>
                    </div>
                  )}
                </div>

                {/* หมายเหตุจาก Admin */}
                {b.admin_note && <div className="dj-admin-note">{t('driver.admin_note_prefix')}{b.admin_note}</div>}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
