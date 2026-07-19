import argparse
import json
import re
import subprocess
import urllib.request
from pathlib import Path
from urllib.parse import urljoin

from lxml import html


OUT = Path("outputs/admissions_data")


BASE_BY_YEAR = {
    114: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/",
    115: "https://www.cac.edu.tw/CacLink/apply115/115Apply_sievE_Result_querY_615JG8Wgh9d/html_sieve_result_115_Zx57f1dW/Standard/",
}

WORK_BY_YEAR = {
    114: Path("work/apply114_sieve_caclink"),
    115: Path("work/apply115_sieve"),
}


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


def clean_spaces(value):
    return re.sub(r"\s+", " ", value or "").strip()


def compact(value):
    return re.sub(r"\s+", "", value or "")


def spaced_join(words):
    return " ".join(w["text"] for w in sorted(words, key=lambda w: w["x"]))


def get_school_links(base):
    page = html.fromstring(fetch_text(urljoin(base, "collegeList.htm")))
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
                "school_name": clean_spaces(match.group(2)),
                "report_url": urljoin(base, href),
            }
        )
    return links


def download_school_image(link, work):
    report = fetch_text(link["report_url"])
    match = re.search(r'<img\s+src="([^"]+)"', report, re.I)
    if not match:
        raise RuntimeError(f"no image in {link['report_url']}")
    image_url = urljoin(link["report_url"], match.group(1))
    path = work / f"{link['school_code']}.png"
    if not path.exists():
        path.write_bytes(fetch_bytes(image_url))
    return path, image_url


def all_words(ocr):
    words = []
    for line in ocr:
        words.extend(line.get("words", []))
    return words


def fix_subject_text(text):
    text = clean_spaces(text)
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
        "＋": "+",
        "÷": "+",
        "／": "+",
        "/": "+",
        "芵 文": "英文",
        "芵文": "英文",
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
    text = re.sub(r"\s*\+\s*", "+", text)
    return clean_spaces(text)


def display_subject(label):
    label = fix_subject_text(label)
    return label.replace("數學A", "數A").replace("數學B", "數B")


def extract_thresholds_for_row(words, y):
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
    return normalize_standard_display("、".join(dedup)), text


def normalize_standard_display(text):
    text = text.replace("÷", "+").replace("＋", "+").replace("／", "+").replace("/", "+")
    text = text.replace("芵 文", "英文").replace("芵文", "英文")
    text = text.replace("數學A", "數A").replace("數學B", "數B")
    text = re.sub(r"\s*([()+、])\s*", r"\1", text)
    text = re.sub(r"\s*\+\s*", "+", text)
    text = text.replace("(然", "(自然").replace("+然", "+自然")
    text = re.sub(r"(?<!自)然\)", "自然)", text)
    return text.strip()


def parse_school(link, year, work):
    image_path, image_url = download_school_image(link, work)
    ocr = ocr_image(image_path)
    words = all_words(ocr)
    records = []
    for word in words:
        if not re.fullmatch(r"\d{6}", word["text"]):
            continue
        code = word["text"]
        cy = word["y"] + word["height"] / 2
        name_words = [w for w in words if abs((w["y"] + w["height"] / 2) - cy) <= 12 and 185 <= w["x"] <= 590]
        threshold, raw = extract_thresholds_for_row(words, cy)
        records.append(
            {
                "admission_year": year,
                "program_code": code,
                "school_code": link["school_code"],
                "school_name": link["school_name"],
                "department_name_ocr": compact(spaced_join(name_words)),
                "sieve_result_standard": threshold,
                "sieve_result_raw": raw,
                "source_image_url": image_url,
            }
        )
    return records


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, choices=sorted(BASE_BY_YEAR), required=True)
    args = parser.parse_args()

    base = BASE_BY_YEAR[args.year]
    work = WORK_BY_YEAR.get(args.year, Path(f"work/apply{args.year}_sieve"))
    work.mkdir(parents=True, exist_ok=True)
    links = get_school_links(base)
    all_records = []
    errors = []
    for i, link in enumerate(links, start=1):
        try:
            rows = parse_school(link, args.year, work)
            all_records.extend(rows)
            print(f"{i}/{len(links)} {link['school_code']} {len(rows)} rows")
        except Exception as exc:
            errors.append({"school": link, "error": str(exc)})
            print(f"ERR {link['school_code']} {exc}")

    all_records.sort(key=lambda r: r["program_code"])
    (OUT / f"apply{args.year}_sieve_result_standards.json").write_text(json.dumps(all_records, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / f"apply{args.year}_sieve_result_errors.json").write_text(json.dumps(errors, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"year": args.year, "rows": len(all_records), "errors": len(errors)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
