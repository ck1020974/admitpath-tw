const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../site/admission-catalog.js'), 'utf8'), context);
const catalog = context.window.AdmissionCatalog;
const records = [
  { schoolName: '銘傳大學', schoolCode: '046' },
  { schoolName: '馬偕醫學院', schoolCode: '152' },
  { schoolName: '馬偕醫學大學', schoolCode: '152' },
];
const special = [
  { id: 'a', year: 116, school: '銘傳大學(桃園)', department: '資訊工程學系', area: '北', plan: '特殊選才' },
  { id: 'b', year: 116, school: '銘傳大學(臺北)', department: '法律學系', area: '北', plan: '特殊選才' },
  { id: 'c', year: 116, school: '馬偕醫學大學', department: '醫學系', area: '北', plan: '特殊選才' },
];
const output = catalog.initialize(records, special);
// 選單每間學校只有一項。
assert.deepEqual(Array.from(catalog.schoolOptions(), school => school.name), ['銘傳大學', '馬偕醫學大學']);
// 資料仍保留校區與舊校名，篩選時才用統一校名。
assert.equal(output[0].schoolName, '銘傳大學(桃園)');
assert.equal(output[0].schoolFilterName, '銘傳大學');
assert.equal(output[0].schoolCode, '046');
assert.equal(records[1].schoolName, '馬偕醫學院');
assert.equal(records[1].schoolFilterName, '馬偕醫學大學');
assert.equal(records[0].schoolFilterName, undefined);
assert.equal(output[2].schoolFilterName, undefined);
assert.equal(catalog.matchesArea({ schoolName: '馬偕醫學院' }, '北'), true);
console.log('School catalog merge: one option per school, campus and former names kept on records.');
