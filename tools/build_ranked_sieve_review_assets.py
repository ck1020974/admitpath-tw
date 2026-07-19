import csv
import json
from pathlib import Path

from PIL import Image, ImageOps


SITE_DATA = Path("site/data")
CROP_DIR = Path("site/review_crops")
CROP_DIR.mkdir(parents=True, exist_ok=True)

BASE_IMAGE_BY_YEAR = {
    115: "https://www.cac.edu.tw/CacLink/apply115/115Apply_sievE_Result_querY_615JG8Wgh9d/html_sieve_result_115_Zx57f1dW/Standard/report/pict/",
    114: "https://www.cac.edu.tw/cacportal/apply_his_report/114/114_sieve_standard/report/pict/",
}


def load_json(path):
    return json.load(open(path, encoding="utf-8-sig"))


def all_words(ocr):
    words = []
    for line in ocr:
        words.extend(line.get("words", []))
    return words


def word_cy(word):
    return word["y"] + word["height"] / 2


def make_crop(image_path, code_word, out_path):
    image = Image.open(image_path)
    cy = word_cy(code_word)
    left = 0
    top = max(0, int(cy - 66))
    right = min(image.width, 1960)
    bottom = min(image.height, int(cy + 66))
    crop = image.crop((left, top, right, bottom))
    crop = crop.resize((crop.width * 2, crop.height * 2))
    crop = ImageOps.autocontrast(ImageOps.grayscale(crop))
    crop.save(out_path)


def ranked_text(items, only_missing=False):
    rows = []
    for item in items or []:
        if only_missing and item.get("score"):
            continue
        if not only_missing and not item.get("score"):
            continue
        subjects = "+".join(item.get("subjects") or [])
        if not subjects:
            continue
        rows.append(f"{subjects} {item.get('score')}".strip())
    return "、".join(rows)


def write_missing_csv(rows):
    out = Path("outputs/admissions_data/comparison_reports/apply_ranked_sieve_missing_scores.csv")
    out.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "year",
        "programCode",
        "schoolName",
        "departmentName",
        "officialResult",
        "missingRanks",
        "ocrRaw",
        "sourceImageUrl",
        "detailUrl",
    ]
    with out.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows({field: row.get(field, "") for field in fields} for row in rows)


def load_university_tw_compare():
    path = Path("outputs/admissions_data/comparison_reports/ranked_sieve_university_tw_compare.json")
    if not path.exists():
        return {}
    rows = json.load(path.open(encoding="utf-8"))
    return {(int(row.get("year") or 0), str(row.get("programCode"))): row for row in rows}


def main():
    records = load_json("site/data/admissions_records.json")
    compare_map = load_university_tw_compare()
    ocr_cache = {}
    review_rows = []
    csv_rows = []

    for record in records:
        if record.get("channelKey") != "personal_application":
            continue
        result = record.get("applySieveResult") or {}
        ranked = result.get("rankedItems") or []
        missing = [item for item in ranked if not item.get("score")]
        if not result.get("sieveResultStandard") or not missing:
            continue

        year = int(record.get("year") or 0)
        code = record.get("programCode") or ""
        school_code = record.get("schoolCode") or code[:3]
        work = Path(f"work/apply{year}_sieve")
        image_path = work / f"{school_code}.png"
        ocr_path = work / f"{school_code}.ocr.json"
        crop_name = ""
        located = False

        if image_path.exists() and ocr_path.exists():
            cache_key = (year, school_code)
            if cache_key not in ocr_cache:
                ocr_cache[cache_key] = all_words(load_json(ocr_path))
            code_words = [word for word in ocr_cache[cache_key] if word.get("text") == code]
            if code_words:
                located = True
                crop_name = f"ranked_{year}_{code}.png"
                make_crop(image_path, code_words[0], CROP_DIR / crop_name)

        official_image = result.get("sourceImageUrl") or f"{BASE_IMAGE_BY_YEAR.get(year, '')}{school_code}.png"
        compare = compare_map.get((year, code), {})
        row = {
            "index": len(review_rows) + 1,
            "year": year,
            "programCode": code,
            "schoolCode": school_code,
            "schoolName": record.get("schoolName", ""),
            "departmentName": record.get("departmentName", ""),
            "officialResult": result.get("sieveResultStandard", ""),
            "rankedKnown": ranked_text(ranked),
            "missingRanks": ranked_text(ranked, only_missing=True),
            "rankedItems": ranked,
            "ocrRaw": result.get("sieveResultRaw", ""),
            "detailUrl": record.get("detailUrl", ""),
            "cropImage": f"./review_crops/{crop_name}" if crop_name else "",
            "officialImageUrl": official_image,
            "locatedInOcr": located,
            "externalStatus": compare.get("status", ""),
            "universityTwResult": compare.get("universityTwResult", ""),
            "suggestedFill": compare.get("suggestedFill", ""),
            "externalConflicts": compare.get("conflicts", ""),
            "universityTwUrl": compare.get("universityTwUrl", ""),
        }
        review_rows.append(row)
        csv_rows.append(
            {
                "year": year,
                "programCode": code,
                "schoolName": row["schoolName"],
                "departmentName": row["departmentName"],
                "officialResult": row["officialResult"],
                "missingRanks": row["missingRanks"],
                "ocrRaw": row["ocrRaw"],
                "sourceImageUrl": official_image,
                "detailUrl": row["detailUrl"],
            }
        )

    SITE_DATA.mkdir(parents=True, exist_ok=True)
    (SITE_DATA / "review_ranked_sieve_missing.json").write_text(
        json.dumps(review_rows, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    write_missing_csv(csv_rows)
    print(json.dumps({"rows": len(review_rows), "crops": sum(1 for row in review_rows if row["cropImage"])}), flush=True)


if __name__ == "__main__":
    main()
