const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appJsPath = path.join(__dirname, "..", "site", "app.js");
const indexPath = path.join(__dirname, "..", "site", "index.html");
const recordsPath = path.join(__dirname, "..", "site", "data", "admissions_records.json");
const resultsPath = path.join(__dirname, "..", "site", "data", "distribution_results_114.json");
const groupsPath = path.join(__dirname, "..", "site", "data", "group_departments.json");
const standardsPath = path.join(__dirname, "..", "site", "data", "ceec_gsat_five_standard_scores.json");

const source = fs.readFileSync(appJsPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");
const records = JSON.parse(fs.readFileSync(recordsPath, "utf8"));
const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const groups = JSON.parse(fs.readFileSync(groupsPath, "utf8"));
const standards = JSON.parse(fs.readFileSync(standardsPath, "utf8"));
const applySieveOverrideMatch = source.match(/const\s+APPLY_SIEVE_SCORE_OVERRIDES\s*=\s*\{[\s\S]*?\n\};/);

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
  'data-view="placement"',
  'id="placementView"',
  'id="placementResults"',
  'data-placement-score="數A"',
  'data-placement-channel="personal_application"',
].forEach((pattern) => {
  if (!index.includes(pattern)) fail(`Missing placement analysis markup: ${pattern}`);
});

[
  "defaultPlacementState",
  "renderPlacementAnalysis",
  "placementProfile",
  "evaluatePlacementRecord",
  "placementRecordRequirements",
  "placementMatchesFilters",
  "placementResultSummary",
].forEach((name) => extractFunction(name));

const sandbox = {
  Intl,
  state: {
    records,
    results,
    groups,
    gsatStandards: standards,
    placement: {
      scores: {
        國文: 13,
        英文: 12,
        數A: 10,
        數B: "",
        社會: 12,
        自然: 13,
        英聽: "",
        在校: 8,
        數甲: "",
        數乙: "",
        歷史: "",
        地理: "",
        公民: "",
        物理: "",
        化學: "",
        生物: "",
      },
      channels: ["personal_application", "star_recommendation"],
      schoolOwnership: "all",
      topUniversityOnly: false,
      groups: ["資訊學群", "工程學群"],
      categories: ["資訊工程學類", "電機工程學類"],
      keyword: "",
    },
  },
  fmt: new Intl.NumberFormat("zh-Hant-TW"),
};

vm.createContext(sandbox);
vm.runInContext([
  applySieveOverrideMatch ? applySieveOverrideMatch[0] : "const APPLY_SIEVE_SCORE_OVERRIDES = {};",
  extractFunction("defaultPlacementState"),
  extractFunction("placementProfile"),
  extractFunction("evaluatePlacementRecord"),
  extractFunction("placementRecordRequirements"),
  extractFunction("placementApplyRequirements"),
  extractFunction("applySieveOverrideConfig"),
  extractFunction("applySieveRankedItems"),
  extractFunction("placementStarRequirements"),
  extractFunction("placementDistributionRequirements"),
  extractFunction("uniquePlacementRequirements"),
  extractFunction("placementMatchesFilters"),
  extractFunction("placementSelectedNeedles"),
  extractFunction("placementResultSummary"),
  extractFunction("placementRequirementLabel"),
  extractFunction("placementScoreValue"),
  extractFunction("placementRequirementResult"),
  extractFunction("advancedSubjectKey"),
  extractFunction("advancedSubjectKeysFromText"),
  extractFunction("schoolOwnership"),
  extractFunction("isTopUniversity"),
  extractFunction("specialAdmissionInfo"),
  extractFunction("specialAdmissionModeAllows"),
  extractFunction("advancedCategoryNeedles"),
  extractFunction("groupRowsToNeedles"),
  extractFunction("matchesGroup"),
  extractFunction("distributionResult"),
  extractFunction("distributionSubjectLabel"),
  extractFunction("distributionWeightLabel"),
  extractFunction("shortSubject"),
  extractFunction("normalizeSubject"),
  extractFunction("subjectKey"),
  extractFunction("normalize"),
].join("\n\n"), sandbox);

const profile = sandbox.placementProfile();
if (!profile.channels.includes("personal_application") || !profile.channels.includes("star_recommendation")) {
  fail("Placement profile should expose selected channels.");
}

const ntuCs = records.find((record) => record.schoolName === "國立臺灣大學" && record.departmentName.includes("資訊工程"));
if (!ntuCs) fail("Could not find NTU CS sample.");
if (!sandbox.placementMatchesFilters(ntuCs, profile)) {
  fail("NTU CS should match selected 資訊/工程學類 filters.");
}

const ntuLiterature = records.find((record) => record.schoolName === "國立臺灣大學" && record.departmentName.includes("中國文學"));
if (!ntuLiterature) fail("Could not find NTU literature sample.");
if (sandbox.placementMatchesFilters(ntuLiterature, profile)) {
  fail("Literature should not match selected 資訊/工程學類 filters.");
}

const evaluation = sandbox.evaluatePlacementRecord(ntuCs, profile);
if (!["match", "near", "miss", "missing"].includes(evaluation.status)) {
  fail(`Unexpected placement status: ${evaluation.status}`);
}
if (!Array.isArray(evaluation.requirements) || !evaluation.requirements.length) {
  fail("Placement evaluation should expose checked requirements.");
}
if (!sandbox.placementResultSummary(evaluation)) {
  fail("Placement evaluation should provide a readable summary.");
}

console.log("Placement analysis contract check passed.");
