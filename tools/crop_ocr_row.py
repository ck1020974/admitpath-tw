import json
import sys
from pathlib import Path

from PIL import Image, ImageOps


def word_cy(word):
    return word["y"] + word["height"] / 2


def main():
    if len(sys.argv) != 4:
        raise SystemExit("usage: python tools/crop_ocr_row.py <year> <school_code> <program_code>")
    year, school_code, program_code = sys.argv[1:]
    work = Path(f"work/apply{year}_sieve")
    ocr = json.load((work / f"{school_code}.ocr.json").open(encoding="utf-8-sig"))
    image = Image.open(work / f"{school_code}.png")
    code_word = None
    for line in ocr:
        for word in line.get("words", []):
            if word.get("text") == program_code:
                code_word = word
                break
        if code_word:
            break
    if not code_word:
        raise SystemExit(f"program code {program_code} not found")
    cy = word_cy(code_word)
    left = 0
    top = max(0, int(cy - 90))
    right = min(image.width, 1960)
    bottom = min(image.height, int(cy + 90))
    crop = image.crop((left, top, right, bottom))
    crop = crop.resize((crop.width * 2, crop.height * 2))
    crop = ImageOps.autocontrast(ImageOps.grayscale(crop))
    out = Path("outputs/debug_crops")
    out.mkdir(parents=True, exist_ok=True)
    target = out / f"{year}_{program_code}.png"
    crop.save(target)
    print(target)


if __name__ == "__main__":
    main()
