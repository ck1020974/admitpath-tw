import csv
import json
import re
from pathlib import Path

from prepare_site_data import infer_sieve_standard_from_raw, normalize_sieve_standard


ROOT = Path("outputs/admissions_data")
WORK = Path("work/apply115_sieve")
REPORT = ROOT / "comparison_reports"


SPECIAL_KEYWORDS = [
    "音樂",
    "美術",
    "設計",
    "體育",
    "運動",
    "表演",
    "舞蹈",
    "劇場",
    "主修",
    "彩繪",
    "創意",
    "素描",
    "術科",
]


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def compact(value):
    return re.sub(r"\s+", "", str(value or ""))


def load_json(path):
    return json.load(open(path, encoding="utf-8-sig"))


def all_words(ocr):
    words = []
    for line in ocr:
        for word in line.get("words", []):
            words.append(word)
    return words


def word_cy(word):
    return word["y"] + word["height"] / 2


def row_band_text(words, code_word):
    cy = word_cy(code_word)
    row_words = [
        w for w in words
        if 1280 <= w["x"] <= 1840 and cy - 36 <= word_cy(w) <= cy + 36
    ]
    row_words.sort(key=lambda w: (round(word_cy(w) / 8) * 8, w["x"]))
    return " ".join(w["text"] for w in row_words)


def normalize_ocr_text(value):
    text = clean(value)
    replacements = {
        "÷": "+",
        "＋": "+",
        "／": "+",
        "/": "+",
        "國 文": "國文",
        "英 文": "英文",
        "數 學 A": "數A",
        "數 學 B": "數B",
        "數 學": "數",
        "自 然": "自然",
        "社 會": "社會",
        "芵 文": "英文",
        "礻 土 會": "社會",
        "A P C S": "APCS",
        "APCS 實 作": "APCS實作",
    }
    for before, after in replacements.items():
        text = text.replace(before, after)
    text = re.sub(r"\s*([()+、])\s*", r"\1", text)
    text = re.sub(r"\s*\+\s*", "+", text)
    text = re.sub(r"數\s*A", "數A", text)
    text = re.sub(r"數\s*B", "數B", text)
    text = text.replace("+然", "+自然").replace("(然", "(自然")
    text = re.sub(r"(?<!自)然\)", "自然)", text)
    return text


def expand_subject(token):
    token = compact(token)
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
        "APCS實作": "APCS實作",
    }.get(token, "")


def parse_refined_standard(raw):
    text = normalize_ocr_text(raw)
    found = []

    for match in re.finditer(r"\(([^)]{2,40})\)\s*([1-5]?\d)", text):
        score = int(match.group(2))
        if not 6 <= score <= 60:
            continue
        subjects = []
        for token in re.split(r"\+", match.group(1)):
            subject = expand_subject(token)
            if subject and subject not in subjects:
                subjects.append(subject)
        if len(subjects) >= 2:
            found.append(f"({'+'.join(subjects)}){match.group(2)}")

    if not found and ("(" in text or ")" in text):
        subjects = subjects_from_noisy_text(text)
        scores = [
            int(token) for token in re.findall(r"(?<!\d)([1-5]?\d)(?!\d)", text)
            if 6 <= int(token) <= 60
        ]
        if len(subjects) >= 2 and scores:
            found.append(f"({'+'.join(subjects)}){scores[-1]}")

    spaced = re.sub(r"([國英社自])", r" \1 ", text)
    spaced = re.sub(r"(數A|數B|國文|英文|社會|自然|APCS實作)", r" \1 ", spaced)
    tokens = [token for token in re.split(r"[\s+()、]+", spaced) if token]
    subjects = []
    for token in tokens:
        subject = expand_subject(token)
        if subject:
            if subject not in subjects:
                subjects.append(subject)
            continue
        if re.fullmatch(r"\d+(?:\.\d+)?", token):
            score = float(token)
            if len(subjects) >= 2 and 6 <= score <= 60 and not token.endswith(".5"):
                found.append(f"({'+'.join(subjects)}){token}")
            subjects = []

    dedup = []
    seen = set()
    for item in found:
        if item not in seen:
            seen.add(item)
            dedup.append(item)
    return "、".join(dedup), text


