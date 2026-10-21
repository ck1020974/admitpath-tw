'use strict';
// 確認拆分後的 records_core.json 在查詢列表、關鍵字、科目篩選、資料狀態與落點判定上，
// 與完整的 admissions_records.json 結果完全相同，且詳情載入後能還原原始資料。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { split, merge } = require('./build_site_data.js');

const root = path.resolve(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'site/data', name), 'utf8'));
const full = read('admissions_records.json');
const gsat = read('ceec_gsat_five_standard_scores.json');
const quality = read('apply114_quality_report.json');
const results = read('distribution_results.json');
const groups = read('group_departments.json');

function stubElement() {
  return new Proxy(function () {}, {
    get: (target, key) => (key === Symbol.toPrimitive ? () => '' : stubElement()),
    apply: () => stubElement(),
    set: () => true,
  });
}

function session(records) {
  const context = vm.createContext({
    AdmissionRules: require('../site/admission-rules.js'),
    console, Intl, URLSearchParams,
    window: { location: { search: '', hash: '' }, GroupIntroductions: require('../site/group-introductions.js') },
    location: { search: '', hash: '' },
    history: { replaceState() {}, pushState() {} },
    setTimeout() {}, clearTimeout() {},
    document: { body: stubElement(), getElementById: stubElement, querySelector: stubElement, querySelectorAll: () => [], addEventListener() {} },
    __data: { records, gsat, quality, results, groups },
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'site/app.js'), 'utf8'), context);
  vm.runInContext(`
    state.records = __data.records; state.gsatStandards = __data.gsat; state.qualityReport = __data.quality;
    state.results = __data.results; state.groups = __data.groups; state.placement = defaultPlacementState(); buildRecordIndexes();
  `, context);
  return context;
}

const profiles = [
  { 國文: 12, 英文: 13, 數A: 11, 數B: 12, 社會: 12, 自然: 11, 英聽: 'A', 在校: 10 },
  { 國文: 15, 英文: 15, 數A: 15, 數B: 15, 社會: 15, 自然: 15, 英聽: 'A', 在校: 1, 數甲: 80, 數乙: 80, 物理: 80, 化學: 80, 生物: 80, 歷史: 80, 地理: 80, 公民: 80 },
  { 國文: 9, 英文: 8, 數A: 7, 數B: 9, 社會: 10, 自然: 8, 在校: 40, 數甲: 40, 物理: 45 },
];

function snapshot(context) {
  return vm.runInContext(`(() => {
    const profiles = ${JSON.stringify(profiles)};
    return state.records.map((record) => JSON.stringify([
      record.id,
      recordSearchText(record),
      workbenchRecordRowHtml(record),
      [...recordSubjectKeys(record)].sort(),
      dataQualityStatusInfo(record),
      profiles.map((scores) => {
        const profile = { ...placementProfile(), scores, channels: ["personal_application", "star_recommendation", "exam_distribution"] };
        const evaluation = evaluatePlacementRecord(record, profile);
        return [evaluation.status, evaluation.gapTotal, placementResultCardHtml(record, evaluation)];
      }),
    ]));
  })()`, context);
}

const coreRecords = full.map(record => split(record).core);
const expected = snapshot(session(full));
const actual = snapshot(session(coreRecords));
assert.equal(actual.length, expected.length);
let differences = 0;
expected.forEach((row, index) => {
  if (row !== actual[index] && differences++ < 3) console.error('Different:', full[index].id);
});
assert.equal(differences, 0, `${differences} records render differently with the split data`);

// 詳情載入：用 app.js 的 mergeRecordDetail 合併後，詳情抽屜內容與完整資料一致。
const fullContext = session(full);
const coreContext = session(coreRecords.map(record => JSON.parse(JSON.stringify(record))));
let checked = 0;
full.forEach((record, index) => {
  const { detail } = split(record);
  if (!Object.keys(detail).length) return;
  vm.runInContext(`mergeRecordDetail(state.records[${index}], ${JSON.stringify(detail)})`, coreContext);
  const expectedHtml = vm.runInContext(`detailHtml(state.records[${index}], null)`, fullContext);
  const actualHtml = vm.runInContext(`detailHtml(state.records[${index}], null)`, coreContext);
  assert.equal(actualHtml, expectedHtml, record.id);
  assert.deepEqual(merge(split(record).core, detail), record);
  checked++;
});

console.log(`Site data split: ${expected.length} records list/placement identical, ${checked} detail drawers identical after lazy load.`);
