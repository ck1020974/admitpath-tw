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
for (const name of ['normalize', 'recordSearchText', 'queryKeywordMatches', 'placementSchoolScopeAllows', 'placementMatchesFilters', 'isInternationalDualDegree', 'quickCategoryNeedles', 'categorySelectionNames', 'cachedGroupNeedles', 'groupRowsToNeedles', 'matchesGroup']) {
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
const architecture = records.find(r => r.year === 115 && r.channelKey === 'personal_application' && r.departmentName === '建築學系');
assert(architecture);
assert(context.placementMatchesFilters(architecture, { ...profile, quickCategory: '建築學類' }));
assert.equal(context.placementMatchesFilters(literature, { ...profile, quickCategory: '建築學類' }), false);
const crimeRecords = records.filter(r => r.channelKey === 'personal_application' && /犯罪防治/.test(r.departmentName));
assert(crimeRecords.length > 0);
for (const record of crimeRecords) {
  for (const category of ['心理學類', '法律學類']) {
    assert(context.placementMatchesFilters(record, { ...profile, quickCategory: category }), record.id + category);
  }
}
const html = fs.readFileSync(require.resolve('../site/index.html'), 'utf8');
const finance = { ...profile, quickCategory: '財務金融學類' };
const mathematics = records.filter(r => r.channelKey === 'personal_application' && r.departmentName === '數學系');
assert(mathematics.length > 0);
for (const record of mathematics) assert.equal(context.placementMatchesFilters(record, finance), false, record.id);
for (const departmentName of ['財務金融學系', '財務工程與精算數學系']) {
  const record = records.find(r => r.channelKey === 'personal_application' && r.departmentName === departmentName);
  assert(record);
  assert(context.placementMatchesFilters(record, finance), record.id);
}
const categories = [...html.matchAll(/data-placement-popular-category="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(categories).size, 10);
for (const category of categories) assert(groups.some(g => g.categoryName === category), category);
assert(!html.includes('id="changePlacementChannel"'));
console.log('Placement quick filters: four regions, real electrical category membership, clearing/unknown category and ten mapped presets passed.');

// Psychology shortcuts also include counseling departments across admission years.
for (const school of ["國立臺灣師範大學", "國立嘉義大學", "國立臺北教育大學"]) {
  const rows = records.filter(r => r.schoolName === school && /輔導|諮商/.test(r.departmentName) && r.channelKey === "personal_application");
  assert(rows.length, school);
  for (const row of rows) assert(context.placementMatchesFilters(row, { ...profile, quickCategory: "心理學類" }), row.id);
}
