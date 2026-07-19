const fs = require("fs");
const path = require("path");

const appJsPath = path.join(__dirname, "..", "site", "app.js");
const source = fs.readFileSync(appJsPath, "utf8");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!/selectedExplorerStage/.test(source)) {
  fail("Explorer should track an explicit selectedExplorerStage state.");
}

if (!/function\s+explorerGroupIntroHtml\s*\(/.test(source)) {
  fail("Explorer should render a dedicated group introduction view before department cards.");
}

if (!/function\s+explorerCategoryIntroHtml\s*\(/.test(source)) {
  fail("Explorer should render a dedicated category introduction view.");
}

if (!/function\s+explorerDepartmentListHtml\s*\(/.test(source)) {
  fail("Explorer should render a dedicated department list view after category introduction.");
}

const categoryIntroMatch = source.match(/function\s+explorerCategoryIntroHtml\s*\(\)\s*\{([\s\S]*?)\n\}/);
if (!categoryIntroMatch) {
  fail("Could not inspect explorerCategoryIntroHtml source.");
}

if (/explorer-dept-grid/.test(categoryIntroMatch[1])) {
  fail("Category introduction view should not inline the related department grid.");
}

if (!/data-open-category-results/.test(categoryIntroMatch[1])) {
  fail("Category introduction view should include an explicit action to open the related departments page.");
}

if (!/if\s*\(entry === "group-explorer"\)\s*\{[\s\S]*(selectedExplorerStage\s*=\s*"overview"|resetExplorerState\("overview"\));/s.test(source)) {
  fail("Clicking the 18-group entry should reset the explorer back to overview stage.");
}

console.log("Explorer stage contract check passed.");
