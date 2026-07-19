import json
import re
import subprocess
import urllib.request
from pathlib import Path
from urllib.parse import urljoin

from lxml import html


BASE = "https://www.cac.edu.tw/CacLink/apply115/115Apply_sievE_Result_querY_615JG8Wgh9d/html_sieve_result_115_Zx57f1dW/Standard/"
OUT = Path("outputs/admissions_data")
WORK = Path("work/apply115_sieve")
WORK.mkdir(parents=True, exist_ok=True)


def fetch_text(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(request, timeout=30).read().decode("utf-8", "replace")


def fetch_bytes(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(request, timeout=60).read()


def ocr_image(path):
    out_json = path.with_suffix(".ocr.json")
    if out_json.exists():
        return json.load(out_json.open(encoding="utf-8-sig"))
    result = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            "tools/ocr_windows_image.ps1",
            "-ImagePath",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    out_json.write_text(result.stdout, encoding="utf-8")
    return json.loads(result.stdout)


def get_school_links():
    page = html.fromstring(fetch_text(urljoin(BASE, "collegeList.htm")))
    links = []
    for a in page.xpath("//a[contains(@href,'report/')]"):
        href = a.get("href")
        text = "".join(a.xpath(".//text()"))
        match = re.search(r"\((\d{3})\)(.+)", text)
        if not match:
            continue
        links.append(
            {
                "school_code": match.group(1),
                "school_name": match.group(2).strip(),
                "report_url": urljoin(BASE, href),
            }
        )
    return links


def download_school_image(link):
    report = fetch_text(link["report_url"])
    match = re.search(r'<img\s+src="([^"]+)"', report, re.I)
    if not match:
        raise RuntimeError(f"no image in {link['report_url']}")
    image_url = urljoin(link["report_url"], match.group(1))
    path = WORK / f"{link['school_code']}.png"
    if not path.exists():
        path.write_bytes(fetch_bytes(image_url))
    return path, image_url


def all_words(ocr):
    words = []
    for line in ocr:
        for word in line.get("words", []):
            words.append(word)
    return words


def compact(text):
    return re.sub(r"\s+", "", text or "")


def spaced_join(words):
    return " ".join(w["text"] for w in sorted(words, key=lambda w: w["x"]))


def fix_subject_text(text):
    text = re.sub(r"\s+", " ", text or "").strip()
    replacements = {
        "國 文": "國文",
        "英 文": "英文",
        "數 學 A": "數學A",
        "數 學 B": "數學B",
        "自 然": "自然",
        "社 會": "社會",
        "英 聽": "英聽",
        "實 作": "實作",
        "APCS 實作": "APCS實作",
        "目 組 合": "",
        "組 合": "",
        "礻 土 會": "社會",
        "礻土會": "社會",
        "A P C S": "APCS",
    }
    for before, after in replacements.items():
        text = text.replace(before, after)
    text = text.replace("數學 A", "數學A").replace("數學 B", "數學B")
    text = text.replace("( ", "(").replace(" )", ")").replace(" + ", "+")
    return re.sub(r"\s+", " ", text).strip()


def display_subject(label):
    label = fix_subject_text(label)
    return label.replace("數學A", "數A").replace("數學B", "數B")


def extract_thresholds_for_row(words, y):
    # The official page is an image table. Keeping only the same row prevents
    # wrapped text from the previous department from polluting this row's score.
    band = [w for w in words if abs((w["y"] + w["height"] / 2) - y) <= 13 and w["x"] >= 1320]
    text = fix_subject_text(spaced_join(band)).replace("--", "")
    patterns = []
    subject_pattern = r"(國文|英文|數學A|數學B|數A|數B|社會|自然|英聽|APCS實作|\([^)]{2,24}\))"
    for match in re.finditer(subject_pattern + r"\s*([0-9]{1,3}(?:\.[0-9]+)?)", text):
        label = display_subject(match.group(1)).strip(" -")
        score = match.group(2)
        if label:
            patterns.append(f"{label}{score}")

    dedup = []
    seen = set()
    for item in patterns:
        key = compact(item)
        if key not in seen:
            seen.add(key)
            dedup.append(item)
    return "、".join(dedup), text


def parse_school(link):
    image_path, image_url = download_school_image(link)
    ocr = ocr_image(image_path)
    words = all_words(ocr)
    records = []
    for word in words:
        if not re.fullmatch(r"\d{6}", word["text"]):
            continue
        code = word["text"]
        cy = word["y"] + word["height"] / 2
        name_words = [w for w in words if abs((w["y"] + w["height"] / 2) - cy) <= 12 and 185 <= w["x"] <= 590]
        name = compact(spaced_join(name_words))
        threshold, raw = extract_thresholds_for_row(words, cy)
        records.append(
            {
                "admission_year": 115,
                "program_code": code,
                "school_code": link["school_code"],
                "school_name": link["school_name"],
                "department_name_ocr": name,
                "sieve_result_standard": threshold,
                "sieve_result_raw": raw,
                "source_image_url": image_url,
            }
        )
    return records


def main():
    links = get_school_links()
    all_records = []
    errors = []
    for i, link in enumerate(links, start=1):
        try:
            rows = parse_school(link)
            all_records.extend(rows)
            print(f"{i}/{len(links)} {link['school_code']} {len(rows)} rows")
        except Exception as exc:
            errors.append({"school": link, "error": str(exc)})
            print(f"ERR {link['school_code']} {exc}")

    all_records.sort(key=lambda r: r["program_code"])
    (OUT / "apply115_sieve_result_standards.json").write_text(json.dumps(all_records, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "apply115_sieve_result_errors.json").write_text(json.dumps(errors, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"rows": len(all_records), "errors": len(errors)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
