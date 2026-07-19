const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const reportPath = path.join(root, "site", "data", "apply114_quality_report.json");
const appPath = path.join(root, "site", "app.js");
const htmlPath = path.join(root, "site", "index.html");

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

assert(fs.existsSync(reportPath), "Missing apply114 quality report data file");

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
assert(report.summary?.year === 114, "Report summary must target year 114");
assert(report.summary?.channelKey === "personal_application", "Report summary must target personal application");
assert(report.summary?.totalRecords >= 2000, "Report should cover all 114 personal application records");
assert(report.summary?.officialResultCoverageRate > 0.3 && report.summary?.officialResultCoverageRate < 0.5, "114 official coverage rate should expose the current gap");
assert(report.summary?.missingOfficialResultCount > 1000, "Report should list the large missing official result backlog");

const ruleText = JSON.stringify(report.qualityRules || []);
assert(ruleText.includes("同校") || ruleText.includes("same_school"), "Quality rules must use same-school context");
assert(ruleText.includes("層級") || ruleText.includes("tier"), "Quality rules must include tier fallback context");
assert(ruleText.includes("科目數") || ruleText.includes("subjectCount"), "Quality rules must compare by subject count");

const nccuAnomaly = (report.anomalies || []).find((item) => item.recordId === "114-personal_application-006132-114_apply");
assert(nccuAnomaly, "Report should flag NCCU ethnology OCR anomaly");
assert(nccuAnomaly.risk === "high", "NCCU ethnology anomaly should be high risk");
assert(/合計|錯位/.test(JSON.stringify(nccuAnomaly)), "NCCU anomaly reason should mention sum or shift issue");

assert((report.manualCorrections || []).length >= 6, "Report should include the first batch of verified manual corrections");
[
  "114-personal_application-001082-114_apply",
  "114-personal_application-001122-114_apply",
  "114-personal_application-004172-114_apply",
  "114-personal_application-006032-114_apply",
  "114-personal_application-006132-114_apply",
  "114-personal_application-006152-114_apply",
  "114-personal_application-006182-114_apply",
].forEach((recordId) => {
  assert((report.manualCorrections || []).some((item) => item.recordId === recordId), `Missing manual correction for ${recordId}`);
});

const nccuCorrection = (report.manualCorrections || []).find((item) => item.recordId === "114-personal_application-006132-114_apply");
assert(nccuCorrection?.correctedRankedItems?.some((item) => item.rank === 1 && String(item.score) === "40"), "Report should include the NCCU 006132 correction to 40");
assert(Array.isArray(report.missingOfficialResults) && report.missingOfficialResults.length > 1000, "Missing official results list should be present");
assert(Array.isArray(report.confirmedOfficialEmptyResults), "Report should expose confirmed official empty results");
assert(report.confirmedOfficialEmptyResults.some((item) => item.recordId === "114-personal_application-099142-114_apply"), "Report should classify 099142 as confirmed official empty");
assert(!(report.missingOfficialResults || []).some((item) => item.recordId === "114-personal_application-099142-114_apply"), "099142 should not remain in missing official results");
assert((report.summary?.confirmedOfficialEmptyCount || 0) >= 20, "Report should batch classify special-group official-empty rows");
[
  "114-personal_application-002402-114_apply",
  "114-personal_application-003462-114_apply",
  "114-personal_application-011452-114_apply",
  "114-personal_application-013332-114_apply",
  "114-personal_application-109192-114_apply",
].forEach((recordId) => {
  assert((report.confirmedOfficialEmptyResults || []).some((item) => item.recordId === recordId), `Missing confirmed official empty classification for ${recordId}`);
  assert(!(report.missingOfficialResults || []).some((item) => item.recordId === recordId), `${recordId} should not remain in missing official results`);
});
assert((report.summary?.confirmedOfficialEmptyCount || 0) >= 70, "Report should absorb youth-account and conservative public-fund official-empty rows");
[
  "114-personal_application-002042-114_apply",
  "114-personal_application-020062-114_apply",
  "114-personal_application-154022-114_apply",
  "114-personal_application-011082-114_apply",
  "114-personal_application-023172-114_apply",
  "114-personal_application-036052-114_apply",
].forEach((recordId) => {
  assert((report.confirmedOfficialEmptyResults || []).some((item) => item.recordId === recordId), `Missing youth/public-fund official empty classification for ${recordId}`);
  assert(!(report.missingOfficialResults || []).some((item) => item.recordId === recordId), `${recordId} should not remain in missing official results`);
});

assert(Array.isArray(report.reviewQueue) && report.reviewQueue.length >= 20, "Report should expose a prioritized review queue");
assert(Array.isArray(report.mixedPublicFundSchools) && report.mixedPublicFundSchools.length >= 3, "Report should expose mixed public-fund schools");
["002", "031", "032"].forEach((schoolCode) => {
  assert((report.mixedPublicFundSchools || []).some((item) => item.schoolCode === schoolCode), `Missing mixed public-fund school ${schoolCode}`);
});
assert((report.anomalies || []).every((item) => typeof item.anomalyScore === "number"), "Each anomaly should expose a numeric anomaly score");
assert((report.anomalies || []).some((item) => item.reviewAction === "先看官方圖"), "Anomalies should expose review actions");
assert((report.anomalies || []).some((item) => item.sourceUrl), "Anomalies should carry source URLs for follow-up");
assert(report.reviewQueue.some((item) => item.kind === "anomaly"), "Review queue should include anomaly items");
assert(report.reviewQueue.some((item) => item.kind === "missing_official"), "Review queue should include missing official result items");

const html = fs.readFileSync(htmlPath, "utf8");
assert(!html.includes('data-view="quality"'), "Student navigation should not expose the internal data quality view");
assert(!html.includes('id="qualityView"'), "Student-facing HTML should not include the internal quality view panel");
assert(!html.includes('id="qualityReportRoot"'), "Student-facing HTML should not include the internal quality report root");

const app = fs.readFileSync(appPath, "utf8");
assert(app.includes("renderQualityReport"), "Internal quality-report rendering helper should remain available for maintenance use");

console.log("Apply 114 quality report contract passed");
