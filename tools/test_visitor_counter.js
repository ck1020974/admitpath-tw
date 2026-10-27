const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../site/usage.js'), 'utf8');
async function test() {
  const element = { textContent: '' }, calls = [];
  const window = { YUHSIN_USAGE_CONFIG: { goatcounterCode: 'yuhsin', visitorStartDate: '2026-10-27' }, location: { hostname: 'ck1020974.github.io' },
    document: { getElementById: () => element, createElement: () => ({ dataset: {}, addEventListener() {} }), head: { appendChild() {} } },
    fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ count: '1,234' }) }; } };
  vm.runInNewContext(source, { window });
  await window.YuhsinUsage.refreshVisitorCount();
  assert.equal(element.textContent, '1,234 人次');
  assert.equal(calls[0].url, 'https://yuhsin.goatcounter.com/counter/%2Fsite-visit.json?start=2026-10-27');
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(window.YuhsinUsage.page('site-visit'), false);
  window.fetch = async () => ({ ok: false });
  await window.YuhsinUsage.refreshVisitorCount();
  assert.equal(element.textContent, '統計更新中');
  window.fetch = async () => ({ ok: true, json: async () => ({ count: null }) });
  await window.YuhsinUsage.refreshVisitorCount();
  assert.equal(element.textContent, '統計更新中');
  console.log('Visitor counter: formatted real API count, fixed site-visit path, deduplication and unavailable/invalid data handling passed.');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
