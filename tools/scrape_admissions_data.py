import csv
import html
import json
import re
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen


OUT_DIR = Path("outputs/admissions_data")
OUT_DIR.mkdir(parents=True, exist_ok=True)


CAC_DATASETS = [
    {
        "year": 115,
        "channel": "personal_application",
        "channel_zh": "個人申請",
        "system_url": "https://www.cac.edu.tw/apply115/system/ColQry_115xappLyfOrStu_Azd5gP29/",
        "total_url": "https://www.cac.edu.tw/apply115/system/ColQry_115xappLyfOrStu_Azd5gP29/TotalGsdShow.htm",
        "source_organization": "大學甄選入學委員會",
    },
    {
        "year": 115,
        "channel": "star_recommendation",
        "channel_zh": "繁星推薦",
        "system_url": "https://www.cac.edu.tw/star115/system/ColQry_115xStarFoRstU_BT65fwZ9z/",
        "total_url": "https://www.cac.edu.tw/star115/system/ColQry_115xStarFoRstU_BT65fwZ9z/TotalGsdShow.htm",
        "source_organization": "大學甄選入學委員會",
    },
    {
        "year": 114,
        "channel": "personal_application",
        "channel_zh": "個人申請",
        "system_url": "https://www.cac.edu.tw/apply114/system/ColQry_114applyXForStu_Fd87eO2q/",
        "total_url": "https://www.cac.edu.tw/apply114/system/ColQry_114applyXForStu_Fd87eO2q/TotalGsdShow.htm",
        "source_organization": "大學甄選入學委員會",
    },
    {
        "year": 114,
        "channel": "star_recommendation",
        "channel_zh": "繁星推薦",
        "system_url": "https://www.cac.edu.tw/star114/system/ColQry_114starForStu_4wSdO6dz/",
        "total_url": "https://www.cac.edu.tw/star114/system/ColQry_114starForStu_4wSdO6dz/TotalGsdShow.htm",
        "source_organization": "大學甄選入學委員會",
    },
]


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self._href = None
        self._buf = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            attr = dict(attrs)
            self._href = attr.get("href")
            self._buf = []

    def handle_data(self, data):
        if self._href is not None:
            self._buf.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.links.append((self._href, clean_text("".join(self._buf))))
            self._href = None
            self._buf = []


class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self._row = None
        self._cell = None
        self._link = None

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        attr = dict(attrs)
        if tag == "tr":
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self._cell = {"title": attr.get("title", ""), "text": "", "links": []}
        elif tag == "a" and self._cell is not None:
            self._link = attr.get("href")
            if self._link:
                self._cell["links"].append(self._link)
        elif tag == "br" and self._cell is not None:
            self._cell["text"] += "\n"

    def handle_data(self, data):
        if self._cell is not None:
            self._cell["text"] += data

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in ("td", "th") and self._cell is not None:
            self._cell["text"] = clean_text(self._cell["text"])
            self._row.append(self._cell)
            self._cell = None
        elif tag == "tr" and self._row is not None:
            if self._row:
                self.rows.append(self._row)
            self._row = None
        elif tag == "a":
            self._link = None


def clean_text(text):
    text = html.unescape(text or "")
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    return text.strip()


def fetch_text(url, referer=None, retries=4):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.7",
    }
    if referer:
        headers["Referer"] = referer
    last_error = None
    for attempt in range(retries):
        try:
            req = Request(url, headers=headers)
            with urlopen(req, timeout=30) as resp:
                data = resp.read()
                charset = resp.headers.get_content_charset() or "utf-8"
                text = data.decode(charset, errors="replace")
                if "流量過大" in text and attempt < retries - 1:
                    time.sleep(2 + attempt)
                    continue
                return text
        except Exception as exc:
            last_error = exc
            time.sleep(1 + attempt)
    raise RuntimeError(f"failed to fetch {url}: {last_error}")


def parse_school_links(dataset):
    text = fetch_text(dataset["total_url"], referer=dataset["total_url"])
    parser = LinkParser()
    parser.feed(text)
    schools = []
    for href, label in parser.links:
        if "ShowSchGsd.php" not in href or "colno=" not in href:
            continue
        m_code = re.search(r"colno=([0-9A-Za-z]+)", href)
        if not m_code:
            continue
        school_code = m_code.group(1)
        name = re.sub(r"^\(?[0-9A-Za-z]+\)?", "", label)
        name = re.sub(r"[-－]\s*\d+\s*校系.*$", "", name).strip()
        count_match = re.search(r"[-－]\s*(\d+)\s*校系", label)
        schools.append(
            {
                "school_code": school_code,
                "school_name": name,
                "listed_program_count": int(count_match.group(1)) if count_match else None,
                "url": urljoin(dataset["system_url"], href),
            }
        )
    return schools


