import json
import re
from pathlib import Path


ROOT = Path("outputs/admissions_data")
SITE_DATA = Path("site/data")
SITE_DATA.mkdir(parents=True, exist_ok=True)
CATEGORY_SUFFIX = "學類"
GROUP_REFERENCE_PATH = Path("outputs/ceec_18_group_category_reference.json")


SOURCE_FILES = [
    ("115_apply", ROOT / "admissions_115_personal_application_index.json"),
    ("115_star", ROOT / "admissions_115_star_recommendation_index.json"),
    ("114_apply", ROOT / "admissions_114_personal_application_index.json"),
    ("114_star", ROOT / "admissions_114_star_recommendation_index.json"),
    ("114_distribution", ROOT / "admissions_114_exam_distribution_index.json"),
    ("115_distribution", ROOT / "admissions_115_exam_distribution_results.json"),
]


CHANNEL_LABEL = {
    "personal_application": "個人申請",
    "star_recommendation": "繁星推薦",
    "exam_distribution": "分發入學",
}


def clean_text(value):
    value = "" if value is None else str(value)
    value = value.replace("\r", "\n")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def clean_school_name(value):
    value = clean_text(value)
    value = re.sub(r"\s*[-－]\s*\d+\s*系(?:\(組\))?.*$", "", value)
    return value.strip()


def clean_department_name(value, school_name):
    value = clean_text(value)
    school_name = clean_text(school_name)
    if school_name and value.startswith(school_name):
        value = value[len(school_name):].strip()
    return value


def category_base_name(value):
    value = clean_text(value)
    if value.endswith(CATEGORY_SUFFIX):
        return value[:-len(CATEGORY_SUFFIX)]
    return value


def parse_json_string(value, default):
    if not value:
        return default
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return default


def find_first(raw_fields, names):
    for name in names:
        if name in raw_fields and clean_text(raw_fields[name]):
            return clean_text(raw_fields[name])
    return ""


OCR_CACHE = {}


def normalize_record(source_key, row, detail=None, star_rank=None, apply_sieve=None, apply_sieve_review=None, star_admission=None):
    raw_fields = row.get("raw_fields") or {}
    year = int(row.get("admission_year") or 0)
    channel_key = row.get("admission_channel_key") or ""
    channel = CHANNEL_LABEL.get(channel_key, row.get("admission_channel") or "")
    school = clean_school_name(row.get("school_name"))
    department = clean_department_name(row.get("department_name"), school)
    source_url = row.get("source_school_url") or row.get("source_total_url") or row.get("source_url") or ""

    quota = (
        find_first(raw_fields, ["招生名額", "核定名額"])
        or clean_text(row.get("approved_quota"))
    )
    extra_quota = (
        find_first(raw_fields, ["外加名額", "原住民外加名額", "原民外加"])
        or clean_text(row.get("indigenous_extra_quota"))
    )
    category = find_first(raw_fields, ["類別", "學群類別"])
    exam_required = find_first(raw_fields, ["是否要參加術科考試"])

    weighted_subjects = parse_json_string(row.get("weighted_subjects_json"), [])
    weighted_subjects_text = ""
    if weighted_subjects:
        parts = []
        for item in weighted_subjects:
            raw = clean_text(item.get("raw")) if isinstance(item, dict) else clean_text(item)
            if raw and raw not in ("--", "---"):
                parts.append(raw)
        weighted_subjects_text = "、".join(parts)

    cac_detail = normalize_cac_detail(detail)
    apply_sieve_result = normalize_apply_sieve(apply_sieve)
    if channel_key == "personal_application" and cac_detail:
        apply_sieve_result = add_ranked_apply_sieve(
            apply_sieve_result,
            cac_detail,
            year,
            clean_text(row.get("program_code")),
            clean_text(row.get("school_code")),
        )

    return {
        "id": f"{year}-{channel_key}-{row.get('program_code')}-{source_key}",
        "year": year,
        "channel": channel,
        "channelKey": channel_key,
        "dataType": clean_text(row.get("data_type")),
        "sourceKey": source_key,
        "sourceOrganization": clean_text(row.get("source_organization")),
        "sourceUrl": source_url,
        "schoolCode": clean_text(row.get("school_code")),
        "schoolName": school,
        "programCode": clean_text(row.get("program_code")),
        "departmentName": department,
        "quota": quota,
        "extraQuota": extra_quota,
        "category": category,
        "starGroup": find_first(raw_fields, ["學群類別"]),
        "genderRequirement": find_first(raw_fields, ["性別要求"]),
        "screeningDate": find_first(raw_fields, ["指定項目甄試日期"]),
        "screeningFee": find_first(raw_fields, ["指定項目甄試費用", "指定項目甄試費"]),
        "expectedSecondStageCount": find_first(raw_fields, ["預計甄試人數"]),
        "examRequired": exam_required,
        "detailUrl": clean_text(row.get("detail_url")),
        "testRequirementStandard": clean_text(row.get("test_requirement_standard")),
        "weightedSubjects": weighted_subjects,
        "weightedSubjectsText": weighted_subjects_text,
        "selectionNotes": clean_text(row.get("selection_notes")),
        "detailMatchStatus": clean_text(row.get("detail_match_status")),
        "rawFields": raw_fields,
        "cacDetail": cac_detail,
        "starRankStandard": normalize_star_rank(star_rank),
        "starAdmissionResult": normalize_star_admission_result(star_admission),
        "applySieveResult": apply_sieve_result,
        "applySieveReview": normalize_apply_sieve_review(apply_sieve_review),
    }


