const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appJsPath = path.join(__dirname, "..", "site", "app.js");
const indexPath = path.join(__dirname, "..", "site", "index.html");
const recordsPath = path.join(__dirname, "..", "site", "data", "admissions_records.json");
const groupsPath = path.join(__dirname, "..", "site", "data", "group_departments.json");

const source = fs.readFileSync(appJsPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");
const records = JSON.parse(fs.readFileSync(recordsPath, "utf8"));
const groups = JSON.parse(fs.readFileSync(groupsPath, "utf8"));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function extractFunction(name) {
  const match = source.match(new RegExp(`function\\s+${name}\\s*\\(`));
  const start = match ? match.index : -1;
  if (start < 0) fail(`Could not find ${name} in site/app.js`);
  let index = source.indexOf("{", start);
  let depth = 0;
  for (; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  fail(`Could not parse ${name} in site/app.js`);
}

[
  "advancedFilterDrawer",
  "openAdvancedFiltersButton",
  "advancedFilterSummary",
].forEach((pattern) => {
  if (!index.includes(pattern)) fail(`Missing advanced filter markup: ${pattern}`);
});

[
  "recordMatchesAdvancedFilters",
  "recordSubjectKeys",
  "schoolOwnership",
  "isTopUniversity",
  "renderAdvancedFilterDrawer",
  "advancedFilterSummaryText",
].forEach((name) => extractFunction(name));

const sandbox = {
  state: {
    groups,
    filters: {
      advanced: {
        excludedSubjects: [],
        schoolOwnership: "all",
        topUniversityOnly: false,
        group: "",
        category: "",
      },
    },
  },
  normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[（）]/g, (char) => (char === "（" ? "(" : ")"));
  },
};

vm.createContext(sandbox);
vm.runInContext([
  extractFunction("recordMatchesAdvancedFilters"),
  extractFunction("recordSubjectKeys"),
  extractFunction("advancedSubjectKeysFromText"),
  extractFunction("advancedSubjectKey"),
  extractFunction("schoolOwnership"),
  extractFunction("isTopUniversity"),
  extractFunction("specialAdmissionInfo"),
  extractFunction("specialAdmissionModeAllows"),
  extractFunction("advancedCategoryNeedles"),
  extractFunction("groupRowsToNeedles"),
  extractFunction("matchesGroup"),
].join("\n\n"), sandbox);

const ntuApply = records.find((record) => (
  record.channelKey === "personal_application"
  && record.schoolName === "國立臺灣大學"
  && record.departmentName.includes("中國文學")
));
if (!ntuApply) fail("Could not find NTU personal application sample.");

if (!sandbox.isTopUniversity(ntuApply)) fail("NTU should be treated as a top university.");
if (sandbox.schoolOwnership(ntuApply) !== "public") fail("National universities should be public.");

sandbox.state.filters.advanced.excludedSubjects = ["數A"];
if (sandbox.recordMatchesAdvancedFilters(ntuApply)) {
  fail("Personal application record with 數A requirement should be excluded by 不看數A.");
}

sandbox.state.filters.advanced.excludedSubjects = [];
sandbox.state.filters.advanced.schoolOwnership = "private";
if (sandbox.recordMatchesAdvancedFilters(ntuApply)) {
  fail("Public school should be excluded when private schools are selected.");
}

sandbox.state.filters.advanced.schoolOwnership = "all";
sandbox.state.filters.advanced.topUniversityOnly = true;
const privateRecord = records.find((record) => record.schoolName && !record.schoolName.startsWith("國立") && !record.schoolName.startsWith("市立"));
if (!privateRecord) fail("Could not find private sample.");
if (sandbox.recordMatchesAdvancedFilters(privateRecord)) {
  fail("Non-top university should be excluded when top university filter is enabled.");
}

sandbox.state.filters.advanced.topUniversityOnly = false;
sandbox.state.filters.advanced.category = "資訊工程學類";
if (sandbox.recordMatchesAdvancedFilters(ntuApply)) {
  fail("Chinese literature should be excluded when 資訊工程學類 is selected.");
}

const ntuCs = records.find((record) => record.schoolName === "國立臺灣大學" && record.departmentName.includes("資訊工程"));
if (!ntuCs) fail("Could not find NTU CS sample.");
if (!sandbox.recordMatchesAdvancedFilters(ntuCs)) {
  fail("NTU CS should match 資訊工程學類.");
}

console.log("Advanced filter contract check passed.");
