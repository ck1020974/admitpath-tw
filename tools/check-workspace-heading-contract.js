const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "site", "index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "site", "styles.css"), "utf8");

function fail(message) {
  console.error(message);
  process.exit(1);
}

[
  "workbenchView",
  "placementView",
  "explorerView",
  "compareView",
].forEach((viewId) => {
  const section = html.match(new RegExp(`<section class="view-panel" id="${viewId}"[\\s\\S]*?<\\/section>\\s*(?=<section class="view-panel"|<\\/main>)`));
  if (!section?.[0].includes("workspace-page-head")) {
    fail(`${viewId} should use the shared workspace heading.`);
  }
  if (!section[0].includes("workspace-page-copy")) {
    fail(`${viewId} should use the shared title and subtitle structure.`);
  }
});

[
  "校系資料查詢",
  "落點分析",
  "十八學群探索",
  "比較清單",
].forEach((title) => {
  if (!new RegExp(`<h2>${title}<\\/h2>`).test(html)) {
    fail(`Missing consistent workspace title: ${title}.`);
  }
});

if (!/\.workspace-page-head\s*\{[\s\S]*?display:\s*flex;[\s\S]*?align-items:\s*flex-end;[\s\S]*?\}/.test(css)) {
  fail("Workspace headings should share a common aligned layout.");
}

if (!/\.workspace-page-copy\s*>\s*p\s*\{[\s\S]*?color:\s*var\(--muted\)/.test(css)) {
  fail("Workspace subtitles should use the shared muted treatment.");
}

if (!/\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/.test(css)) {
  fail("Buttons and other styled controls should still honor their hidden state.");
}

console.log("Workspace heading contract check passed.");
