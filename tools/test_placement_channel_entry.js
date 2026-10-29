const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../site/app.js'), 'utf8');
let controlUpdates = 0;
const context = { state: {}, hydratePlacementResultFilters() {}, renderPlacementStage() {},
  renderPlacementControls() { controlUpdates++; }, advancedSubjectKey: String, shortSubject: String };
vm.createContext(context);
for (const name of ['defaultPlacementState', 'placementSubjects', 'selectPlacementChannel', 'placementProfile', 'placementHasAnyInput', 'placementScoreValue', 'placementRequirementResult']) {
  vm.runInContext(source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))[0], context);
}
context.state.placement = context.defaultPlacementState();
// 申請預設同時看個人申請與四技申請；結果篩選可只看一般大學或科大。
assert.equal(context.placementProfile().channels.join(), 'personal_application,tech_application');
context.state.placement.applyScope = 'tech';
assert.equal(context.placementProfile().channels.join(), 'tech_application');
context.state.placement.applyScope = 'university';
assert.equal(context.placementProfile().channels.join(), 'personal_application');
context.state.placement.applyScope = 'all';
assert.equal(context.placementHasAnyInput(context.placementProfile()), false);
context.selectPlacementChannel('personal_application');
context.state.placement.scores.國文 = '12';
context.state.placement.scores.英聽 = 'B';
context.state.placement.scores.在校 = '8';
let profile = context.placementProfile();
assert.equal(profile.channels.join(), 'personal_application,tech_application');
assert.equal(Object.keys(profile.scores).length, 7);
assert(!('在校' in profile.scores));
assert(!('數甲' in profile.scores));
assert.equal(context.placementHasAnyInput(profile), true);
context.selectPlacementChannel('star_recommendation');
assert.equal(context.placementProfile().scores.國文, '12');
assert.equal(context.placementProfile().scores.在校, '8');
context.state.placement.scores.在校 = '';
assert.equal(context.placementHasAnyInput(context.placementProfile()), false);
context.state.placement.scores.在校 = '5';
assert.equal(context.placementHasAnyInput(context.placementProfile()), true);
Object.assign(context.state.placement, { year: '115', keyword: '化學系', schoolScope: 'ntu' });
context.selectPlacementChannel('exam_distribution');
assert.equal(context.state.placement.year, '115');
assert.equal(context.state.placement.keyword, '化學系');
assert.equal(context.state.placement.schoolScope, 'ntu');
profile = context.placementProfile();
assert.equal(profile.channels.join(), 'exam_distribution');
assert.equal(Object.keys(profile.scores).length, 14);
assert.equal(profile.scores.國文, '');
assert(!('英聽' in profile.scores) && !('在校' in profile.scores));
assert.equal(context.placementHasAnyInput(profile), false);
Object.assign(context.state.placement.scores, { 國文: '60', 英文: '50', 歷史: '40' });
profile = context.placementProfile();
assert.equal(context.placementScoreValue(profile, '國文'), 60);
assert.equal(context.placementRequirementResult({ kind: 'weightedTotal', subjects: ['國文', '英文', '歷史'],
  weighted: [{ subject: '國文', weight: 1.5 }, { subject: '英文', weight: 1.25 }, { subject: '歷史', weight: 1 }], threshold: 190 }, profile).actual, 192.5);
context.selectPlacementChannel('personal_application');
assert.equal(context.placementProfile().scores.國文, '12');
assert(!('歷史' in context.placementProfile().scores));
assert.equal(context.placementScoreValue({ scores: { 國文: 60 }, channels: ['personal_application'] }, '國文'), null);
context.selectPlacementChannel('exam_distribution');
assert.equal(context.placementProfile().scores.國文, '60');
assert.equal(context.state.placement.stage, 'setup');
assert.equal(controlUpdates, 5);
// 結果頁改選下拉管道時，使用同一套切換流程回到成績輸入頁。
let channelChange;
Object.assign(context, {
  document: { querySelectorAll: () => [], querySelector: () => null, getElementById: () => null },
  els: { placementChannelFilter: { value: 'star_recommendation', addEventListener: (event, handler) => { channelChange = handler; } } },
});
vm.runInContext(source.match(/const PLACEMENT_APPLY_OPTIONS = [^;]+;/)[0], context);
vm.runInContext(source.match(/function bindPlacementEvents\([\s\S]*?\n\}/)[0], context);
context.bindPlacementEvents();
context.state.placement.stage = 'results';
channelChange();
assert.equal(context.state.placement.channel, 'star_recommendation');
assert.equal(context.state.placement.stage, 'setup');
assert.equal(context.placementProfile().scores.國文, '12');
// 在申請的結果頁改看「四技申請（科大）」只換範圍，留在結果頁，不必重新輸入成績。
Object.assign(context, { renderPlacementAnalysis() {} });
context.selectPlacementChannel('personal_application');
context.state.placement.stage = 'results';
context.els.placementChannelFilter.value = 'apply_tech';
channelChange();
assert.equal(context.state.placement.channel, 'personal_application');
assert.equal(context.state.placement.applyScope, 'tech');
assert.equal(context.state.placement.stage, 'results');
assert.equal(context.placementProfile().channels.join(), 'tech_application');
console.log('Channel entry: personal application default, relevant subjects only, required star rank, retained GSAT scores, separate 15/60 score sets and weighted distribution totals passed.');
