// 校系代碼與名稱的合理性檢查：招生說明的英文字（AACSB、EMI）曾被解析成校系。
const records = require('../site/data/admissions_records.json');

const bad = records.filter(record => record.channelKey === 'star_recommendation' && !/^\d{5}$/.test(record.programCode));
const long = records.filter(record => String(record.departmentName).length > 45);
if (bad.length || long.length) {
  console.error([...bad, ...long].map(record => `${record.id} ${String(record.departmentName).slice(0, 30)}`).join('\n'));
  process.exit(1);
}
console.log(`Record names: ${records.length} records have real program codes and department names.`);
