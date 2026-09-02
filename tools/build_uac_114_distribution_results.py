import csv
import argparse
import json
import re
from pathlib import Path

import pdfplumber


OUT_DIR = Path("outputs/admissions_data")
DEFAULT_YEAR = 114


def clean(value):
    if value is None:
        return ""
    value = str(value).replace("\n", "")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def clean_tie_break(value):
    text = clean(value)
    if not text or text == "-----":
        return text
    text = re.sub(r"([0-9])([^\d\s])", r"\1 \2", text)
    text = re.sub(r"([^\d\s])(\d)", r"\1 \2", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_results(result_pdf, year):
    rows = []
    with pdfplumber.open(result_pdf) as pdf:
        for page_index, page in enumerate(pdf.pages, start=1):
            for table in page.extract_tables():
                if not table or len(table) < 2:
                    continue
                header = [clean(c) for c in table[0]]
                if "校名" not in header or not any("錄取分數" in h for h in header):
                    continue
                for raw in table[1:]:
                    cells = [clean(c) for c in (raw + [None] * 12)[:12]]
                    code, school, dept, subjects, admitted, regular_score, regular_tie, indigenous, veteran, overseas, mongolian_tibetan, dispatched = cells
                    if not re.fullmatch(r"\d{4}", code):
                        continue
                    regular_score = clean(regular_score)
                    indigenous = clean(indigenous)
                    veteran = clean(veteran)
                    overseas = clean(overseas)
                    mongolian_tibetan = clean(mongolian_tibetan)
                    dispatched = clean(dispatched)
                    rows.append(
                        {
                            "admission_year": year,
                            "admission_channel": "分發入學",
                            "admission_channel_key": "exam_distribution",
                            "data_type": "放榜結果：各系組最低錄取標準及錄取人數",
                            "source_organization": "大學考試入學分發委員會",
                            "source_url": f"https://www2.uac.edu.tw/{year}data/{year}_result_school_data.pdf",
                            "program_code": code,
                            "school_name": school,
                            "department_name": dept,
                            "weighted_subjects_compact": subjects,
                            "admitted_count_including_extra": admitted,
                            "regular_min_admission_score": regular_score,
                            "regular_total_score": regular_score,
                            "regular_tie_break": clean_tie_break(regular_tie),
                            "indigenous_min_admission_score": indigenous,
                            "indigenous_total_score": indigenous,
                            "veteran_min_admission_score": veteran,
                            "veteran_total_score": veteran,
                            "overseas_chinese_min_admission_score": overseas,
                            "overseas_chinese_total_score": overseas,
                            "mongolian_tibetan_min_admission_score": mongolian_tibetan,
                            "mongolian_tibetan_total_score": mongolian_tibetan,
                            "dispatched_child_min_admission_score": dispatched,
                            "dispatched_child_total_score": dispatched,
                            "result_pdf_page": page_index,
                        }
                    )
    return rows


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parse UAC distribution-admission result PDFs.")
    parser.add_argument("--year", type=int, default=DEFAULT_YEAR)
    parser.add_argument("--pdf", type=Path, default=None)
    args = parser.parse_args()

    result_pdf = args.pdf or OUT_DIR / f"uac_{args.year}_result_school_data.pdf"
    records = parse_results(result_pdf, args.year)
    json_path = OUT_DIR / f"admissions_{args.year}_exam_distribution_results.json"
    csv_path = OUT_DIR / f"admissions_{args.year}_exam_distribution_results.csv"
    with json_path.open("w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    fieldnames = list(records[0].keys()) if records else []
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)
    summary = {"rows": len(records), "csv": str(csv_path), "json": str(json_path)}
    with (OUT_DIR / f"uac_{args.year}_distribution_results_summary.json").open("w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
