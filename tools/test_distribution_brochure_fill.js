// 分發校系分則要完整：採計加權須和官方放榜結果一致，同分科目須依簡章順序。
const assert = require('node:assert/strict');
const records = require('../site/data/admissions_records.json').filter((r) => r.channelKey === 'exam_distribution');
const results = require('../site/data/distribution_results.json');

const SHORT = { 國文: '國', 英文: '英', 數學甲: '數甲', 數學乙: '數乙', 數學A: '數A', 數學B: '數B', 物理: '物', 化學: '化',
  生物: '生', 歷史: '歷', 地理: '地', 公民與社會: '公', 社會: '社', 自然: '自' };
const compact = (text) => String(text ?? '').replace(/\s/g, '');
const subjectsOf = (record) => (record.weightedSubjects || []).filter((item) => item.subject);
const label = (item) => (item.exam_type === '術科' ? '術' : SHORT[compact(item.subject)] || compact(item.subject));

let tieChecked = 0;
for (const record of records) {
  const name = `${record.year}-${record.programCode} ${record.schoolName}${record.departmentName}`;
  const result = results[`${record.year}-${record.programCode}`];
  assert(result, name);
  assert.match(record.schoolCode, /^\d{3}$/, name);
  assert.match(String(record.quota), /^\d+$/, name);
  assert.match(String(record.extraQuota), /^\d+$/, name);
  assert(!/其他各類外加|本頁以下空白/.test(record.selectionNotes + record.departmentName), name);
  assert(!/---/.test(record.testRequirementStandard), name);

  const subjects = subjectsOf(record);
  assert.equal(record.weightedSubjects.length, 5, name);
  assert.equal(subjects.map((item) => `${label(item)}x${item.weight}`).join(' '), compact(result.weightedSubjectsCompact).replace(/([\d.]{4})(?=\D)/g, '$1 '), name);
  assert.deepEqual(subjects.map((item) => Number(item.tie_break_order)), [...subjects.keys()].map((i) => i + 1), name);

  // 官方同分參酌列出的科目，順序必須是簡章同分順序的前段。
  const tie = String(result.regularTieBreak || '').replace(/-{3,}/g, ' ');
  const tieSubjects = (tie.match(/[^\s\d.]+/g) || []).map(compact);
  tieSubjects.slice(0, subjects.length).forEach((subject, index) => assert.equal(subject, label(subjects[index]), name));
  if (tieSubjects.length) tieChecked += 1;
}

const byCode = (year, code) => records.find((r) => r.year === year && r.programCode === code);
assert.equal(records.filter((r) => r.year === 115).length, 1764);
assert.equal(records.filter((r) => r.year === 114).length, 1787);
assert.equal(byCode(115, '0001').quota, '20');
assert.equal(byCode(115, '0001').testRequirementStandard, '1. 數學 A(均標)或數學 B(均標)');
assert.equal(byCode(114, '2663').testRequirementStandard, '英 聽 (Ｂ級)'); // 臺藝戲劇(男)
console.log(`Distribution brochure fill: ${records.length} records complete, ${tieChecked} tie-break orders match results.`);
