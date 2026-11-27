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
assert.equal(evaluate(chemistry, { ...all15, 英文: 16 }).status, 'missing');
const unresolved = { ...chemistry, cacDetail: { screeningSubjects: [{ subject: '國文', standard: '未知標準' }] } };
assert.equal(evaluate(unresolved, all15).status, 'missing');

// 特殊條件逐項寫出；藝術類版面但不需術科、術科欄位全是「--」的校系不算特殊條件。
const art = records.find(r => r.examRequired === '是' && (r.cacDetail?.artSubjects || []).some(a => a.subject === '素描'));
assert(rules.specialConditionList(art).some(item => item.key === 'art' && item.detail.includes('素描')));
const apcs = records.find(r => (r.cacDetail?.apcsSubjects || []).some(a => a.subject === '程式實作'));
assert(rules.specialConditionList(apcs).some(item => item.key === 'apcs' && item.detail.includes('程式實作')));
const artLayoutOnly = records.find(r => r.cacDetail?.layout === 'art' && r.examRequired !== '是'
  && (r.cacDetail.artSubjects || []).every(a => a.subject === '--') && !/APCS/.test(r.departmentName) && !(r.cacDetail.apcsSubjects || []).length && !r.militaryAdmission);
assert(artLayoutOnly && !rules.hasSpecialConditions(artLayoutOnly), 'art layout without 術科 is not a special condition');

// 對照過官方原表的「--」= 該順位沒刷人：略過該順位，用其他順位照常判定。
const reviewedBlank = records.find(r => r.year === 115 && r.channelKey === 'personal_application' && rules.officiallyReviewed(r)
  && (r.applySieveResult?.rankedItems || []).some(i => i.score === '' && i.subjects.every(s => ['國文', '英文', '數A', '數B', '社會', '自然'].includes(s)))
  && (r.applySieveResult.rankedItems || []).some(i => /^\d/.test(i.score)) && !rules.hasSpecialConditions(r));
assert(reviewedBlank, 'need a reviewed record with a blank 順位');
assert.notEqual(evaluate(reviewedBlank, all15).status, 'missing', reviewedBlank.departmentName);
// 全部「--」（沒有篩選）：通過檢定即照常判定，並標示未篩選。
const unscreened = records.find(r => r.year === 115 && r.channelKey === 'personal_application' && rules.noScreening(r));
assert(unscreened && evaluate(unscreened, all15).noScreening === true && evaluate(unscreened, all15).status !== 'missing', 'unscreened');
// 未核對的空白仍是資料不足。
const unreviewedBlank = { ...reviewedBlank, admissionAudit: { resultStatus: 'pending' }, applySieveResult: { ...reviewedBlank.applySieveResult, verification: undefined } };
assert.equal(rules.officiallyReviewed(unreviewedBlank), false);

const app = fs.readFileSync(require.resolve('../site/app.js'), 'utf8');
const context = { AdmissionRules: rules, escapeHtml: String, escapeAttr: String };
vm.createContext(context);
for (const name of ['placementResultSummary', 'placementCardNote', 'placementRequirementChipsHtml', 'placementRequirementLabel']) {
  vm.runInContext(app.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))[0], context);
}
const chips = context.placementRequirementChipsHtml(evaluate(chemistry, belowScreening).requirements);
assert(chips.includes('一階篩選') && chips.includes('申請門檻'));
assert(chips.indexOf('申請門檻') < chips.indexOf('一階篩選'));
assert.equal(context.placementResultSummary(evaluate(missing, all15)), '資料不足');
assert(context.placementResultSummary(evaluate(chemistry, all15)).endsWith('・暫估'));

// 申請門檻全部達標時合成一句；一階篩選只寫門檻，未達的標籤用 miss 樣式。
const test = (status) => ({ kind: 'score', subjects: ['國文'], actual: 12, threshold: 10, standard: '均標', source: '檢定', status });
const screen = { kind: 'score', subjects: ['英文'], actual: 10, threshold: 11, source: '倍率篩選', status: 'miss' };
const sum = { kind: 'sum', subjects: ['國文', '社會'], actual: 24, threshold: 23, source: '官方篩選暫估', status: 'match' };
const metHtml = context.placementRequirementChipsHtml([test('match'), test('match'), screen, sum]);
assert(metHtml.includes('申請門檻：已符合'));
assert(!metHtml.includes('均標'), '全部達標時不逐項列出申請門檻');
assert(metHtml.includes('>英文 11<') && metHtml.includes('placement-req miss'));
assert(metHtml.includes('>國文+社會 23<'));
const unmetHtml = context.placementRequirementChipsHtml([test('match'), { ...test('miss'), subjects: ['英文'] }]);
assert(!unmetHtml.includes('已符合') && unmetHtml.includes('英文') && unmetHtml.includes('未達'));
assert(!unmetHtml.includes('國文'), '有未達時只列沒達到的申請門檻');
assert(context.placementRequirementChipsHtml([test('match')], true).includes('已收錄項目符合'), '資料不足時不能說全部符合');
// 所有狀態同一種寫法：剛好達標／超出 N／差 N，估計資料加「・暫估」；資料不足由標籤表示，不重複。
assert.equal(context.placementCardNote({ status: 'match', margin: 0 }), '剛好達標');
assert.equal(context.placementCardNote({ status: 'match', margin: 1 }), '超出 1');
assert.equal(context.placementCardNote({ status: 'safe', margin: 3 }), '超出 3');
assert.equal(context.placementCardNote({ status: 'match' }), '達標');
assert.equal(context.placementCardNote({ status: 'match', margin: 0, estimatedScreeningData: true }), '剛好達標・暫估');
assert.equal(context.placementCardNote({ status: 'near', gapTotal: 1 }), '差 1');
assert.equal(context.placementCardNote({ status: 'near', gapTotal: 1, estimatedScreeningData: true }), '差 1・暫估');
assert.equal(context.placementCardNote({ status: 'miss', gapTotal: 5, pendingData: true }), '差 5・暫估');
assert.equal(context.placementCardNote({ status: 'missing', pendingData: true }), '');

