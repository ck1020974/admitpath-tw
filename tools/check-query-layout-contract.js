const fs = require("fs");
const path = require("path");

const app = fs.readFileSync(path.join(__dirname, "..", "site", "app.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "site", "styles.css"), "utf8");

function fail(message) {
  console.error(message);
  process.exit(1);
}

const renderTable = app.match(/function renderTable\(\)\s*\{[\s\S]*?\n\}/)?.[0] || "";
if (renderTable.includes("dataQualityStatusPillHtml") || renderTable.includes("status-pill-row")) {
  fail("Student-facing query rows should not show internal data-quality status pills.");
}

if (!/\.table-shell\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*900px;[\s\S]*?\}/.test(css)) {
  fail("The query shell should use a compact readable width instead of leaving a large blank framed area.");
}

if (!/table\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*760px;[\s\S]*?\}/.test(css)) {
  fail("The query table should fill its compact workspace while retaining a readable minimum width.");
}

[
  ["col-channel", "12%"],
  ["col-program", "23%"],
  ["col-highlight", "51%"],
  ["col-actions", "14%"],
].forEach(([column, width]) => {
  if (!new RegExp(`\\.${column}\\s*\\{\\s*width:\\s*${width.replace("%", "\\%")}\\s*;\\s*\\}`).test(css)) {
    fail(`Query column ${column} should use the shared proportional width ${width}.`);
  }
});

if (!/\.row-actions\s+\.small-button\s*\{[\s\S]*?min-height:\s*32px;[\s\S]*?padding:\s*0\s+8px;[\s\S]*?font-size:\s*12px;[\s\S]*?\}/.test(css)) {
  fail("Query action buttons should be compact enough to remain side-by-side without horizontal overflow.");
}

console.log("Query layout contract check passed.");
