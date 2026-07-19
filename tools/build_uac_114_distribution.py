import csv
import json
import re
from pathlib import Path

import pdfplumber


OUT_DIR = Path("outputs/admissions_data")
INFORM_PDF = OUT_DIR / "uac_114_inform.pdf"
RECRUIT_PDF = OUT_DIR / "uac_114_recruit.pdf"


def clean(value):
    if value is None:
        return ""
    value = str(value).replace("\n", "")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def norm_name(value):
    value = clean(value)
    value = value.replace("（", "(").replace("）", ")")
    value = re.sub(r"\s+", "", value)
    return value


def parse_inform():
    records = []
    with pdfplumber.open(INFORM_PDF) as pdf:
        for page_index, page in enumerate(pdf.pages, start=1):
            for table in page.extract_tables():
                if not table or len(table) < 2:
                    continue
                header = [clean(c) for c in table[0]]
                if "校名" not in header or not any("系組" in h and "代碼" in h for h in header):
                    continue
                for row in table[1:]:
                    cells = [clean(c) for c in row]
                    if len(cells) < 7:
                        continue
                    school_name, dept_name, code, quota, indigenous, other_extra, short_name = cells[:7]
                    if not re.fullmatch(r"\d{4}", code):
                        continue
                    records.append(
                        {
                            "admission_year": 114,
                            "admission_channel": "分發入學",
                            "admission_channel_key": "exam_distribution",
                            "data_type": "登記相關資訊：系組代碼及核定名額",
                            "source_organization": "大學考試入學分發委員會",
                            "source_url": "https://www.uac.edu.tw/114data/114inform.pdf",
                            "school_name": school_name,
                            "department_name": dept_name,
                            "program_code": code,
                            "approved_quota": quota,
                            "indigenous_extra_quota": indigenous,
                            "other_extra_quota": other_extra,
                            "application_short_name": short_name,
                            "inform_pdf_page": page_index,
                        }
                    )
    return records


def parse_subject_line(text):
    text = clean(text)
    m = re.match(r"(.+?)\((.+?)\)\s*x\s*([0-9.]+)", text)
    if not m:
        return {"raw": text}
    return {
        "subject": clean(m.group(1)),
        "exam_type": clean(m.group(2)),
        "weight": m.group(3),
        "raw": text,
    }


def parse_recruit():
    records = []
    current_school = ""
    current_school_code = ""

    def finish(record):
        if not record:
            return
        record["test_requirement_standard"] = "\n".join(x for x in record.pop("_standards") if x)
        record["selection_notes"] = "\n".join(x for x in record.pop("_notes") if x)
        record["weighted_subjects_json"] = json.dumps(record.pop("_subjects"), ensure_ascii=False)
        records.append(record)

    with pdfplumber.open(RECRUIT_PDF) as pdf:
        for page_index, page in enumerate(pdf.pages, start=1):
            tables = page.extract_tables()
            for table in tables:
                if not table:
                    continue
                first = [clean(c) for c in table[0]]
                if first and first[0].startswith("校名："):
                    m = re.match(r"校名：(.+?)\((\d+)\)", first[0])
                    if m:
                        current_school = m.group(1)
                        current_school_code = m.group(2)
                    data_rows = table[2:]
                else:
                    data_rows = table
                current = None
                for row in data_rows:
                    cells = [clean(c) for c in (row + [None] * 5)[:5]]
                    dept, standard, subject, tie_order, note = cells
                    if dept in ("學系", "本頁以下空白") or "學科能力測驗" in standard:
                        continue
                    if dept:
                        finish(current)
                        current = {
                            "school_name": current_school,
                            "school_code": current_school_code,
                            "department_name": dept,
                            "_standards": [],
                            "_subjects": [],
                            "_notes": [],
                            "recruit_pdf_page": page_index,
                        }
                    if not current:
                        continue
                    if standard and standard not in ("---", "-- --"):
                        current["_standards"].append(standard)
                    if subject and subject not in ("---", "-- --"):
                        item = parse_subject_line(subject)
                        if tie_order:
                            item["tie_break_order"] = tie_order
                        current["_subjects"].append(item)
                    if note:
                        current["_notes"].append(note)
                finish(current)
    return records


def merge_records(inform_records, recruit_records):
    detail_by_key = {}
    for detail in recruit_records:
        key = (norm_name(detail["school_name"]), norm_name(detail["department_name"]))
        detail_by_key.setdefault(key, detail)

    merged = []
    unmatched = []
    for rec in inform_records:
        key = (norm_name(rec["school_name"]), norm_name(rec["department_name"]))
        detail = detail_by_key.get(key)
        merged_rec = dict(rec)
        if detail:
            merged_rec.update(
                {
                    "school_code": detail["school_code"],
                    "test_requirement_standard": detail["test_requirement_standard"],
                    "weighted_subjects_json": detail["weighted_subjects_json"],
                    "selection_notes": detail["selection_notes"],
                    "recruit_pdf_page": detail["recruit_pdf_page"],
                    "detail_match_status": "matched_by_school_department",
                }
            )
        else:
            merged_rec.update(
                {
                    "school_code": "",
                    "test_requirement_standard": "",
                    "weighted_subjects_json": "[]",
                    "selection_notes": "",
                    "recruit_pdf_page": "",
                    "detail_match_status": "unmatched_recruit_detail",
                }
            )
            unmatched.append(rec)
        merged.append(merged_rec)
    return merged, unmatched


def write_csv(path, rows):
    fieldnames = [
        "admission_year",
        "admission_channel",
        "program_code",
        "school_code",
        "school_name",
        "department_name",
        "approved_quota",
        "indigenous_extra_quota",
        "other_extra_quota",
        "application_short_name",
        "test_requirement_standard",
        "weighted_subjects_json",
        "selection_notes",
        "detail_match_status",
        "source_url",
        "inform_pdf_page",
        "recruit_pdf_page",
        "data_type",
        "source_organization",
        "admission_channel_key",
    ]
    extra = sorted({k for row in rows for k in row.keys()} - set(fieldnames))
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames + extra)
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    inform = parse_inform()
    recruit = parse_recruit()
    merged, unmatched = merge_records(inform, recruit)

    json_path = OUT_DIR / "admissions_114_exam_distribution_index.json"
    csv_path = OUT_DIR / "admissions_114_exam_distribution_index.csv"
    with json_path.open("w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    write_csv(csv_path, merged)

    with (OUT_DIR / "admissions_114_exam_distribution_unmatched.json").open("w", encoding="utf-8") as f:
        json.dump(unmatched, f, ensure_ascii=False, indent=2)

    summary = {
        "inform_rows": len(inform),
        "recruit_detail_rows": len(recruit),
        "merged_rows": len(merged),
        "unmatched_detail_rows": len(unmatched),
        "csv": str(csv_path),
        "json": str(json_path),
    }
    with (OUT_DIR / "uac_114_distribution_summary.json").open("w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
