// 首頁與導覽列版面（2026-10-23 改版：上方導覽列、照片主視覺、兩張入口卡、關於作者、頁尾）。
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "..", "site", "index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "site", "layout.css"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "..", "site", "app.js"), "utf8");
function fail(message) { console.error(message); process.exit(1); }

if (/<aside class="side">/.test(html)) fail("The left sidebar should be replaced by the top navigation.");
const nav = html.match(/<nav class="top-nav primary-nav"[\s\S]*?<\/nav>/);
if (!nav) fail("Top navigation should exist.");
["explorer", "workbench", "placement", "compare"].forEach((view) => {
  if (!nav[0].includes(`data-view="${view}"`)) fail(`Top navigation should contain ${view}.`);
});
if (!/data-curiosity-entry href="\.\/explore\/curiosity\/"/.test(nav[0])) fail("Top navigation should start with 學群探索.");
if (/data-view="(quality|sources)"/.test(nav[0])) fail("Navigation should not foreground data administration views.");
if (!/class="brand" type="button" data-view="overview"/.test(html)) fail("The brand should take students back to the homepage.");
if (!/id="topbarMenu"[^>]*aria-controls="primaryNav"/.test(html)) fail("Phones need a menu button for the top navigation.");
if (!/class="home-spot"[\s\S]*?class="home-cta" href="\.\/explore\/curiosity\/"/.test(html)) fail("Homepage hero should start the curiosity explorer.");
if (!/data-home-entry="group-explorer"/.test(html)) fail("Homepage should link to 十八學群.");
["special-entry", "star-entry", "personal-apply", "distribution-entry"].forEach((entry) => {
  if (!new RegExp(`class="home-channels"[\\s\\S]*?data-home-entry="${entry}"`).test(html)) fail(`Homepage school card should include ${entry}.`);
});
if (!/id="about"[\s\S]*?讓學生成為<br>自己未來的主人/.test(html)) fail("Homepage should introduce the author.");
if (!/id="aboutActions"[^>]*hidden/.test(html) || !/function setupContactLinks/.test(app)) fail("Contact buttons should stay hidden until contact-config.js is filled.");
if (!/class="site-foot"[\s\S]*?id="sideRecordCount"/.test(html)) fail("Footer should show the data status.");
if (!/@media \(max-width: 1020px\)[\s\S]*?body\.menu-open \.top-nav \{ display: grid; \}/.test(css)) fail("The phone menu should open from the menu button.");
if (/home-campus-wide\.jpg|home-study\.jpg/.test(html)) fail("Homepage should not reuse the old stock photos.");
console.log("Homepage layout contract passed.");
