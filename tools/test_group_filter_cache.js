const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../site/app.js'), 'utf8');
const records = require('../site/data/admissions_records.json');
const groups = require('../site/data/group_departments.json');
const ctx = { state: { groups } };
vm.createContext(ctx);
for (const name of ['normalize', 'visibleGroupRows', 'selectedCategoryRows', 'categorySelectionNames', 'groupRowsToNeedles', 'cachedGroupNeedles', 'matchesGroup', 'getGroupNeedles', 'getCategoryNeedles', 'placementSelectedNeedles']) {
  vm.runInContext(source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))[0], ctx);
}
let builds = 0;
const build = ctx.groupRowsToNeedles;
ctx.groupRowsToNeedles = rows => { builds++; return build(rows); };
function originalMatch(record, needles) {
  const full = ctx.normalize(record.schoolName + record.departmentName), dept = ctx.normalize(record.departmentName);
  return [...needles].some(n => n && (full.includes(n) || n.includes(full) || dept.includes(n)));
}
// Exact result equivalence across every record, including OR and within-group categories.
for (const [selected, categories, within] of [
  [['工程學群'], [], false], [['資訊學群', '工程學群'], [], false],
  [['不分系學群'], [], false], [[], [], false],
  [['工程學群'], ['資訊工程學類'], true],
  [[], ['資訊工程學類'], true],
  [['文史哲學群'], ['資訊工程學類'], false],
]) {
  const rows = groups.filter(row => within ? categories.includes(row.categoryName) && (!selected.length || selected.includes(row.groupName)) : selected.includes(row.groupName) || categories.includes(row.categoryName));
  const oldNeedles = build(rows), before = builds;
  const actual = records.map(r => ctx.matchesGroup(r, ctx.cachedGroupNeedles(selected, categories, within)));
  assert.equal(builds - before, 1, 'Build once per selection, not once per record');
  assert.deepEqual(actual, records.map(r => originalMatch(r, oldNeedles)));
  assert.equal(ctx.cachedGroupNeedles([...selected].reverse(), categories, within), ctx.cachedGroupNeedles(selected, categories, within));
}
assert.equal(ctx.getGroupNeedles('工程學群'), ctx.placementSelectedNeedles({ groups: ['工程學群'], categories: [] }));
assert.equal(ctx.getCategoryNeedles('工程學群', '資訊工程學類'), ctx.cachedGroupNeedles(['工程學群'], ['資訊工程學類'], true));
const psychologyRows = ctx.selectedCategoryRows('社會心理學群', '心理學類');
assert.equal(psychologyRows.length, 55, 'Psychology includes counseling, with three cross-listed programs deduplicated');
assert.equal(new Set(psychologyRows.map(r => ctx.normalize(r.schoolDepartmentName))).size, psychologyRows.length);
const psychology = ctx.getCategoryNeedles('社會心理學群', '心理學類');
const expectedPsychology = build(groups.filter(r => ['心理學類', '輔導諮商學類'].includes(r.categoryName)));
assert.deepEqual(records.map(r => ctx.matchesGroup(r, psychology)), records.map(r => originalMatch(r, expectedPsychology)));
for (const [school, department] of [['國立臺灣師範大學', '教育心理與輔導學系'], ['國立嘉義大學', '輔導與諮商學系'], ['國立臺北教育大學', '心理與諮商學系']]) {
  const fixtures = records.filter(r => r.schoolName === school && r.departmentName === department);
  assert.ok(fixtures.length, `Missing fixture ${school} ${department}`);
  assert.ok(fixtures.every(r => ctx.matchesGroup(r, psychology)), `${school} must appear in psychology`);
  assert.ok(psychologyRows.some(r => r.schoolDepartmentName === school + department));
}
assert.equal(ctx.matchesGroup({ schoolName: '國立臺灣大學', departmentName: '中國文學系' }, psychology), false);
assert.equal(ctx.selectedCategoryRows('社會心理學群', '輔導諮商學類').length, 25, 'Counseling remains a separate official category');
const mutable = { schoolName: '測試大學', departmentName: '資訊工程學系' }, it = ctx.getGroupNeedles('資訊學群');
assert.equal(ctx.matchesGroup(mutable, it), true);
mutable.departmentName = '中國文學系';
assert.equal(ctx.matchesGroup(mutable, it), false, 'Record name changes must invalidate a match');
const previous = ctx.getGroupNeedles('工程學群');
ctx.state.groups = [...groups];
assert.notEqual(ctx.getGroupNeedles('工程學群'), previous, 'Reloaded dataset must not reuse stale cache');
const engineering = groups.filter(r => r.groupName === '工程學群');
let start = performance.now();
for (const r of records.slice(0, 100)) originalMatch(r, build(engineering));
const original100 = performance.now() - start;
ctx.state.groups = [...groups];
start = performance.now();
const first = records.filter(r => ctx.matchesGroup(r, ctx.getGroupNeedles('工程學群')));
const cold = performance.now() - start;
start = performance.now();
const again = records.filter(r => ctx.matchesGroup(r, ctx.getGroupNeedles('工程學群')));
const warm = performance.now() - start;
assert.deepEqual(first, again);
console.log(JSON.stringify({ passed: true, records: records.length, cases: 7, engineeringMatches: first.length, original100Ms: Math.round(original100), cachedFullColdMs: Math.round(cold), cachedFullWarmMs: Math.round(warm) }));
