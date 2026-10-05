const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync(path.join(__dirname, '../site/app.js'), 'utf8');
function fn(name) {
  const match = source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert(match, name);
  return match[0];
}
let evaluations = 0;
let controlUpdates = 0;
const input = { value: '15', dataset: { placementScore: '國文' }, addEventListener(event, handler) { this.handler = handler; } };
const sandbox = {
  Intl,
  state: { placement: { stage: 'setup', resultTab: 'match', scores: {}, year: 'all', keyword: '' },
    filters: { advanced: {} }, records: [{ departmentName: '甲', schoolCode: '001' }], results: {}, groups: [], gsatStandards: {} },
  els: { placementResults: {} },
  document: { querySelectorAll: selector => selector === '[data-placement-score]' ? [input] : [],
    querySelector: () => null, getElementById: () => null },
  renderPlacementControls() { controlUpdates++; },
  showPlacementResults() {}, showPlacementSetup() {}, openAdvancedFilters() {}, updatePlacementResultFilters() {},
  debounce(fn) { return fn; },
  placementMatchesFilters: () => true,
  evaluatePlacementRecord: () => { evaluations++; return { status: 'match', gapTotal: 0 }; },
  placementStatusWeight: () => 0,
  placementProfile: () => { throw new Error('Setup must not prepare analysis'); },
};
vm.createContext(sandbox);
vm.runInContext(['bindPlacementEvents', 'renderPlacementAnalysis', 'placementAnalysisRows'].map(fn).join('\n'), sandbox);
sandbox.bindPlacementEvents();
input.handler();
assert.equal(sandbox.state.placement.scores.國文, '15', 'Latest input saved synchronously');
assert.equal(evaluations, 0, 'Typing must not evaluate records');
sandbox.renderPlacementAnalysis();
assert.equal(evaluations, 0, 'Setup rendering must not evaluate hidden results');
assert(controlUpdates > 0);
const profile = { scores: { 國文: 15 } };
const first = sandbox.placementAnalysisRows(profile);
assert.equal(evaluations, 1);
sandbox.state.placement.resultTab = 'near';
assert.strictEqual(sandbox.placementAnalysisRows(profile), first);
assert.equal(evaluations, 1, 'Result tabs reuse evaluations');
for (const mutate of [
  () => { profile.scores.國文 = 14; },
  () => { sandbox.state.placement.keyword = '甲'; },
  () => { sandbox.state.placement.year = '115'; },
  () => { sandbox.state.filters.advanced.groups = ['工程學群']; },
  () => { sandbox.state.records = [...sandbox.state.records]; },
  () => { sandbox.state.groups = []; },
  () => { sandbox.state.results = {}; },
  () => { sandbox.state.gsatStandards = {}; },
]) {
  const before = evaluations;
  mutate();
  sandbox.placementAnalysisRows(profile);
  assert.equal(evaluations, before + 1, 'Changed criteria/data invalidate cache');
}
console.log('Placement input is calculation-free; result caching/invalidation passed.');
