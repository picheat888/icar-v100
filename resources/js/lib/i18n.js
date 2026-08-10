import th from '../locales/th.json';
import en from '../locales/en.json';

const dict = { th, en };
// locale จาก meta ที่ PHP ฝังให้ (default en)
const locale = document.querySelector('meta[name="locale"]')?.content || 'en';

// t('key') หรือ t('key', { n: 3 }) แทน {n} ในข้อความ · fallback: locale -> th -> key ดิบ
export const t = (key, params) => {
  let s = dict[locale]?.[key] ?? dict.th?.[key] ?? key;
  if (params) {
    for (const k in params) s = s.split('{' + k + '}').join(String(params[k]));
  }
  return s;
};
export const currentLocale = () => locale;
