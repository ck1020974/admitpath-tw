import csv
import json
import re
from pathlib import Path

from PIL import Image, ImageOps


BASE_IMAGE_URL = "https://www.cac.edu.tw/CacLink/apply115/115Apply_sievE_Result_querY_615JG8Wgh9d/html_sieve_result_115_Zx57f1dW/Standard/report/pict/"
WORK = Path("work/apply115_sieve")
SITE_DATA = Path("site/data")
CROP_DIR = Path("site/review_crops")
CROP_DIR.mkdir(parents=True, exist_ok=True)


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
    top = max(0, int(cy - 58))
    right = min(image.width, 1900)
    bottom = min(image.height, int(cy + 58))
    crop = image.crop((left, top, right, bottom))
    crop = crop.resize((crop.width * 2, crop.height * 2))
    gray = ImageOps.grayscale(crop)
    # A high contrast copy improves readability while keeping the original row layout.
    crop = ImageOps.autocontrast(gray)
    crop.save(out_path)


def review_label(row):
    if row.get("status") == "official_blank_or_ocr_blank":
        return "官方未列最低級分"
    return row.get("label", "")


def main():
    records = load_json("site/data/admissions_records.json")
    record_by_code = {
        row["programCode"]: row
        for row in records
        if row["year"] == 115 and row["channelKey"] == "personal_application"
    }
    pending_rows = list(csv.DictReader(open("outputs/admissions_data/comparison_reports/115_apply_sieve_pending_review.csv", encoding="utf-8-sig")))

    ocr_cache = {}
    review = []
    for idx, row in enumerate(pending_rows, start=1):
        code = row["programCode"]
        record = record_by_code.get(code, {})
        school_code = record.get("schoolCode") or code[:3]
        image_path = WORK / f"{school_code}.png"
        ocr_path = WORK / f"{school_code}.ocr.json"
        crop_name = ""
        located = False

        if image_path.exists() and ocr_path.exists():
            if school_code not in ocr_cache:
                ocr_cache[school_code] = all_words(load_json(ocr_path))
            code_words = [word for word in ocr_cache[school_code] if word.get("text") == code]
            if code_words:
                located = True
                crop_name = f"{code}.png"
                make_crop(image_path, code_words[0], CROP_DIR / crop_name)

        review.append(
            {
                "index": idx,
                "programCode": code,
                "schoolCode": school_code,
                "schoolName": row["schoolName"],
                "departmentName": row["departmentName"],
                "status": row.get("status", ""),
                "label": review_label(row),
                "ocrRaw": row.get("ocrRaw", ""),
                "normalized": row.get("normalized", ""),
                "detailUrl": row.get("detailUrl", ""),
                "cropImage": f"./review_crops/{crop_name}" if crop_name else "",
                "officialImageUrl": f"{BASE_IMAGE_URL}{school_code}.png",
                "locatedInOcr": located,
            }
        )

    SITE_DATA.mkdir(parents=True, exist_ok=True)
    (SITE_DATA / "review_pending_115_apply.json").write_text(json.dumps(review, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"rows": len(review), "crops": sum(1 for row in review if row["cropImage"])}), flush=True)


if __name__ == "__main__":
    main()
