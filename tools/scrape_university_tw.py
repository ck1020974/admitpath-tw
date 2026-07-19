import json
import re
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urljoin

from lxml import html


BASE = "https://university-tw.ldkrsi.men"
OUT = Path("outputs/admissions_data")
WORK = Path("work/university_tw")
WORK.mkdir(parents=True, exist_ok=True)


def fetch(path):
    url = urljoin(BASE, path)
    cache_name = re.sub(r"[^0-9A-Za-z_-]+", "_", path.strip("/") or "index") + ".html"
    cache_path = WORK / cache_name
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8")
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(3):
        try:
            data = urllib.request.urlopen(request, timeout=30).read().decode("utf-8", "replace")
            cache_path.write_text(data, encoding="utf-8")
            return data
        except (urllib.error.URLError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(1.5 * (attempt + 1))
    return ""


def clean(text):
    return re.sub(r"\s+", " ", text or "").strip()


def table_matrix(table):
    rows = []
    for tr in table.xpath(".//tr"):
        cells = [clean("".join(cell.xpath(".//text()"))) for cell in tr.xpath("./th|./td")]
        if cells:
            rows.append(cells)
    return rows


def table_year_map(rows):
    if len(rows) < 2:
        return {}
    headers = rows[0][1:]
    data = {}
    for row in rows[1:]:
        if not row:
            continue
        year = row[0].replace("年", "")
        data[year] = {header: value for header, value in zip(headers, row[1:])}
    return data


def parse_detail(channel, school_code, program_code, path):
    page = html.fromstring(fetch(path))
    title = clean("".join(page.xpath("//title/text()")))
    h1 = clean("".join(page.xpath("//h1/text()")))
    body = clean("".join(page.xpath("//main//text()") or page.xpath("//body//text()")))
    tables = [table_matrix(table) for table in page.xpath("//table")]
    record = {
        "channel": channel,
        "school_code": school_code,
        "program_code": program_code,
        "path": path,
        "url": urljoin(BASE, path),
        "title": title,
        "heading": h1,
        "tables": tables,
        "body_text": body,
    }
    if channel == "caac":
        if len(tables) >= 1:
            record["test_requirements_by_year"] = table_year_map(tables[0])
        if len(tables) >= 2:
            record["screening_multipliers_by_year"] = table_year_map(tables[1])
        if len(tables) >= 3:
            record["screening_result_rows"] = tables[2]
    elif channel == "star":
        if len(tables) >= 1:
            record["test_requirements_by_year"] = table_year_map(tables[0])
        if len(tables) >= 2:
            record["distribution_order_by_year"] = table_year_map(tables[1])
        if len(tables) >= 3:
            record["result_rows"] = tables[2]
        match = re.search(r"在校總學業成績前([0-9]+%)", body)
        if match:
            record["rank_percentile"] = f"前{match.group(1)}"
    return record


def school_links(channel):
    root = f"/{channel}/"
    page = html.fromstring(fetch(root))
    links = []
    for a in page.xpath("//a[@href]"):
        href = a.get("href", "")
        text = clean("".join(a.xpath(".//text()")))
        if re.fullmatch(r"j?\d{3}/?", href):
            code = href.strip("/")
            links.append({"school_code": code, "school_name": text, "path": urljoin(root, href)})
    return links


def program_links(channel):
    programs = []
    errors = []
    pattern = re.compile(rf"^/{channel}/([^/]+)/(\d{{5,6}})$")
    for school in school_links(channel):
        try:
            page = html.fromstring(fetch(school["path"]))
            title = clean("".join(page.xpath("//title/text()")))
            for a in page.xpath("//a[@href]"):
                href = a.get("href", "")
                match = pattern.fullmatch(href)
                if not match:
                    continue
                programs.append(
                    {
                        "channel": channel,
                        "school_code": match.group(1),
                        "school_name": school["school_name"],
                        "school_page_title": title,
                        "program_code": match.group(2),
                        "department_name": clean("".join(a.xpath(".//text()"))),
                        "path": href,
                        "url": urljoin(BASE, href),
                    }
                )
        except Exception as exc:
            errors.append({"channel": channel, "school": school, "error": str(exc)})
    return programs, errors


def enrich_details(programs, max_workers=12):
    enriched = []
    errors = []
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        future_map = {
            pool.submit(parse_detail, p["channel"], p["school_code"], p["program_code"], p["path"]): p
            for p in programs
        }
        for i, future in enumerate(as_completed(future_map), start=1):
            program = future_map[future]
            try:
                detail = future.result()
                enriched.append({**program, "detail": detail})
            except Exception as exc:
                errors.append({"program": program, "error": str(exc)})
            if i % 250 == 0:
                print(f"details {i}/{len(programs)}")
    enriched.sort(key=lambda row: (row["channel"], row["program_code"]))
    return enriched, errors


def main():
    all_records = []
    all_errors = []
    for channel in ["caac", "star"]:
        programs, errors = program_links(channel)
        print(channel, "programs", len(programs), "school errors", len(errors))
        enriched, detail_errors = enrich_details(programs)
        all_records.extend(enriched)
        all_errors.extend(errors)
        all_errors.extend(detail_errors)

    (OUT / "university_tw_records.json").write_text(json.dumps(all_records, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "university_tw_errors.json").write_text(json.dumps(all_errors, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"records": len(all_records), "errors": len(all_errors)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
