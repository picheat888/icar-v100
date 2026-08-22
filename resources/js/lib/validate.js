// เป็นจำนวนเต็มบวกไหม - ตรงกับกฎฝั่ง server (preg_match '/^\d+$/' หลัง trim)
export const isPositiveInt = (v) => /^\d+$/.test(String(v ?? '').trim());
