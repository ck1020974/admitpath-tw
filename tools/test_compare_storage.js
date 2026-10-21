const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../site/app.js'), 'utf8');
const key = 'admitpath-tw:compare:v1';
const records = Array.from({ length: 101 }, (_, i) => ({
  id: `115-personal_application-${i}-115_apply`, year: 115,
  channelKey: 'personal_application', schoolName: '測試大學', departmentName: `最新系名${i}`,
}));
const storage = new Map();
let failRead = false;
let failWrite = false;
const localStorage = {
  getItem(k) { if (failRead) throw new Error('SecurityError'); return storage.get(k) ?? null; },
  setItem(k, value) { if (failWrite) throw new Error('QuotaExceededError'); storage.set(k, value); },
};
function session() {
  const context = vm.createContext({
    console, Intl, URLSearchParams, window: { localStorage, alert() {}, GroupIntroductions: require("../site/group-introductions.js") },
    document: { addEventListener() {} }, __records: records,
  });
  vm.runInContext(source, context);
  vm.runInContext(`
    state.records = __records;
    els.detailCompareButton = { dataset: {} };
    renderCompare = () => {};
    renderTable = () => {};
    updateDetailCompareButton = () => {};
  `, context);
  return {
    run: code => vm.runInContext(code, context),
    ids: () => Array.from(vm.runInContext('state.compare.map(record => record.id)', context)),
    status: () => vm.runInContext('state.compareStorageStatus', context),
  };
}
const savedIds = () => JSON.parse(storage.get(key)).ids;
const toggle = (s, i) => s.run(`toggleCompare(${JSON.stringify(records[i].id)})`);
async function main() {
  let s = session();
  s.run('restoreCompare()');
  assert.deepEqual(s.ids(), []);
  assert.match(s.status(), /自動儲存/);
  toggle(s, 2); toggle(s, 0); toggle(s, 1);
  assert.deepEqual(savedIds(), [records[2].id, records[0].id, records[1].id]);
  assert.deepEqual(Object.keys(JSON.parse(storage.get(key))).sort(), ['ids', 'version']);

  // A fresh JS context models leaving the site and opening it again.
  s = session();
  s.run('restoreCompare()');
  assert.deepEqual(s.ids(), savedIds());
  assert.equal(s.run('state.compare[0] === state.records[2]'), true);
  toggle(s, 0);
  s = session(); s.run('restoreCompare()');
  assert.deepEqual(s.ids(), [records[2].id, records[1].id]);
  s.run('clearCompare()');
  s = session(); s.run('restoreCompare()');
  assert.deepEqual(s.ids(), []);

  storage.set(key, JSON.stringify({ version: 1, ids: [records[1].id, 'removed-program', records[1].id, records[0].id] }));
  s = session(); s.run('restoreCompare()');
  assert.deepEqual(s.ids(), [records[1].id, records[0].id]);
  assert.match(s.status(), /1 個項目已不在目前資料/);
  assert.deepEqual(savedIds(), s.ids());
  storage.set(key, JSON.stringify({ version: 1, ids: records.map(r => r.id) }));
  s = session(); s.run('restoreCompare()');
  assert.equal(s.ids().length, 100);
  toggle(s, 100);
  assert.equal(savedIds().length, 100);

  for (const invalid of ['broken JSON', 'null', '{"version":2,"ids":[]}', '{"version":1,"ids":[null]}', '{"version":1,"ids":{}}']) {
    storage.set(key, invalid);
    s = session(); s.run('restoreCompare()');
    assert.deepEqual(s.ids(), []);
    assert.match(s.status(), /格式無法讀取/);
    assert.equal(storage.get(key), invalid); // Reading bad data does not overwrite it.
    toggle(s, 0);
    assert.deepEqual(savedIds(), [records[0].id]);
  }
  failRead = true;
  s = session(); s.run('restoreCompare()');
  assert.match(s.status(), /無法讀取/);
  failRead = false; failWrite = true;
  toggle(s, 1);
  assert.deepEqual(s.ids(), [records[1].id]);
  assert.match(s.status(), /無法儲存/);
  s.run('clearCompare()');
  assert.deepEqual(s.ids(), []);
  failWrite = false;
  toggle(s, 2);
  assert.match(s.status(), /已自動儲存/);

  // Exercise the real init ordering: restore after data loads, before table rendering.
  s = session();
  s.run(`
    state.records = [];
    bindElements = () => {};
    bindEvents = () => {};
    loadData = async () => { state.records = __records; };
    hydrateSchoolFilter = () => {};
    hydratePlacementFilters = () => {};
    applyFilters = () => { if (state.compare[0] !== __records[2]) throw new Error('Selection not restored before rendering'); };
    renderPlacementAnalysis = renderExplorer = renderQualityReport = renderSources = () => {};
  `);
  await s.run('init()');
  assert.deepEqual(s.ids(), [records[2].id]);
  console.log('Compare storage: fresh-session restore, order, current records, remove, clear, missing IDs, deduplication, 100-limit, invalid data, storage failures, recovery and init ordering passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
