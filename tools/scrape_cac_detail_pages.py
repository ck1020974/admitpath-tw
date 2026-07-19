import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import Request, urlopen

from lxml import html


DATA_DIR = Path("outputs/admissions_data")
OUT_PATH = DATA_DIR / "cac_detail_pages.json"
ERROR_PATH = DATA_DIR / "cac_detail_pages_errors.json"

INDEX_FILES = [
    DATA_DIR / "admissions_115_personal_application_index.json",
    DATA_DIR / "admissions_115_star_recommendation_index.json",
    DATA_DIR / "admissions_114_personal_application_index.json",
    DATA_DIR / "admissions_114_star_recommendation_index.json",
]


def clean(text):
    text = "" if text is None else str(text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    return text.strip()


def split_lines(text):
    return [clean(x) for x in re.split(r"\n+", clean(text)) if clean(x)]


def fetch(url, referer):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.7",
        "Referer": referer or url,
    }
    req = Request(url, headers=headers)
    with urlopen(req, timeout=30) as resp:
        raw = resp.read()
        charset = resp.headers.get_content_charset() or "utf-8"
        return raw.decode(charset, errors="replace")


def td_text(td):
    return clean("\n".join(td.xpath(".//text()")))


def all_rows(tree):
    rows = []
    for tr in tree.xpath("//tr"):
        cells = [td_text(td) for td in tr.xpath("./td|./th")]
        if any(cells):
            rows.append(cells)
    return rows


def find_label_value(rows, labels):
    for row in rows:
        for index, cell in enumerate(row[:-1]):
            if clean(cell) in labels:
                return clean(row[index + 1])
    return ""


def parse_program_row(rows):
    for row in rows:
        if any(cell == "校系代碼" for cell in row):
            return row
    return []


def parse_apply_detail(tree, rows):
    record = {
        "detail_kind": "personal_application_detail",
        "screening_subjects": [],
        "second_stage_items": [],
        "same_score_order": [],
        "review_items": "",
        "review_description": "",
        "interview_or_test_description": "",
        "over_enrollment_screening": "",
        "important_dates": {},
    }
    program_row = parse_program_row(rows)
    if len(program_row) >= 11:
        subjects = split_lines(program_row[2])
        standards = split_lines(program_row[3])
        multipliers = split_lines(program_row[4])
        weights = split_lines(program_row[5])
        for i, subject in enumerate(subjects):
            record["screening_subjects"].append(
                {
                    "subject": subject,
                    "standard": standards[i] if i < len(standards) else "",
                    "screening_multiplier": multipliers[i] if i < len(multipliers) else "",
                    "score_weight": weights[i] if i < len(weights) else "",
                }
            )
        stage_items = split_lines(program_row[7]) if len(program_row) > 7 else []
        stage_standards = split_lines(program_row[8]) if len(program_row) > 8 else []
        stage_rates = split_lines(program_row[9]) if len(program_row) > 9 else []
        for i, item in enumerate(stage_items):
            record["second_stage_items"].append(
                {
                    "item": item,
                    "standard": stage_standards[i] if i < len(stage_standards) else "",
                    "percentage": stage_rates[i] if i < len(stage_rates) else "",
                }
            )
        record["same_score_order"] = split_lines(program_row[10]) if len(program_row) > 10 else []

    date_labels = {
        "指定項目甄試費": "screening_fee",
        "寄發(或公告)指定\n項目甄試通知": "screening_notice",
        "寄發(或公告)指定項目甄試通知": "screening_notice",
        "繳交資料截止": "submission_deadline",
        "指定項目\n甄試日期": "screening_date",
        "指定項目甄試日期": "screening_date",
        "榜示": "result_announcement",
        "總成績複查截止": "score_review_deadline",
    }
    for row in rows:
        for i, cell in enumerate(row[:-1]):
            key = date_labels.get(cell)
            if key:
                record["important_dates"][key] = clean(row[i + 1])

    text = "\n".join(["\n".join(row) for row in rows])
    m_items = re.search(r"項目：\n?(.+?)(?:※|說明：)", text, re.S)
    if m_items:
        record["review_items"] = clean(m_items.group(1))
    m_desc = re.search(r"說明：\n?(.+?)(?:寄發|繳交資料截止|指定項目|榜示|同級分)", text, re.S)
    if m_desc:
        record["review_description"] = clean(m_desc.group(1))

    for row in rows:
        row_text = "\n".join(row)
        if "甄試\n說明" in row_text or "甄試說明" in row_text:
            record["interview_or_test_description"] = clean(row[-1])
        if "同級分(分數)超額篩選方式" in row_text:
            record["over_enrollment_screening"] = clean(row[-1])
    return record


