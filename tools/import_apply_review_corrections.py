import json
import re
from pathlib import Path

from prepare_site_data import normalize_sieve_standard, parse_sieve_result_items


SRC = Path("outputs/admissions_data/comparison_reports/115_apply_review_corrections.json")
OUT_RESULTS = Path("outputs/admissions_data/apply115_sieve_manual_corrections.json")
OUT_REVIEW = Path("outputs/admissions_data/apply115_sieve_manual_review.json")


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def main():
    rows = json.load(open(SRC, encoding="utf-8"))
    results = []
    review = []
    for row in rows:
        code = clean(row.get("programCode"))
        standard = normalize_sieve_standard(row.get("correctedStandard"))
        correction_type = clean(row.get("correctionType"))
        note = clean(row.get("note"))
        if standard:
            results.append(
                {
                    "admission_year": 115,
                    "program_code": code,
                    "school_name": clean(row.get("schoolName")),
                    "department_name": clean(row.get("departmentName")),
                    "sieve_result_standard": standard,
                    "sieve_result_raw": clean(row.get("correctedStandard")),
                    "sieve_result_items": parse_sieve_result_items(standard),
                    "source": "manual_review",
                    "correction_type": correction_type or "gsat",
                    "note": note,
                    "saved_at": clean(row.get("savedAt")),
                }
            )
        else:
            status = {
                "blank": "manual_blank",
                "special": "manual_special",
                "unresolved": "manual_unresolved",
            }.get(correction_type, "manual_unresolved")
            review.append(
                {
                    "admission_year": 115,
                    "program_code": code,
                    "school_name": clean(row.get("schoolName")),
                    "department_name": clean(row.get("departmentName")),
                    "refine_status": status,
                    "sieve_result_raw": "",
                    "sieve_result_normalized": "",
                    "note": note,
                    "saved_at": clean(row.get("savedAt")),
                }
            )

    OUT_RESULTS.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_REVIEW.write_text(json.dumps(review, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"manual_results": len(results), "manual_review": len(review)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
