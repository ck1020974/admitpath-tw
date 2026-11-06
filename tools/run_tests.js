// 依序執行 tools/ 內所有 test_*、check-* 測試；部署流程與本機都用這個入口。
// 用法：node tools/run_tests.js
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const TIMEOUT_MS = 90000;
const files = fs.readdirSync(__dirname).filter(name => /^(test_|check-).*\.(js|mjs)$/.test(name)).sort();
const failed = [];

require('./records_store').merge();

for (const name of files) {
  const result = spawnSync(process.execPath, [path.join('tools', name)], { cwd: root, encoding: 'utf8', timeout: TIMEOUT_MS });
  if (result.status === 0) continue;
  failed.push(name);
  console.error(`\nFAILED ${name}${result.error ? ` (${result.error.message})` : ''}`);
  console.error(`${result.stdout || ''}${result.stderr || ''}`.trim().split('\n').slice(-12).join('\n'));
}

console.log(`\n${files.length - failed.length}/${files.length} tests passed.`);
if (failed.length) {
  console.error(`Failed: ${failed.join(', ')}`);
  process.exit(1);
}