def subjects_from_noisy_text(text):
    text = text.replace("數學", "數 學")
    raw_tokens = [token for token in re.split(r"[\s+()、]+", text) if token]
    subjects = []
    i = 0
    while i < len(raw_tokens):
        token = raw_tokens[i]
        subject = expand_subject(token)
        if subject:
            if subject not in subjects:
                subjects.append(subject)
            i += 1
            continue
        if token in {"數", "數學"}:
            lookahead = "".join(raw_tokens[i + 1:i + 5])
            subject = "數A" if "A" in lookahead else "數B" if "B" in lookahead else ""
            if subject and subject not in subjects:
                subjects.append(subject)
            i += 1
            continue
        i += 1
    return subjects


def classify(row, raw, standard, code_found):
    dept = row["departmentName"]
    if standard:
        return "refined_success"
    if any(keyword in dept or keyword in raw for keyword in SPECIAL_KEYWORDS):
        return "special_result"
    if not code_found:
        return "code_not_found_in_ocr"
    if not raw.strip():
        return "official_blank_or_ocr_blank"
    if "(" in raw and ")" not in raw:
        return "incomplete_combined_text"
    return "manual_review"


def main():
    records = load_json("site/data/admissions_records.json")
    base_rows = load_json(ROOT / "apply115_sieve_result_standards.json")
    base_resolved = set()
    for row in base_rows:
        standard = normalize_sieve_standard(row.get("sieve_result_standard")) or infer_sieve_standard_from_raw(row.get("sieve_result_raw"))
        if standard:
            base_resolved.add(str(row.get("program_code")))
    pending_rows = [
        row for row in records
        if row["year"] == 115 and row["channelKey"] == "personal_application" and row["programCode"] not in base_resolved
    ]

    ocr_cache = {}
    refined = []
    review = []
    for row in pending_rows:
        school_code = row["schoolCode"]
        if school_code not in ocr_cache:
            path = WORK / f"{school_code}.ocr.json"
            ocr_cache[school_code] = all_words(load_json(path)) if path.exists() else []
        words = ocr_cache[school_code]
        code_words = [w for w in words if w.get("text") == row["programCode"]]
        raw = ""
        standard = ""
        if code_words:
            raw = row_band_text(words, code_words[0])
            standard, normalized = parse_refined_standard(raw)
        else:
            normalized = ""
        status = classify(row, raw, standard, bool(code_words))
        item = {
            "admission_year": 115,
            "program_code": row["programCode"],
            "school_code": school_code,
            "school_name": row["schoolName"],
            "department_name": row["departmentName"],
            "sieve_result_standard": standard,
            "sieve_result_raw": raw,
            "sieve_result_normalized": normalized,
            "refine_status": status,
        }
        if standard:
            refined.append(item)
        else:
            review.append(item)

    refined.sort(key=lambda r: r["program_code"])
    review.sort(key=lambda r: (r["refine_status"], r["program_code"]))
    (ROOT / "apply115_sieve_refined_results.json").write_text(json.dumps(refined, ensure_ascii=False, indent=2), encoding="utf-8")
    (ROOT / "apply115_sieve_refined_review.json").write_text(json.dumps(review, ensure_ascii=False, indent=2), encoding="utf-8")

    csv_path = REPORT / "115_apply_sieve_refined_review.csv"
    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        fields = ["program_code", "school_name", "department_name", "refine_status", "sieve_result_raw", "sieve_result_normalized"]
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows({field: row.get(field, "") for field in fields} for row in review)

    counts = {}
    for row in refined + review:
        counts[row["refine_status"]] = counts.get(row["refine_status"], 0) + 1
    print(json.dumps({"refined": len(refined), "review": len(review), "counts": counts}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
