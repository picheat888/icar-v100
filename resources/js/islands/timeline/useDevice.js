import { useState, useEffect } from 'react';

// hook ตรวจขนาดจอ -> 'mobile' (<=680) | 'tablet' (681-1024) | 'desktop' (>1024)
// ใช้ปรับ layout หน้าตารางการใช้รถให้ตรง mockup มือถือ/แท็บเล็ต
export function useDevice() {
  const [device, setDevice] = useState('desktop');

  useEffect(() => {
    const mqMobile = window.matchMedia('(max-width: 680px)');
    const mqTablet = window.matchMedia('(min-width: 681px) and (max-width: 1024px)');
    const update = () => setDevice(mqMobile.matches ? 'mobile' : mqTablet.matches ? 'tablet' : 'desktop');
    update();
    mqMobile.addEventListener('change', update);
    mqTablet.addEventListener('change', update);
    return () => {
      mqMobile.removeEventListener('change', update);
      mqTablet.removeEventListener('change', update);
    };
  }, []);

  return device;
}
