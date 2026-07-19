import csv
import json
import re
from pathlib import Path

import pdfplumber


ROOT = Path("outputs/admissions_data")
ALLOWED_THRESHOLDS = [20, 30, 40, 50]
PDF_SOURCE_URLS = {
    114: "https://www.cac.edu.tw/star114/PDF_FileGet.php?Type=appform_3_0",
    115: "https://www.cac.edu.tw/star115/PDF_FileGet.php?Type=appform_3_0",
}


def clean(value):
    text = "" if value is None else str(value)
    text = text.replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def normalize_percent_label(value):
    return f"前 {int(value)}%"


def infer_threshold(max_percent):
    for threshold in ALLOWED_THRESHOLDS:
        if max_percent <= threshold:
            return threshold
    return ALLOWED_THRESHOLDS[-1]


def parse_pdf(year):
    path = ROOT / f"star_{year}_rank_percent_standards.pdf"
    if not path.exists() or path.stat().st_size < 1000:
        return []

    rows = []
    seen = set()
    pattern = re.compile(r"^(\d{3})\s+(.+?)\s+前\s+(\d)\s*0\s*%$")

    with pdfplumber.open(path) as pdf:
        for page_no, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            for raw_line in text.splitlines():
                line = clean(raw_line)
                match = pattern.match(line)
                if not match:
                    continue
                school_code, school_name, tens = match.groups()
                key = (school_code, school_name)
                if key in seen:
                    continue
                seen.add(key)
                rows.append(
                    {
                        "admission_year": year,
                        "school_code": school_code,
                        "school_name": school_name,
                        "academic_rank_percentile_standard": normalize_percent_label(int(tens) * 10),
                        "pdf_page": page_no,
                        "source_url": PDF_SOURCE_URLS[year],
                        "source_method": "official_pdf",
                    }
                )
    return rows


def load_admission_standards(year):
    path = ROOT / f"star{year}_admission_standards.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def infer_from_admission_standards(year, existing_rows):
    existing_codes = {str(row.get("school_code") or "").strip() for row in existing_rows}
    grouped = {}
    for row in load_admission_standards(year):
        school_code = str(row.get("school_code") or "").strip()
        school_name = clean(row.get("school_name"))
        if not school_code or school_code in existing_codes:
            continue
        entry = grouped.setdefault(
            school_code,
            {
                "school_name": school_name,
                "max_percent": 0.0,
                "source_url": clean(row.get("source_url")),
            },
        )
        if not entry["school_name"] and school_name:
            entry["school_name"] = school_name
        if not entry["source_url"] and row.get("source_url"):
            entry["source_url"] = clean(row.get("source_url"))
        for item in row.get("distribution_standards") or []:
            for field in ("firstRoundStandard", "secondRoundStandard"):
                value = clean(item.get(field))
                if not value.endswith("%"):
                    continue
                try:
                    percent = float(value[:-1])
                except ValueError:
                    continue
                if percent > entry["max_percent"]:
                    entry["max_percent"] = percent

    rows = []
    for school_code, entry in sorted(grouped.items()):
        threshold = infer_threshold(entry["max_percent"])
        rows.append(
            {
                "admission_year": year,
                "school_code": school_code,
                "school_name": entry["school_name"],
                "academic_rank_percentile_standard": normalize_percent_label(threshold),
                "pdf_page": None,
                "source_url": entry["source_url"] or PDF_SOURCE_URLS[year],
                "source_method": "inferred_from_admission_standards",
                "derived_from_max_percent": entry["max_percent"],
            }
        )
    return rows


def write_csv(path, rows):
    fieldnames = [
        "admission_year",
        "school_code",
        "school_name",
        "academic_rank_percentile_standard",
        "pdf_page",
        "source_url",
        "source_method",
        "derived_from_max_percent",
    ]
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main():
    rows = []
    summary = {}
    for year in (115, 114):
        parsed_rows = parse_pdf(year)
        inferred_rows = infer_from_admission_standards(year, parsed_rows)
        year_rows = sorted(parsed_rows + inferred_rows, key=lambda row: row["school_code"])
        rows.extend(year_rows)
        summary[str(year)] = {
            "official_pdf_rows": len(parsed_rows),
            "inferred_rows": len(inferred_rows),
            "total_rows": len(year_rows),
        }

    json_path = ROOT / "star_rank_percent_standards.json"
    csv_path = ROOT / "star_rank_percent_standards.csv"
    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(csv_path, rows)
    print(json.dumps({"rows": len(rows), "summary": summary}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
