const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../site/app.js'), 'utf8');
const ctx = { state: { records: [], specialRecordsBySchool: new Map(), recordIndexByFullName: new Map(), recordIndexBySchoolDept: new Map() } };
vm.createContext(ctx);
for (const name of ['normalize', 'splitSchoolDepartmentName', 'stripSchoolCampus', 'schoolMatchKey', 'isDepartmentVariant', 'specialRecordsForGroupRow', 'explorerRecordKey', 'chooseExplorerRepresentative', 'explorerChannelRank', 'explorerChannelRecords']) {
  vm.runInContext(source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))[0], ctx);
}
vm.runInContext(source.match(/const EXPLORER_CHANNEL_ORDER = \{[\s\S]*?\n\};/)[0], ctx);

const special = (schoolName, departmentName, year = 116) => ({ id: `${schoolName}${departmentName}${year}`, year, channelKey: 'special_selection', schoolName, departmentName });
const fixtures = [
  special('國立政治大學', '統計學系'),
  special('銘傳大學(桃園)', '資訊工程學系'),
  special('銘傳大學(臺北)', '財金法律學系'),
  special('中原大學', '商業設計學系產品設計組'),
];
fixtures.forEach(record => {
  const key = ctx.schoolMatchKey(record.schoolName);
  if (!ctx.state.specialRecordsBySchool.has(key)) ctx.state.specialRecordsBySchool.set(key, []);
  ctx.state.specialRecordsBySchool.get(key).push(record);
});
const matches = (name, matched = []) => ctx.specialRecordsForGroupRow(ctx.splitSchoolDepartmentName(name), matched).map(item => `${item.schoolName}${item.departmentName}`);

// 特選不分組，學群資料分組：每一組都要接到同一筆特選。
assert.deepEqual(matches('國立政治大學統計學系(A組)'), ['國立政治大學統計學系']);
assert.deepEqual(matches('國立政治大學統計學系(B組)'), ['國立政治大學統計學系']);
assert.deepEqual(matches('中原大學商業設計學系'), ['中原大學商業設計學系產品設計組'], '特選分組、學群不分組');
// 校區寫法不同（半形、全形、台／臺）也要對得上，不同校區不能混用。
assert.deepEqual(matches('銘傳大學資訊工程學系(桃園校區)'), ['銘傳大學(桃園)資訊工程學系']);
assert.deepEqual(matches('銘傳大學財金法律學系（台北校區）'), ['銘傳大學(臺北)財金法律學系']);
assert.deepEqual(matches('銘傳大學資訊工程學系(臺北校區)'), [], '不同校區不算同系');
// 相近系名不能誤對。
assert.deepEqual(matches('國立政治大學統計學系碩士班'), []);
assert.deepEqual(matches('國立政治大學應用統計學系'), []);
assert.equal(ctx.isDepartmentVariant('資訊工程學系', '資訊工程學系資安組'), true);
assert.equal(ctx.isDepartmentVariant('資訊工程學系', '資訊工程學系進修部'), false);
assert.equal(ctx.isDepartmentVariant('', '資訊工程學系'), false);
// 同年度已精確對到特選時，不再重複加入。
assert.deepEqual(matches('國立政治大學統計學系(A組)', [special('國立政治大學', '統計學系(A組)')]), []);
assert.equal(ctx.stripSchoolCampus('實踐大學(高雄)'), '實踐大學');
assert.equal(ctx.stripSchoolCampus('國立臺灣大學'), '國立臺灣大學');

// 按鈕最前面是 116 特選，卡片預設內容仍是一般管道。
const records = [
  { year: 115, channelKey: 'special_selection' },
  { year: 114, channelKey: 'personal_application' },
  { year: 116, channelKey: 'special_selection' },
  { year: 115, channelKey: 'personal_application' },
];
assert.deepEqual(ctx.explorerChannelRecords(records).map(item => item.key), ['116-special_selection', '115-personal_application', '114-personal_application', '115-special_selection']);
assert.equal(ctx.chooseExplorerRepresentative(records).year, 115);
assert.equal(ctx.chooseExplorerRepresentative(records).channelKey, 'personal_application');
assert.equal(ctx.chooseExplorerRepresentative(records, '116-special_selection').channelKey, 'special_selection');

// 清單不再於資料層截斷，科大（代碼排在最後）才看得到。
assert.doesNotMatch(source.match(/function getExplorerDepartmentRows\([\s\S]*?\n\}/)[0], /\.slice\(/);
const list = source.match(/function explorerDepartmentListHtml\([\s\S]*?\n\}/)[0];
assert.match(list, /fmt\.format\(allRows\.length\)\} 個相關校系/, '標題顯示全部筆數');
assert.match(list, /data-explorer-load-more/);
console.log('Explorer department rows: special matching across groups and campuses, channel order and full list passed.');
