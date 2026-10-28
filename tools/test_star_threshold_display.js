const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../site/app.js'), 'utf8');
const records = require('../site/data/admissions_records.json').filter(r => r.channelKey === 'star_recommendation');
const standards = require('../site/data/ceec_gsat_five_standard_scores.json');
const ctx = { state: { gsatStandards: standards }, kv: (key, value) => key + ': ' + value, escapeHtml: String };
vm.createContext(ctx);
for (const name of ['normalizeSubject', 'shortSubject', 'formatSubjectScore', 'formatStarRequirement', 'starThresholdParts',
  'formatStarPdfRequirements', 'cacDetailHtml', 'placementStarRequirements', 'uniquePlacementRequirements']) {
  vm.runInContext(source.match(new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}'))[0], ctx);
}
for (const standard of ['頂標', '前標', '均標', '後標', '底標']) {
  assert.equal(ctx.formatStarRequirement(115, { subject: '英文', standard, score: '8' }), '英文 ' + standard);
  assert.equal(ctx.formatStarRequirement(115, { subject: '英文', standard }), '英文 ' + standard);
}
assert.equal(ctx.formatStarRequirement(115, { subject: '英聽', standard: 'A級' }), '英聽A');
assert.equal(ctx.formatStarRequirement(115, { subject: '數學A', standard: '--', score: '' }), '');
assert.equal(ctx.formatStarRequirement(115, { subject: '術科', score: '60' }), '術科 60');
const pharmacy = records.find(r => r.id === '115-star_recommendation-00144-115_star');
assert.equal(Array.from(ctx.starThresholdParts(pharmacy)).join('、'), '國文 均標、英文 均標、數A 頂標、自然 頂標');
assert.equal(ctx.formatStarPdfRequirements(115, pharmacy.starAdmissionResult.testRequirements), '國文 均標、英文 均標、數A 頂標、自然 頂標');
const detail = ctx.cacDetailHtml(pharmacy, { ...pharmacy.cacDetail, notes: '' });
assert(detail.includes('學測/英聽檢定: 國文 均標、英文 均標、數A 頂標、自然 頂標'));
// 顯示改為五標後，分析仍取得原本的數值門檻。
const numeric = ctx.placementStarRequirements(pharmacy).filter(r => r.kind === 'score');
assert.deepEqual(Array.from(numeric, r => [r.subjects[0], r.threshold]), [['國文',10], ['英文',8], ['數A',12], ['自然',13]]);
let checked = 0;
for (const record of records) {
  const items = record.starAdmissionResult?.testRequirements?.length ? record.starAdmissionResult.testRequirements : record.cacDetail?.testRequirements || [];
  const expected = items.filter(i => ['頂標', '前標', '均標', '後標', '底標'].includes(i.standard));
  const labels = Array.from(ctx.starThresholdParts(record));
  for (const item of expected) {
    assert(labels.includes(ctx.shortSubject(item.subject) + ' ' + item.standard), record.id);
    checked++;
  }
}
console.log('Star threshold display: ' + records.length + ' records, ' + checked + ' five-standard labels, PDF/fallback, listening and numeric analysis thresholds passed.');