def normalize_cac_detail(detail):
    if not detail:
        return None
    return {
        "kind": detail.get("detail_kind", ""),
        "screeningSubjects": detail.get("screening_subjects", []),
        "secondStageItems": detail.get("second_stage_items", []),
        "sameScoreOrder": detail.get("same_score_order", []),
        "reviewItems": clean_text(detail.get("review_items")),
        "reviewDescription": clean_text(detail.get("review_description")),
        "interviewOrTestDescription": clean_text(detail.get("interview_or_test_description")),
        "overEnrollmentScreening": clean_text(detail.get("over_enrollment_screening")),
        "importantDates": detail.get("important_dates", {}),
        "academicRankPercentile": clean_text(detail.get("academic_rank_percentile")),
        "testRequirements": detail.get("test_requirements", []),
        "distributionOrder": detail.get("distribution_order", []),
        "notes": clean_text(detail.get("notes")),
        "detailUrl": clean_text(detail.get("detail_url")),
    }


def normalize_star_rank(row):
    if not row:
        return None
    return {
        "academicRankPercentileStandard": clean_text(row.get("academic_rank_percentile_standard")),
        "sourceUrl": clean_text(row.get("source_url")),
        "pdfPage": row.get("pdf_page"),
    }


def normalize_star_admission_result(row):
    if not row:
        return None
    return {
        "standardType": clean_text(row.get("standard_type")),
        "standardTypeLabel": clean_text(row.get("standard_type_label")),
        "quota": clean_text(row.get("quota")),
        "totalCount": clean_text(row.get("total_admitted")),
        "firstRoundCount": clean_text(row.get("first_round_admitted")),
        "secondRoundCount": clean_text(row.get("second_round_admitted")),
        "testRequirements": row.get("test_requirements") or [],
        "artExamRequirements": row.get("art_exam_requirements") or [],
        "distributionStandards": row.get("distribution_standards") or [],
        "sourceUrl": clean_text(row.get("source_url")),
        "pdfPage": row.get("pdf_page"),
    }


def normalize_apply_sieve(row):
    if not row:
        return None
    standard = merge_sieve_standards(row.get("sieve_result_standard"), row.get("sieve_result_raw"))
    items = parse_sieve_result_items(standard)
    if not standard and not items:
        return None
    return {
        "sieveResultStandard": sieve_items_display(items) or standard,
        "sieveResultRaw": clean_text(row.get("sieve_result_raw")),
        "sieveResultItems": items,
        "sourceImageUrl": clean_text(row.get("source_image_url")),
    }


def add_ranked_apply_sieve(result, detail, year, program_code, school_code):
    ranks = build_screening_rank_groups(detail.get("screeningSubjects") or [])
    if not ranks:
        return result

    if not result:
        return None

    item_scores = {}
    for item in result.get("sieveResultItems") or []:
        subjects = tuple(item.get("subjects") or [])
        score = clean_text(item.get("score"))
        if subjects and score:
            item_scores[subjects] = score

    ocr_scores = extract_rank_scores_from_ocr(year, school_code, program_code, len(ranks))
    ranked_items = []
    for index, rank in enumerate(ranks, start=1):
        subjects = tuple(rank["subjects"])
        score = item_scores.get(subjects) or (ocr_scores[index - 1] if index - 1 < len(ocr_scores) else "")
        ranked_items.append(
            {
                "rank": index,
                "multiplier": rank["multiplier"],
                "subjects": list(subjects),
                "score": score,
                "label": f"{'+'.join(subjects)}{score}" if score else f"{'+'.join(subjects)}待補",
            }
        )

    result["rankedItems"] = ranked_items
    display = [item["label"] for item in ranked_items if item.get("score")]
    if display:
        result["sieveResultStandard"] = "、".join(display)
    return result


