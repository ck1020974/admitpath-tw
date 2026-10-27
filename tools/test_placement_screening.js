const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const rules = require('../site/admission-rules.js');
const records = require('../site/data/admissions_records.json');
const standards = require('../site/data/ceec_gsat_five_standard_scores.json');
const find = code => records.find(r => r.year === 115 && r.channelKey === 'personal_application' && r.programCode === code);
const evaluate = (record, scores) => rules.evaluate(record, { scores }, standards);

// 實際漏算案例：沒有原圖網址，但已收錄的一階單科／合計級分都必須參與分析。
const chemistry = find('001112');
assert.equal(chemistry.applySieveResult.sourceImageUrl, '');
const belowScreening = { 國文: 10, 英文: 13, 數A: 12, 自然: 13 };
assert(rules.thresholds(chemistry, standards).every(r => rules.check(r, { scores: belowScreening }).status === 'match'));
assert.equal(evaluate(chemistry, belowScreening).status, 'near');
assert.equal(evaluate(chemistry, belowScreening).estimatedScreeningData, true);
assert.equal(evaluate(chemistry, { 國文: 10, 英文: 14, 數A: 12, 自然: 14 }).status, 'match');
const electrical = find('001572');
assert.notEqual(evaluate(electrical, { 英文: 13, 數A: 12, 自然: 13 }).status, 'match');
assert.equal(evaluate(electrical, { 英文: 15, 數A: 14, 自然: 15 }).status, 'match');
assert(rules.requirements(electrical, standards).some(r => r.kind === 'sum' && r.threshold === 44));

// 既有已核對篩選不能退回只判斷門檻；數A／數B擇一也仍然保留。
const literature = find('001012');
assert.equal(evaluate(literature, { 國文: 13, 英文: 13, 社會: 13, 數B: 13 }).status, 'near');
assert.equal(evaluate(literature, { 國文: 15, 英文: 10, 社會: 10, 數B: 5 }).status, 'match');

const all15 = { 國文: 15, 英文: 15, 數A: 15, 數B: 15, 社會: 15, 自然: 15, 英聽: 'A' };
const missing = { ...chemistry, applySieveResult: {} };
assert.equal(evaluate(missing, all15).status, 'missing');
assert.equal(evaluate(missing, all15).pendingData, true);
const malformed = { ...chemistry, applySieveResult: { rankedItems: [{ subjects: ['英文'], score: '99' }] } };
assert.equal(evaluate(malformed, all15).status, 'missing');
const partial = { ...chemistry, applySieveResult: { rankedItems: [{ subjects: ['英文'], score: '14' }, { subjects: ['自然'], score: '--' }] } };
assert.equal(evaluate(partial, all15).status, 'missing');
const noRequirements = { channelKey: 'personal_application', year: 115 };
assert.equal(evaluate(noRequirements, all15).status, 'missing');

const app = fs.readFileSync(require.resolve('../site/app.js'), 'utf8');
const context = { AdmissionRules: rules, escapeHtml: String, escapeAttr: String };
vm.createContext(context);
for (const name of ['placementResultSummary', 'placementRequirementChipsHtml', 'placementRequirementLabel']) {
  vm.runInContext(app.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))[0], context);
}
const chips = context.placementRequirementChipsHtml(evaluate(chemistry, belowScreening).requirements);
assert(chips.includes('一階篩選') && chips.includes('申請門檻'));
assert(context.placementResultSummary(evaluate(missing, all15)).includes('一階篩選資料不足'));
assert(context.placementResultSummary(evaluate(chemistry, all15)).includes('暫估'));
console.log('Placement screening: missing-image single/sum cutoffs, verified results, math alternatives, incomplete data, invalid cutoffs and UI labels passed.');
