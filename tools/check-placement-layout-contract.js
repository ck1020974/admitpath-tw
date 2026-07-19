const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "site", "index.html");
const cssPath = path.join(__dirname, "..", "site", "styles.css");
const appPath = path.join(__dirname, "..", "site", "app.js");

const html = fs.readFileSync(htmlPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");
const app = fs.readFileSync(appPath, "utf8");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (/Score Matcher/.test(html) || /輸入學測、繁星或分發相關成績/.test(html)) {
  fail("Placement should not spend a full header card on a repeated label and explanatory copy.");
}

if (!/class="[^"]*placement-head[^"]*placement-head-compact[^"]*"/.test(html) || !/<h2>落點分析<\/h2>/.test(html)) {
  fail("Placement should retain a compact, plain-language heading.");
}

if (!/\.placement-head-compact\s*\{[^}]*border:\s*0[^}]*background:\s*transparent/s.test(css)) {
  fail("The compact placement heading should not look like a separate card.");
}

[
  "placement-workbench",
  "placement-score-band",
  "placement-filter-band",
  "placement-direction-panel",
  "placementGroupChips",
  "placementCategoryChips",
  "placementSummaryCards",
].forEach((pattern) => {
  if (!html.includes(pattern)) fail(`Missing placement scheme-B markup: ${pattern}`);
});

if (/placement-filter-disclosure|placement-direction-disclosure|<details/.test(html)) {
  fail("Placement filters should stay directly visible instead of using collapsible disclosures.");
}

if (/placementKeywordInput|placement-keyword|state\.placement\.keyword/.test(html) || /placementKeywordInput|state\.placement\.keyword/.test(app)) {
  fail("Placement should not include a keyword input or keyword-based matching state.");
}

["歷史", "地理", "公民", "生物"].forEach((subject) => {
  if (!html.includes(`data-placement-score="${subject}"`)) {
    fail(`Placement should include a score input for ${subject}.`);
  }
});

if (!/\.placement-filter-section\s*\{/.test(css) || !/\.placement-direction-columns\s*\{/.test(css)) {
  fail("Placement filters should use direct, consistently styled sections.");
}

const directionChips = css.match(/\.placement-direction-chips\s*\{[\s\S]*?\n\}/)?.[0] || "";
if (/max-height|overflow:\s*auto/.test(directionChips)) {
  fail("Placement group and category lists should use page scrolling instead of nested scrollbars.");
}

if (!/\.placement-direction-chip\s*\{[\s\S]*?min-height:\s*34px;[\s\S]*?font-size:\s*13px;[\s\S]*?\}/.test(css)) {
  fail("Placement group and category chips should use the larger readable selection size.");
}

[
  "未填科目會標示資料不足",
  "可同時選多個學群與學類",
  "尚未限制學群或學類",
  "管道、學校、招生類型",
].forEach((copy) => {
  if (html.includes(copy) || app.includes(copy)) {
    fail(`Placement should remove nonessential helper copy: ${copy}.`);
  }
});

[
  "renderPlacementDirectionOptions",
  "placementGroupChipHtml",
  "placementCategoryChipHtml",
  "placementSummaryCardsHtml",
].forEach((name) => {
  if (!new RegExp(`function\\s+${name}\\s*\\(`).test(app)) fail(`Missing placement layout function: ${name}`);
});

[
  "placement-control-panel",
  "placement-multi-selects",
  "placementGroupSelect",
  "placementCategorySelect",
].forEach((pattern) => {
  if (html.includes(pattern)) fail(`Placement scheme-B layout should not keep old selector UI: ${pattern}`);
});

if (!/\.placement-workbench\s*\{[\s\S]*?display:\s*grid;[\s\S]*?\}/.test(css)) {
  fail("Placement workbench should be a grid layout.");
}

if (!/\.placement-results-panel\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?\}/.test(css)) {
  fail("Placement results panel should be full-width single-column.");
}

[
  "placement-setup-stage",
  "placement-result-stage",
  "runPlacementAnalysis",
  "editPlacementCriteria",
  "placementCriteriaSummary",
].forEach((pattern) => {
  if (!html.includes(pattern)) fail(`Placement two-page flow is missing ${pattern}.`);
});

[
  "showPlacementResults",
  "showPlacementSetup",
  "placementCriteriaSummaryHtml",
].forEach((name) => {
  if (!new RegExp(`function\\s+${name}\\s*\\(`).test(app)) fail(`Placement two-page flow is missing ${name}.`);
});

if (!/\.placement-result-stage\s*\{/.test(css) || !/\.placement-run-bar\s*\{/.test(css)) {
  fail("Placement setup and results stages should have dedicated layout styling.");
}

console.log("Placement layout contract check passed.");