def build_screening_rank_groups(items):
    groups = {}
    order = []
    for item in items:
        multiplier = clean_text(item.get("screening_multiplier"))
        if not multiplier or multiplier == "--":
            continue
        try:
            multiplier_value = float(multiplier)
        except ValueError:
            continue
        subjects = expand_screening_subjects(item.get("subject"))
        if not subjects:
            continue
        if multiplier not in groups:
            groups[multiplier] = {"multiplier": multiplier, "value": multiplier_value, "subjects": []}
            order.append(multiplier)
        for subject in subjects:
            if subject not in groups[multiplier]["subjects"]:
                groups[multiplier]["subjects"].append(subject)
    return [
        {"multiplier": group["multiplier"], "subjects": group["subjects"]}
        for group in sorted(groups.values(), key=lambda row: row["value"], reverse=True)
    ]


def expand_screening_subjects(value):
    text = clean_text(value).replace(" ", "")
    if not text or text == "--":
        return []
    replacements = {
        "國文": "國",
        "英文": "英",
        "數學A": "數A",
        "數學B": "數B",
        "社會": "社",
        "自然": "自",
        "英聽": "英聽",
    }
    for before, after in replacements.items():
        text = text.replace(before, after)
    subjects = []
    index = 0
    token_map = [
        ("APCS實作", "APCS實作"),
        ("英聽", "英聽"),
        ("數A", "數A"),
        ("數B", "數B"),
        ("國", "國文"),
        ("英", "英文"),
        ("社", "社會"),
        ("自", "自然"),
    ]
    while index < len(text):
        matched = False
        for token, subject in token_map:
            if text.startswith(token, index):
                if subject not in subjects:
                    subjects.append(subject)
                index += len(token)
                matched = True
                break
        if not matched:
            index += 1
    return subjects


def extract_rank_scores_from_ocr(year, school_code, program_code, expected_count):
    if expected_count <= 0 or not school_code or not program_code:
        return []
    ocr_paths = [
        Path(f"work/apply{year}_sieve_caclink") / f"{school_code}.ocr.json",
        Path(f"work/apply{year}_sieve") / f"{school_code}.ocr.json",
    ]
    ocr_path = next((path for path in ocr_paths if path.exists()), ocr_paths[0])
    if not ocr_path.exists():
        return []
    if ocr_path not in OCR_CACHE:
        OCR_CACHE[ocr_path] = json.load(ocr_path.open(encoding="utf-8-sig"))
    words = []
    for line in OCR_CACHE[ocr_path]:
        words.extend(line.get("words", []))
    code_words = [word for word in words if word.get("text") == program_code]
    if not code_words:
        return []
    cy = code_words[0]["y"] + code_words[0]["height"] / 2
    row_words = sorted(
        [
            word
            for word in words
            if abs((word["y"] + word["height"] / 2) - cy) <= 18
            and word.get("x", 0) >= 1500
        ],
        key=lambda word: word.get("x", 0),
    )
    scores = []
    for word in row_words:
        value = clean_text(word.get("text"))
        score = re.search(r"(\d+(?:\.\d+)?)$", value)
        if score:
            scores.append(score.group(1))
    return scores[:expected_count]


def normalize_apply_sieve_review(row):
    if not row:
        return None
    status = clean_text(row.get("refine_status"))
    labels = {
        "special_result": "特殊術科結果",
        "official_blank_or_ocr_blank": "官方未列最低級分",
        "code_not_found_in_ocr": "OCR 未定位系組",
        "incomplete_combined_text": "合計欄位待人工確認",
        "manual_review": "OCR 待人工確認",
        "manual_blank": "官方未列最低級分",
        "manual_special": "特殊術科結果",
        "manual_unresolved": "人工覆核仍待確認",
    }
    return {
        "status": status,
        "label": labels.get(status, "篩選結果待複核"),
        "raw": clean_text(row.get("sieve_result_raw")),
        "normalized": clean_text(row.get("sieve_result_normalized")),
    }


