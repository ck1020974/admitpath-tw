/*
 * Import 114 personal-application first-stage results from University TW only
 * when every displayed result can be matched exactly to the CAC screening
 * subjects and multiplier order already stored in this project.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const recordsPath = path.join(root, "site", "data", "admissions_records.json");
const sourceBase = "https://university-tw.ldkrsi.men/caac";
const subjectMap = { 國: "國文", 國文: "國文", 英: "英文", 英文: "英文", 數A: "數A", 數學A: "數A", 數B: "數B", 數學B: "數B", 社: "社會", 社會: "社會", 自: "自然", 自然: "自然" };

function compact(value) {
  return String(value || "").replace(/\s/g, "").replace(/臺/g, "台");
}

function subjectList(value) {
  const text = compact(value).replace(/數學/g, "數");
  const tokens = text.match(/國文|英文|數A|數B|社會|自然|國|英|社|自/g) || [];
  const subjects = tokens.map((item) => subjectMap[item]).filter(Boolean);
  return [...new Set(subjects)];
}

function sameSubjects(left, right) {
  return left.length === right.length && left.every((item) => right.includes(item));
}

function expectedRows(record) {
  const current = record.applySieveResult?.rankedItems || [];
  if (current.length) return current.map((item, index) => ({
    rank: Number(item.rank) || index + 1,
    multiplier: String(item.multiplier || ""),
    subjects: subjectList((item.subjects || []).join("+")),
  })).filter((item) => item.subjects.length);
  const grouped = new Map();
  for (const item of record.cacDetail?.screeningSubjects || []) {
    const multiplier = Number(String(item.screening_multiplier || "").replace(/[^\d.]/g, ""));
    const subjects = subjectList(item.subject);
    if (!Number.isFinite(multiplier) || multiplier <= 0 || !subjects.length) continue;
    const key = String(multiplier);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(...subjects);
  }
  return [...grouped.entries()]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([multiplier, subjects], index) => ({ rank: index + 1, multiplier, subjects: [...new Set(subjects)] }));
}

function tableCells(html) {
  const section = html.match(/114年篩選結果<\/dt>\s*<dd[^>]*>[\s\S]*?<tbody><tr>([\s\S]*?)<\/tr>/);
  if (!section) return [];
  return [...section[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
    .map((match) => match[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim())
    .map((value) => {
      const score = value.match(/=\s*(\d+(?:\.\d+)?)/);
      const subjects = subjectList(value.split("=")[0]);
      return score && subjects.length ? { subjects, score: score[1] } : null;
    })
    .filter(Boolean);
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "AdmitPath data verification" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function mapPool(items, limit, task) {
  const results = [];
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function importRecord(record) {
  const expected = expectedRows(record);
  if (!expected.length || !record.schoolCode || !record.programCode) return { status: "no_expected_rows" };
  const url = `${sourceBase}/${String(record.schoolCode).padStart(3, "0")}/${record.programCode}`;
  try {
    const candidates = tableCells(await fetchText(url));
    const used = new Set();
    const rows = expected.map((item) => {
      const index = candidates.findIndex((candidate, candidateIndex) => !used.has(candidateIndex) && sameSubjects(candidate.subjects, item.subjects));
      if (index < 0) return null;
      used.add(index);
      const candidate = candidates[index];
      return { ...item, score: candidate.score, label: `${item.subjects.join("+")}${candidate.score}` };
    });
    if (rows.some((row) => !row)) return { status: "unmatched", url, expected: expected.length, candidates: candidates.length };
    return { status: "matched", url, rows };
  } catch (error) {
    return { status: "fetch_failed", reason: String(error.message || error) };
  }
}

async function main() {
  const records = JSON.parse(fs.readFileSync(recordsPath, "utf8"));
  const targets = records.filter((record) => {
    if (record.year !== 114 || record.channelKey !== "personal_application") return false;
    const rows = record.applySieveResult?.rankedItems || [];
    return !rows.length || rows.some((item) => !String(item.score || "").trim());
  });
  const results = await mapPool(targets, 6, importRecord);
  const summary = {};
  let changed = 0;
  targets.forEach((record, index) => {
    const result = results[index];
    summary[result.status] = (summary[result.status] || 0) + 1;
    if (result.status !== "matched") return;
    const previous = record.applySieveResult?.rankedItems || [];
    if (JSON.stringify(previous) !== JSON.stringify(result.rows)) changed += 1;
    record.applySieveResult = {
      ...(record.applySieveResult || {}),
      rankedItems: result.rows,
      sieveResultItems: result.rows.map((item) => ({ type: item.subjects.length > 1 ? "combined" : "single", subjects: item.subjects, score: item.score, label: item.label })),
      sieveResultStandard: result.rows.map((item) => item.label).join("、"),
      verification: { method: "university_tw_crosscheck", sourceUrl: result.url, matchedAgainst: "CAC screening subjects and multipliers" },
    };
  });
  fs.writeFileSync(recordsPath, JSON.stringify(records), "utf8");
  console.log(JSON.stringify({ changed, summary }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
