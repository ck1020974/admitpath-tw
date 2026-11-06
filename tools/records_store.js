'use strict';
// 校系資料的原始檔放在 site/data/records/，依年度與管道分檔、一筆一行，改動時 Git 只記錄該行。
// site/data/admissions_records.json 是合併產生的檔案，不進 Git；網站、測試與工具照常讀取。
// 用法：node tools/records_store.js merge  由分檔產生完整檔
//       node tools/records_store.js split  匯入工具改過完整檔後，寫回分檔
const fs = require('node:fs');
const path = require('node:path');

const dataDir = path.resolve(__dirname, '../site/data');
const recordsDir = path.join(dataDir, 'records');
const indexPath = path.join(recordsDir, 'index.json');
const mergedPath = path.join(dataDir, 'admissions_records.json');

function fileNameOf(record) {
  const group = record.militaryAdmission ? 'military_application' : record.channelKey;
  return `${record.year}_${group}.json`;
}

function readIndex() {
  return fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')) : [];
}

function merge() {
  const files = readIndex();
  const bodies = files.map((name) => fs.readFileSync(path.join(recordsDir, name), 'utf8').trim().slice(1, -1).trim());
  const text = `[${bodies.filter(Boolean).join(',\n')}]\n`;
  if (fs.existsSync(mergedPath)) {
    const current = fs.readFileSync(mergedPath, 'utf8');
    if (current === text) return { files: files.length, changed: false };
    const newestSource = Math.max(...[indexPath, ...files.map((name) => path.join(recordsDir, name))].map((file) => fs.statSync(file).mtimeMs));
    if (fs.statSync(mergedPath).mtimeMs > newestSource) {
      throw new Error('admissions_records.json 有尚未寫回的修改，請先執行 node tools/records_store.js split');
    }
  }
  fs.writeFileSync(mergedPath, text);
  return { files: files.length, changed: true };
}

function split() {
  const records = JSON.parse(fs.readFileSync(mergedPath, 'utf8'));
  const groups = new Map(readIndex().map((name) => [name, []]));
  for (const record of records) {
    const name = fileNameOf(record);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(JSON.stringify(record));
  }
  fs.mkdirSync(recordsDir, { recursive: true });
  for (const [name, lines] of groups) {
    const file = path.join(recordsDir, name);
    if (lines.length) fs.writeFileSync(file, `[${lines.join(',\n')}]\n`);
    else fs.rmSync(file, { force: true });
  }
  const files = [...groups].filter(([, lines]) => lines.length).map(([name]) => name);
  fs.writeFileSync(indexPath, `${JSON.stringify(files, null, 2)}\n`);
  return { files: files.length, records: records.length };
}

if (require.main === module) {
  const command = process.argv[2];
  if (command === 'merge') console.log(`Records merged from ${merge().files} files.`);
  else if (command === 'split') {
    const result = split();
    console.log(`Records split: ${result.records} records in ${result.files} files.`);
  } else {
    console.error('用法：node tools/records_store.js merge|split');
    process.exit(1);
  }
}

module.exports = { fileNameOf, merge, split, readIndex, recordsDir, mergedPath };
