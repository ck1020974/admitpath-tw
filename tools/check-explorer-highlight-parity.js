const fs = require("fs");
const path = require("path");

const appJsPath = path.join(__dirname, "..", "site", "app.js");
const source = fs.readFileSync(appJsPath, "utf8");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (/function\s+explorerCompactHighlightHtml\s*\(/.test(source)) {
  fail("Explorer should not keep a separate compact highlight renderer.");
}

const listMatch = source.match(/function\s+explorerDepartmentListHtml\s*\(\)\s*\{[\s\S]*?\n\}/);
if (!listMatch) {
  fail("Could not find explorerDepartmentListHtml() in site/app.js");
}

if (!/workbenchRecordRowHtml\(record\)/.test(listMatch[0])) {
  fail("The explorer list should share the workbench row renderer.");
}

console.log("Explorer highlight parity check passed.");
