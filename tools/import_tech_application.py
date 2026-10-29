"""匯入四技申請入學（科技校院日間部四年制申請入學聯合招生，招收高中生）資料。

來源（技專校院招生委員會聯合會官方公告，原檔放在 tools/sources/tech_application/）：
  {年度}_caac_minute.xlsx  招生學校系(組)、學程資料：名額、學測採計科目與加權、第二階段項目與比例、日期
  {年度}_repot_01.pdf      各校系(組)、學程第一階段最低篩選標準（百分制）與 APCS 超額篩選標準

兩份檔案以「志願代碼」對應，校名、系名必須完全一致，否則中止匯入。
每次重跑會先移除舊的四技申請資料再寫入，可重複執行。
需要 openpyxl 與 pdftotext（poppler-utils）。

用法：python3 tools/import_tech_application.py
之後請執行 node tools/augment_group_departments.js 補上十八學群對應，
並修改 site/app.js 的 DATA_VERSION。
"""
import json
import re
import subprocess
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "tools" / "sources" / "tech_application"
RECORDS = ROOT / "site" / "data" / "admissions_records.json"
YEARS = [114, 115]
CHANNEL_KEY = "tech_application"
CHANNEL = "四技申請"
ORGANIZATION = "科技校院日間部四年制申請入學聯合招生委員會"
SUBJECT_COLUMNS = [("國文", "國文權重"), ("英文", "英文權重"), ("數學A", "數學A權重"),
                   ("數學B", "數學B權重"), ("社會", "社會權重"), ("自然", "自然權重")]
SHORT = {"數學A": "數A", "數學B": "數B"}
# 依校址判斷地區，與網站「北、中、南、東」的學校分區一致。
AREAS = [("北", "臺北台北新北基隆桃園新竹宜蘭"), ("中", "苗栗臺中台中彰化南投雲林"),
         ("南", "嘉義臺南台南高雄屏東澎湖"), ("東", "花蓮臺東台東")]


def area_of(address):
    text = clean(address)
    hits = [(text.find(city), area) for area, cities in AREAS
            for city in [cities[i:i + 2] for i in range(0, len(cities), 2)] if city in text]
    return min(hits)[1] if hits else ""


def school_areas(rows):
    # 少數列的校址欄誤填網址，以同校其他列判斷；同校分屬多區時取校系最多的地區。
    votes = {}
    for row in rows:
        area = area_of(row.get("校址"))
        if area:
            votes.setdefault(clean(row["學校"]), []).append(area)
    areas = {school: max(set(found), key=found.count) for school, found in votes.items()}
    missing = {clean(row["學校"]) for row in rows} - set(areas)
    if missing:
        raise ValueError(f"無法判斷地區：{sorted(missing)}")
    return areas
EMPTY = {"", "-", "--", "---", "None"}


def clean(value):
    text = "" if value is None else str(value).strip()
    return "" if text in EMPTY else text


def number(value):
    text = clean(value)
    return float(text) if text else None


def weight_text(value):
    # 1.00 → 1、1.50 → 1.5，畫面上比較好讀。
    return f"{value:g}"


def read_minute(year):
    sheet = openpyxl.load_workbook(SOURCES / f"{year}_caac_minute.xlsx", read_only=True, data_only=True).worksheets[0]
    rows = list(sheet.iter_rows(values_only=True))
    header = [str(cell or "").replace("\n", "").strip() for cell in rows[0]]
    return [dict(zip(header, row)) for row in rows[1:] if row and clean(row[header.index("志願代碼")])]


def column(row, *prefixes):
    # 不同年度的欄名略有差異（例如「書面資料審查」與「學習歷程備審資料審查」），以開頭比對。
    for key, value in row.items():
        if any(key.startswith(prefix) for prefix in prefixes):
            return value
    return None


def read_standards(year):
    text = subprocess.run(["pdftotext", "-layout", str(SOURCES / f"{year}_repot_01.pdf"), "-"],
                          check=True, capture_output=True, text=True).stdout
    standards = {}
    for line in text.splitlines():
        if not re.match(r"^\s*\d{6}\s", line):
            continue
        match = re.match(r"^\s*(\d{6})\s+(\S+)\s+(.+?)\s{2,}(\S+)\s+(\S+)\s+(\S+)\s*$", line)
        if not match:
            raise ValueError(f"{year} 一階標準無法解析：{line}")
        code, school, department, standard, apcs_level, apcs_weighted = match.groups()
        standards[code] = {
            "schoolName": school,
            "departmentName": department.strip(),
            "standard": float(standard),
            "apcsLevel": number(apcs_level),
            "apcsWeighted": number(apcs_weighted),
        }
    return standards


