import csv
import json
import re
import argparse
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urljoin

import pdfplumber
from lxml import html


ROOT = Path("outputs/admissions_data")

CONFIGS = {
    114: {
        "base_root": "https://www.cac.edu.tw/CacLink/star114/114staR_reSuLt_Query_d5Z_91d3Ek4z_49wq/html_114_L7d/standard",
        "work": Path("work/star114_standard"),
    },
    115: {
        "base_root": "https://www.cac.edu.tw/CacLink/star115/115starP_reultSK_Query_94feYz1zW_d3Ez/html_115_9wL/standard",
        "work": Path("work/star115_standard"),
    },
}
SOURCE_ORG = "大學甄選入學委員會"


def clean(value):
    value = "" if value is None else str(value)
    value = value.replace("\r", "\n")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{2,}", "\n", value)
    return value.strip()


def split_lines(value):
    text = clean(value)
    if not text or text == "--":
        return []
    return [clean(part) for part in text.split("\n") if clean(part)]


def normalize_score(value):
    text = clean(value)
    if not text or text == "--":
        return ""
    text = text.replace("級分", "").replace("分", "")
    return text.strip()


def normalize_standard(value):
    text = clean(value)
    if not text or text == "--":
        return ""
    return text.replace("級", "").strip() if text in {"A級", "B級", "C級", "F級"} else text


def align(values, length):
    values = list(values)
    if len(values) < length:
        values.extend([""] * (length - len(values)))
    return values[:length]


def fetch_bytes(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.headers.get("Content-Type", ""), response.read()


def source_types(year):
    base_root = CONFIGS[year]["base_root"]
    return {
        "one2seven": {
            "list_url": base_root + "/one2seven/collegeList_1.php",
            "label": "第一類至第七類學群錄取標準",
        },
        "eight": {
            "list_url": base_root + "/eight/collegeList_1.php",
            "label": "第八類學群篩選標準",
        },
    }


def school_links(year, source_type):
    source = source_types(year)[source_type]
    content_type, data = fetch_bytes(source["list_url"])
    page = html.fromstring(data.decode("utf-8", "replace"))
    links = []
    for a in page.xpath("//a[contains(@href,'.pdf')]"):
        href = a.get("href")
        text = "".join(a.xpath(".//text()"))
        match = re.search(r"\((\d{3})\)", text) or re.search(rf"{year}Standard_(\d{{3}})\.pdf", href or "")
        if not match:
            continue
        school = match.group(1)
        links.append(
            {
                "school_code": school,
                "pdf_url": urljoin(source["list_url"], href),
            }
        )
    return links


def download_pdf(year, link, source_type, work):
    school = link["school_code"]
    url = link["pdf_url"]
    suffix = "" if source_type == "one2seven" else f"_{source_type}"
    path = work / f"{year}Standard_{school}{suffix}.pdf"
    if path.exists() and path.stat().st_size > 1000:
        return path, url, "cached"
    try:
        content_type, data = fetch_bytes(url)
        if not data.startswith(b"%PDF"):
            return None, url, f"not_pdf:{content_type}"
        path.write_bytes(data)
        return path, url, "downloaded"
    except urllib.error.HTTPError as exc:
        return None, url, f"http_{exc.code}"
    except Exception as exc:
        return None, url, f"error:{exc.__class__.__name__}"


def parse_requirement(subjects_text, standards_text, scores_text):
    subjects = split_lines(subjects_text)
    standards = align(split_lines(standards_text), len(subjects))
    scores = align(split_lines(scores_text), len(subjects))
    items = []
    for subject, standard, score in zip(subjects, standards, scores):
        if not subject or subject == "--":
            continue
        items.append(
            {
                "subject": subject,
                "standard": normalize_standard(standard),
                "score": normalize_score(score),
            }
        )
    return items


def parse_distribution(items_text, first_text, second_text):
    items = split_lines(items_text)
    first = align(split_lines(first_text), len(items))
    second = align(split_lines(second_text), len(items))
    out = []
    for index, (item, first_standard, second_standard) in enumerate(zip(items, first, second), start=1):
        if not item or item == "--":
            continue
        out.append(
            {
                "rank": index,
                "item": item,
                "firstRoundStandard": normalize_score(first_standard),
                "secondRoundStandard": normalize_score(second_standard),
            }
        )
    return out


def parse_pdf(path, source_url, source_type, year):
    rows_out = []
    with pdfplumber.open(path) as pdf:
        for page_no, page in enumerate(pdf.pages, start=1):
            for table in page.extract_tables() or []:
                for row in table[2:]:
                    cells = [clean(cell) for cell in row]
                    if len(cells) < 15 or not re.fullmatch(r"\d{5}", cells[0] or ""):
                        continue
                    test_items = parse_requirement(cells[4], cells[5], cells[6])
                    art_items = parse_requirement(cells[7], cells[8], cells[9])
                    distribution = parse_distribution(cells[10], cells[12], cells[14])
                    rows_out.append(
                        {
                            "admission_year": year,
                            "program_code": cells[0],
                            "department_name": cells[1],
                            "school_code": cells[0][:3],
                            "quota": cells[2],
                            "total_admitted": cells[3],
                            "test_requirements": test_items,
                            "art_exam_requirements": art_items,
                            "distribution_standards": distribution,
                            "first_round_admitted": cells[11],
                            "second_round_admitted": cells[13],
                            "pdf_page": page_no,
                            "source_url": source_url,
                            "source_organization": SOURCE_ORG,
                            "standard_type": source_type,
                            "standard_type_label": source_types(year)[source_type]["label"],
                        }
                    )
    return rows_out


def write_csv(path, rows):
    fields = [
        "admission_year",
        "school_code",
        "program_code",
        "department_name",
        "quota",
        "total_admitted",
        "first_round_admitted",
        "second_round_admitted",
        "test_requirements",
        "art_exam_requirements",
        "distribution_standards",
        "pdf_page",
        "source_url",
        "source_organization",
        "standard_type",
        "standard_type_label",
    ]
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            item = dict(row)
            for key in ("test_requirements", "art_exam_requirements", "distribution_standards"):
                item[key] = json.dumps(item[key], ensure_ascii=False)
            writer.writerow(item)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, choices=sorted(CONFIGS), default=115)
    args = parser.parse_args()

    year = args.year
    work = CONFIGS[year]["work"]
    work.mkdir(parents=True, exist_ok=True)
    rows = []
    downloads = []
    for source_type in source_types(year):
        links = school_links(year, source_type)
        for link in links:
            path, url, status = download_pdf(year, link, source_type, work)
            downloads.append({"school_code": link["school_code"], "standard_type": source_type, "status": status, "source_url": url})
            if not path:
                continue
            rows.extend(parse_pdf(path, url, source_type, year))

    json_path = ROOT / f"star{year}_admission_standards.json"
    csv_path = ROOT / f"star{year}_admission_standards.csv"
    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(csv_path, rows)
    (ROOT / f"star{year}_admission_standards_downloads.json").write_text(
        json.dumps(downloads, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    summary = {
        "year": year,
        "schools": len(downloads),
        "pdf_ok": sum(1 for row in downloads if row["status"] in {"cached", "downloaded"}),
        "rows": len(rows),
        "download_status": {},
    }
    for row in downloads:
        summary["download_status"][row["status"]] = summary["download_status"].get(row["status"], 0) + 1
    (ROOT / f"star{year}_admission_standards_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
