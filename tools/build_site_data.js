'use strict';
// 將 site/data/admissions_records.json 拆成兩部分，讓首頁載入更快：
//   site/data/records_core.json      查詢、篩選、落點分析需要的欄位（首頁一次載入）
//   site/data/records_detail/NN.json 只在「校系詳情」才用到的長文字與來源網址（點開時才載入）
// 原始檔 admissions_records.json 不會被修改，覆核頁與工具腳本照常使用。
// 用法：node tools/build_site_data.js        產生拆分檔
//       node tools/build_site_data.js --check 只檢查拆分後能否完整還原
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'site/data');
const sourcePath = path.join(dataDir, 'admissions_records.json');
const corePath = path.join(dataDir, 'records_core.json');
const detailDir = path.join(dataDir, 'records_detail');
const BUCKETS = 64;

// 只在詳情抽屜顯示、或網站完全沒用到的欄位。
// 調整前請確認 site/app.js 與 site/admission-rules.js 的列表、篩選、落點邏輯沒有讀取它們。
const DETAIL_FIELDS = {
  '': ['sourceUrl', 'detailUrl', 'rawFields'],
  cacDetail: [
    'notes', 'reviewItems', 'reviewDescription', 'interviewOrTestDescription', 'overEnrollmentScreening',
    'secondStageItems', 'sameScoreOrder', 'academicPercentage', 'artPercentage',
    'importantDates', 'provenance', 'parserVersion', 'detailUrl', 'academicRankPercentile',
  ],
  starAdmissionResult: ['sourceUrl'],
  starRankStandard: ['sourceUrl', 'pdfPage'],
  applySieveResult: ['verification'],
  admissionAudit: ['detailSourceUrl', 'resultScope'],
};

function bucketOf(id) {
  let hash = 0;
  for (const char of String(id)) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return hash % BUCKETS;
}

function split(record) {
  const core = { ...record };
  const detail = {};
  for (const [group, fields] of Object.entries(DETAIL_FIELDS)) {
    const source = group ? record[group] : record;
    if (!source || typeof source !== 'object') continue;
    const moved = {};
    for (const field of fields) if (field in source) moved[field] = source[field];
    if (!Object.keys(moved).length) continue;
    if (group) {
      core[group] = { ...source };
      for (const field of Object.keys(moved)) delete core[group][field];
      detail[group] = moved;
    } else {
      for (const field of Object.keys(moved)) delete core[field];
      Object.assign(detail, moved);
    }
  }
  // 驗證方式仍是落點判定條件之一，留一個精簡版本在核心資料。
  const method = record.applySieveResult?.verification?.method;
  if (method) core.applySieveResult.verification = { method };
  // 關鍵字搜尋會用到 rawFields 的內容，保留為單一字串。
  if (record.rawFields) core.rawText = Object.values(record.rawFields).join(' ');
  if (Object.keys(detail).length) core.detailChunk = bucketOf(record.id);
  return { core, detail };
}

// 與 site/app.js 的 mergeRecordDetail 相同：把詳情欄位併回核心資料。
function merge(core, detail) {
  const merged = { ...core };
  for (const [key, value] of Object.entries(detail || {})) {
    merged[key] = value && typeof value === 'object' && !Array.isArray(value) && merged[key] && typeof merged[key] === 'object'
      ? { ...merged[key], ...value }
      : value;
  }
  delete merged.detailChunk;
  delete merged.rawText;
  return merged;
}

function build({ check = false } = {}) {
  const records = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const cores = [];
  const chunks = Array.from({ length: BUCKETS }, () => ({}));
  for (const record of records) {
    const { core, detail } = split(record);
    cores.push(core);
    if (core.detailChunk !== undefined) chunks[core.detailChunk][record.id] = detail;
  }
  records.forEach((record, index) => {
    const restored = merge(cores[index], chunks[cores[index].detailChunk]?.[record.id]);
    if (JSON.stringify(sortKeys(restored)) !== JSON.stringify(sortKeys(record))) {
      throw new Error(`拆分後無法還原：${record.id}`);
    }
  });
  if (check) return { records: records.length };
  fs.writeFileSync(corePath, JSON.stringify(cores));
  fs.rmSync(detailDir, { recursive: true, force: true });
  fs.mkdirSync(detailDir, { recursive: true });
  chunks.forEach((chunk, index) => fs.writeFileSync(path.join(detailDir, `${index}.json`), JSON.stringify(chunk)));
  return { records: records.length, coreBytes: fs.statSync(corePath).size, sourceBytes: fs.statSync(sourcePath).size };
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortKeys(value[key])]));
}

if (require.main === module) {
  const check = process.argv.includes('--check');
  const result = build({ check });
  if (check) console.log(`Site data split verified: ${result.records} records.`);
  else console.log(`Site data split: ${result.records} records, core ${(result.coreBytes / 1e6).toFixed(1)} MB (原始 ${(result.sourceBytes / 1e6).toFixed(1)} MB).`);
}

module.exports = { build, split, merge, bucketOf, BUCKETS, DETAIL_FIELDS };
