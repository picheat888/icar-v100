import { useState, useEffect, useMemo, Fragment } from 'react';
import { fmtDate, weekdayName, rangeLines, dateTimeRange } from '../lib/date';
import { t } from '../lib/i18n';
import { isSafeUrl } from '../lib/url';
import { CloseIcon, CalIcon } from '../lib/icons';
import Table from '../lib/Table';

/**
 * งานของฉัน (Driver) - ตาราง (เดสก์ท็อป) / การ์ด (มือถือ) + คลิกแถวเปิด drawer รายละเอียด
 * props: jobs[] (คำขอ approved ที่มอบหมายให้คนขับคนนี้ · ส่งตรงจาก controller ไม่ต้องมี endpoint)
 */
export default function DriverJobs({ jobs = [] }) {
  const [detail, setDetail] = useState(null);   // งานที่เปิดดูรายละเอียด
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const on = () => setNarrow(mq.matches); on();
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
  }, []);

  // ปิด drawer ด้วยปุ่ม Esc
  useEffect(() => {
    if (!detail) return;
    const onKey = (e) => { if (e.key === 'Escape') setDetail(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail]);

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
            <div onClick={(e) => e.stopPropagation()} className="icar-drawer">
              <div className="modal-head">
                <h3 className="modal-title">{t('driver.detail_title', { code: b.booking_code })}</h3>
                <button onClick={() => setDetail(null)} className="modal-close">{CloseIcon}</button>
              </div>
              <div className="dj-drawer-body">
                <div className="dj-drawer-status"><span className="pill pill--sm pill--green">{t('driver.assigned')}</span></div>
                <div className="dj-detail-grid">
                  <div className="dj-detail-full"><div className="detail-label">{t('driver.destination')}</div><div className="dj-detail-value">{b.location}</div></div>
                  <div><div className="detail-label">{t('driver.passenger')}</div><div className="dj-detail-value">{b.requester_name || '-'}</div></div>
                  <div><div className="detail-label">{t('driver.dept_label')}</div><div className="dj-detail-value">{b.dept_name || '-'}</div></div>
                  <div><div className="detail-label">{t('driver.passenger_count_label')}</div><div className="dj-detail-value">{t('driver.people_count', { n: b.people })}</div></div>
                  {b.ext_driver_vehicle && <div><div className="detail-label">{t('driver.vehicle_used_label')}</div><div className="dj-detail-value">{b.ext_driver_vehicle}</div></div>}
                  <div className="dj-detail-full"><div className="detail-label">{t('driver.time_range')}</div><div className="dj-detail-value">{dateTimeRange(b.start_at, b.end_at)}</div></div>
                  {b.purpose && <div className="dj-detail-full"><div className="detail-label">{t('driver.purpose_label')}</div><div className="dj-detail-value">{b.purpose}</div></div>}
                </div>

                {/* ลิงก์แผนที่ (กันลิงก์ไม่ปลอดภัย) */}
                {b.map_link && (
                  <div className="dj-map-wrap">
                    {isSafeUrl(b.map_link)
                      ? <a href={b.map_link} target="_blank" rel="noopener" className="dj-map-link">{t('driver.open_maps')}</a>
                      : <span className="dj-map-invalid">{t('driver.invalid_map_link')}</span>}
                  </div>
                )}

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
