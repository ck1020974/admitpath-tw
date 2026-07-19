const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "..", "site", "app.js");
const cssPath = path.join(__dirname, "..", "site", "styles.css");
const source = fs.readFileSync(appPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

function fail(message) {
  console.error(message);
  process.exit(1);
}

[
  "dataQualityStatusInfo",
  "dataQualityStatusPillHtml",
  "dataQualityStatusSummary",
].forEach((name) => {
  if (!source.includes(`function ${name}`)) fail(`Missing ${name} in site/app.js`);
});

if (!source.includes('資料狀態')) {
  fail("Detail view should render a 資料狀態 row.");
}

if (!source.includes('官方從缺')) {
  fail("Personal application records should support an official-empty status.");
}

if (!/\.data-status-pill\s*\{/.test(css)) {
  fail("Missing data status pill styling.");
}

if (!/\.data-status-pill\.review\s*\{/.test(css)) {
  fail("Missing review status tone styling.");
}

console.log("Data status contract check passed.");