def split_program_cell(text, school_name):
    compact = clean_text(text).replace("\n", " ")
    m_code = re.search(r"[（(]\s*([0-9A-Za-z]{3,})\s*[)）]", compact)
    program_code = m_code.group(1) if m_code else ""
    without_code = re.sub(r"[（(]\s*[0-9A-Za-z]{3,}\s*[)）]", "", compact).strip()
    dept = without_code
    if school_name and dept.startswith(school_name):
        dept = dept[len(school_name):].strip()
    return program_code, dept


def parse_school_rows(dataset, school):
    text = fetch_text(school["url"], referer=dataset["total_url"])
    parser = TableParser()
    parser.feed(text)
    rows = []
    for cells in parser.rows:
        if not cells:
            continue
        first_title = cells[0]["title"]
        first_text = cells[0]["text"]
        if "校系" not in first_title and not re.search(r"[（(]\s*[0-9A-Za-z]{3,}\s*[)）]", first_text):
            continue
        program_code, department_name = split_program_cell(first_text, school["school_name"])
        if not program_code:
            continue
        record = {
            "admission_year": dataset["year"],
            "admission_channel": dataset["channel_zh"],
            "admission_channel_key": dataset["channel"],
            "data_type": "招生校系分則索引",
            "source_organization": dataset["source_organization"],
            "source_total_url": dataset["total_url"],
            "source_school_url": school["url"],
            "school_code": school["school_code"],
            "school_name": school["school_name"],
            "program_code": program_code,
            "department_name": department_name,
            "detail_url": "",
            "raw_fields": {},
        }
        for idx, cell in enumerate(cells[1:], start=1):
            key = cell["title"] or f"欄位{idx}"
            record["raw_fields"][key] = cell["text"]
            if cell["links"] and not record["detail_url"]:
                record["detail_url"] = urljoin(dataset["system_url"], cell["links"][0])
        rows.append(record)
    return rows


def flatten_record(record):
    flat = {k: v for k, v in record.items() if k != "raw_fields"}
    mapping = {
        "招生名額": "quota",
        "性別要求": "gender_requirement",
        "預計甄試人數": "expected_second_stage_count",
        "原住民外加名額": "indigenous_extra_quota",
        "離島外加名額": "offshore_extra_quota",
        "願景計畫外加名額": "vision_plan_extra_quota",
        "指定項目甄試費": "screening_fee",
        "指定項目甄試日期": "screening_date",
        "類別": "category",
        "是否要參加術科考試": "requires_arts_exam",
        "是否有扶弱措施": "has_support_measure",
        "學群": "star_group",
        "在校學業成績全校排名百分比標準": "school_rank_percentile_standard",
    }
    for zh, en in mapping.items():
        if zh in record["raw_fields"]:
            flat[en] = record["raw_fields"][zh]
    flat["raw_fields_json"] = json.dumps(record["raw_fields"], ensure_ascii=False)
    return flat


def write_records(dataset, records):
    stem = f"admissions_{dataset['year']}_{dataset['channel']}_index"
    json_path = OUT_DIR / f"{stem}.json"
    csv_path = OUT_DIR / f"{stem}.csv"
    with json_path.open("w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    flat = [flatten_record(r) for r in records]
    fieldnames = sorted({k for row in flat for k in row.keys()})
    preferred = [
        "admission_year",
        "admission_channel",
        "school_code",
        "school_name",
        "program_code",
        "department_name",
        "quota",
        "star_group",
        "category",
        "detail_url",
        "source_school_url",
        "raw_fields_json",
    ]
    fieldnames = [f for f in preferred if f in fieldnames] + [f for f in fieldnames if f not in preferred]
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(flat)
    return {"json": str(json_path), "csv": str(csv_path), "count": len(records)}


def scrape_cac():
    outputs = []
    for dataset in CAC_DATASETS:
        schools = parse_school_links(dataset)
        records = []
        errors = []
        for i, school in enumerate(schools, start=1):
            try:
                records.extend(parse_school_rows(dataset, school))
            except Exception as exc:
                errors.append({"school": school, "error": str(exc)})
            time.sleep(0.2)
            if i % 20 == 0:
                print(f"{dataset['year']} {dataset['channel_zh']}: {i}/{len(schools)} schools, {len(records)} rows")
        out = write_records(dataset, records)
        out.update({"year": dataset["year"], "channel": dataset["channel_zh"], "schools": len(schools), "errors": len(errors)})
        outputs.append(out)
        with (OUT_DIR / f"admissions_{dataset['year']}_{dataset['channel']}_errors.json").open("w", encoding="utf-8") as f:
            json.dump(errors, f, ensure_ascii=False, indent=2)
        print(f"done {dataset['year']} {dataset['channel_zh']}: {len(records)} rows, {len(errors)} errors")
    return outputs


if __name__ == "__main__":
    summary = scrape_cac()
    with (OUT_DIR / "cac_scrape_summary.json").open("w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
