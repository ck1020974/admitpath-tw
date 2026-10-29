const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../site/app.js'), 'utf8');
const html = fs.readFileSync(require.resolve('../site/index.html'), 'utf8');
const channels = ['personal_application', 'star_recommendation', 'exam_distribution', 'special_selection'];
const records = Array.from({ length: 101 }, (_, i) => ({ id: String(i), year: i % 2 ? 114 : 115, channelKey: channels[i % 4], schoolName: '測試大學', departmentName: `測試系${i}` }));
const buttons = channels.map(channel => ({ dataset: { compareChannelToggle: channel }, classList: { toggle() {} }, setAttribute(name, value) { this[name] = value; } }));
const grid = { innerHTML: '', querySelectorAll: () => [] };
const clear = {};
const tools = {};
const state = { records, compare: [], compareFilters: { year: 'all', channels: [...channels] } };
let alerts = 0;
const context = { state, els: { compareGrid: grid, compareYearFilter: {} }, fmt: new Intl.NumberFormat('zh-Hant-TW'),
  accountRecords:null,renderCompareImport(){},
  COMPARE_STORAGE_KEY: 'admitpath-tw:compare:v1',
  document: { getElementById: id => id === 'compareTools' ? tools : id === 'clearCompareButton' ? clear : null, querySelectorAll: () => buttons }, window: { alert: () => alerts++, localStorage: { setItem() {} } },
  renderTable() {}, updateDetailCompareButton() {}, recordSummary: r => ({ key: { label: '條件', html: `標準${r.id}` }, sub: null }), channelBadge: r => r.channelKey, specialAdmissionBadgeHtml: () => '（軍校）', escapeHtml: String, escapeAttr: String };
vm.createContext(context);
const names = ['dataPending', 'saveCompare', 'toggleCompare', 'renderCompare', 'filteredCompareRecords', 'workbenchRecordRowHtml'];
vm.runInContext(names.map(name => source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))[0]).join('\n'), context);
context.renderCompare();
assert.equal(tools.hidden, true);
assert.equal(clear.hidden, true);
assert.ok(grid.innerHTML.includes('href="#workbench"') && grid.innerHTML.includes('href="#placement"'));
assert.ok(grid.innerHTML.includes('＋ 追蹤'));
for (let i = 0; i < 100; i++) context.toggleCompare(String(i));
assert.equal(tools.hidden, false);
assert.equal(clear.hidden, false);
assert.equal(state.compare.length, 100);
assert.equal(context.filteredCompareRecords().length, 100);
assert.equal((grid.innerHTML.match(/<tr[ >]/g) || []).length, 101); // Header + all 100 rows, no hidden cap.
assert.ok(!html.includes('id="compareResultCount"'));
assert.ok(!html.includes('id="navCompareCount"'));
assert.ok(!html.includes('id="compareTrayCount"'));
context.toggleCompare('100');
assert.equal(state.compare.length, 100);
assert.equal(alerts, 1);
context.toggleCompare('0');
context.toggleCompare('100');
assert.equal(state.compare.length, 100);
assert.ok(state.compare.some(r => r.id === '100'));
state.compareFilters.year = '114';
context.renderCompare();
assert.equal(context.filteredCompareRecords().length, 50);
state.compareFilters.channels = ['star_recommendation'];
context.renderCompare();
assert.equal(context.filteredCompareRecords().length, 25);
assert.equal(buttons[0]['aria-pressed'], 'false');
assert.equal(buttons[1]['aria-pressed'], 'true');
state.compareFilters.channels = [];
context.renderCompare();
assert.equal(context.filteredCompareRecords().length, 0);
assert.equal(state.compare.length, 100);
assert.ok(grid.innerHTML.includes('尚未選取入學管道'));
state.compareFilters = { year: 'all', channels: [...channels] };
context.renderCompare();
assert.equal(context.filteredCompareRecords().length, 100);
const row = context.workbenchRecordRowHtml(records[0], true);
assert.ok(row.includes('標準0') && row.includes('（軍校）') && row.includes('data-detail="0"') && row.includes('data-remove-compare="0"'));
assert.ok(context.workbenchRecordRowHtml(records[0]).includes('data-compare="0"'));
context.recordSummary = () => ({ key: { label: '一階篩選', html: '英文 12' }, sub: { label: '申請門檻', text: '英文 均標' } });
for (const comparing of [false, true]) {
  const ordered = context.workbenchRecordRowHtml(records[0], comparing);
  assert(ordered.indexOf('申請門檻') < ordered.indexOf('一階篩選'));
}
assert.equal((html.match(/data-compare-channel-toggle=/g) || []).length, 5); // 個申、四技、繁星、分發、特選
assert.ok(html.includes('id="compareYearFilter"'));
// Star admission rounds share the same row markup, bold values and separators.
context.starThresholdParts = () => ['英文 均標'];
context.starRoundRows = () => [{ items: ['在校 5%', '英文 13'] }, { items: ['在校 8%', '英文 12'] }];
vm.runInContext(source.match(/function recordSummary\([\s\S]*?\n\}/)[0], context);
const starRecord = { ...records[0], channelKey: 'star_recommendation' };
for (const comparing of [false, true]) {
  const starRow = context.workbenchRecordRowHtml(starRecord, comparing);
  assert.equal((starRow.match(/class="rec-key"/g) || []).length, 2);
  assert.equal((starRow.match(/class="rec-key-value"/g) || []).length, 2);
  assert.ok(starRow.includes('<b>在校 5%</b>') && starRow.includes('<b>在校 8%</b>'));
  assert.equal((starRow.match(/class="rec-step"/g) || []).length, 2);
  assert.ok(!starRow.includes('rec-after'));
  assert.ok(starRow.indexOf('申請門檻') < starRow.indexOf('>一階<'));
  assert.ok(starRow.indexOf('>一階<') < starRow.indexOf('>二階<'));
}
context.starRoundRows = () => [{ items: [] }, { items: ['在校 8%'] }];
assert.ok(context.workbenchRecordRowHtml(starRecord).includes('<b>在校 8%</b>'));
context.starRoundRows = () => [];
assert.equal(context.recordSummary(starRecord).secondKey, null);
state.compare = [];
context.renderCompare();
assert.equal(tools.hidden, true);
assert.equal(clear.hidden, true);
assert.ok(grid.innerHTML.includes('trackingEmptyTitle'));
console.log('Compare list: 100-limit, 101st rejection, remove/re-add, year and all four channel filters, retained selections, shared workbench rows passed.');
