const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "site", "app.js"), "utf8");
const records = JSON.parse(fs.readFileSync(path.join(root, "site", "data", "admissions_records.json"), "utf8"));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function extractFunction(name) {
  const match = app.match(new RegExp(`function\\s+${name}\\s*\\(`));
  const start = match ? match.index : -1;
  if (start < 0) fail(`Could not find ${name} in site/app.js`);
  let index = app.indexOf("{", start);
  let depth = 0;
  for (; index < app.length; index += 1) {
    const char = app[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return app.slice(start, index + 1);
    }
  }
  fail(`Could not parse ${name} in site/app.js`);
}

const constMatch = app.match(/const\s+APPLY_SIEVE_SCORE_OVERRIDES\s*=\s*\{[\s\S]*?\n\};/);
if (!constMatch) fail("Missing APPLY_SIEVE_SCORE_OVERRIDES.");

const sandbox = {
  shortSubject: (value) => value,
  formatSubjectScore: (subject, score) => `${subject} ${score}`,
  applicationThresholdParts: () => [],
  normalizeSieveLabel: (value) => value,
  splitSieveLabelParts: (value) => [value],
  sieveItemLabel: (value) => value?.label || "",
  subjectKey: (value) => value,
};
vm.createContext(sandbox);
vm.runInContext(
  [
    constMatch[0],
    extractFunction("personalApplicationStandardParts"),
    extractFunction("rankedSieveLabel"),
    extractFunction("personalApplicationNoResultLabel"),
    extractFunction("coveredSubjectsFromResult"),
    extractFunction("applySieveOverrideConfig"),
    extractFunction("applySieveRankedItems"),
  ].join("\n\n"),
  sandbox
);

const business = records.find((item) => item.id === "114-personal_application-004292-114_apply");
if (!business) fail("Missing fixture for 004292");
const businessParts = sandbox.personalApplicationStandardParts(business).map((item) => item.text);
if (!businessParts.includes("英文+數B 27")) {
  fail(`004292 should expose corrected screening label, got: ${businessParts.join(" / ")}`);
}
if (businessParts.includes("從缺")) {
  fail("004292 should not render 從缺 once corrected ranked items exist.");
}

const land = records.find((item) => item.id === "114-personal_application-006092-114_apply");
if (!land) fail("Missing fixture for 006092");
const landParts = sandbox.personalApplicationStandardParts(land).map((item) => item.text);
["國文 12", "英文+數A 20", "國文+英文+數A+社會 47"].forEach((label) => {
  if (!landParts.includes(label)) {
    fail(`006092 should expose ${label}, got: ${landParts.join(" / ")}`);
  }
});
if (landParts.includes("從缺")) {
  fail("006092 should not render 從缺 once corrected ranked items exist.");
}

console.log("Apply sieve display contract check passed.");
