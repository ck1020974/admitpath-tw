const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const rankPath = path.join(root, "outputs", "admissions_data", "star_rank_percent_standards.json");
const star114Path = path.join(root, "outputs", "admissions_data", "star114_admission_standards.json");
const star115Path = path.join(root, "outputs", "admissions_data", "star115_admission_standards.json");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function schoolSet(rows) {
  return new Set(rows.map((row) => String(row.school_code || "").trim()).filter(Boolean));
}

const standards = loadJson(rankPath);
const star114Rows = loadJson(star114Path);
const star115Rows = loadJson(star115Path);

const byYear = new Map();
standards.forEach((row) => {
  const year = Number(row.admission_year || 0);
  const schoolCode = String(row.school_code || "").trim();
  if (!year || !schoolCode) fail("Every star rank standard row must include admission_year and school_code.");
  if (!byYear.has(year)) byYear.set(year, new Map());
  byYear.get(year).set(schoolCode, row);
});

const expected114Schools = schoolSet(star114Rows);
const expected115Schools = schoolSet(star115Rows);

if (!byYear.has(114)) {
  fail("Missing 114 star rank standards.");
}

if (!byYear.has(115)) {
  fail("Missing 115 star rank standards.");
}

const allowedValues = new Set(["前 20%", "前 30%", "前 40%", "前 50%"]);

for (const [year, expectedSchools] of [
  [114, expected114Schools],
  [115, expected115Schools],
]) {
  const rows = byYear.get(year);
  const missing = [...expectedSchools].filter((schoolCode) => !rows.has(schoolCode));
  if (missing.length) {
    fail(`${year} star rank standards are missing ${missing.length} schools: ${missing.slice(0, 8).join(", ")}`);
  }
  for (const schoolCode of expectedSchools) {
    const row = rows.get(schoolCode);
    const value = String(row.academic_rank_percentile_standard || "").trim();
    if (!allowedValues.has(value)) {
      fail(`${year} ${schoolCode} has invalid percentile standard: ${value || "(empty)"}`);
    }
    const sourceUrl = String(row.source_url || "").trim();
    if (!sourceUrl.startsWith("https://www.cac.edu.tw/")) {
      fail(`${year} ${schoolCode} should keep an official source URL.`);
    }
  }
}

console.log(
  `Star rank standards contract check passed (114: ${expected114Schools.size} schools, 115: ${expected115Schools.size} schools).`,
);
