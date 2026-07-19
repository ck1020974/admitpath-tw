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

if (/class="home-card-rail"/.test(html)) {
  fail("Homepage should no longer use the older four-card rail layout.");
}

if (/全台校系查詢與升學管道比較/.test(html) || /class="topbar"/.test(html)) {
  fail("The shared page header should be removed to preserve vertical space for each workspace.");
}

if (!/class="side-nav primary-nav"/.test(html)) {
  fail("Sidebar should separate student-facing primary navigation.");
}

if (/class="side-nav utility-nav"/.test(html)) {
  fail("Comparison should share the main navigation flow instead of living in a separate utility block.");
}

const primaryNavigation = html.match(/<nav class="side-nav primary-nav"[\s\S]*?<\/nav>/);

["overview", "workbench", "placement", "explorer", "compare"].forEach((view) => {
  if (!primaryNavigation?.[0].includes(`data-view="${view}"`)) {
    fail(`Primary navigation should contain ${view}.`);
  }
});

if (primaryNavigation?.[0].includes('data-view="sources"') || primaryNavigation?.[0].includes('data-view="quality"')) {
  fail("Sidebar should not foreground data-source or data-quality administration views.");
}

if (/教師工具/.test(html)) {
  fail("Sidebar should not label comparison as a teacher-only tool.");
}

if (!/class="home-intro"/.test(html)) {
  fail("Homepage should use a compact student-facing introduction.");
}

if (/<span class="hero-kicker">升學探索入口<\/span>/.test(html)) {
  fail("Homepage introduction should not repeat the exploration-entry label.");
}

if (/class="home-hero home-hero-compact"/.test(html)) {
  fail("Homepage should not wrap its introduction in the older framed hero panel.");
}

if (!/class="home-entry-grid"/.test(html)) {
  fail("Homepage should render a dedicated primary entry grid.");
}

const primaryCards = html.match(/class="home-primary-card/g) || [];
if (primaryCards.length !== 2) {
  fail("Homepage should keep exactly two primary entry cards.");
}

const utilityCards = html.match(/class="home-utility-card/g) || [];
if (utilityCards.length < 3) {
  fail("Homepage should expose at least three compact utility cards.");
}

if (/data-home-entry="quality-review"/.test(html)) {
  fail("Homepage should not expose the data quality workflow in the user-facing home entry cards.");
}

if (/Main Workspace/.test(html)) {
  fail("Homepage primary cards should avoid long English kicker text that crowds the image overlay.");
}

['data-home-entry="star-entry"', 'data-home-entry="personal-apply"', 'data-home-entry="distribution-entry"'].forEach((pattern) => {
  if (!html.includes(pattern)) fail(`Homepage should expose utility entry ${pattern}.`);
});

if (/data-home-entry="compare-list"/.test(html)) {
  fail("Homepage utility cards should now focus on the three admission channels instead of compare list.");
}

if (!/\.home-entry-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2/s.test(css)) {
  fail("Homepage primary entry grid should use a two-column layout on desktop.");
}

if (!/\.home-utility-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3/s.test(css)) {
  fail("Homepage utility entry grid should use a compact three-card layout.");
}

if (!/\.home-intro\s*\{[^}]*background:\s*transparent/s.test(css)) {
  fail("Homepage introduction should remain unframed and transparent.");
}

if (!/@media \(max-width: 720px\)[\s\S]*?\.home-intro h2\s*\{[^}]*font-size:\s*30px/s.test(css)) {
  fail("Homepage introduction should reduce the headline scale on mobile.");
}

if (!/@media \(max-width: 720px\)[\s\S]*?\.home-entry-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2/s.test(css)) {
  fail("Mobile homepage should keep both primary entry cards in a compact two-column row.");
}

if (!/@media \(max-width: 720px\)[\s\S]*?\.home-utility-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3/s.test(css)) {
  fail("Mobile homepage should keep the three admission-channel entries in a compact row.");
}

if (!/@media \(max-width: 720px\)[\s\S]*?\.side\s*\{[^}]*gap:\s*8px/s.test(css)) {
  fail("Mobile navigation should use compact sidebar spacing.");
}

if (!/@media \(max-width: 720px\)[\s\S]*?\.primary-nav\s*\{[^}]*grid-template-columns:\s*repeat\(5/s.test(css)) {
  fail("Mobile navigation should keep comparison in the same five-item row as the primary destinations.");
}

if (!/@media \(max-width: 720px\)[\s\S]*?\.side-meta\s*\{[^}]*display:\s*none/s.test(css)) {
  fail("Mobile navigation should hide the nonessential record-count panel.");
}

if (!/\.home-primary-card\s*\{[^}]*min-height:\s*clamp\(208px,\s*28vh,\s*268px\)/s.test(css)) {
  fail("Homepage primary cards should use a compact viewport-aware height.");
}

if (!/compare-empty-actions/.test(app) || !/data-compare-channel/.test(app)) {
  fail("An empty comparison list should guide users into existing query filters.");
}

if (!/data-compare-empty-action/.test(app)) {
  fail("An empty comparison list should also expose existing placement and explorer routes.");
}

if (!/\.explorer-head-actions\s*\{[^}]*flex-wrap:\s*nowrap;[^}]*\}/s.test(css)) {
  fail("Explorer action row should keep controls on one line with flex-wrap: nowrap.");
}

if (!/\.explorer-search\.compact\s*\{[^}]*flex:\s*0 1 /s.test(css)) {
  fail("Explorer compact search should have an explicit shrinkable width rule.");
}

console.log("Homepage layout contract check passed.");
