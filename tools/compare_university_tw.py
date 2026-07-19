import csv
import json
import re
import unicodedata
from pathlib import Path


OUT = Path("outputs/admissions_data")
REPORT = OUT / "comparison_reports"
REPORT.mkdir(parents=True, exist_ok=True)


SEGMENTS = [
    ("115_personal_application", 115, "personal_application", "caac"),
    ("115_star_recommendation", 115, "star_recommendation", "star"),
    ("114_personal_application", 114, "personal_application", "caac"),
    ("114_star_recommendation", 114, "star_recommendation", "star"),
    ("114_exam_distribution", 114, "exam_distribution", None),
]


SUBJECT_MAP = {
    "國文": "國文",
    "英文": "英文",
    "英": "英文",
    "數學A": "數A",
    "數A": "數A",
    "數學B": "數B",
    "數B": "數B",
    "社會": "社會",
    "自然": "自然",
    "英聽": "英聽",
}


def clean(value):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", str(value or ""))).strip()


def clean_name(value):
    value = clean(value)
    value = re.sub(r"^\(?[A-Za-z0-9j]{3,4}\)?", "", value)
    value = value.replace("（", "(").replace("）", ")")
    return value


def norm_subject(value):
    return SUBJECT_MAP.get(clean(value), clean(value))


def is_value(value):
    value = clean(value)
    return value and value not in {"--", "-", "無", "0"}


def norm_standard(value):
    value = clean(value)
    value = value.replace("頂標", "頂標").replace("前標", "前標").replace("均標", "均標").replace("後標", "後標").replace("底標", "底標")
    return "" if value in {"--", "-"} else value


def norm_multiplier(value):
    value = clean(value)
    return "" if value in {"--", "-", "0"} else value


def norm_combined_subject(value):
    value = clean(value)
    value = value.replace("國文", "國").replace("英文", "英").replace("數學A", "數A").replace("數學B", "數B")
    value = value.replace("+", "").replace("、", "")
    return value


def norm_order_item(value):
    value = clean(value)
    value = re.sub(r"^\d+、", "", value)
    value = value.replace("數學A", "數A").replace("數學B", "數B")
    if value.startswith("學測") and "、" in value:
        body = value.replace("學測", "")
        body = body.replace("之級分總和", "").replace("級分總和", "").replace("之級分", "").replace("級分", "").replace("之", "")
        subject_short = {"國文": "國", "英文": "英", "數A": "數A", "數B": "數B", "社會": "社", "自然": "自"}
        parts = [subject_short.get(part, part) for part in body.split("、") if part]
        return "學測" + "+".join(parts)
    value = value.replace("在校學業成績全校排名百分比", "在校學業")
    value = value.replace("國語文學業成績總平均全校排名百分比", "國文學業")
    value = value.replace("英語文學業成績總平均全校排名百分比", "英文學業")
    value = value.replace("公民與社會學業成績總平均全校排名百分比", "公民學業")
    value = value.replace("地球科學學業成績總平均全校排名百分比", "地科學業")
    value = value.replace("資訊科技學業成績總平均全校排名百分比", "資訊學業")
    value = value.replace("生活科技學業成績總平均全校排名百分比", "生活學業")
    value = re.sub(r"(數學|歷史|地理|公民|物理|化學|生物|地球科學|美術|音樂|體育|生活科技)學業成績總平均全校排名百分比", r"\1學業", value)
    value = value.replace("地球科學學業", "地科學業")
    value = value.replace("資訊科技學業", "資訊學業")
    value = value.replace("生活科技學業", "生活學業")
    value = value.replace("級分總和", "").replace("之級分", "").replace("級分", "").replace("之", "")
    value = value.replace("國文、英文、數學A、社會", "國+英+數A+社")
    value = value.replace("國文、英文、數學B、社會", "國+英+數B+社")
    value = value.replace("國文、英文、社會", "國+英+社")
    value = value.replace("英文、數學A、社會、自然", "英+數A+社+自")
    value = value.replace("英文、數學A、社會", "英+數A+社")
    value = value.replace("英文、數學A、自然", "英+數A+自")
    value = value.replace("英文、自然", "英+自")
    return value