def normalize_sieve_standard(value):
    text = clean_text(value)
    if not text:
        return ""
    replacements = {
        "＋": "+",
        "÷": "+",
        "／": "+",
        "/": "+",
        "芵文": "英文",
        "芵 文": "英文",
        "數學A": "數A",
        "數學B": "數B",
        "自 然": "自然",
        "社 會": "社會",
        "國 文": "國文",
        "英 文": "英文",
        "數 A": "數A",
        "數 B": "數B",
    }
    for before, after in replacements.items():
        text = text.replace(before, after)
    text = re.sub(r"\s*([()+、])\s*", r"\1", text)
    text = re.sub(r"\s*\+\s*", "+", text)
    text = text.replace("(然", "(自然").replace("+然", "+自然")
    text = re.sub(r"(?<!自)然\)", "自然)", text)
    return text.strip()


def parse_sieve_result_items(standard):
    items = []
    if not standard:
        return items
    subject_pattern = r"國文|英文|數A|數B|社會|自然|英聽|APCS實作"
    for part in [piece.strip() for piece in standard.split("、") if piece.strip()]:
        combined = re.fullmatch(r"\(([^)]+)\)(\d+(?:\.\d+)?)", part)
        if combined:
            subjects = [s for s in combined.group(1).split("+") if re.fullmatch(subject_pattern, s)]
            items.append(
                {
                    "type": "combined",
                    "subjects": subjects,
                    "score": combined.group(2),
                    "label": f"{'+'.join(subjects)}{combined.group(2)}",
                }
            )
            continue
        concatenated = list(re.finditer(rf"({subject_pattern})(\d+(?:\.\d+)?)", part))
        if len(concatenated) > 1 and "".join(match.group(0) for match in concatenated) == part:
            for match in concatenated:
                items.append(
                    {
                        "type": "single",
                        "subjects": [match.group(1)],
                        "score": match.group(2),
                        "label": f"{match.group(1)}{match.group(2)}",
                    }
                )
            continue
        single = re.fullmatch(rf"({subject_pattern})(\d+(?:\.\d+)?)", part)
        if single:
            items.append(
                {
                    "type": "single",
                    "subjects": [single.group(1)],
                    "score": single.group(2),
                    "label": part,
                }
            )
            continue
        items.append({"type": "text", "subjects": [], "score": "", "label": part})
    return items


def sieve_items_display(items):
    return "、".join(item.get("label", "") for item in items if item.get("label"))


def merge_sieve_standards(standard_value, raw_value):
    standard = normalize_sieve_standard(standard_value)
    inferred = infer_sieve_standard_from_raw(raw_value)
    pieces = []
    seen = set()
    for value in (standard, inferred):
        for item in parse_sieve_result_items(value):
            label = item.get("label", "")
            key = (item.get("type"), tuple(item.get("subjects") or []), item.get("score"))
            if label and key not in seen:
                seen.add(key)
                if item.get("type") == "combined":
                    pieces.append(f"({'+'.join(item.get('subjects') or [])}){item.get('score')}")
                else:
                    pieces.append(label)
    return "、".join(pieces)


def longest_unique_suffix(subjects):
    suffix = []
    seen = set()
    for subject in reversed(subjects):
        if subject in seen:
            break
        suffix.append(subject)
        seen.add(subject)
    return list(reversed(suffix))


def infer_sieve_standard_from_raw(value):
    text = normalize_sieve_standard(value)
    if not text:
        return ""
    inferred = []
    compact_text = re.sub(r"([國英社自])", r" \1 ", text)
    compact_text = re.sub(r"(數A|數B|國文|英文|社會|自然)", r" \1 ", compact_text)
    tokens = [token for token in re.split(r"[\s+()、]+", compact_text) if token]
    subjects = []
    for token in tokens:
        subject = expand_sieve_subject(token)
        if subject:
            subjects.append(subject)
            continue
        if re.fullmatch(r"\d+(?:\.\d+)?", token):
            score_value = float(token)
            unique_subjects = longest_unique_suffix(subjects)
            if len(unique_subjects) >= 2 and 6 <= score_value <= 60 and not token.endswith(".5"):
                inferred.append(f"({'+'.join(unique_subjects)}){token}")
            subjects = []
    if inferred:
        dedup = []
        seen = set()
        for item in inferred:
            if item not in seen:
                seen.add(item)
                dedup.append(item)
        return "、".join(dedup)
    return ""


def expand_sieve_subject(value):
    value = clean_text(value).replace(" ", "")
    return {
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
        "然": "自然",
        "自然": "自然",
    }.get(value, "")