def parse_star_detail(tree, rows):
    record = {
        "detail_kind": "star_recommendation_detail",
        "academic_rank_percentile": "",
        "test_requirements": [],
        "distribution_order": [],
        "notes": "",
    }
    program_row = parse_program_row(rows)
    if len(program_row) >= 4:
        subjects = split_lines(program_row[2])
        standards = split_lines(program_row[3])
        for i, subject in enumerate(subjects):
            record["test_requirements"].append(
                {
                    "subject": subject,
                    "standard": standards[i] if i < len(standards) else "",
                }
            )
    for row in rows:
        joined = "\n".join(row)
        if "分發比序項目" in joined:
            continue
        if any("在校學業成績全校排名百分比" in cell for cell in row):
            for cell in row:
                if "在校學業成績全校排名百分比" in cell and "、" in cell:
                    record["distribution_order"] = split_lines(cell.replace("、", "、"))
                    break
        for index, cell in enumerate(row[:-1]):
            if cell == "備註":
                record["notes"] = clean(row[index + 1])

    order_text = "\n".join(record["distribution_order"])
    m = re.search(r"在校學業成績全校排名百分比[^0-9%]*(?:前)?\s*([0-9]+)\s*%", order_text)
    if m:
        record["academic_rank_percentile"] = f"{m.group(1)}%"
    # Most CAC star pages encode the ranking percentage as the first distribution item text.
    if not record["academic_rank_percentile"] and record["distribution_order"]:
        first = record["distribution_order"][0]
        m2 = re.search(r"([0-9]+)\s*%", first)
        if m2:
            record["academic_rank_percentile"] = f"{m2.group(1)}%"
    return record


def parse_detail(base):
    page = fetch(base["detail_url"], base.get("source_school_url") or base.get("source_total_url") or "")
    tree = html.fromstring(page)
    rows = all_rows(tree)
    title_school = clean("".join(tree.xpath("string(//*[contains(@class,'colname')])")))
    title_dept = clean("".join(tree.xpath("string(//*[contains(@class,'gsdname')])")))
    parsed = parse_apply_detail(tree, rows) if base["admission_channel_key"] == "personal_application" else parse_star_detail(tree, rows)
    parsed.update(
        {
            "admission_year": base["admission_year"],
            "admission_channel": base["admission_channel"],
            "admission_channel_key": base["admission_channel_key"],
            "program_code": base["program_code"],
            "school_name": title_school or base.get("school_name", ""),
            "department_name": title_dept or base.get("department_name", ""),
            "detail_url": base["detail_url"],
            "raw_text": clean(tree.text_content())[:12000],
        }
    )
    return parsed


def load_targets():
    targets = []
    for path in INDEX_FILES:
        rows = json.load(path.open(encoding="utf-8"))
        for row in rows:
            if row.get("detail_url"):
                targets.append(row)
    return targets


def main():
    targets = load_targets()
    existing = {}
    if OUT_PATH.exists():
        try:
            for row in json.load(OUT_PATH.open(encoding="utf-8")):
                existing[(row.get("admission_year"), row.get("admission_channel_key"), row.get("program_code"))] = row
        except Exception:
            existing = {}
    targets = [
        target
        for target in targets
        if (target.get("admission_year"), target.get("admission_channel_key"), target.get("program_code")) not in existing
    ]
    details = []
    errors = []
    done = 0
    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = {executor.submit(parse_detail, target): target for target in targets}
        for future in as_completed(futures):
            target = futures[future]
            try:
                details.append(future.result())
            except Exception as exc:
                errors.append(
                    {
                        "program_code": target.get("program_code"),
                        "detail_url": target.get("detail_url"),
                        "error": str(exc),
                    }
                )
            done += 1
            if done % 500 == 0:
                combined = list(existing.values()) + details
                combined.sort(key=lambda r: (r["admission_year"], r["admission_channel_key"], r["program_code"]))
                OUT_PATH.write_text(json.dumps(combined, ensure_ascii=False, indent=2), encoding="utf-8")
                ERROR_PATH.write_text(json.dumps(errors, ensure_ascii=False, indent=2), encoding="utf-8")
                print(f"{done}/{len(targets)} done, errors={len(errors)}")
                time.sleep(0.2)

    details = list(existing.values()) + details
    details.sort(key=lambda r: (r["admission_year"], r["admission_channel_key"], r["program_code"]))
    OUT_PATH.write_text(json.dumps(details, ensure_ascii=False, indent=2), encoding="utf-8")
    ERROR_PATH.write_text(json.dumps(errors, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"details": len(details), "errors": len(errors), "out": str(OUT_PATH)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