// 空白校排不能當作前 0%；缺少分發錄取分數或無法判斷的成績也不能顯示符合。
Object.assign(context, { advancedSubjectKey: String, shortSubject: String,
  state: { gsatStandards: standards }, placementRecordRequirements: () => context.testRequirements });
for (const name of ['evaluatePlacementRecord', 'evaluatePlacementRecordBase', 'placementSafetyMargin', 'placementMissingReason', 'placementRequirementResult', 'placementScoreValue']) {
  vm.runInContext(app.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))[0], context);
}
context.testRequirements = [{ kind: 'percent', subjects: ['在校'], threshold: 5, source: '校排' }];
const star = { channelKey: 'star_recommendation' };
assert.equal(context.evaluatePlacementRecord(star, { scores: {} }).status, 'missing');
// 校排門檻 5%：剛好或只好 1 個百分點為符合，好 2 個以上為保底。
assert.equal(context.evaluatePlacementRecord(star, { scores: { 在校: 5 } }).status, 'match');
assert.equal(context.evaluatePlacementRecord(star, { scores: { 在校: 4 } }).status, 'match');
assert.equal(context.evaluatePlacementRecord(star, { scores: { 在校: 3 } }).status, 'safe');
assert(!['match', 'safe'].includes(context.evaluatePlacementRecord(star, { scores: { 在校: 6 } }).status));
context.testRequirements = [];
assert.equal(context.evaluatePlacementRecord({ channelKey: 'exam_distribution' }, { scores: all15 }).status, 'missing');
context.testRequirements = [{ kind: 'weightedTotal', subjects: ['數甲'], weighted: [{ subject: '數甲', weight: 1 }], threshold: null }];
assert.equal(context.evaluatePlacementRecord({ channelKey: 'exam_distribution' }, { scores: { 數甲: 50 } }).status, 'missing');
assert.equal(context.placementScoreValue({ scores: { 國文: -3 } }, '國文'), null);
assert.equal(context.placementScoreValue({ scores: { 數甲: 61 } }, '數甲'), null);
Object.assign(context, { distributionResult: () => ({ regularTotalScore: null }),
  distributionSubjectLabel: String, distributionWeightLabel: String });
vm.runInContext(app.match(/function placementDistributionRequirements\([\s\S]*?\n\}/)[0], context);
assert.equal(context.placementDistributionRequirements({ weightedSubjects: [{ subject: '數甲', weight: 1, raw: '1' }] })[0].threshold, null);

// 資料不足的卡片寫出原因；官方「--」表示該順位沒有刷人。
const reason = (sieve, extra = {}) => context.placementMissingReason({ channelKey: 'personal_application', applySieveResult: sieve, ...extra }, { status: 'missing', ...extra.evaluation });
assert.equal(reason({}), '尚未收錄一階結果');
assert.equal(reason({ publishedStatus: 'not-published', rankedItems: [] }), '一階結果待核對');
assert.equal(reason({ rankedItems: [{ rank: 1, subjects: ['社會'], score: '' }, { rank: 2, subjects: ['國文'], score: '7' }] }), '一階結果待核對');
assert.equal(reason({ rankedItems: [{ rank: 1, subjects: ['素描'], score: '80' }] }), '一階看術科');
assert.equal(reason({ rankedItems: [{ rank: 1, subjects: ['APCS實作'], score: '3' }] }), '一階看APCS');
assert.equal(reason({ specializations: [{ major: '鋼琴' }] }), '依主修術科篩選');
assert.equal(context.placementCardNote({ status: 'missing', missingReason: '尚未收錄一階結果' }), '尚未收錄一階結果');
console.log('Placement screening: missing-image single/sum cutoffs, verified results, math alternatives, incomplete data, invalid cutoffs and UI labels passed.');
