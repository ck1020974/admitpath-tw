"""Import the MOE 116 special-selection and cybersecurity tables without merging plans."""
import argparse
import hashlib
import json
import re
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]


def compact(value):
    return re.sub(r"\s+", "", value or "")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("general", type=Path)
    parser.add_argument("cybersecurity", type=Path)
    args = parser.parse_args()
    old = json.loads((ROOT / "site/data/special_admissions_115.json").read_text(encoding="utf-8"))
    areas = {compact(r["school"]).replace("台", "臺"): r["area"] for r in old["records"]}
    areas.update({"實踐大學(臺北)": "北", "實踐大學(高雄)": "南", "真理大學(臺北)": "北", "銘傳大學(桃園)": "北", "銘傳大學(臺北)": "北"})
    records, sources = [], []
    for attachment, path, plan, expected in [(1, args.general, "特殊選才", 746), (2, args.cybersecurity, "資安外加", 34)]:
        destination = ROOT / f"site/data/sources/special_admissions_116_attach{attachment}.pdf"
        destination.parent.mkdir(parents=True, exist_ok=True)
        payload = path.read_bytes()
        destination.write_bytes(payload)
        source_url = f"./data/sources/{destination.name}"
        sources.append({"attachment": attachment, "plan": plan, "url": source_url, "sha256": hashlib.sha256(payload).hexdigest()})
        serials = []
        with pdfplumber.open(path) as pdf:
            for page_number, page in enumerate(pdf.pages, 1):
                for table in page.extract_tables():
                    for cells in table:
                        if not cells[0] or not cells[0].isdigit():
                            continue
                        assert len(cells) == (21 if attachment == 1 else 20)
                        serial = int(cells[0])
                        serials.append(serial)
                        school, department = compact(cells[1]), compact(cells[2])
                        dates = {}
                        contact = compact(cells[14])
                        for label, index in [("announcement", 5), ("registrationStart", 7), ("registrationEnd", 8), ("examStart", 10), ("examEnd", 11), ("results", 13)]:
                            value = compact(cells[index])
                            match = re.fullmatch(r"(20\d{2}/\d{1,2}/\d{1,2})(.*)", value)
                            assert match, (attachment, serial, index, value)
                            dates[label] = match[1]
                            # Some contact labels overflow into the results-date column in the PDF.
                            if match[2]:
                                assert index == 13, (attachment, serial, index, value)
                                contact = match[2] + contact
                        tentative = {"registration": compact(cells[6]) == "是", "exam": compact(cells[9]) == "是", "results": compact(cells[12]) == "是"}
                        schedule = [f"【簡章公告（暫定）】{dates['announcement']}"]
                        for key, label, start, end in [("registration", "報名日期", "registrationStart", "registrationEnd"), ("exam", "考試日期", "examStart", "examEnd"), ("results", "放榜日期", "results", "results")]:
                            value = dates[start] if dates[start] == dates[end] else f"{dates[start]} ~ {dates[end]}"
                            schedule.append(f"【{label}{'（暫定）' if tentative[key] else ''}】{value}")
                        target = compact(cells[17])
                        education = compact(cells[18])
                        if education:
                            target += "\n招收不同教育資歷：" + education
                        if attachment == 1 and compact(cells[19]):
                            target += "\n其他說明：" + compact(cells[19])
                        url = compact(cells[16])
                        assert url.startswith(("https://", "http://")), (serial, url)
                        records.append({"id": f"special-116-{'general' if attachment == 1 else 'cybersecurity'}-{serial}", "year": 116, "area": areas[school.replace("台", "臺")], "type": "國立" if school.startswith("國立") else "市立" if school.startswith("臺北市立") else "私立", "school": school, "department": department, "plan": plan, "target": target, "quota": int(compact(cells[3])), "exam": compact(cells[4]), "schedule": "\n".join(schedule), "dates": dates, "tentative": tentative, "contact": f"聯絡人：{contact}\n聯絡電話：{compact(cells[15])}", "url": url, "note": compact(cells[-1]), "sourceUrl": source_url, "sourceAttachment": attachment, "sourcePage": page_number, "sourceSerial": serial, "sourceCells": cells})
        assert serials == list(range(1, expected + 1)), (attachment, serials)
    output = {"year": 116, "source": "教育部116學年度特殊選才及資安外加招生資訊（使用者提供附件）", "retrieved": "2026-10-12", "notice": "各校考試及招生日期以各校公告簡章為準；暫定日期依來源保留。", "sources": sources, "records": records}
    (ROOT / "site/data/special_admissions_116.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({plan: {"records": len(rows := [r for r in records if r['plan'] == plan]), "quota": sum(r['quota'] for r in rows)} for plan in ["特殊選才", "資安外加"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
