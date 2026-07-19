const fs = require("fs");
const path = require("path");

const appJsPath = path.join(__dirname, "..", "site", "app.js");
const representativesPath = path.join(__dirname, "..", "site", "data", "category_representatives.json");
const groupsPath = path.join(__dirname, "..", "site", "data", "group_departments.json");

const source = fs.readFileSync(appJsPath, "utf8");
const representatives = JSON.parse(fs.readFileSync(representativesPath, "utf8"));
const groupRows = JSON.parse(fs.readFileSync(groupsPath, "utf8"));

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!/function\s+categoryRepresentativeSchools\s*\(/.test(source)) {
  fail("Category overview should use a dedicated representative school selection helper.");
}

if (!/category_representatives\.json/.test(source)) {
  fail("Category overview should load representative school priorities from a dedicated data file.");
}

const representativeEntries = Object.values(representatives).filter((entry) => {
  return Array.isArray(entry?.prioritySchools) && entry.prioritySchools.length;
});
if (representativeEntries.length < Math.floor(new Set(groupRows.map((row) => row.categoryName).filter(Boolean)).size * 0.8)) {
  fail("Representative school table should cover most categories.");
}

const match = source.match(/function\s+explorerCategoryIntroHtml\s*\(\)\s*\{([\s\S]*?)\n\}/);
if (!match) {
  fail("Could not inspect explorerCategoryIntroHtml.");
}

const categorySource = match[1];
const requiredPatterns = [
  ["explorer-category-hero", "Category overview should render a dedicated hero layout."],
  ["explorer-category-brief", "Category overview should render a consolidated brief section."],
  ["explorer-brief-courses", "Category overview should merge course highlights into the main category brief."],
  ["explorer-brief-combined", "Category overview should combine traits and abilities into one shared card."],
  ["profile-chip trait", "Trait chips should use the shared profile chip component."],
  ["profile-chip ability", "Ability chips should use the shared profile chip component."],
  ["renderCategoryCourseHighlights", "Category overview should render compact course highlights."],
  ["explorer-representative-grid", "Category overview should render a representative school grid."],
  ["representative-school-name", "Representative cards should protect long school names."],
  ["representative-departments", "Representative cards should protect long department names."],
];

requiredPatterns.forEach(([pattern, message]) => {
  if (!categorySource.includes(pattern)) fail(message);
});

const forbiddenPatterns = [
  ["explorer-category-summary", "Category overview should not keep the older tri-panel summary layout."],
  ["explorer-insight-grid", "Category overview should not keep the old duplicated insight grid."],
  ["renderCourseGroup", "Category overview should not keep the old multi-card course grouping layout."],
  ["chip-trait", "Traits should not use a separate chip style from abilities."],
  ["ability-pill", "Abilities should not use a separate chip style from traits."],
];

forbiddenPatterns.forEach(([pattern, message]) => {
  if (categorySource.includes(pattern)) fail(message);
});

console.log("Category overview contract check passed.");
