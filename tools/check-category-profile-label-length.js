const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appJsPath = path.join(__dirname, "..", "site", "app.js");
const groupsPath = path.join(__dirname, "..", "site", "data", "group_departments.json");
const insightsPath = path.join(__dirname, "..", "site", "data", "category_insights.json");

const source = fs.readFileSync(appJsPath, "utf8");
const rows = JSON.parse(fs.readFileSync(groupsPath, "utf8"));
const insights = JSON.parse(fs.readFileSync(insightsPath, "utf8"));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function extractFunction(name) {
  const start = source.indexOf(`function ${name}`);
  if (start < 0) fail(`Could not find ${name} in site/app.js`);
  let index = source.indexOf("{", start);
  let depth = 0;
  for (; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  fail(`Could not parse ${name} in site/app.js`);
}

const sandbox = {
  state: { categoryInsights: insights },
};
vm.createContext(sandbox);
vm.runInContext([
  extractFunction("categorySummaryProfile"),
  extractFunction("stableProfileHash"),
  extractFunction("seededProfileItems"),
  extractFunction("mergeProfileItems"),
  extractFunction("compactProfileLabel"),
].join("\n\n"), sandbox);

const seen = new Set();
for (const row of rows) {
  if (!row.categoryName || seen.has(row.categoryName)) continue;
  seen.add(row.categoryName);
  const insight = insights[row.categoryName] || {
    summary: row.categoryName,
    focusDescription: row.groupName || "",
    foundationCourses: [],
    coreCourses: [row.categoryName],
    appliedCourses: [],
  };
  const profile = sandbox.categorySummaryProfile(row.categoryName, insight, row.groupName || "");
  [...profile.traits, ...profile.abilities].forEach((label) => {
    const compact = sandbox.compactProfileLabel(label);
    if ([...compact].length > 8) {
      fail(`Profile label should be 8 chars or fewer: ${label} => ${compact}`);
    }
  });
}

console.log("Category profile label length check passed.");
