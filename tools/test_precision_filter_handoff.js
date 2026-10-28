const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const records = require('../site/data/admissions_records.json');
const groups = require('../site/data/group_departments.json');
const source = fs.readFileSync(require.resolve('../site/app.js'), 'utf8');
let open = false;
let analysisRows = [];
const ctx = { state: { records, groups, results: {}, view: 'workbench', linkedGroup: '工程學群', linkedCategory: '電機工程學類' },
  els: { yearFilter: {}, schoolFilter: { value: '國立臺灣大學' }, advancedFilterDrawer: {
    classList: { add() { open = true; }, remove() { open = false; } }, setAttribute() {},
  } }, document: { getElementById: () => null },
  getGroupNeedles: () => new Set(), getCategoryNeedles: () => new Set(),
  placementFilterOptions() {}, renderAdvancedFilterSummary() {}, renderTable() {}, syncUrl() {},
  hydratePlacementResultFilters() {}, renderAdvancedFilterDrawer() {},
  placementSelectedNeedles: () => new Set(), placementChannelHasRequiredScores: () => true,
  specialAdmissionInfo: () => ({ special: false }),
  renderPlacementAnalysis() { analysisRows = records.filter(r => ctx.placementMatchesFilters(r, ctx.placementProfile())); },
};
vm.createContext(ctx);
vm.runInContext('let advancedFilterDraft = null;', ctx);
for (const name of ['normalize', 'recordSearchText', 'queryKeywordMatches', 'refreshQueryYears', 'renderQueryShortcuts',
  'placementSchoolScopeAllows', 'isInternationalDualDegree', 'quickCategoryNeedles', 'cachedGroupNeedles', 'groupRowsToNeedles', 'matchesGroup', 'applyFilters',
  'placementMatchesFilters', 'defaultPlacementState', 'placementProfile', 'placementSubjects', 'defaultAdvancedFilters',
  'cloneAdvancedFilters', 'currentAdvancedFilters', 'clearOuterSchoolFilters', 'openAdvancedFilters', 'closeAdvancedFilters',
  'recordMatchesAdvancedFilters', 'specialAdmissionModeAllows', 'advancedSubjectKey', 'recordSubjectKeys',
  'advancedSubjectKeysFromText', 'shortSubject', 'normalizeSubject']) {
  vm.runInContext(source.match(new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}'))[0], ctx);
}
for (const view of ['workbench', 'placement']) {
  ctx.state.view = view;
  const outer = { year: '115', channel: 'personal_application', school: '國立臺灣大學', schoolScope: 'ntu',
    quickCategory: '電機工程學類', dualDegreeOnly: true, keyword: '', advanced: ctx.defaultAdvancedFilters() };
  ctx.state.filters = { ...outer };
  ctx.state.placement = { ...ctx.defaultPlacementState(), ...outer, stage: 'results', scores: { 國文: '13', 英文: '12' } };
  const scores = ctx.state.placement.scores;
  const inactiveScope = view === 'workbench' ? ctx.state.placement.schoolScope : ctx.state.filters.schoolScope;
  ctx.openAdvancedFilters();
  assert(open);
  const filters = view === 'workbench' ? ctx.state.filters : ctx.state.placement;
  assert.equal(filters.school, 'all');
  assert.equal(filters.schoolScope, 'all');
  assert.equal(filters.quickCategory, '');
  assert.equal(filters.dualDegreeOnly, false);
  assert.equal(filters.year, '115');
  assert.equal(filters.channel, 'personal_application');
  assert.strictEqual(ctx.state.placement.scores, scores);
  assert.equal(view === 'workbench' ? ctx.state.placement.schoolScope : ctx.state.filters.schoolScope, inactiveScope);
  if (view === 'workbench') {
    assert.equal(ctx.state.linkedGroup, '');
    assert.equal(ctx.state.linkedCategory, '');
    assert.equal(ctx.els.schoolFilter.value, 'all');
  }
  // 實際改選另一校／學群：先前台大電機捷徑不得把東吳法律條件排除。
  vm.runInContext('advancedFilterDraft.schools = ["東吳大學"]; advancedFilterDraft.groups = ["法政學群"];', ctx);
  assert.equal(ctx.state.filters.advanced.schools.length, 0, 'Draft must not apply before confirmation');
  vm.runInContext('state.filters.advanced = cloneAdvancedFilters(advancedFilterDraft);', ctx);
  ctx.closeAdvancedFilters();
  ctx.applyFilters();
  const rows = view === 'workbench' ? ctx.state.filtered : analysisRows;
  assert(rows.length > 0, view);
  assert(rows.every(r => r.schoolName === '東吳大學' && r.year === 115 && r.channelKey === 'personal_application'));
  assert(rows.some(r => r.departmentName.includes('法律')));
  assert(!open);
  // 再開啟／取消保留已套用精準條件，不因清除外部捷徑而遺失。
  ctx.openAdvancedFilters();
  vm.runInContext('advancedFilterDraft.schools = ["國立清華大學"];', ctx);
  ctx.closeAdvancedFilters();
  assert.equal(ctx.state.filters.advanced.schools[0], '東吳大學');
  ctx.state.filters.advanced.excludedSubjects = ['英文'];
  ctx.applyFilters();
  const excludedRows = view === 'workbench' ? ctx.state.filtered : analysisRows;
  assert(excludedRows.length < rows.length, 'Subject exclusion must still change results');
  assert(excludedRows.every(r => !ctx.recordSubjectKeys(r).has('英文')));
}
console.log('Precision handoff: external school/category cleared immediately on both pages, real school/group filtering, draft/cancel, retained years/channels/scores passed.');
