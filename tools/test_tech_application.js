// 四技申請（科大）：資料完整性、一階加權平均換算與落點判定。
// 執行：node tools/test_tech_application.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const records = JSON.parse(fs.readFileSync(path.join(root, 'site/data/admissions_records.json'), 'utf8'));
const groups = JSON.parse(fs.readFileSync(path.join(root, 'site/data/group_departments.json'), 'utf8'));
const source = fs.readFileSync(path.join(root, 'site/app.js'), 'utf8');
const tech = records.filter(r => r.channelKey === 'tech_application');

// 筆數與官方檔一致：114 年 602 個、115 年 593 個校系。
assert.equal(tech.filter(r => r.year === 114).length, 602);
assert.equal(tech.filter(r => r.year === 115).length, 593);
assert.equal(new Set(tech.map(r => r.id)).size, tech.length, 'ids are unique');
assert(tech.every(r => r.schoolCode.startsWith('T')), '科大學校代碼加 T，避免和大學代碼重複');
assert(tech.every(r => r.weightedSubjects.length >= 1 && r.weightedSubjects.length <= 4), '學測採計 1 到 4 科');
assert(tech.every(r => ['北', '中', '南', '東'].includes(r.techApplication.area)));
assert(tech.every(r => Math.abs(r.techApplication.screeningLevel - r.techApplication.screeningStandard * 15 / 100) < 0.006));

// 抽樣與官方「第一階段最低篩選標準」逐字核對。
const sample = (year, code) => tech.find(r => r.year === year && r.programCode === code);
assert.equal(sample(115, '101001').techApplication.screeningStandard, 84.44);
assert.equal(sample(114, '101001').techApplication.screeningStandard, 82.22);
assert.equal(sample(115, '101005').techApplication.apcsLevel, 7);
assert.equal(sample(115, '101005').techApplication.apcsWeighted, 62.67);
assert.equal(sample(114, '101014').techApplication.screeningStandard, 87.69);
assert.equal(sample(115, '101005').weightedSubjectsText, '國文×1、英文×2、數A×2');
assert(tech.some(r => r.techApplication.screeningStandard === 0), '官方標準 0（未篩除）要保留');

// 每個科大校系都要依 tools/tech_application_groups.json 對應到十八學群（可同時兩個學群）。
const curated = JSON.parse(fs.readFileSync(path.join(root, 'tools/tech_application_groups.json'), 'utf8'));
const mapped = new Map();
groups.forEach(g => { if (!mapped.has(g.schoolDepartmentName)) mapped.set(g.schoolDepartmentName, new Set()); mapped.get(g.schoolDepartmentName).add(`${g.groupName}|${g.categoryName}`); });
const names = [...new Set(tech.map(r => r.schoolName + r.departmentName))];
const unmapped = names.filter(name => !mapped.has(name));
assert.equal(unmapped.length, 0, `尚未對應學群：${unmapped.join('、')}`);
names.forEach(name => {
  assert(curated[name], `對應表缺少：${name}`);
  curated[name].forEach(([group, category]) => assert(mapped.get(name).has(`${group}|${category}`), `${name} 沒有 ${category}`));
});
// 人工確認過的幾個容易誤判的例子。
const has = (name, category) => mapped.get(name)?.has(category);
assert(has('國立屏東科技大學獸醫學系', '生物資源學群|獸醫學類'));
assert(has('中臺科技大學醫學影像暨放射科學系', '醫藥衛生學群|影像放射學類') && !has('中臺科技大學醫學影像暨放射科學系', '大眾傳播學群|廣電電影學類'));
assert(has('德明財經科技大學應用外語系日文組', '外語學群|日語文學類'));
assert(has('國立臺北科技大學資訊工程系', '資訊學群|資訊工程學類') && !has('國立臺北科技大學資訊工程系', '工程學群|工程科學學類'));

// 落點判定：用網站的函式計算。
const context = { shortSubject: s => ({ 數學A: '數A', 數學B: '數B' }[s] || s), advancedSubjectKey: s => s };
vm.createContext(context);
for (const name of ['formatTechLevel', 'formatTechGap', 'evaluateTechPlacement', 'placementScoreValue', 'placementRequirementLabel', 'placementResultSummary']) {
  vm.runInContext(source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))[0], context);
}
const profile = scores => ({ scores, channels: ['personal_application', 'tech_application'] });
const csim = sample(115, '101005'); // 國×1、英×2、數A×2，標準 77.33
// (12 + 12×2 + 11×2) ÷ (15×5) = 58 ÷ 75 = 77.33…，剛好達標。
let result = context.evaluateTechPlacement(csim, profile({ 國文: '12', 英文: '12', 數A: '11' }));
assert.equal(result.status, 'match');
assert.equal(context.placementResultSummary(result), '達一階最低篩選標準');
// 少 1 級分英文：(12 + 22 + 22) ÷ 75 = 74.67，差 0.4 級分 → 接近。
result = context.evaluateTechPlacement(csim, profile({ 國文: '12', 英文: '11', 數A: '11' }));
assert.equal(result.status, 'near');
assert.equal(context.placementResultSummary(result), '加權平均約差 0.40 級分');
assert.equal(context.placementRequirementLabel(result.requirements[0]), '加權平均 11.20／11.60 級分');
// 只差一點點也不能顯示「差 0.00」。
assert.equal(context.formatTechGap(0.0015), '0.01');
// 差很多 → 未達；空白科目依落點分析設定以 0 計算。
result = context.evaluateTechPlacement(csim, profile({ 國文: '12' }));
assert.equal(result.status, 'miss');
// 標準 0：任何成績都通過。
const open = tech.find(r => r.techApplication.screeningStandard === 0);
assert.equal(context.evaluateTechPlacement(open, profile({})).status, 'match');

console.log(`Tech application: ${tech.length} records (114: 602, 115: 593), official samples, unique T-codes, areas, 學群 mapping (all ${names.length} departments), weighted-average placement boundary/near/miss/zero passed.`);
