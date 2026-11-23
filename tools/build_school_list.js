/* 由教育部統計處「高級中等學校名錄」CSV 產生會員註冊用的縣市／學校清單。
   來源：https://stats.moe.gov.tw/files/school/<學年度>/high.csv（存於 site/data/sources/）
   輸出：
     site/data/schools.json                                    註冊頁選單（瀏覽器載入）
     supabase/migrations/20261123100000_school_directory.sql   資料庫學校表（註冊時驗證學校代碼）
   用法：node tools/build_school_list.js [CSV 路徑] */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOURCE = process.argv[2] || path.join(ROOT, "site/data/sources/moe_high_schools_115.csv");
const JSON_OUT = path.join(ROOT, "site/data/schools.json");
const SQL_OUT = path.join(ROOT, "supabase/migrations/20261123100000_school_directory.sql");

// 依內政部行政區排列（北到南、本島到離島）。
const COUNTY_ORDER = ["臺北市", "新北市", "基隆市", "桃園市", "新竹市", "新竹縣", "苗栗縣", "臺中市", "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣", "臺南市", "高雄市", "屏東縣", "宜蘭縣", "花蓮縣", "臺東縣", "澎湖縣", "金門縣", "連江縣"];

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(v => v.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(v => v.trim())) rows.push(row);
  return rows;
}

function build(csvText) {
  const [header, ...rows] = parseCsv(csvText.replace(/^﻿/, ""));
  // 名錄的「備註」偶有未加引號的換行，會變成只有一欄的列；併回上一列的備註。
  const body = [];
  for (const r of rows) {
    if (r.length === 1 && body.length) body[body.length - 1][header.length - 1] += "\n" + r[0];
    else if (r.length !== header.length) throw new Error("CSV 欄位數不符：" + r.join(","));
    else body.push(r);
  }
  const col = name => { const i = header.findIndex(h => h.trim() === name); if (i < 0) throw new Error("CSV 缺少欄位：" + name); return i; };
  const iYear = col("學年度"), iCode = col("代碼"), iName = col("學校名稱"), iCounty = col("縣市名稱");
  const years = new Set(), seen = new Set(), byCounty = new Map();
  for (const r of body) {
    const code = r[iCode].trim(), name = r[iName].trim();
    const county = r[iCounty].trim().replace(/^\[\d+\]/, "");
    if (!code && !name) continue;
    if (!/^[0-9A-Z]{6}$/.test(code)) throw new Error("學校代碼格式不符：" + code + " " + name);
    if (!name) throw new Error("缺少學校名稱：" + code);
    if (!COUNTY_ORDER.includes(county)) throw new Error("無法辨識縣市：" + r[iCounty] + "（" + name + "）");
    if (seen.has(code)) throw new Error("學校代碼重複：" + code);
    seen.add(code);
    years.add(r[iYear].trim());
    if (!byCounty.has(county)) byCounty.set(county, []);
    byCounty.get(county).push([code, name]);
  }
  if (years.size !== 1) throw new Error("CSV 含多個學年度：" + [...years].join(","));
  const year = Number([...years][0]);
  const counties = COUNTY_ORDER.filter(c => byCounty.has(c)).map(c => ({
    name: c,
    // 公立在前、私立在後，同類依代碼排序，與教育部名錄一致。
    schools: byCounty.get(c).sort((a, b) => a[0].localeCompare(b[0])),
  }));
  return { year, total: seen.size, counties };
}

function sqlText(value) { return "'" + String(value).replace(/'/g, "''") + "'"; }

function toSql({ year, total, counties }) {
  const values = [];
  for (const c of counties) for (const [code, name] of c.schools) values.push(`(${sqlText(code)},${sqlText(name)},${sqlText(c.name)},${year})`);
  return `-- 由 tools/build_school_list.js 產生，請勿手動修改。
-- 來源：教育部統計處 ${year} 學年度高級中等學校名錄（${total} 所）。
-- 會員註冊時以此表驗證學校代碼；瀏覽器讀取的是 site/data/schools.json，不直接查這張表。
begin;
create table if not exists public.schools (
  code text primary key check (code ~ '^[0-9A-Z]{6}$'),
  name text not null check (length(name) between 1 and 100),
  county text not null,
  source_year integer not null
);
alter table public.schools enable row level security;
revoke all on public.schools from anon, authenticated;
grant all on public.schools to service_role;

insert into public.schools(code, name, county, source_year) values
${values.join(",\n")}
on conflict (code) do update set name = excluded.name, county = excluded.county, source_year = excluded.source_year;
commit;
`;
}

if (require.main === module) {
  const data = build(fs.readFileSync(SOURCE, "utf8"));
  const json = { source: "教育部統計處高級中等學校名錄", sourceUrl: `https://stats.moe.gov.tw/files/school/${data.year}/high.csv`, year: data.year, total: data.total, counties: data.counties };
  fs.writeFileSync(JSON_OUT, JSON.stringify(json) + "\n");
  fs.writeFileSync(SQL_OUT, toSql(data));
  console.log(`${data.year} 學年度：${data.counties.length} 縣市、${data.total} 所學校`);
  console.log("已寫入 " + path.relative(ROOT, JSON_OUT) + "、" + path.relative(ROOT, SQL_OUT));
}

module.exports = { parseCsv, build, toSql, COUNTY_ORDER };
