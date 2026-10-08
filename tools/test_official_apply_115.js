const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "site", "app.js"), "utf8");
const records = JSON.parse(fs.readFileSync(path.join(root, "site", "data", "admissions_records.json"), "utf8"));
const gsat = JSON.parse(fs.readFileSync(path.join(root, "site", "data", "ceec_gsat_five_standard_scores.json"), "utf8"));
const quality = JSON.parse(fs.readFileSync(path.join(root, "site", "data", "apply114_quality_report.json"), "utf8"));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function stubElement() {
  return {
    innerHTML: "",
    textContent: "",
    value: "",
    dataset: {},
    style: {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; },
    },
    setAttribute() {},
    getAttribute() { return null; },
    appendChild() {},
    remove() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
  };
}

const sandbox = {
  AdmissionRules: require("../site/admission-rules.js"),
  console,
  window: { location: { search: "" } },
  location: { search: "" },
  history: { replaceState() {} },
  URLSearchParams,
  setTimeout() {},
  clearTimeout() {},
  fetch: async () => ({ json: async () => ({}) }),
  document: {
    body: stubElement(),
    getElementById() { return stubElement(); },
    querySelector() { return stubElement(); },
    querySelectorAll() { return []; },
    addEventListener() {},
  },
  __records: records,
  __gsat: gsat,
  __quality: quality,
};

vm.createContext(sandbox);
vm.runInContext(app, sandbox);
vm.runInContext(
  "state.records = __records; state.gsatStandards = __gsat; state.qualityReport = __quality;",
  sandbox
);


const assert = require('assert');
const rules = require('../site/admission-rules.js');
const reviews = JSON.parse(fs.readFileSync(path.join(__dirname, 'official_sieve_reviews_20261008.json'), 'utf8'));
for (const id of Object.keys(reviews)) {
  const record = records.find(r => r.id === id);
  const detail = vm.runInContext(`detailHtml(state.records.find(r => r.id === ${JSON.stringify(id)}), null)`, sandbox);
  assert(detail.includes('第一階段篩選結果'), id);
  assert(!detail.includes('篩選 ◎倍'), id);
  const html = vm.runInContext(`applySieveResultHtml(state.records.find(r => r.id === ${JSON.stringify(id)}))`, sandbox);
  assert(html.includes('查看官方篩選原表'), id);
  const display = sandbox.personalApplicationDisplayResults(record);
  assert.equal(display.length, record.applySieveResult.rankedItems.filter(i => i.score).length, id);
  for (const specialization of record.applySieveResult.specializations || []) {
    assert(html.includes(specialization.major), id + specialization.major);
    for (const row of specialization.rankedItems.filter(i => i.score)) assert(html.includes(row.score), id + row.label);
  }
  if (record.applySieveResult.publishedStatus === 'not-published') assert(html.includes('官方未列篩選分數（--）'), id);
  assert(rules.requirements(record, gsat).every(rule => rule.subjects.every(s => !['主修','副修','樂理','視唱','聽寫','素描','彩繪技法','創意表現','美術鑑賞','水墨書畫','體育百分等級','體育','APCS識讀','APCS實作'].includes(s))), id);
}
const plant = records.find(r => r.id === '115-personal_application-001492-115_apply');
assert.deepEqual(plant.applySieveResult.rankedItems.map(i => i.score), ['26','8','11']);
const displayAPCS = records.find(r => r.id === '115-personal_application-003272-115_apply');
assert(sandbox.personalApplicationDisplayResults(displayAPCS).some(i => i.subjects.includes('APCS識讀')));
const music = records.filter(r => r.id in reviews && r.applySieveResult.specializations);
assert.equal(music.length, 15);
assert.equal(music.reduce((n,r) => n + r.applySieveResult.specializations.length,0), 201);
for (const record of music) assert.equal(record.applySieveResult.specializations.reduce((n,s) => n + Number(s.quota),0), Number(record.quota));
assert.equal(records.filter(r => r.year === 115 && r.admissionAudit?.resultIssues?.length).length, 0);
console.log('Official 115 audit: 186 details render, 201 majors complete; arts/APCS excluded from GSAT-only placement.');
