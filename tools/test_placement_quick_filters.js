const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const records = require('../site/data/admissions_records.json');
const groups = require('../site/data/group_departments.json');
const special = ['115', '116'].flatMap(year => require(`../site/data/special_admissions_${year}.json`).records);
const source = fs.readFileSync(require.resolve('../site/app.js'), 'utf8');
const context = { window: {}, state: { groups, filters: { advanced: {} }, placement: { year: 'all', keyword: '' } },
  placementChannelHasRequiredScores: () => true, placementSelectedNeedles: () => new Set(), recordMatchesAdvancedFilters: () => true };
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../site/admission-catalog.js'), 'utf8'), context);
context.AdmissionCatalog = context.window.AdmissionCatalog;
context.AdmissionCatalog.initialize(records, special);
for (const name of ['normalize', 'recordSearchText', 'queryKeywordMatches', 'placementSchoolScopeAllows', 'placementMatchesFilters', 'cachedGroupNeedles', 'groupRowsToNeedles', 'matchesGroup']) {
  vm.runInContext(source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))[0], context);
}
for (const [school, region] of [['國立臺灣大學', 'area-north'], ['國立中興大學', 'area-central'], ['國立成功大學', 'area-south'], ['國立東華大學', 'area-east']]) {
  const record = records.find(r => r.schoolName === school);
  assert(context.placementSchoolScopeAllows(record, region), school);
  for (const other of ['area-north', 'area-central', 'area-south', 'area-east'].filter(r => r !== region)) assert.equal(context.placementSchoolScopeAllows(record, other), false, school + other);
}
const profile = { channels: ['personal_application'], schoolScope: 'all', schoolOwnership: 'all', topUniversityOnly: false, quickCategory: '電機工程學類' };
const electric = records.find(r => r.id === '115-personal_application-001572-115_apply');
const literature = records.find(r => r.id === '115-personal_application-001012-115_apply');
assert(context.placementMatchesFilters(electric, profile));
assert.equal(context.placementMatchesFilters(literature, profile), false);
assert.equal(context.placementMatchesFilters(electric, { ...profile, quickCategory: '不存在學類' }), false);
assert(context.placementMatchesFilters(literature, { ...profile, quickCategory: '' }));
const html = fs.readFileSync(require.resolve('../site/index.html'), 'utf8');
const categories = [...html.matchAll(/data-placement-popular-category="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(categories).size, 10);
for (const category of categories) assert(groups.some(g => g.categoryName === category), category);
assert(!html.includes('id="changePlacementChannel"'));
console.log('Placement quick filters: four regions, real electrical category membership, clearing/unknown category and ten mapped presets passed.');
