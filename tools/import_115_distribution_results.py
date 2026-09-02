"""Add the official 115 UAC distribution results to the publishable site data."""

import json
import re
from pathlib import Path


ROOT = Path("outputs/admissions_data")
SITE_DATA = Path("site/data")
YEAR = 115
CHANNEL_KEY = "exam_distribution"
SOURCE_URL = "https://www2.uac.edu.tw/115data/115_result_school_data.pdf"


def clean(value):
    return "" if value is None else str(value).strip()


def weighted_subjects(value):
    return [
        {"subject": subject, "weight": weight, "raw": f"{subject}x{weight}"}
        for subject, weight in re.findall(r"([^\s]+?)x([0-9.]+)", clean(value))
    ]


def site_record(row):
    program_code = clean(row.get("program_code"))
    compact = clean(row.get("weighted_subjects_compact"))
    return {
        "id": f"{YEAR}-{CHANNEL_KEY}-{program_code}-115_distribution",
        "year": YEAR,
        "channel": "分發入學",
        "channelKey": CHANNEL_KEY,
        "dataType": "放榜結果：各系組最低錄取標準及錄取人數",
        "sourceKey": "115_distribution",
        "sourceOrganization": "大學考試入學分發委員會",
        "sourceUrl": SOURCE_URL,
        "schoolCode": "",
        "schoolName": clean(row.get("school_name")),
        "programCode": program_code,
        "departmentName": clean(row.get("department_name")),
        "quota": "",
        "extraQuota": "",
        "category": "",
        "starGroup": "",
        "genderRequirement": "",
        "screeningDate": "",
        "screeningFee": "",
        "expectedSecondStageCount": "",
        "examRequired": "",
        "detailUrl": "",
        "testRequirementStandard": "",
        "weightedSubjects": weighted_subjects(compact),
        "weightedSubjectsText": compact,
        "selectionNotes": "",
        "detailMatchStatus": "official_result_only",
        "rawFields": {},
        "cacDetail": None,
        "starRankStandard": None,
        "starAdmissionResult": None,
        "applySieveResult": None,
        "applySieveReview": None,
    }


def result_record(row):
    return {
        "programCode": clean(row.get("program_code")),
        "schoolName": clean(row.get("school_name")),
        "departmentName": clean(row.get("department_name")),
        "weightedSubjectsCompact": clean(row.get("weighted_subjects_compact")),
        "admittedCount": clean(row.get("admitted_count_including_extra")),
        "regularMinScore": clean(row.get("regular_min_admission_score")),
        "regularTotalScore": clean(row.get("regular_total_score") or row.get("regular_min_admission_score")),
        "regularTieBreak": clean(row.get("regular_tie_break")),
        "sourceUrl": SOURCE_URL,
    }


def main():
    source = json.loads((ROOT / "admissions_115_exam_distribution_results.json").read_text(encoding="utf-8"))
    records_path = SITE_DATA / "admissions_records.json"
    records = json.loads(records_path.read_text(encoding="utf-8"))
    records = [r for r in records if not (r.get("year") == YEAR and r.get("channelKey") == CHANNEL_KEY)]
    records.extend(site_record(row) for row in source)
    records_path.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")

    prior_results = json.loads((SITE_DATA / "distribution_results_114.json").read_text(encoding="utf-8"))
    results = {f"114-{code}": value for code, value in prior_results.items()}
    results.update({f"115-{row.get('program_code')}": result_record(row) for row in source})
    (SITE_DATA / "distribution_results.json").write_text(json.dumps(results, ensure_ascii=False), encoding="utf-8")

    manifest_path = SITE_DATA / "site_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["recordCount"] = len(records)
    manifest["resultCount"] = len(results)
    datasets = [item for item in manifest.get("datasets", []) if not (item.get("year") == YEAR and item.get("channel") == "分發入學")]
    datasets.insert(2, {"year": YEAR, "channel": "分發入學", "count": len(source)})
    manifest["datasets"] = datasets
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"records": len(records), "distributionResults": len(results), "added115": len(source)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
