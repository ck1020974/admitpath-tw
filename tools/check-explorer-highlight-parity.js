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

const explorerCardMatch = source.match(/function\s+explorerDepartmentCard\s*\(row\)\s*\{[\s\S]*?\n\}/);
if (!explorerCardMatch) {
  fail("Could not find explorerDepartmentCard(row) in site/app.js");
}

if (!/const\s+compactHighlight\s*=\s*record\s*\?\s*highlightHtml\(record\)\s*:\s*"";/.test(explorerCardMatch[0])) {
  fail("Explorer cards are not using the shared highlightHtml(record) renderer.");
}

console.log("Explorer highlight parity check passed.");
