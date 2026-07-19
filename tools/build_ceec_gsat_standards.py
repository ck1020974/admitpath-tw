import json
from pathlib import Path

import pdfplumber


OUT = Path("outputs/admissions_data")
LABELS = ["頂標", "前標", "均標", "後標", "底標"]
SUBJECTS = ["國文", "英文", "數學A", "數學B", "社會", "自然"]


def extract_year(path, year):
    with pdfplumber.open(path) as pdf:
        table = pdf.pages[3].extract_tables()[0]
    result = {}
    pending_subject = None
    for row in table:
        if not row:
            continue
        first = row[0]
        if first in SUBJECTS:
            if row[1]:
                result[first] = parse_row(row)
                pending_subject = None
            else:
                pending_subject = first
        elif pending_subject and row[1]:
            result[pending_subject] = parse_row(row)
            pending_subject = None
    return result


def parse_row(row):
    values = {}
    # The first column under each label is the target year in these CEEC tables.
    label_columns = [1, 4, 7, 10, 13]
    for label, col in zip(LABELS, label_columns):
        values[label] = int(row[col])
    return values


def main():
    standards = {
        "115": extract_year(OUT / "ceec_115_gsat_statistics.pdf", 115),
        "114": extract_year(OUT / "ceec_114_gsat_statistics.pdf", 114),
    }
    path = OUT / "ceec_gsat_five_standard_scores.json"
    path.write_text(json.dumps(standards, ensure_ascii=False, indent=2), encoding="utf-8")
    site_path = Path("site/data/ceec_gsat_five_standard_scores.json")
    site_path.parent.mkdir(parents=True, exist_ok=True)
    site_path.write_text(json.dumps(standards, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(standards, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