def load_cac_details():
    path = ROOT / "cac_detail_pages.json"
    if not path.exists():
        return {}
    details = {}
    for row in json.load(path.open(encoding="utf-8")):
        key = (int(row.get("admission_year") or 0), row.get("admission_channel_key"), str(row.get("program_code")))
        details[key] = row
    return details


def load_records():
    detail_map = load_cac_details()
    star_rank_map = load_star_rank_standards()
    star_admission_maps = load_star_admission_results()
    apply_sieve_map = load_apply_sieve_results()
    apply_sieve_review_map = load_apply_sieve_review()
    records = []
    for source_key, path in SOURCE_FILES:
        data = json.load(path.open(encoding="utf-8"))
        for row in data:
            key = (int(row.get("admission_year") or 0), row.get("admission_channel_key"), str(row.get("program_code")))
            rank_key = (int(row.get("admission_year") or 0), str(row.get("school_code") or ""))
            star_key = (
                int(row.get("admission_year") or 0),
                str(row.get("program_code") or ""),
                clean_department_name(row.get("department_name"), row.get("school_name")),
            )
            star_admission = star_admission_maps["by_department"].get(star_key) or star_admission_maps["by_code"].get(
                (int(row.get("admission_year") or 0), str(row.get("program_code") or ""))
            )
            records.append(
                normalize_record(
                    source_key,
                    row,
                    detail_map.get(key),
                    star_rank_map.get(rank_key),
                    apply_sieve_map.get(key),
                    apply_sieve_review_map.get(key),
                    star_admission,
                )
            )
    return records


def load_apply_sieve_results():
    standards = {}
    for year in (114, 115):
        path = ROOT / f"apply{year}_sieve_result_standards.json"
        if not path.exists():
            continue
        for row in json.load(path.open(encoding="utf-8")):
            key = (int(row.get("admission_year") or 0), "personal_application", str(row.get("program_code")))
            standard = normalize_sieve_standard(row.get("sieve_result_standard")) or infer_sieve_standard_from_raw(row.get("sieve_result_raw"))
            if standard and key not in standards:
                standards[key] = row
    refined_path = ROOT / "apply115_sieve_refined_results.json"
    if refined_path.exists():
        for row in json.load(refined_path.open(encoding="utf-8")):
            key = (115, "personal_application", str(row.get("program_code")))
            standard = normalize_sieve_standard(row.get("sieve_result_standard"))
            if standard:
                standards[key] = row
    manual_path = ROOT / "apply115_sieve_manual_corrections.json"
    if manual_path.exists():
        for row in json.load(manual_path.open(encoding="utf-8")):
            key = (115, "personal_application", str(row.get("program_code")))
            standard = normalize_sieve_standard(row.get("sieve_result_standard"))
            if standard:
                standards[key] = row
    return standards


def load_apply_sieve_review():
    review = {}
    for filename in ("apply115_sieve_refined_review.json", "apply115_sieve_manual_review.json"):
        path = ROOT / filename
        if not path.exists():
            continue
        for row in json.load(path.open(encoding="utf-8")):
            key = (115, "personal_application", str(row.get("program_code")))
            review[key] = row
    return review


def load_star_rank_standards():
    path = ROOT / "star_rank_percent_standards.json"
    if not path.exists():
        return {}
    standards = {}
    for row in json.load(path.open(encoding="utf-8")):
        standards[(int(row.get("admission_year") or 0), str(row.get("school_code") or ""))] = row
    return standards


def load_star_admission_results():
    maps = {"by_department": {}, "by_code": {}}
    for path in (ROOT / "star114_admission_standards.json", ROOT / "star115_admission_standards.json"):
        if not path.exists():
            continue
        for row in json.load(path.open(encoding="utf-8")):
            year = int(row.get("admission_year") or 0)
            code = str(row.get("program_code") or "")
            department = clean_text(row.get("department_name"))
            if not year or not code:
                continue
            maps["by_department"][(year, code, department)] = row
            fallback_key = (year, code)
            current = maps["by_code"].get(fallback_key)
            if not current or "【外加】" in clean_text(current.get("department_name")):
                maps["by_code"][fallback_key] = row
    return maps


