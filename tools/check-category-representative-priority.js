const fs = require("fs");
const path = require("path");

const representativesPath = path.join(__dirname, "..", "site", "data", "category_representatives.json");
const representatives = JSON.parse(fs.readFileSync(representativesPath, "utf8"));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireSchools(categoryName, expectedSchools) {
  const entry = representatives[categoryName];
  if (!entry || !Array.isArray(entry.prioritySchools)) {
    fail(`Missing representative schools for ${categoryName}.`);
  }
  expectedSchools.forEach((schoolName) => {
    if (!entry.prioritySchools.includes(schoolName)) {
      fail(`${categoryName} should include ${schoolName} in representative schools.`);
    }
  });
}

requireSchools("大眾傳播學類", ["世新大學", "銘傳大學"]);
requireSchools("新聞學類", ["世新大學", "銘傳大學", "國立政治大學"]);
requireSchools("工程科學學類", ["國立臺灣大學", "國立清華大學", "國立成功大學"]);
requireSchools("電機工程學類", ["國立臺灣大學", "國立清華大學", "國立陽明交通大學"]);
requireSchools("醫學學類", ["國立臺灣大學", "國立陽明交通大學", "長庚大學"]);

console.log("Category representative priority check passed.");
