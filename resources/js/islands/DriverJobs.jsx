import { useState, useEffect, useMemo, Fragment } from 'react';
import { thDate, thTime, thDateTime, thWeekday } from '../lib/date';
import { t } from '../lib/i18n';

// ลิงก์ปลอดภัย — เฉพาะ http(s) (กัน javascript:/data: ที่หลุดมา)
const isSafeUrl = (u) => /^https?:\/\//i.test(String(u || ''));

// ไอคอนปฏิทินนำหน้าแถบวันที่
const CAL_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);

const th = { padding: '12px 14px', fontSize: 12.5, fontWeight: 700, color: '#3d4852', textAlign: 'center', whiteSpace: 'nowrap', background: '#e6eaef', borderBottom: '2px solid #cfd6dd', letterSpacing: 0.2 };
const td = { padding: '13px 14px', fontSize: 13.5, color: '#37434d', textAlign: 'center', verticalAlign: 'middle', borderTop: '1px solid #f2f4f6' };
const badge = { background: '#e7f4ee', color: '#16855a', borderRadius: 999, padding: '4px 13px', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-block' };
const dLbl = { fontSize: 12, color: '#9aa7b2', fontWeight: 600, marginBottom: 3 };
const dVal = { fontSize: 14, color: '#37434d', fontWeight: 600, wordBreak: 'break-word' };

/**
 * งานของฉัน (Driver) — ตาราง (เดสก์ท็อป) / การ์ด (มือถือ) + คลิกแถวเปิด drawer รายละเอียด
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

  // จัดกลุ่มงานตามวันใช้รถ (start_at) — วันล่าสุดอยู่บน
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
    return <div style={{ background: '#fff', border: '1px solid #e7ebee', borderRadius: 14, padding: 48, textAlign: 'center', color: '#9aa7b2' }}>{t('driver.empty')}</div>;
  }

  return (
    <div>
      {narrow ? (
        /* มือถือ: การ์ดจัดกลุ่มตามวัน (แตะดูรายละเอียด) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groups.map((g) => (
            <div key={g.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#e6f3f2', border: '1px solid #cbe6e2', borderRadius: 8, padding: '8px 14px', marginBottom: 10, fontSize: 13, fontWeight: 700, color: '#0a605e' }}>{CAL_ICON}{thDate(g.key)} {thWeekday(g.key)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {g.rows.map((b) => (
                  <div key={b.id} onClick={() => setDetail(b)} style={{ background: '#fff', border: '1px solid #e7ebee', borderLeft: '3px solid #0c8b87', borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#37434d' }}>{b.booking_code}</span>
                      <span style={badge}>{t('driver.assigned')}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2a33' }}>{b.location}</div>
                    <div style={{ fontSize: 12.5, color: '#6b7884', marginTop: 3 }}>{b.requester_name || '-'} · {t('driver.people_count', { n: b.people })}</div>
                    <div style={{ fontSize: 12.5, color: '#6b7884', marginTop: 2 }}>{thDate(b.start_at)} {thTime(b.start_at)} → {thTime(b.end_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* เดสก์ท็อป: ตาราง */
        <div style={{ background: '#fff', border: '1px solid #e7ebee', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead><tr>
                <th style={th}>{t('driver.col_code')}</th>
                <th style={th}>{t('driver.destination')}</th>
                <th style={th}>{t('driver.passenger')}</th>
                <th style={th}>{t('driver.col_count')}</th>
                <th style={th}>{t('driver.time_range')}</th>
                <th style={th}>{t('driver.col_status')}</th>
              </tr></thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={g.key}>
                    <tr>
                      <td colSpan={6} style={{ padding: '9px 20px', background: '#e6f3f2', borderTop: '1px solid #cbe6e2', borderBottom: '1px solid #cbe6e2', fontSize: 12.5, fontWeight: 700, color: '#0a605e', textAlign: 'left' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{CAL_ICON}{thDate(g.key)} {thWeekday(g.key)}</span>
                      </td>
                    </tr>
                    {g.rows.map((b) => (
                      <tr key={b.id} onClick={() => setDetail(b)} style={{ cursor: 'pointer' }}>
                        <td style={{ ...td, fontWeight: 700 }}>{b.booking_code}</td>
                        <td style={{ ...td, maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.location}</td>
                        <td style={td}>{b.requester_name || '-'}</td>
                        <td style={td}>{b.people}</td>
                        <td style={{ ...td, whiteSpace: 'nowrap', lineHeight: 1.5 }}>{thDate(b.start_at)}<br />{thTime(b.start_at)} → {thTime(b.end_at)}</td>
                        <td style={td}><span style={badge}>{t('driver.assigned')}</span></td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* drawer รายละเอียดงาน (เลื่อนจากขวา) */}
      {detail && (() => {
        const b = detail;
        return (
          <div onClick={() => setDetail(null)} className="icar-drawer-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(31,42,51,.45)', display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', zIndex: 150 }}>
            <div onClick={(e) => e.stopPropagation()} className="icar-drawer" style={{ background: '#fff', width: 'min(560px, 100%)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,.22)' }}>
              <div style={{ flex: 'none', padding: '20px 24px', borderBottom: '1px solid #f0f3f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#1f2a33' }}>{t('driver.detail_title', { code: b.booking_code })}</h3>
                <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aa7b2', padding: 4, display: 'flex' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                <div style={{ marginBottom: 16 }}><span style={badge}>{t('driver.assigned')}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px 20px' }}>
                  <div style={{ gridColumn: '1 / -1' }}><div style={dLbl}>{t('driver.destination')}</div><div style={dVal}>{b.location}</div></div>
                  <div><div style={dLbl}>{t('driver.passenger')}</div><div style={dVal}>{b.requester_name || '-'}</div></div>
                  <div><div style={dLbl}>{t('driver.dept_label')}</div><div style={dVal}>{b.dept_name || '-'}</div></div>
                  <div><div style={dLbl}>{t('driver.passenger_count_label')}</div><div style={dVal}>{t('driver.people_count', { n: b.people })}</div></div>
                  {b.ext_driver_vehicle && <div><div style={dLbl}>{t('driver.vehicle_used_label')}</div><div style={dVal}>{b.ext_driver_vehicle}</div></div>}
                  <div style={{ gridColumn: '1 / -1' }}><div style={dLbl}>{t('driver.time_range')}</div><div style={dVal}>{thDateTime(b.start_at)} → {thDateTime(b.end_at)}</div></div>
                  {b.purpose && <div style={{ gridColumn: '1 / -1' }}><div style={dLbl}>{t('driver.purpose_label')}</div><div style={dVal}>{b.purpose}</div></div>}
                </div>

                {/* ลิงก์แผนที่ (กันลิงก์ไม่ปลอดภัย) */}
                {b.map_link && (
                  <div style={{ marginTop: 16 }}>
                    {isSafeUrl(b.map_link)
                      ? <a href={b.map_link} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#e6f3f2', color: '#0a716e', borderRadius: 8, padding: '9px 15px', fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>{t('driver.open_maps')}</a>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f1f3f5', color: '#9aa7b2', borderRadius: 8, padding: '9px 15px', fontSize: 13.5, fontWeight: 600 }}>{t('driver.invalid_map_link')}</span>}
                  </div>
                )}

                {/* หมายเหตุจาก Admin */}
                {b.admin_note && <div style={{ marginTop: 16, background: '#f6f8f9', borderRadius: 8, padding: '11px 14px', fontSize: 13.5, color: '#54616c' }}>{t('driver.admin_note_prefix')}{b.admin_note}</div>}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