def load_results():
    results = {}
    for year in (114, 115):
        path = ROOT / f"admissions_{year}_exam_distribution_results.json"
        for row in json.load(path.open(encoding="utf-8")):
            results[f"{year}-{row.get('program_code')}"] = {
                "programCode": clean_text(row.get("program_code")),
                "schoolName": clean_text(row.get("school_name")),
                "departmentName": clean_text(row.get("department_name")),
                "weightedSubjectsCompact": clean_text(row.get("weighted_subjects_compact")),
                "admittedCount": clean_text(row.get("admitted_count_including_extra")),
                "regularMinScore": clean_text(row.get("regular_min_admission_score")),
                "regularTotalScore": clean_text(row.get("regular_total_score") or row.get("regular_min_admission_score")),
                "regularTieBreak": clean_text(row.get("regular_tie_break")),
                "sourceUrl": clean_text(row.get("source_url")),
            }
    return results


def load_groups():
    group_reference = {}
    if GROUP_REFERENCE_PATH.exists():
        for row in json.load(GROUP_REFERENCE_PATH.open(encoding="utf-8")):
            category = clean_text(row.get("category"))
            if not category:
                continue
            group_reference[category] = [
                clean_text(row.get("group1")),
                clean_text(row.get("group2")),
            ]

    path = Path("outputs/uac_115_departments_by_group_category.json")
    raw_rows = json.load(path.open(encoding="utf-8"))
    grouped_rows = {}
    for row in raw_rows:
        source_department_id = clean_text(row.get("source_department_id"))
        school_department_name = clean_text(row.get("school_department_name"))
        key = source_department_id or school_department_name
        grouped_rows.setdefault(key, []).append(row)

    departments = []
    for rows in grouped_rows.values():
        category_name = clean_text(rows[0].get("category_name"))
        preferred_groups = [
            name for name in group_reference.get(category_base_name(category_name), []) if name
        ]

        def sort_key(row):
            group_name = clean_text(row.get("group_name"))
            try:
                group_rank = preferred_groups.index(group_name)
            except ValueError:
                group_rank = 99
            group_id = clean_text(row.get("group_id")) or "999"
            return (
                group_rank,
                group_name == "跨領域",
                group_id.zfill(3),
                clean_text(row.get("school_department_name")),
            )

        rows = sorted(rows, key=sort_key)
        primary = rows[0]
        cross_group_names = []
        for row in rows[1:]:
            group_name = clean_text(row.get("group_name"))
            if group_name and group_name != clean_text(primary.get("group_name")) and group_name not in cross_group_names:
                cross_group_names.append(group_name)

        departments.append(
            {
                "groupId": clean_text(primary.get("group_id")),
                "groupName": clean_text(primary.get("group_name")),
                "categoryId": clean_text(primary.get("category_id")),
                "categoryName": category_name,
                "schoolDepartmentName": clean_text(primary.get("school_department_name")),
                "sourceDepartmentId": clean_text(primary.get("source_department_id")),
                "crossGroupNames": cross_group_names,
            }
        )
    return departments


def main():
    records = load_records()
    results = load_results()
    group_departments = load_groups()

    manifest = {
        "generatedFor": "升學工具網站第一版",
        "recordCount": len(records),
        "resultCount": len(results),
        "applySieveResultCount": sum(1 for r in records if r.get("applySieveResult")),
        "groupDepartmentCount": len(group_departments),
        "datasets": [
            {"year": 115, "channel": "個人申請", "count": sum(1 for r in records if r["year"] == 115 and r["channelKey"] == "personal_application")},
            {"year": 115, "channel": "繁星推薦", "count": sum(1 for r in records if r["year"] == 115 and r["channelKey"] == "star_recommendation")},
            {"year": 115, "channel": "分發入學", "count": sum(1 for r in records if r["year"] == 115 and r["channelKey"] == "exam_distribution")},
            {"year": 114, "channel": "個人申請", "count": sum(1 for r in records if r["year"] == 114 and r["channelKey"] == "personal_application")},
            {"year": 114, "channel": "繁星推薦", "count": sum(1 for r in records if r["year"] == 114 and r["channelKey"] == "star_recommendation")},
            {"year": 114, "channel": "分發入學", "count": sum(1 for r in records if r["year"] == 114 and r["channelKey"] == "exam_distribution")},
        ],
    }

    (SITE_DATA / "admissions_records.json").write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    (SITE_DATA / "distribution_results.json").write_text(json.dumps(results, ensure_ascii=False), encoding="utf-8")
    (SITE_DATA / "group_departments.json").write_text(json.dumps(group_departments, ensure_ascii=False), encoding="utf-8")
    (SITE_DATA / "site_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
