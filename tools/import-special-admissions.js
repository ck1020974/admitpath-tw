const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const match = html.match(/<table[^>]*id="school-table"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
if (!match) throw Error('Official table not found');
function clean(value = '') { return value.replace(/<!--[\s\S]*?-->/g, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\r/g, '').split('\n').map(part => part.trim()).filter(Boolean).join('\n'); }
function cells(row) { return [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(item => clean(item[1])); }
function href(row = '') { return row.match(/<a\s+[^>]*href="([^"]+)"/i)?.[1] || ''; }
const rows = [...match[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(item => item[1]);
const records = [];
for (let index = 0; index < rows.length; index += 3) {
  const main = cells(rows[index]); const contact = cells(rows[index + 1]); const note = cells(rows[index + 2]);
  if (main.length < 7) continue;
  const [, area, type, school] = main[0].match(/【([^、]+)、([^】]+)】\s*([\s\S]+)/) || [];
  const quota = Number(String(main[4]).replace(/[^0-9]/g, ''));
  if (!school || !Number.isFinite(quota)) continue;
  records.push({ id: `special-115-${records.length + 1}`, year: 115, area, type, school: school.trim(), department: main[1], plan: main[2], target: main[3], quota, exam: main[5], schedule: main[6], contact: contact[0] || '', url: href(rows[index + 1]), note: note[0] || '' });
}
if (records.length !== 747) throw Error(`Expected 747 records but found ${records.length}`);
fs.writeFileSync('site/data/special_admissions_115.json', JSON.stringify({ source: 'https://srecruit.moe.edu.tw/', retrieved: '2026-09-18', records }, null, 2));
console.log(JSON.stringify({ rows: records.length, schools: new Set(records.map(r => r.school)).size, quota: records.reduce((sum, r) => sum + r.quota, 0) }));
