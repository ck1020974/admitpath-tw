const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "site", "app.js"), "utf8");
const records = JSON.parse(fs.readFileSync(path.join(root, "site", "data", "admissions_records.json"), "utf8"));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function extractFunction(name) {
  const match = app.match(new RegExp(`function\\s+${name}\\s*\\(`));
  const start = match ? match.index : -1;
  if (start < 0) fail(`Could not find ${name} in site/app.js`);
  let index = app.indexOf("{", start);
  let depth = 0;
  for (; index < app.length; index += 1) {
    const char = app[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return app.slice(start, index + 1);
    }
  }
  fail(`Could not parse ${name} in site/app.js`);
}

const constMatch = app.match(/const\s+APPLY_SIEVE_SCORE_OVERRIDES\s*=\s*\{[\s\S]*?\n\};/);
if (!constMatch) fail("Missing APPLY_SIEVE_SCORE_OVERRIDES.");

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(
  `${constMatch[0]}\n${extractFunction("applySieveOverrideConfig")}\n${extractFunction("applySieveRankedItems")}`,
  sandbox
);

[
  ["114-personal_application-006132-114_apply", 1, "40", "NCCU Ethnology first rank"],
  ["114-personal_application-006032-114_apply", 1, "46", "NCCU Philosophy first rank"],
  ["114-personal_application-006152-114_apply", 1, "43", "NCCU International Business first rank"],
  ["114-personal_application-006182-114_apply", 1, "9", "NCCU Statistics A first rank"],
  ["114-personal_application-001122-114_apply", 1, "47", "NTU Geology first rank"],
  ["114-personal_application-001062-114_apply", 1, "40", "NTU Library Science first rank"],
  ["114-personal_application-001062-114_apply", 2, "14", "NTU Library Science second rank"],
  ["114-personal_application-001402-114_apply", 1, "40", "NTU Agricultural Chemistry first rank"],
  ["114-personal_application-001402-114_apply", 3, "14", "NTU Agricultural Chemistry third rank"],
  ["114-personal_application-001142-114_apply", 1, "33", "NTU Geography first rank"],
  ["114-personal_application-001532-114_apply", 1, "43", "NTU Finance first rank"],
  ["114-personal_application-004172-114_apply", 1, "43", "NCKU Engineering Science first rank"],
  ["114-personal_application-004022-114_apply", 1, "39", "NCKU Foreign Languages first rank"],
  ["114-personal_application-001082-114_apply", 1, "10", "NTU Drama first rank"],
  ["114-personal_application-001082-114_apply", 4, "12", "NTU Drama fourth rank"],
  ["114-personal_application-001122-114_apply", 3, "13", "NTU Geology third rank"],
  ["114-personal_application-004172-114_apply", 3, "14", "NCKU Engineering Science third rank"],
  ["114-personal_application-004262-114_apply", 1, "22", "NCKU Transportation first rank"],
  ["114-personal_application-004292-114_apply", 1, "27", "NCKU Business Administration first rank"],
  ["114-personal_application-004302-114_apply", 4, "58", "NCKU Medicine fourth rank"],
  ["114-personal_application-004282-114_apply", 1, "45", "NCKU Accounting first rank"],
  ["114-personal_application-004332-114_apply", 1, "46", "NCKU Medical Laboratory first rank"],
  ["114-personal_application-004332-114_apply", 3, "13", "NCKU Medical Laboratory third rank"],
  ["114-personal_application-004362-114_apply", 1, "49", "NCKU Occupational Therapy first rank"],
  ["114-personal_application-004362-114_apply", 2, "13", "NCKU Occupational Therapy second rank"],
  ["114-personal_application-006042-114_apply", 1, "50", "NCCU Education first rank"],
  ["114-personal_application-006052-114_apply", 1, "25", "NCCU Political Science first rank"],
  ["114-personal_application-006062-114_apply", 1, "9", "NCCU Sociology first rank"],
  ["114-personal_application-006072-114_apply", 1, "32", "NCCU Public Finance first rank"],
  ["114-personal_application-006092-114_apply", 1, "12", "NCCU Land Resources Planning first rank"],
  ["114-personal_application-006092-114_apply", 2, "20", "NCCU Land Resources Planning second rank"],
  ["114-personal_application-006092-114_apply", 3, "47", "NCCU Land Resources Planning third rank"],
  ["114-personal_application-099012-114_apply", 1, "49", "NTPU Law general first rank"],
  ["114-personal_application-099022-114_apply", 1, "46", "NTPU Law general flying first rank"],
  ["114-personal_application-099022-114_apply", 4, "13", "NTPU Law general flying fourth rank"],
  ["114-personal_application-099032-114_apply", 1, "51", "NTPU Law judicial first rank"],
  ["114-personal_application-099032-114_apply", 4, "13", "NTPU Law judicial fourth rank"],
  ["114-personal_application-099042-114_apply", 1, "47", "NTPU Law judicial flying first rank"],
  ["114-personal_application-099042-114_apply", 4, "13", "NTPU Law judicial flying fourth rank"],
  ["114-personal_application-099052-114_apply", 1, "52", "NTPU Financial law first rank"],
  ["114-personal_application-099062-114_apply", 1, "44", "NTPU Financial law flying first rank"],
  ["114-personal_application-099062-114_apply", 4, "14", "NTPU Financial law flying fourth rank"],
  ["114-personal_application-099112-114_apply", 1, "43", "NTPU Accounting first rank"],
  ["114-personal_application-099112-114_apply", 2, "8", "NTPU Accounting second rank"],
  ["114-personal_application-099122-114_apply", 1, "40", "NTPU Accounting flying first rank"],
  ["114-personal_application-099192-114_apply", 1, "42", "NTPU Public Finance first rank"],
  ["114-personal_application-099192-114_apply", 2, "8", "NTPU Public Finance second rank"],
  ["114-personal_application-099202-114_apply", 1, "42", "NTPU Public Finance flying first rank"],
  ["114-personal_application-099322-114_apply", 1, "42", "NTPU Applied Foreign Languages first rank"],
  ["114-personal_application-023202-114_apply", 1, "32", "NCUE Information Management information group first rank"],
  ["114-personal_application-023212-114_apply", 1, "30", "NCUE Information Management digital content first rank"],
  ["114-personal_application-023222-114_apply", 1, "32", "NCUE Civics Education first rank"],
  ["114-personal_application-023272-114_apply", 1, "22", "NCUE Eagle D first rank"],
  ["114-personal_application-023272-114_apply", 2, "9", "NCUE Eagle D second rank"],
  ["114-personal_application-023282-114_apply", 1, "19", "NCUE Eagle E first rank"],
  ["114-personal_application-023282-114_apply", 2, "8", "NCUE Eagle E second rank"],
  ["114-personal_application-003052-114_apply", 1, "45", "NCHU Finance first rank"],
  ["114-personal_application-003052-114_apply", 2, "8", "NCHU Finance second rank"],
  ["114-personal_application-003092-114_apply", 1, "43", "NCHU Accounting first rank"],
  ["114-personal_application-003112-114_apply", 1, "31", "NCHU Applied Economics first rank"],
  ["114-personal_application-003272-114_apply", 1, "7", "NCHU CS APCS first rank"],
  ["114-personal_application-003272-114_apply", 2, "25", "NCHU CS APCS second rank"],
  ["114-personal_application-003272-114_apply", 4, "7", "NCHU CS APCS fourth rank"],
  ["114-personal_application-003332-114_apply", 1, "28", "NCHU Agronomy first rank"],
  ["114-personal_application-003332-114_apply", 3, "12", "NCHU Agronomy third rank"],
  ["114-personal_application-002102-114_apply", 1, "25", "NTNU Special Education first rank"],
  ["114-personal_application-002102-114_apply", 3, "13", "NTNU Special Education third rank"],
  ["114-personal_application-002112-114_apply", 1, "19", "NTNU Special Education public funded first rank"],
  ["114-personal_application-002172-114_apply", 1, "36", "NTNU History first rank"],
  ["114-personal_application-002172-114_apply", 3, "11", "NTNU History third rank"],
  ["114-personal_application-041302-114_apply", 1, "12", "NCCU CJK and financial law first rank"],
  ["114-personal_application-041362-114_apply", 1, "4", "NCCU Jiaxing C law first rank"],
  ["114-personal_application-041362-114_apply", 2, "19", "NCCU Jiaxing C law second rank"],
  ["114-personal_application-041402-114_apply", 1, "9", "NCCU Jiaxing G education first rank"],
  ["114-personal_application-041402-114_apply", 2, "19", "NCCU Jiaxing G education second rank"],
  ["114-personal_application-006092-114_apply", 1, "12", "NCCU Land Resources Planning first rank"],
  ["114-personal_application-006092-114_apply", 2, "20", "NCCU Land Resources Planning second rank"],
  ["114-personal_application-006092-114_apply", 3, "47", "NCCU Land Resources Planning third rank"],
  ["114-personal_application-006142-114_apply", 1, "43", "NCCU Diplomacy first rank"],
  ["114-personal_application-006252-114_apply", 1, "23", "NCCU Communication natural first rank"],
  ["114-personal_application-006252-114_apply", 2, "47", "NCCU Communication natural second rank"],
  ["114-personal_application-006382-114_apply", 1, "14", "NCCU Law first rank"],
  ["114-personal_application-006382-114_apply", 2, "28", "NCCU Law second rank"],
  ["114-personal_application-006382-114_apply", 3, "54", "NCCU Law third rank"],
  ["114-personal_application-006392-114_apply", 1, "11", "NCCU Applied Mathematics first rank"],
  ["114-personal_application-006392-114_apply", 2, "25", "NCCU Applied Mathematics second rank"],
  ["114-personal_application-006412-114_apply", 1, "11", "NCCU Computer Science first rank"],
  ["114-personal_application-006412-114_apply", 2, "50", "NCCU Computer Science second rank"],
  ["114-personal_application-006422-114_apply", 1, "20", "NCCU Computer Science APCS first rank"],
  ["114-personal_application-006422-114_apply", 2, "3", "NCCU Computer Science APCS second rank"],
  ["114-personal_application-006442-114_apply", 1, "24", "NCCU Innovation College first rank"],
  ["114-personal_application-006452-114_apply", 1, "30", "NCCU Zhengxing A first rank"],
  ["114-personal_application-006462-114_apply", 1, "26", "NCCU Zhengxing B first rank"],
  ["114-personal_application-004012-114_apply", 1, "22", "NCKU Chinese first rank"],
  ["114-personal_application-004012-114_apply", 2, "14", "NCKU Chinese second rank"],
  ["114-personal_application-004072-114_apply", 1, "14", "NCKU Chemistry first rank"],
  ["114-personal_application-004092-114_apply", 1, "43", "NCKU Photonics first rank"],
  ["114-personal_application-004092-114_apply", 2, "28", "NCKU Photonics second rank"],
  ["114-personal_application-004102-114_apply", 1, "36", "NCKU Mechanical first rank"],
  ["114-personal_application-004102-114_apply", 2, "50", "NCKU Mechanical second rank"],
  ["114-personal_application-004112-114_apply", 1, "38", "NCKU Mechanical Purdue first rank"],
  ["114-personal_application-004112-114_apply", 2, "51", "NCKU Mechanical Purdue second rank"],
  ["114-personal_application-004122-114_apply", 1, "39", "NCKU Chemical Engineering first rank"],
  ["114-personal_application-004132-114_apply", 1, "40", "NCKU Materials first rank"],
  ["114-personal_application-004162-114_apply", 1, "8", "NCKU Hydraulic first rank"],
  ["114-personal_application-004162-114_apply", 2, "11", "NCKU Hydraulic second rank"],
  ["114-personal_application-004162-114_apply", 3, "12", "NCKU Hydraulic third rank"],
  ["114-personal_application-004162-114_apply", 4, "11", "NCKU Hydraulic fourth rank"],
  ["114-personal_application-004182-114_apply", 1, "10", "NCKU Systems and Naval first rank"],
  ["114-personal_application-004182-114_apply", 2, "13", "NCKU Systems and Naval second rank"],
  ["114-personal_application-004182-114_apply", 3, "38", "NCKU Systems and Naval third rank"],
  ["114-personal_application-004212-114_apply", 1, "47", "NCKU Environmental first rank"],
  ["114-personal_application-004212-114_apply", 2, "36", "NCKU Environmental second rank"],
  ["114-personal_application-004222-114_apply", 1, "48", "NCKU Surveying first rank"],
  ["114-personal_application-004232-114_apply", 1, "39", "NCKU Biomedical Engineering first rank"],
  ["114-personal_application-004252-114_apply", 1, "21", "NCKU IIM APCS first rank"],
  ["114-personal_application-004252-114_apply", 2, "8", "NCKU IIM APCS second rank"],
  ["114-personal_application-004352-114_apply", 1, "14", "NCKU Physical Therapy first rank"],
  ["114-personal_application-004352-114_apply", 2, "52", "NCKU Physical Therapy second rank"],
  ["114-personal_application-004412-114_apply", 1, "39", "NCKU Psychology first rank"],
  ["114-personal_application-004422-114_apply", 1, "42", "NCKU Electrical first rank"],
  ["114-personal_application-004432-114_apply", 1, "42", "NCKU Electrical Purdue first rank"],
  ["114-personal_application-004442-114_apply", 1, "42", "NCKU Computer Science first rank"],
  ["114-personal_application-004452-114_apply", 1, "27", "NCKU Computer Science intelligent first rank"],
  ["114-personal_application-004462-114_apply", 1, "40", "NCKU Computer Science Purdue first rank"],
  ["114-personal_application-004472-114_apply", 1, "50", "NCKU Architecture first rank"],
  ["114-personal_application-004482-114_apply", 1, "23", "NCKU Urban Planning first rank"],
  ["114-personal_application-004482-114_apply", 2, "11", "NCKU Urban Planning second rank"],
  ["114-personal_application-004492-114_apply", 1, "49", "NCKU Industrial Design first rank"],
  ["114-personal_application-099072-114_apply", 1, "47", "NTPU Business first rank"],
  ["114-personal_application-099082-114_apply", 1, "8", "NTPU Business flying first rank"],
  ["114-personal_application-099082-114_apply", 2, "26", "NTPU Business flying second rank"],
  ["114-personal_application-099092-114_apply", 1, "49", "NTPU Finance coop first rank"],
  ["114-personal_application-099102-114_apply", 1, "41", "NTPU Finance coop flying first rank"],
  ["114-personal_application-099132-114_apply", 1, "34", "NTPU Statistics first rank"],
  ["114-personal_application-099212-114_apply", 1, "32", "NTPU Real Estate A first rank"],
  ["114-personal_application-099222-114_apply", 1, "36", "NTPU Real Estate B first rank"],
  ["114-personal_application-099282-114_apply", 1, "23", "NTPU Social Work first rank"],
  ["114-personal_application-099292-114_apply", 1, "27", "NTPU Social Work flying first rank"],
  ["114-personal_application-099302-114_apply", 1, "37", "NTPU Chinese first rank"],
  ["114-personal_application-099342-114_apply", 1, "27", "NTPU History first rank"],
  ["114-personal_application-099372-114_apply", 1, "17", "NTPU CS APCS first rank"],
  ["114-personal_application-099372-114_apply", 2, "7", "NTPU CS APCS second rank"],
  ["114-personal_application-099382-114_apply", 1, "19", "NTPU CS flying first rank"],
  ["114-personal_application-099412-114_apply", 1, "37", "NTPU Electrical first rank"],
  ["114-personal_application-099422-114_apply", 1, "30", "NTPU Electrical flying first rank"],
  ["114-personal_application-001022-114_apply", 1, "15", "NTU Foreign Languages first rank"],
  ["114-personal_application-001112-114_apply", 1, "11", "NTU Chemistry first rank"],
  ["114-personal_application-001112-114_apply", 2, "14", "NTU Chemistry second rank"],
  ["114-personal_application-001112-114_apply", 3, "14", "NTU Chemistry third rank"],
  ["114-personal_application-001132-114_apply", 1, "41", "NTU Psychology first rank"],
  ["114-personal_application-001222-114_apply", 1, "10", "NTU Sociology first rank"],
  ["114-personal_application-001222-114_apply", 2, "42", "NTU Sociology second rank"],
  ["114-personal_application-001242-114_apply", 1, "14", "NTU Medicine first rank"],
  ["114-personal_application-001242-114_apply", 2, "58", "NTU Medicine second rank"],
  ["114-personal_application-001242-114_apply", 3, "44", "NTU Medicine third rank"],
  ["114-personal_application-001262-114_apply", 1, "59", "NTU Dentistry first rank"],
  ["114-personal_application-001262-114_apply", 2, "45", "NTU Dentistry second rank"],
  ["114-personal_application-001272-114_apply", 1, "28", "NTU Pharmacy first rank"],
  ["114-personal_application-001272-114_apply", 2, "27", "NTU Pharmacy second rank"],
  ["114-personal_application-001282-114_apply", 1, "14", "NTU Med Lab first rank"],
  ["114-personal_application-001292-114_apply", 1, "12", "NTU Nursing first rank"],
  ["114-personal_application-001292-114_apply", 2, "13", "NTU Nursing second rank"],
  ["114-personal_application-001302-114_apply", 1, "41", "NTU Physical Therapy first rank"],
  ["114-personal_application-001322-114_apply", 1, "51", "NTU Civil Engineering first rank"],
  ["114-personal_application-001332-114_apply", 1, "41", "NTU Mechanical first rank"],
  ["114-personal_application-001372-114_apply", 1, "41", "NTU Biomedical Engineering first rank"],
  ["114-personal_application-001372-114_apply", 2, "14", "NTU Biomedical Engineering second rank"],
  ["114-personal_application-001412-114_apply", 1, "14", "NTU Forestry first rank"],
  ["114-personal_application-001422-114_apply", 1, "33", "NTU Animal Science first rank"],
  ["114-personal_application-001422-114_apply", 2, "14", "NTU Animal Science second rank"],
  ["114-personal_application-001442-114_apply", 1, "13", "NTU Horticulture first rank"],
  ["114-personal_application-001442-114_apply", 2, "13", "NTU Horticulture second rank"],
  ["114-personal_application-001462-114_apply", 1, "44", "NTU Bio-industry Communication first rank"],
  ["114-personal_application-001482-114_apply", 1, "32", "NTU Entomology first rank"],
  ["114-personal_application-001482-114_apply", 2, "13", "NTU Entomology second rank"],
  ["114-personal_application-001492-114_apply", 1, "14", "NTU Plant Pathology first rank"],
  ["114-personal_application-001492-114_apply", 2, "13", "NTU Plant Pathology second rank"],
  ["114-personal_application-001572-114_apply", 1, "38", "NTU Public Health first rank"],
  ["114-personal_application-001582-114_apply", 1, "44", "NTU Electrical first rank"],
  ["114-personal_application-001602-114_apply", 1, "12", "NTU CS APCS first rank"],
  ["114-personal_application-001602-114_apply", 2, "5", "NTU CS APCS second rank"],
  ["114-personal_application-001622-114_apply", 1, "30", "NTU Law first rank"],
  ["114-personal_application-001632-114_apply", 1, "30", "NTU Judicial first rank"],
  ["114-personal_application-001642-114_apply", 1, "30", "NTU Financial Law first rank"],
  ["114-personal_application-001682-114_apply", 1, "43", "NTU Hope A first rank"],
  ["114-personal_application-001682-114_apply", 2, "35", "NTU Hope A second rank"],
  ["114-personal_application-001692-114_apply", 1, "34", "NTU Hope B first rank"],
  ["114-personal_application-001702-114_apply", 1, "41", "NTU Hope C first rank"],
  ["114-personal_application-001702-114_apply", 2, "31", "NTU Hope C second rank"],
  ["114-personal_application-001712-114_apply", 1, "45", "NTU Hope D first rank"],
  ["114-personal_application-001712-114_apply", 2, "32", "NTU Hope D second rank"],
  ["114-personal_application-001722-114_apply", 1, "45", "NTU Hope E first rank"],
  ["114-personal_application-001722-114_apply", 2, "33", "NTU Hope E second rank"],
  ["114-personal_application-001742-114_apply", 1, "38", "NTU Hope G first rank"],
  ["114-personal_application-001742-114_apply", 2, "30", "NTU Hope G second rank"],
  ["114-personal_application-001752-114_apply", 1, "13", "NTU Hope H first rank"],
  ["114-personal_application-001752-114_apply", 2, "56", "NTU Hope H second rank"],
  ["114-personal_application-001752-114_apply", 3, "42", "NTU Hope H third rank"],
].forEach(([recordId, rank, expected, label]) => {
  const record = records.find((item) => item.id === recordId);
  if (!record) fail(`Could not find fixture for ${label}.`);
  const original = record.applySieveResult?.rankedItems?.find((item) => item.rank === rank);
  const corrected = sandbox.applySieveRankedItems(record);
  const correctedItem = corrected.find((item) => item.rank === rank);
  if (String(correctedItem?.score) !== expected) {
    fail(`${label} should be corrected to ${expected}, got ${correctedItem?.score}`);
  }
  if (correctedItem === original) {
    fail(`applySieveRankedItems should return copied ranked items for ${label}.`);
  }
});

console.log("Apply sieve corrections contract check passed.");