def official_requirement_map(record):
    detail = record.get("cacDetail") or {}
    items = []
    if record["channelKey"] == "personal_application":
        items = detail.get("screeningSubjects") or []
    elif record["channelKey"] == "star_recommendation":
        items = detail.get("testRequirements") or []
    result = {}
    for item in items:
        subject = norm_subject(item.get("subject"))
        standard = norm_standard(item.get("standard"))
        multiplier = norm_multiplier(item.get("screening_multiplier"))
        if subject and (standard or multiplier):
            result[subject] = {"standard": standard, "multiplier": multiplier}
    return result


def utw_requirement_map(record, year):
    detail = record.get("detail") or {}
    table = (detail.get("test_requirements_by_year") or {}).get(str(year), {})
    result = {}
    for subject, standard in table.items():
        subject = norm_subject(subject)
        standard = norm_standard(standard)
        if subject and standard:
            result.setdefault(subject, {})["standard"] = standard
    multipliers = (detail.get("screening_multipliers_by_year") or {}).get(str(year), {})
    for subject, multiplier in multipliers.items():
        subject = norm_subject(subject)
        multiplier = norm_multiplier(multiplier)
        combined = re.fullmatch(r"([0-9.]+)\(([^)]+)\)", multiplier)
        if subject == "相加項" and combined:
            subject = norm_combined_subject(combined.group(2))
            multiplier = combined.group(1)
        if subject and is_value(multiplier):
            result.setdefault(subject, {})["multiplier"] = multiplier
    return result


def official_star_order(record):
    detail = record.get("cacDetail") or {}
    return [norm_order_item(x) for x in detail.get("distributionOrder") or [] if clean(x)]


def utw_star_order(record, year):
    detail = record.get("detail") or {}
    table = (detail.get("distribution_order_by_year") or {}).get(str(year), {})
    return [norm_order_item(v) for v in table.values() if clean(v) and clean(v) != "--"]


def official_rank(record):
    return clean((record.get("starRankStandard") or {}).get("academicRankPercentileStandard"))


def utw_rank(record):
    return clean((record.get("detail") or {}).get("rank_percentile"))


def load_records():
    official = json.load(open("site/data/admissions_records.json", encoding="utf-8"))
    utw = json.load(open(OUT / "university_tw_records.json", encoding="utf-8"))
    official_by_segment = {}
    for row in official:
        if not re.fullmatch(r"\d{4,6}", str(row.get("programCode", ""))):
            continue
        key = (row["year"], row["channelKey"])
        official_by_segment.setdefault(key, {})[str(row["programCode"])] = row
    utw_by_channel = {}
    for row in utw:
        key = row["channel"]
        utw_by_channel.setdefault(key, {}).setdefault(str(row["program_code"]), []).append(row)
    return official_by_segment, utw_by_channel


def select_utw_candidate(code, official_row, candidates):
    if not candidates:
        return None
    school = clean_name(official_row.get("schoolName"))
    dept = clean_name(official_row.get("departmentName"))
    for row in candidates:
        if school and school in clean_name(row.get("school_name")) and dept == clean_name(row.get("department_name")):
            return row
    for row in candidates:
        if school and school in clean_name(row.get("school_name")):
            return row
    return candidates[0]


