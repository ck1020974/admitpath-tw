const fs = require("fs");
const path = require("path");

const site = path.join(__dirname, "..", "site");
const app = fs.readFileSync(path.join(site, "app.js"), "utf8");
const html = fs.readFileSync(path.join(site, "index.html"), "utf8");
const css = fs.readFileSync(path.join(site, "workbench.css"), "utf8");

function fail(message) {
  console.error(message);
  process.exit(1);
}

const renderTable = app.match(/function renderTable\(\)\s*\{[\s\S]*?\n\}/)?.[0] || "";
if (renderTable.includes("dataQualityStatusPillHtml") || renderTable.includes("status-pill-row")) {
  fail("Student-facing query rows should not show internal data-quality status pills.");
}

if (!/<link rel="stylesheet" href="\.\/workbench\.css\?v=[^"]+">/.test(html)) {
  fail("The workbench styles should live in their own versioned workbench.css, separate from the homepage styles.");
}

// 清單要填滿工作區（不再限制 900px），也不能在手機上撐出橫向捲動。
if (!/\.table-shell\.rec-list\s*\{[\s\S]*?max-width:\s*none;[\s\S]*?\}/.test(css)) {
  fail("The result list should fill the workspace width instead of leaving a blank strip on the right.");
}
if (!/\.rec-list table\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?\}/.test(css)) {
  fail("The result list must not force a minimum width that scrolls sideways on phones.");
}

// 每列：整列開詳情、右側比較按鈕、一個重點加一行補充。
const row = app.match(/function workbenchRecordRowHtml\([\s\S]*?\n\}/)?.[0] || "";
["data-detail=", "data-compare=", "data-remove-compare=", "rec-key", "rec-sub"].forEach((needle) => {
  if (!row.includes(needle)) fail(`Workbench rows should include ${needle}.`);
});
if (/去年|今年/.test(app.match(/function recordSummary\([\s\S]*?\n\}/)?.[0] || "")) {
  fail("Row labels should name the stage (一階篩選、最低錄取…), not 去年／今年, so they never need yearly edits.");
}

// 電腦版的年度與管道快速選項，必須綁回原本的下拉選單（手機版用）。
["yearFilter", "channelFilter"].forEach((id) => {
  if (!new RegExp(`data-seg-for="${id}"`).test(html)) fail(`Quick options should mirror #${id}.`);
});

console.log("Query layout contract check passed.");
