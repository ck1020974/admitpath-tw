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

const sample = records.find((item) => item.channelKey === "personal_application" && item.applySieveResult);
if (!sample) fail("Missing personal application fixture with apply sieve result.");

if (vm.runInContext('formatApplicationThresholdWithStandard(115, "國文", "頂標")', sandbox) !== "國文 13級（頂標）") {
  fail("Personal application thresholds should include both the level score and five-standard name.");
}

try {
  const html = vm.runInContext(`detailHtml(state.records.find((item) => item.id === "${sample.id}"), null)`, sandbox);
  if (!html || !html.includes("第一階段篩選結果")) {
    fail("Personal application detail should render first-stage result content.");
  }
  if (!html.includes("學測申請門檻")) {
    fail("Personal application detail should always include the GSAT application thresholds when available.");
  }
  if (html.indexOf("學測申請門檻") > html.indexOf("第一階段篩選結果")) {
    fail("GSAT application thresholds should appear before the first-stage screening result.");
  }
} catch (error) {
  fail(`Personal application detail should render without runtime error: ${error.message}`);
}

console.log("Personal application detail contract check passed.");
