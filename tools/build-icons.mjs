/**
 * สร้างชุดไอคอน offline จาก lucide-static และ @fortawesome/fontawesome-free
 *
 * อ่านทะเบียนจาก resources/icons.json แล้วดึงเฉพาะไอคอนที่ระบุไว้ ออกมาเป็น
 * ไฟล์ข้อมูลให้ทั้งสองฝั่งใช้ชุดเดียวกัน:
 *   app/Helpers/icons_data.php      - ให้ PHP view เรียกผ่าน icon()
 *   resources/js/lib/icons-data.js  - ให้ React เรียกผ่าน <Icon />
 *
 * ผลลัพธ์ไม่พึ่ง node_modules ตอน runtime จึงไม่ต้องติดตั้ง node บนเซิร์ฟเวอร์
 * รัน: npm run icons
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SOURCES = {
  'lucide':     { dir: 'node_modules/lucide-static/icons',                        kind: 'stroke' },
  'fa-solid':   { dir: 'node_modules/@fortawesome/fontawesome-free/svgs/solid',   kind: 'fill' },
  'fa-regular': { dir: 'node_modules/@fortawesome/fontawesome-free/svgs/regular', kind: 'fill' },
  'fa-brands':  { dir: 'node_modules/@fortawesome/fontawesome-free/svgs/brands',  kind: 'fill' },
};

// ดึง viewBox + เนื้อในของ <svg> ตัดคอมเมนต์ license และ attribute ที่ตัวเรนเดอร์จะใส่เอง
function extract(file, kind) {
  const svg = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const viewBox = (svg.match(/viewBox="([^"]+)"/) || [, '0 0 24 24'])[1];
  const body = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>[\s\S]*$/, '')
    .replace(/\s*fill="currentColor"/g, '')   // ให้ <svg> ตัวนอกคุมสีแทน
    .replace(/\s+/g, ' ')
    .trim();

  return { viewBox, body, kind };
}

// escape ให้เป็น string เดี่ยวของ PHP (backslash แล้วค่อย single quote)
function phpString(value) {
  const escaped = String(value).split('\\').join('\\\\').split("'").join("\\'");

  return "'" + escaped + "'";
}

const manifest = JSON.parse(readFileSync('resources/icons.json', 'utf8'));
const icons = {};
const missing = [];

for (const [name, ref] of Object.entries(manifest)) {
  if (name.startsWith('_')) continue;

  const [src, iconName] = ref.split(':');
  const source = SOURCES[src];

  if (!source) {
    missing.push(name + ': ไม่รู้จักแหล่ง "' + src + '"');
    continue;
  }

  const file = source.dir + '/' + iconName + '.svg';

  if (!existsSync(file)) {
    missing.push(name + ': ไม่พบ ' + file);
    continue;
  }

  icons[name] = extract(file, source.kind);
}

if (missing.length) {
  console.error('สร้างไอคอนไม่สำเร็จ:');
  missing.forEach((m) => console.error('  - ' + m));
  process.exit(1);
}

const names = Object.keys(icons).sort();
const stamp = 'ไฟล์นี้ generate โดย tools/build-icons.mjs - ห้ามแก้มือ แก้ที่ resources/icons.json แล้วรัน npm run icons';

const php = [
  '<?php',
  '',
  '/**',
  ' * ข้อมูลไอคอน (viewBox + เนื้อในของ svg + ชนิด stroke/fill)',
  ' * ' + stamp,
  ' */',
  '',
  'return [',
  ...names.map((n) => {
    const i = icons[n];

    return '    ' + phpString(n) + ' => [\'vb\' => ' + phpString(i.viewBox)
      + ', \'kind\' => ' + phpString(i.kind)
      + ', \'body\' => ' + phpString(i.body) + '],';
  }),
  '];',
  '',
].join('\n');

const js = [
  '// ' + stamp,
  'export const ICONS = {',
  ...names.map((n) => '  ' + JSON.stringify(n) + ': ' + JSON.stringify(icons[n]) + ','),
  '};',
  '',
].join('\n');

writeFileSync('app/Helpers/icons_data.php', php);
writeFileSync('resources/js/lib/icons-data.js', js);

const byKind = names.reduce((acc, n) => {
  acc[icons[n].kind] = (acc[icons[n].kind] || 0) + 1;

  return acc;
}, {});

console.log('สร้างไอคอนแล้ว ' + names.length + ' ตัว (stroke ' + (byKind.stroke || 0) + ' · fill ' + (byKind.fill || 0) + ')');
console.log('  -> app/Helpers/icons_data.php');
console.log('  -> resources/js/lib/icons-data.js');
