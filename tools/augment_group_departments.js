const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const groupsPath = path.join(root, "site", "data", "group_departments.json");
const recordsPath = path.join(root, "site", "data", "admissions_records.json");

// 自動補齊的列每次都由原始官方分類重新推導，避免重跑時把推導結果再當成規則來源。
const groups = JSON.parse(fs.readFileSync(groupsPath, "utf8"))
  .filter((row) => !String(row.sourceDepartmentId || "").startsWith("auto-"));
const records = JSON.parse(fs.readFileSync(recordsPath, "utf8"));

function normalize(value) {
  return String(value || "")
    .replace(/[\s\-‐‑–—＿_、，,.()（）\[\]【】]/g, "")
    .replace(/臺/g, "台")
    .toLowerCase();
}

function splitSchoolDepartmentName(value) {
  const text = String(value || "");
  const match = text.match(/^(.+?(?:大學|學院))(.+)$/);
  return match
    ? { schoolName: match[1], departmentName: match[2] }
    : { schoolName: "", departmentName: text };
}

function meaningfulDepartment(value) {
  const text = String(value || "").trim();
  return text.length <= 80 && /(?:系|所|學程|學士班|學院|組)$|(?:系|所|學程|學士班|學院|組)[(（]/.test(text);
}

const categoryDefinitions = [
  ["資訊學群", "資訊工程學類", /資訊工程|資訊科學|資訊應用|資訊技術|數位科技|人工智慧|資安|資料科學|數據科學|資料工程|電腦科學|電腦工程|網路工程|軟體工程|電算|遊戲設計/],
  ["管理學群", "資訊管理學類", /資訊管理|經營資訊|商務資訊|決策科學|智慧商務/],
  ["工程學群", "電機工程學類", /電機工程|電機系/],
  ["工程學群", "電子工程學類", /電子工程|半導體/],
  ["工程學群", "光電工程學類", /光電/],
  ["工程學群", "通訊工程學類", /通訊工程|通信工程/],
  ["工程學群", "機械工程學類", /機械工程|機電工程/],
  ["工程學群", "土木工程學類", /土木工程/],
  ["工程學群", "材料工程學類", /材料工程|化材/],
  ["工程學群", "化學工程學類", /化學工程/],
  ["工程學群", "生醫工程學類", /生醫工程|醫學工程/],
  ["工程學群", "工程科學學類", /工程學系|工程系|工程學士班|工程組|工程跨域/],
  ["地球環境學群", "環境工程學類", /環境工程|環境資源|綠能|永續|防災|消防/],
  ["工程學群", "工程科學學類", /綠能|永續|防災|消防/],
  ["生命科學學群", "生命科學學類", /生命科學|生命學系|生物科學|生物醫學/],
  ["生命科學學群", "生物科技學類", /生物科技|生物技術|生技/],
  ["生物資源學群", "食品生技學類", /食品科學|食品科技|食品生技/],
  ["醫藥衛生學群", "食品營養學類", /食品營養|營養學/],
  ["生物資源學群", "動物科學學類", /動物科學|畜產|畜牧/],
  ["生物資源學群", "園藝學類", /園藝/],
  ["生物資源學群", "森林學類", /森林|林業/],
  ["生物資源學群", "海洋資源學類", /海洋資源|水產養殖|漁業/],
  ["醫藥衛生學群", "醫學學類", /醫學系|運動醫學/],
  ["醫藥衛生學群", "牙醫學類", /牙醫/],
  ["醫藥衛生學群", "藥學學類", /藥學/],
  ["醫藥衛生學群", "護理學類", /護理/],
  ["醫藥衛生學群", "醫學檢驗學類", /醫學檢驗|醫檢|再生醫學/],
  ["醫藥衛生學群", "影像放射學類", /放射|影像醫學/],
  ["醫藥衛生學群", "物理治療學類", /物理治療/],
  ["醫藥衛生學群", "職能治療學類", /職能治療/],
  ["醫藥衛生學群", "語療聽力學類", /語言治療|聽力/],
  ["醫藥衛生學群", "視光學類", /視光/],
  ["醫藥衛生學群", "公共衛生學類", /公共衛生|職業安全|衛生學系/],
  ["醫藥衛生學群", "健康照護學類", /健康促進|長期照顧|健康照護|醫事證照/],
  ["醫藥衛生學群", "醫務管理學類", /醫務管理|醫療管理/],
  ["數理化學群", "數學學類", /數學系|應用數學|數據統計|統計資訊|精算/],
  ["數理化學群", "化學學類", /化學系|應用化學|醫化|香粧/],
  ["數理化學群", "物理學類", /物理學|應用物理/],
  ["數理化學群", "自然科學學類", /理學院|科學學士班|理學組/],
  ["建築設計學群", "建築學類", /建築/],
  ["建築設計學群", "都市計畫學類", /都市計畫|都市設計|都市規劃/],
  ["建築設計學群", "空間設計學類", /空間設計|室內設計/],
  ["建築設計學群", "工業設計學類", /工業設計|產品設計/],
  ["建築設計學群", "商業設計學類", /商業設計|視覺設計|數位媒體設計|媒體設計/],
  ["建築設計學群", "藝術設計學類", /創意設計|設計學系|動畫/],
  ["藝術學群", "美術學類", /美術|繪畫|書畫|造形藝術/],
  ["藝術學群", "音樂學類", /音樂|樂器/],
  ["藝術學群", "表演藝術學類", /戲劇|劇場|表演藝術|舞蹈/],
  ["大眾傳播學群", "廣電電影學類", /電影|影像|廣播電視/],
  ["大眾傳播學群", "大眾傳播學類", /傳播|媒體/],
  ["大眾傳播學群", "新聞學類", /新聞/],
  ["大眾傳播學群", "廣告公關學類", /廣告|公關/],
  ["文史哲學群", "中國語文學類", /中國文學|華文文學|國文|語文學系/],
  ["文史哲學群", "歷史學類", /歷史|史學/],
  ["文史哲學群", "哲學學類", /哲學/],
  ["文史哲學群", "文化產業學類", /文化創意|文創|文化產業/],
  ["外語學群", "日語文學類", /日語|日本語/],
  ["外語學群", "英語文學類", /英語|英文|應用外語/],
  ["外語學群", "歐語文學類", /法語|德語|西班牙語|歐洲語/],
  ["外語學群", "東方語文學類", /韓語|東南亞語|阿拉伯語|土耳其語/],
  ["教育學群", "教育學類", /教育學系|教育組|師資培育/],
  ["教育學群", "特殊教育學類", /特殊教育/],
  ["教育學群", "幼兒教育學類", /幼兒教育|兒童教育/],
  ["教育學群", "數位學習學類", /數位學習|教育科技/],
  ["社會心理學群", "心理學類", /心理學|心理與諮商/],
  ["社會心理學群", "社會學學類", /社會學/],
  ["社會心理學群", "社會工作學類", /社會工作/],
  ["社會心理學群", "輔導諮商學類", /輔導|諮商/],
  ["社會心理學群", "宗教學類", /宗教/],
  ["法政學群", "法律學類", /法律學系|法學系/],
  ["法政學群", "財經法律學類", /財經法律/],
  ["法政學群", "政治學類", /政治學|政治系/],
  ["法政學群", "行政管理學類", /公共行政|行政管理|土地管理|不動產/],
  ["管理學群", "企業管理學類", /企業管理|商學管理|管理學系|管理學士班/],
  ["管理學群", "行銷經營學類", /行銷|經營管理/],
  ["管理學群", "運輸物流學類", /運輸|物流/],
  ["管理學群", "觀光事業學類", /觀光|旅遊|酒店/],
  ["管理學群", "餐旅管理學類", /餐旅|烘焙/],
  ["管理學群", "運動管理學類", /運動產業|運動管理/],
  ["管理學群", "休閒管理學類", /休閒|樂活/],
  ["財經學群", "財務金融學類", /財務金融|金融管理|科技金融|金融學系/],
  ["財經學群", "會計學類", /會計/],
  ["財經學群", "經濟學類", /經濟學系|經濟系/],
  ["財經學群", "財稅學類", /財稅|稅務/],
  ["財經學群", "保險學類", /保險/],
  ["遊憩運動學群", "體育學類", /體育學系|體育系|運動科學/],
  ["遊憩運動學群", "體育學類", /運動/],
];

const categoryIndex = new Map();
for (const row of groups) {
  const key = `${row.groupName}|${row.categoryName}`;
  if (!categoryIndex.has(key)) categoryIndex.set(key, row);
}

function expandMappings(row) {
  const groupNames = [row.groupName, ...(row.crossGroupNames || [])].filter(Boolean);
  return groupNames.map((groupName) => ({ ...row, groupName }));
}

const mappedBySchool = new Map();
for (const row of groups.flatMap(expandMappings)) {
  const parsed = splitSchoolDepartmentName(row.schoolDepartmentName);
  const school = normalize(parsed.schoolName);
  if (!school) continue;
  if (!mappedBySchool.has(school)) mappedBySchool.set(school, []);
  mappedBySchool.get(school).push({ ...row, department: normalize(parsed.departmentName) });
}

function inheritedMappings(school, department) {
  const normalized = normalize(department);
  if (normalized.length < 4) return [];
  const choices = (mappedBySchool.get(normalize(school)) || [])
    .map((row) => ({ row, length: Math.min(normalized.length, row.department.length) }))
    .filter(({ row, length }) => length >= 4 && (normalized.includes(row.department) || row.department.includes(normalized)))
    .sort((a, b) => b.length - a.length);
  if (!choices.length) return [];
  const bestLength = choices[0].length;
  return choices.filter(({ length }) => length === bestLength).map(({ row }) => row);
}

function keywordMappings(department) {
  return categoryDefinitions
    .filter(([, , pattern]) => pattern.test(department))
    .map(([groupName, categoryName]) => categoryIndex.get(`${groupName}|${categoryName}`))
    .filter(Boolean);
}

const existingPairs = new Set(groups.map((row) => {
  const parsed = splitSchoolDepartmentName(row.schoolDepartmentName);
  return `${normalize(parsed.schoolName)}|${normalize(parsed.departmentName)}|${row.groupName}|${row.categoryName}`;
}));
const recordDepartments = new Map();
for (const record of records) {
  if (!meaningfulDepartment(record.departmentName)) continue;
  const key = `${normalize(record.schoolName)}|${normalize(record.departmentName)}`;
  if (!recordDepartments.has(key)) recordDepartments.set(key, { schoolName: record.schoolName, departmentName: record.departmentName });
}

let inherited = 0;
let keyword = 0;
let skipped = 0;
const additions = [];
for (const { schoolName, departmentName } of recordDepartments.values()) {
  const mappings = inheritedMappings(schoolName, departmentName);
  const chosenMappings = mappings.length ? mappings : keywordMappings(departmentName);
  if (mappings.length) inherited += 1;
  else if (chosenMappings.length) keyword += 1;
  else {
    skipped += 1;
    continue;
  }
  for (const mapping of chosenMappings) {
    const id = `${normalize(schoolName)}|${normalize(departmentName)}|${mapping.groupName}|${mapping.categoryName}`;
    if (existingPairs.has(id)) continue;
    existingPairs.add(id);
    additions.push({
      groupId: mapping.groupId,
      groupName: mapping.groupName,
      categoryId: mapping.categoryId,
      categoryName: mapping.categoryName,
      schoolDepartmentName: `${schoolName}${departmentName}`,
      sourceDepartmentId: `auto-${normalize(schoolName)}-${normalize(departmentName)}`,
      crossGroupNames: [],
    });
  }
}

groups.push(...additions);
groups.sort((a, b) => `${a.groupId}|${a.categoryId}|${a.schoolDepartmentName}`.localeCompare(`${b.groupId}|${b.categoryId}|${b.schoolDepartmentName}`, "zh-Hant"));
fs.writeFileSync(groupsPath, JSON.stringify(groups), "utf8");
console.log(JSON.stringify({ additions: additions.length, inherited, keyword, skipped, total: groups.length }, null, 2));
