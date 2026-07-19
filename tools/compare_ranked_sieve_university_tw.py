import csv
import json
import re
from pathlib import Path


OUT = Path("outputs/admissions_data")
REPORT = OUT / "comparison_reports"
REPORT.mkdir(parents=True, exist_ok=True)

SUBJECT_MAP = {
    "國": "國文",
    "國文": "國文",
    "英": "英文",
    "英文": "英文",
    "數A": "數A",
    "數學A": "數A",
    "數B": "數B",
    "數學B": "數B",
    "社": "社會",
    "社會": "社會",
    "自": "自然",
    "自然": "自然",
}


def clean(value):
    return re.sub(r"\s+", "", str(value or "")).strip()


def subject_key(subjects):
    return tuple(SUBJECT_MAP.get(clean(subject), clean(subject)) for subject in subjects if clean(subject))


def parse_utw_result_cell(value):
    value = clean(value)
    if not value or "=" not in value:
        return None
    left, right = value.split("=", 1)
    score = re.search(r"\d+(?:\.\d+)?", right)
    if not score:
        return None
    if float(score.group(0)) == 0:
        return None
    subjects = subject_key(left.split("+"))
    if not subjects:
        return None
    return {
        "subjects": list(subjects),
        "score": score.group(0),
        "label": f"{'+'.join(subjects)} {score.group(0)}",
        "raw": value,
    }


def parse_utw_results(row):
    detail = row.get("detail") or {}
    rows = detail.get("screening_result_rows") or []
    if len(rows) < 2:
        return []
    headers = rows[0]
    values = rows[1]
    results = []
    for index, (header, value) in enumerate(zip(headers, values), start=1):
        if "篩選" not in header:
            continue
        parsed = parse_utw_result_cell(value)
        if parsed:
            parsed["rank"] = index
            results.append(parsed)
    return results


def load_data():
    records = json.load(open("site/data/admissions_records.json", encoding="utf-8"))
    utw = json.load(open(OUT / "university_tw_records.json", encoding="utf-8"))
    utw_by_code = {}
    for row in utw:
        if row.get("channel") != "caac":
            continue
        utw_by_code.setdefault(str(row.get("program_code")), []).append(row)
    return records, utw_by_code


def select_utw(record, candidates):
    if not candidates:
        return None
    school = clean(record.get("schoolName"))
    dept = clean(record.get("departmentName"))
    for row in candidates:
        if school in clean(row.get("school_name")) and dept == clean(row.get("department_name")):
            return row
    for row in candidates:
        if school in clean(row.get("school_name")):
            return row
    return candidates[0]


def same_subjects(a, b):
    return subject_key(a) == subject_key(b)


def compare_record(record, utw_row):
    ranked = (record.get("applySieveResult") or {}).get("rankedItems") or []
    utw_results = parse_utw_results(utw_row) if utw_row else []
    known = [item for item in ranked if item.get("score")]
    missing = [item for item in ranked if not item.get("score")]

    known_conflicts = []
    for item in known:
        rank_index = int(item.get("rank") or 0) - 1
        counterpart = utw_results[rank_index] if 0 <= rank_index < len(utw_results) else None
        if not counterpart:
            known_conflicts.append(f"順位{item.get('rank')} University TW 無資料")
            continue
        if not same_subjects(item.get("subjects") or [], counterpart.get("subjects") or []) or clean(item.get("score")) != clean(counterpart.get("score")):
            known_conflicts.append(
                f"順位{item.get('rank')} 官方 {format_rank(item)} / UTW {counterpart.get('label')}"
            )

    suggestions = []
    for item in missing:
        rank_index = int(item.get("rank") or 0) - 1
        counterpart = utw_results[rank_index] if 0 <= rank_index < len(utw_results) else None
        if counterpart and same_subjects(item.get("subjects") or [], counterpart.get("subjects") or []):
            suggestions.append(counterpart)

    if not utw_row:
        status = "no_university_tw_record"
    elif not utw_results:
        status = "no_university_tw_result"
    elif known_conflicts:
        status = "source_conflict"
    elif suggestions and len(suggestions) == len(missing):
        status = "auto_fill_candidate"
    elif suggestions:
        status = "partial_fill_candidate"
    else:
        status = "no_matching_fill"

    return status, known_conflicts, suggestions, utw_results


def format_rank(item):
    subjects = "+".join(item.get("subjects") or [])
    score = clean(item.get("score"))
    return f"{subjects} {score}".strip()


def write_csv(path, rows):
    fields = [
        "status",
        "year",
        "programCode",
        "schoolName",
        "departmentName",
        "officialKnown",
        "officialMissing",
        "universityTwResult",
        "suggestedFill",
        "conflicts",
        "universityTwUrl",
        "detailUrl",
    ]
    with open(path, "w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main():
    records, utw_by_code = load_data()
    rows = []
    for record in records:
        if record.get("channelKey") != "personal_application":
            continue
        result = record.get("applySieveResult") or {}
        ranked = result.get("rankedItems") or []
        if not result.get("sieveResultStandard") or not ranked or not any(not item.get("score") for item in ranked):
            continue

        utw_row = select_utw(record, utw_by_code.get(str(record.get("programCode")), []))
        status, conflicts, suggestions, utw_results = compare_record(record, utw_row)
        known = [item for item in ranked if item.get("score")]
        missing = [item for item in ranked if not item.get("score")]
        rows.append(
            {
                "status": status,
                "year": record.get("year"),
                "programCode": record.get("programCode"),
                "schoolName": record.get("schoolName"),
                "departmentName": record.get("departmentName"),
                "officialKnown": "、".join(format_rank(item) for item in known),
                "officialMissing": "、".join(format_rank(item) for item in missing),
                "universityTwResult": "、".join(item.get("label", "") for item in utw_results),
                "suggestedFill": "、".join(item.get("label", "") for item in suggestions),
                "conflicts": "；".join(conflicts),
                "universityTwUrl": (utw_row or {}).get("url", ""),
                "detailUrl": record.get("detailUrl", ""),
            }
        )

    summary = {}
    for row in rows:
        summary[row["status"]] = summary.get(row["status"], 0) + 1

    write_csv(REPORT / "ranked_sieve_university_tw_compare.csv", rows)
    (REPORT / "ranked_sieve_university_tw_compare.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    (REPORT / "ranked_sieve_university_tw_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"rows": len(rows), "summary": summary}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
