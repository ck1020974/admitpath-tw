const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "site", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "site", "app.js"), "utf8");
const source = `${html}\n${app}`;
const records = JSON.parse(fs.readFileSync(path.join(root, "site", "data", "admissions_records.json"), "utf8"));

function fail(message) {
  console.error(message);
  process.exit(1);
}

[
  "data-special-admission-filter",
  "data-placement-special",
].forEach((pattern) => {
  if (!source.includes(pattern)) fail(`Missing special admission UI hook: ${pattern}`);
});

[
  "function specialAdmissionInfo(",
  "function specialAdmissionModeAllows(",
  "function specialAdmissionBadgeHtml(",
].forEach((pattern) => {
  if (!app.includes(pattern)) fail(`Missing special admission function: ${pattern}`);
});

if (!/specialAdmissionMode:\s*"exclude"/.test(app)) {
  fail("Special admission mode should default to exclude.");
}

if (!/recordMatchesAdvancedFilters[\s\S]*specialAdmissionModeAllows/.test(app)) {
  fail("Advanced query filters must apply the special admission mode.");
}

if (!/placementMatchesFilters[\s\S]*specialAdmissionModeAllows/.test(app)) {
  fail("Placement analysis filters must apply the special admission mode.");
}

const explicitSpecialNames = [
  "希望組甲組(文社法)",
  "旭日招生甲組(人文、教育)",
  "成星招生甲組(文社)",
  "清華學院學士班乙組(青年儲蓄帳戶組)",
];

explicitSpecialNames.forEach((name) => {
  if (!records.some((record) => String(record.departmentName || "").includes(name))) {
    fail(`Expected fixture record missing: ${name}`);
  }
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(escaped).test(app) && !/希望組|旭日招生|成星招生|青年儲蓄/.test(app)) {
    fail(`Special admission detector does not appear to cover: ${name}`);
  }
});

const normalRecord = records.find((record) => record.schoolName === "國立臺灣大學" && record.departmentName === "化學系");
if (!normalRecord) fail("Expected normal fixture record missing: 國立臺灣大學 化學系");

[
  "\u653f\u661f",
  "\u5c6f\u8499",
].forEach((term) => {
  if (!records.some((record) => String(record.departmentName || "").includes(term))) {
    fail(`Expected special admission fixture record missing: ${term}`);
  }
  if (!app.includes(term)) {
    fail(`Special admission detector should include keyword: ${term}`);
  }
});

console.log("Special admission filter contract check passed.");
