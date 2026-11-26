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
for (const name of ['normalize', 'recordSearchText', 'queryKeywordMatches', 'placementSchoolScopeAllows', 'placementMatchesFilters', 'isInternationalDualDegree', 'quickCategoryNeedles', 'categorySelectionNames', 'cachedGroupNeedles', 'shortcutList', 'schoolScopesAllow', 'regionsAllow', 'quickCategoriesMatch', 'groupRowsToNeedles', 'stripSchoolCampus', 'matchesGroup']) {
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
assert.equal(new Set(categories).size, 69);
// 中文、設計、化學、半導體直接比對系名。
const byName = (category) => records.filter(r => context.placementMatchesFilters(r, { ...profile, quickCategory: category })).map(r => r.departmentName);
const chinese = byName('中文');
assert(chinese.some(d => /中國文學/.test(d)) && !chinese.some(d => /外國語文|日本語文|英/.test(d)), 'chinese');
const chemistry = byName('化學');
assert(chemistry.some(d => /^化學系/.test(d)) && !chemistry.some(d => /文化學系|化學工程/.test(d)), chemistry.filter(d => /文化學系|化學工程/.test(d)).join());
const design = byName('設計');
assert(design.some(d => /視覺傳達設計/.test(d)) && !design.some(d => /晶片設計/.test(d)), 'design');
// 法律、政治分開；財經含經濟系；企管不含資管、餐旅等其他管理。
assert(byName('法律學類').some(d => /^法律學系/.test(d)) && !byName('法律學類').some(d => /^政治學系/.test(d)), 'law');
assert(byName('政治學類').some(d => /^政治學系/.test(d)), 'politics');
// 特教、幼教、社會用系名比對，不能混入整批教育系。
assert(byName('特殊教育').every(d => /特殊教育/.test(d)) && byName('特殊教育').length > 0, 'special-education');
assert(byName('幼兒教育').some(d => /幼兒教育/.test(d)) && !byName('幼兒教育').some(d => /^特殊教育|^教育學系/.test(d)), 'early-childhood');
assert(byName('社會學').some(d => /^社會學系/.test(d)) && !byName('社會學').some(d => /^社會工作/.test(d)), 'sociology');
// 合併按鈕：地科含大氣，觀光餐旅含餐旅，農園含園藝。
assert(byName('地球科學學類').some(d => /大氣/.test(d)), 'earth-atmosphere');
assert(byName('觀光事業學類').some(d => /^餐旅管理/.test(d)), 'tourism-hospitality');
assert(byName('農藝學類').some(d => /^園藝/.test(d)), 'agronomy-horticulture');
assert(byName('財務金融學類').some(d => /^經濟學系/.test(d)) && byName('財務金融學類').some(d => /^財務金融學系/.test(d)), 'finance-economics');
const business = byName('企業管理學類');
assert(business.some(d => /^企業管理學系/.test(d)) && !business.some(d => /資訊管理|餐旅|醫務管理|工業工程/.test(d)), business.filter(d => /資訊管理|餐旅|醫務管理|工業工程/.test(d)).join());
// 統計只收系名含統計／資料科學，不含一般應用數學系。
const statistics = byName('統計');
assert(statistics.some(d => /^統計學系/.test(d)) && !statistics.includes('應用數學系'), 'statistics');
// 外文涵蓋英、日、歐洲語文。
const foreign = byName('英語文學類');
assert(foreign.some(d => /英/.test(d)) && foreign.some(d => /日本語文|應用日語/.test(d)) && foreign.some(d => /西班牙|法國語文|德/.test(d)), 'foreign');
// 醫學只收醫學系（西醫）；中醫、牙醫、獸醫等有自己的按鈕。多選時仍各自比對。
const medicine = { ...profile, channels: ['personal_application', 'star_recommendation', 'exam_distribution'], quickCategory: '醫學學類' };
const medicineDepts = records.filter(r => context.placementMatchesFilters(r, medicine)).map(r => r.departmentName);
assert(medicineDepts.some(d => /^醫學系/.test(d)) && !medicineDepts.some(d => /中醫學系/.test(d)));
assert(records.some(r => /中醫學系/.test(r.departmentName) && context.placementMatchesFilters(r, { ...medicine, quickCategory: '中醫' })), 'chinese-medicine');
assert(!medicineDepts.some(d => /牙醫|獸醫|生物醫學|運動醫學|植物醫學/.test(d)), medicineDepts.filter(d => /牙醫|獸醫|生物醫學|運動醫學|植物醫學/.test(d)).join());
const dentalRecord = records.find(r => r.channelKey === 'personal_application' && r.departmentName === '牙醫學系');
assert(context.placementMatchesFilters(dentalRecord, { ...profile, quickCategory: '醫學學類,牙醫學類' }));
// 醫大：六所醫學大學（含舊名馬偕醫學院）。
const medicalSchools = new Set(records.filter(r => context.placementSchoolScopeAllows(r, 'medical')).map(r => r.schoolName));
for (const school of ['臺北醫學大學', '中山醫學大學', '中國醫藥大學', '高雄醫學大學', '馬偕醫學大學', '國防醫學大學']) assert(medicalSchools.has(school), school);
assert(!medicalSchools.has('國立臺灣大學'));
// 細項學校：台科、北科、軍校。
const scopeSchools = (scope) => new Set(records.filter(r => context.placementSchoolScopeAllows(r, scope)).map(r => r.schoolName));
assert.deepEqual([...scopeSchools('ntust')], ['國立臺灣科技大學']);
assert.deepEqual([...scopeSchools('ntut')], ['國立臺北科技大學']);
assert(scopeSchools('military').has('國防大學') && !scopeSchools('military').has('國立臺灣大學'));
assert.deepEqual([...scopeSchools('fju')], ['輔仁大學']);
for (const scope of ['ntu', 'nthu', 'nycu', 'ncku', 'nccu', 'ntnu', 'central', 'ntpu', 'scu', 'fju', 'ntust', 'ntut', 'medical', 'teacher', 'military']) {
  assert(html.includes(`data-placement-school-scope="${scope}"`), scope);
  assert(scopeSchools(scope).size > 0, scope);
}
const byNameCategories = ['半導體', '中文', '設計', '化學', '企業管理學類', '統計', '公共衛生', '特殊教育', '幼兒教育', '社會學', '人工智慧', '中醫', '公共行政', '外交'];
for (const category of byNameCategories) assert(byName(category).length > 0, category);
for (const category of categories.filter(item => !byNameCategories.includes(item))) assert(groups.some(g => g.categoryName === category), category);
assert(!html.includes('id="changePlacementChannel"'));
console.log('Placement quick filters: four regions, real electrical category membership, clearing/unknown category and ten mapped presets passed.');

// Psychology shortcuts also include counseling departments across admission years.
for (const school of ["國立臺灣師範大學", "國立嘉義大學", "國立臺北教育大學"]) {
  const rows = records.filter(r => r.schoolName === school && /輔導|諮商/.test(r.departmentName) && r.channelKey === "personal_application");
  assert(rows.length, school);
  for (const row of rows) assert(context.placementMatchesFilters(row, { ...profile, quickCategory: "心理學類" }), row.id);
}
