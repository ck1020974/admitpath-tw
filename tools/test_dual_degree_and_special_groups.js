const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../site/app.js'), 'utf8');
const records = require('../site/data/admissions_records.json');
const ctx = { URLSearchParams, state: { view: 'workbench', filters: { channel: 'all', year: 'all', school: 'all', keyword: '', schoolScope: 'all', quickCategory: '', dualDegreeOnly: false } }, document: { getElementById: id => id.endsWith('View') ? {} : null } };
vm.createContext(ctx);
vm.runInContext(source.match(/const ROUTE_FILTER_KEYS = .*;/)[0], ctx);
for (const name of ['isInternationalDualDegree', 'specialAdmissionInfo', 'specialAdmissionModeAllows', 'routeHash', 'parseRoute']) {
  vm.runInContext(source.match(new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}'))[0], ctx);
}
const flying = records.filter(r => /翔飛/.test(r.departmentName));
assert.equal(flying.length, 4);
for (const record of flying) {
  assert(ctx.specialAdmissionInfo(record).special, record.id);
  assert.equal(ctx.specialAdmissionModeAllows(record, 'exclude'), false);
  assert(ctx.specialAdmissionModeAllows(record, 'include'));
  assert(ctx.specialAdmissionModeAllows(record, 'only'));
}
assert(!ctx.specialAdmissionInfo({ departmentName: '藥學系' }).special);
const fixtures = [
  ['國立成功大學', '機械工程學系(普渡雙聯組)'],
  ['國立陽明交通大學', '材料科學與工程學系-伊利諾雙聯組'],
  ['長庚大學', '工商管理學系(雙聯學位組）'],
  ['長榮大學', '觀光與餐飲管理學系國際雙聯組'],
  ['中華大學', '國際觀光與酒店管理雙學士學位學程'],
  ['中原大學', '中原大學與美國天普大學商學管理雙學士學位學程'],
];
for (const [schoolName, departmentName] of fixtures) {
  const found = records.filter(r => r.schoolName === schoolName && r.departmentName === departmentName);
  assert(found.length, departmentName);
  assert(found.every(ctx.isInternationalDualDegree), departmentName);
}
for (const record of [
  { schoolName: '長庚大學', departmentName: '工商管理學系', cacDetail: { notes: '可申請美國國際雙聯學位' } },
  { departmentName: '國際企業學系' }, { departmentName: '企業管理學系(雙主修組)' },
  { departmentName: '企業管理學系(國內雙聯學位組)' },
  { departmentName: '本校提供國際雙聯學位、雙主修與交換機會。' },
  ...records.filter(r => r.departmentName.length > 80 && /雙聯/.test(r.departmentName)),
]) assert.equal(ctx.isInternationalDualDegree(record), false, record.departmentName);
const matches = records.filter(ctx.isInternationalDualDegree);
assert(matches.length > 50);
ctx.state.filters.dualDegreeOnly = true;
ctx.state.filters.quickCategory = '電機工程學類';
const hash = ctx.routeHash();
assert(hash.includes('dual=1'));
const route = ctx.parseRoute(hash);
assert.equal(route.filters.dualDegreeOnly, '1');
assert.equal(route.filters.quickCategory, '電機工程學類');
ctx.state.filters.dualDegreeOnly = false;
assert(!ctx.routeHash().includes('dual='));
console.log('Dual-degree/special groups: ' + matches.length + ' explicit overseas program records, ordinary/prose/domestic exclusions, 4 翔飛 groups and share-link state passed.');