def build_record(year, row, standard, area):
    code = clean(row["志願代碼"])
    weights = []
    for subject, key in SUBJECT_COLUMNS:
        value = number(row.get(key))
        if value:
            weights.append({"subject": subject, "weight": weight_text(value), "raw": f"{subject} × {weight_text(value)}", "exam_type": "學測"})
    if not weights:
        raise ValueError(f"{year} {code} 沒有學測採計科目")

    items = []
    for index in range(1, 8):
        item = clean(row.get(f"同分參酌順序{index}評分項目"))
        if not item:
            continue
        percentage = number(row.get(f"同分參酌順序{index}評分項目之占總成績比例"))
        items.append({"order": index, "item": item, "percentage": percentage})
    ratio_total = sum(item["percentage"] or 0 for item in items)
    if abs(ratio_total - 100) > 0.01:
        raise ValueError(f"{year} {code} 第二階段比例加總為 {ratio_total}")

    portfolio = [{"item": key, "requirement": clean(value)} for key, value in row.items()
                 if re.match(r"^[A-D]-?\d?\.", key) and "上限" not in key and clean(value)]
    onsite = clean(column(row, "第二階段複試評分項目申請生須到校"))
    standard_value = standard["standard"]
    return {
        "id": f"{year}-{CHANNEL_KEY}-{code}",
        "year": year,
        "channel": CHANNEL,
        "channelKey": CHANNEL_KEY,
        "dataType": "四技申請入學校系資料與第一階段最低篩選標準",
        "sourceKey": f"{year}_tech_application",
        "sourceOrganization": ORGANIZATION,
        # 科大的學校代碼和大學甄選會的代碼會重複（例如 101），加上 T 避免混淆。
        "schoolCode": "T" + clean(row["學校代碼"]),
        "schoolName": clean(row["學校"]),
        "programCode": code,
        "departmentName": clean(row["系（組）、學程名稱"]),
        "quota": clean(row["招生名額"]),
        "expectedSecondStageCount": clean(row["預計複試人數"]),
        "screeningFee": clean(row["第二階段複試費"]),
        "screeningDate": clean(row["第二階段複試日期"]),
        "genderRequirement": "" if clean(row["性別要求"]) == "未要求" else clean(row["性別要求"]),
        "examRequired": "",
        "extraQuota": "",
        "category": "",
        "weightedSubjects": weights,
        "weightedSubjectsText": "、".join(f"{SHORT.get(w['subject'], w['subject'])}×{w['weight']}" for w in weights),
        # 複試說明與備註放在 techApplication（只在詳情載入），不重複放進首頁一次載入的核心資料。
        "selectionNotes": "",
        "sourceUrl": f"https://www.jctv.ntut.edu.tw/caac/contents.php?academicYear={year}&subId=109",
        "detailUrl": f"https://www.jctv.ntut.edu.tw/downloads/{year}/caac/{year}_more_rule.pdf",
        "rawFields": "{}",
        "techApplication": {
            # 一階：學測加權平均換算百分制；0 代表沒有篩除任何申請者。
            "screeningStandard": standard_value,
            "area": area,
            "screeningLevel": round(standard_value * 15 / 100, 2),
            "apcsLevel": standard["apcsLevel"],
            "apcsWeighted": standard["apcsWeighted"],
            "reviewOnly": not onsite,
            "onsiteItems": onsite,
            "secondStageItems": items,
            "waitlist": clean(row.get("是否採備取制")),
            "dates": {
                "notice": clean(row.get("公告第二階段複試通知")),
                "uploadDeadline": clean(column(row, "網路上傳資格審查")),
                "interview": clean(row.get("第二階段複試日期")),
                "scoreAnnounce": clean(row.get("公告總成績日期")),
                "recheckDeadline": clean(row.get("成績複查截止日期")),
                "admissionAnnounce": clean(row.get("公告錄取名單日期")),
            },
            "portfolio": portfolio,
            "interviewNotes": clean(row.get("複試說明")),
            "notes": clean(row.get("備註")),
            "standardUrl": f"https://www.jctv.ntut.edu.tw/downloads/{year}/caac/{year}_repot_01.pdf",
            "minuteUrl": f"https://www.jctv.ntut.edu.tw/downloads/{year}/caac/{year}_caac_minute.xlsx",
        },
    }


def main():
    records = json.loads(RECORDS.read_text(encoding="utf-8"))
    kept = [record for record in records if record.get("channelKey") != CHANNEL_KEY]
    added = []
    for year in YEARS:
        minute = read_minute(year)
        standards = read_standards(year)
        areas = school_areas(minute)
        codes = {clean(row["志願代碼"]) for row in minute}
        if codes != set(standards):
            raise ValueError(f"{year} Excel 與一階標準的志願代碼不一致：{sorted(codes ^ set(standards))[:10]}")
        for row in minute:
            code = clean(row["志願代碼"])
            standard = standards[code]
            if (clean(row["學校"]), clean(row["系（組）、學程名稱"]).replace(" ", "")) != (standard["schoolName"], standard["departmentName"].replace(" ", "")):
                raise ValueError(f"{year} {code} 校系名稱不一致：{row['學校']}{row['系（組）、學程名稱']} / {standard['schoolName']}{standard['departmentName']}")
            added.append(build_record(year, row, standard, areas[clean(row["學校"])]))
        print(f"{year}：{len(minute)} 個校系")
    RECORDS.write_text(json.dumps(kept + added, ensure_ascii=False), encoding="utf-8")  # 與既有檔案相同的格式
    print(f"四技申請共 {len(added)} 筆；其他管道 {len(kept)} 筆維持不變。")


if __name__ == "__main__":
    main()
