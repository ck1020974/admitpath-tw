const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const records = require('../site/data/admissions_records.json');
const groups = require('../site/data/group_departments.json');
const source = fs.readFileSync(require.resolve('../site/app.js'), 'utf8');
let renderedYears;
const ctx = { state: { records, groups, filters: { advanced: {} }, placement: {} }, els: { yearFilter: {} },
  document: { getElementById: () => null },
  placementFilterOptions(select, years, label, selected) { renderedYears = { years, label, selected }; },
  getGroupNeedles: () => new Set(), getCategoryNeedles: () => new Set(),
  recordMatchesAdvancedFilters: () => true, placementChannelHasRequiredScores: () => true,
  placementSelectedNeedles: () => new Set(), renderAdvancedFilterSummary() {}, renderTable() {}, syncUrl() {},
  renderPlacementAnalysis() {}, hydratePlacementResultFilters() {}, renderAdvancedFilterDrawer() {},
};
vm.createContext(ctx);
for (const name of ['normalize', 'recordSearchText', 'queryKeywordMatches', 'refreshQueryYears', 'renderQueryShortcuts',
  'placementSchoolScopeAllows', 'isInternationalDualDegree', 'quickCategoryNeedles', 'cachedGroupNeedles', 'groupRowsToNeedles', 'matchesGroup', 'applyFilters',
  'placementMatchesFilters', 'defaultPlacementState', 'placementProfile', 'placementSubjects', 'resetPlacementFilters', 'defaultAdvancedFilters']) {
  vm.runInContext(source.match(new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}'))[0], ctx);
}
const electric = records.find(r => r.id === '115-personal_application-001572-115_apply');
for (const keyword of ['台大 電機', '臺大，電機', '電機 台大', '台灣大學 電機', '001572 電機', '  台大   電機  ']) {
  assert(ctx.queryKeywordMatches(electric, keyword), keyword);
}
assert(!ctx.queryKeywordMatches(electric, '台大 法律'));
assert(!ctx.queryKeywordMatches(electric, '清大 電機'));
assert(ctx.queryKeywordMatches({ schoolName: '國立清華大學', departmentName: '資訊工程學系' }, '清大 資工'));
assert(ctx.queryKeywordMatches(electric, ''));
ctx.refreshQueryYears({}, { channel: 'personal_application', year: '116' });
assert.equal(renderedYears.selected, 'all');
assert.equal(renderedYears.label, '全部年度');
assert.deepEqual(Array.from(renderedYears.years), ['115', '114']);
ctx.refreshQueryYears({}, { channel: 'exam_distribution', year: '115' });
assert.equal(renderedYears.selected, '115');
// 相同查詢條件在兩頁得到同一批校系；落點評分只發生在篩選之後。
for (const filters of [
  { keyword: '台大 電機' }, { keyword: '清大 資工' },
  { school: '國立臺灣大學' }, { schoolScope: 'ntu', quickCategory: '電機工程學類' },
  { year: '114', keyword: '英文', schoolScope: 'nthu' },
  { dualDegreeOnly: true }, { dualDegreeOnly: true, quickCategory: '電機工程學類' },
  { quickCategory: '心理學類' }, { quickCategory: '法律學類' },
]) {
  const shared = { year: 'all', channel: 'personal_application', school: 'all', schoolScope: 'all', quickCategory: '', keyword: '', ...filters };
  ctx.state.filters = { ...shared, advanced: {} };
  ctx.state.placement = { ...ctx.defaultPlacementState(), ...shared, stage: 'results' };
  ctx.applyFilters();
  const expected = records.filter(r => ctx.placementMatchesFilters(r, ctx.placementProfile())).map(r => r.id);
  assert(expected.length > 0, JSON.stringify(filters));
  assert.deepEqual(Array.from(ctx.state.filtered, r => r.id), expected);
}
ctx.state.placement.scores.國文 = '13';
const scores = ctx.state.placement.scores;
const channel = ctx.state.placement.channel;
ctx.state.placement.quickCategory = '電機工程學類';
ctx.state.placement.keyword = '台大';
ctx.state.placement.dualDegreeOnly = true;
ctx.state.filters.advanced.groups = ['工程學群'];
ctx.resetPlacementFilters();
assert.strictEqual(ctx.state.placement.scores, scores);
assert.equal(ctx.state.placement.channel, channel);
assert.equal(ctx.state.placement.keyword, '');
assert.equal(ctx.state.placement.quickCategory, '');
assert.equal(ctx.state.placement.dualDegreeOnly, false);
assert.equal(ctx.state.filters.advanced.groups.length, 0);
console.log('Shared queries: multi-keyword aliases, channel years, matching result sets, school/category filters and score-preserving reset passed.');