def compare_segment(segment_id, year, channel_key, utw_channel, official_by_segment, utw_by_channel):
    official = official_by_segment.get((year, channel_key), {})
    utw_lists = utw_by_channel.get(utw_channel, {}) if utw_channel else {}
    utw = {code: rows[0] for code, rows in utw_lists.items()}
    issues = []

    if not utw_channel:
        return {
            "segment": segment_id,
            "year": year,
            "channelKey": channel_key,
            "officialCount": len(official),
            "universityTwCount": 0,
            "matchedCount": 0,
            "missingInUniversityTw": len(official),
            "extraInUniversityTw": 0,
            "fieldIssueCount": 0,
            "status": "university_tw_no_historical_dataset_for_this_segment",
        }, issues

    official_codes = set(official)
    utw_codes = set(utw)
    matched = official_codes & utw_codes

    for code in sorted(official_codes - utw_codes):
        row = official[code]
        issues.append(issue(segment_id, code, row, None, "missing_in_university_tw", "系組代碼未在 University TW 目前資料中找到", "", ""))
    for code in sorted(utw_codes - official_codes):
        row = utw[code]
        issues.append(issue(segment_id, code, None, row, "extra_in_university_tw", "University TW 有收錄，但本專案官方資料集未收錄", "", ""))

    for code in sorted(matched):
        off = official[code]
        third = select_utw_candidate(code, off, utw_lists.get(code, []))
        if clean_name(off.get("schoolName")) not in clean_name(third.get("school_name")) and clean_name(third.get("school_name")) not in clean_name(off.get("schoolName")):
            issues.append(issue(segment_id, code, off, third, "school_name_mismatch", "學校名稱不同", off.get("schoolName"), third.get("school_name")))
        department_mismatch = clean_name(off.get("departmentName")) != clean_name(third.get("department_name"))
        if department_mismatch:
            issues.append(issue(segment_id, code, off, third, "department_name_mismatch", "學系名稱不同", off.get("departmentName"), third.get("department_name")))
            if year == 114:
                continue

        if channel_key in {"personal_application", "star_recommendation"}:
            compare_requirements(segment_id, year, code, off, third, issues)

        if channel_key == "star_recommendation":
            off_order = official_star_order(off)
            third_order = utw_star_order(third, year)
            if off_order and third_order and off_order != third_order:
                issues.append(issue(segment_id, code, off, third, "star_order_mismatch", "繁星分發比序不同", " / ".join(off_order), " / ".join(third_order)))
            if official_rank(off) and utw_rank(third) and official_rank(off) != utw_rank(third):
                issues.append(issue(segment_id, code, off, third, "star_rank_percentile_mismatch", "繁星在校成績百分比不同", official_rank(off), utw_rank(third)))

    field_issues = [row for row in issues if row["issueType"] not in {"missing_in_university_tw", "extra_in_university_tw"}]
    summary = {
        "segment": segment_id,
        "year": year,
        "channelKey": channel_key,
        "officialCount": len(official),
        "universityTwCount": len(utw),
        "matchedCount": len(matched),
        "missingInUniversityTw": len(official_codes - utw_codes),
        "extraInUniversityTw": len(utw_codes - official_codes),
        "fieldIssueCount": len(field_issues),
        "status": "compared",
    }
    return summary, issues


def compare_requirements(segment_id, year, code, off, third, issues):
    off_map = official_requirement_map(off)
    third_map = utw_requirement_map(third, year)
    for subject in sorted(set(off_map) | set(third_map)):
        off_standard = norm_standard((off_map.get(subject) or {}).get("standard"))
        third_standard = norm_standard((third_map.get(subject) or {}).get("standard"))
        if off_standard != third_standard:
            issues.append(issue(segment_id, code, off, third, "test_requirement_mismatch", f"{subject} 檢定標準不同", off_standard or "--", third_standard or "--"))

        if off["channelKey"] == "personal_application":
            off_multiplier = clean((off_map.get(subject) or {}).get("multiplier"))
            third_multiplier = clean((third_map.get(subject) or {}).get("multiplier"))
            if off_multiplier != third_multiplier:
                issues.append(issue(segment_id, code, off, third, "screening_multiplier_mismatch", f"{subject} 篩選倍率不同", off_multiplier or "--", third_multiplier or "--"))


def issue(segment, code, official, utw, issue_type, message, official_value, utw_value):
    return {
        "segment": segment,
        "programCode": code,
        "issueType": issue_type,
        "message": message,
        "officialSchool": (official or {}).get("schoolName", ""),
        "officialDepartment": (official or {}).get("departmentName", ""),
        "universityTwSchool": (utw or {}).get("school_name", ""),
        "universityTwDepartment": (utw or {}).get("department_name", ""),
        "officialValue": official_value,
        "universityTwValue": utw_value,
        "universityTwUrl": (utw or {}).get("url", ""),
    }


def write_csv(path, rows):
    fields = [
        "segment",
        "programCode",
        "issueType",
        "message",
        "officialSchool",
        "officialDepartment",
        "universityTwSchool",
        "universityTwDepartment",
        "officialValue",
        "universityTwValue",
        "universityTwUrl",
    ]
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main():
    official_by_segment, utw_by_channel = load_records()
    summaries = []
    all_issues = []
    for segment in SEGMENTS:
        summary, issues = compare_segment(*segment, official_by_segment, utw_by_channel)
        summaries.append(summary)
        all_issues.extend(issues)
        write_csv(REPORT / f"{segment[0]}_issues.csv", issues)
        (REPORT / f"{segment[0]}_issues.json").write_text(json.dumps(issues, ensure_ascii=False, indent=2), encoding="utf-8")

    (REPORT / "summary.json").write_text(json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(REPORT / "all_issues.csv", all_issues)
    (REPORT / "all_issues.json").write_text(json.dumps(all_issues, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"summaries": summaries, "issueCount": len(all_issues)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
