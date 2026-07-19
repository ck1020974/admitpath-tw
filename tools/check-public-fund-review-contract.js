const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "site", "public-fund-review.html");
const jsPath = path.join(root, "site", "public-fund-review.js");
const appPath = path.join(root, "site", "app.js");

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

assert(fs.existsSync(htmlPath), "Missing public fund review page");
assert(fs.existsSync(jsPath), "Missing public fund review script");

const html = fs.readFileSync(htmlPath, "utf8");
assert(html.includes('id="reviewList"'), "Public fund review page should reuse review list layout");
assert(html.includes('id="detailTitle"'), "Public fund review page should expose detail title");
assert(html.includes("public-fund-review.js"), "Public fund review page should load its script");

const js = fs.readFileSync(jsPath, "utf8");
assert(js.includes("apply114_quality_report.json"), "Public fund review script should load the quality report");
assert(js.includes("mixedPublicFundSchools"), "Public fund review script should read mixed public-fund schools");
assert(js.includes("schoolFilter"), "Public fund review script should support filtering by school");
assert(js.includes("exportJson"), "Public fund review script should support JSON export");
assert(js.includes("exportCsv"), "Public fund review script should support CSV export");

const app = fs.readFileSync(appPath, "utf8");
assert(app.includes("public-fund-review.html"), "Quality page should link to the public-fund review page");

console.log("Public fund review contract passed");
