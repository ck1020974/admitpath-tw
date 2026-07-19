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
].join("\n\n"), sandbox);

const categories = [];
const seen = new Set();
rows.forEach((row) => {
  if (!row.categoryName || seen.has(row.categoryName)) return;
  seen.add(row.categoryName);
  categories.push({
    categoryName: row.categoryName,
    groupName: row.groupName || "",
  });
});

const signatures = new Map();
categories.forEach(({ categoryName, groupName }) => {
  const insight = insights[categoryName] || {
    summary: categoryName,
    focusDescription: groupName,
    foundationCourses: [],
    coreCourses: [categoryName, groupName].filter(Boolean),
    appliedCourses: [],
  };
  const profile = sandbox.categorySummaryProfile(categoryName, insight, groupName);
  if (!Array.isArray(profile.traits) || profile.traits.length !== 4) {
    fail(`Category ${categoryName} should render exactly four traits.`);
  }
  if (!Array.isArray(profile.abilities) || profile.abilities.length !== 4) {
    fail(`Category ${categoryName} should render exactly four abilities.`);
  }
  const signature = `${profile.traits.join(" / ")} || ${profile.abilities.join(" / ")}`;
  signatures.set(signature, (signatures.get(signature) || 0) + 1);
});

const uniqueCount = signatures.size;
const maxDuplicate = Math.max(...signatures.values());

if (uniqueCount < 110) {
  fail(`Category profiles are still too repetitive: only ${uniqueCount} unique signatures for ${categories.length} categories.`);
}

if (maxDuplicate > 3) {
  fail(`Category profiles are still too repetitive: one signature is reused ${maxDuplicate} times.`);
}

console.log(`Category profile diversity check passed (${uniqueCount} unique signatures / max duplicate ${maxDuplicate}).`);
