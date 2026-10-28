"""Read the supplied roster into private local data. Never write into site/."""
import argparse
from collections import Counter
import json
from pathlib import Path
import re
import uuid

import openpyxl


def cell_text(cell):
    value = cell.value
    if value is None:
        return ""
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if not float(value).is_integer():
            raise ValueError("Identifier contains a non-integer number")
        text = str(int(value))
        if re.fullmatch(r"0+", cell.number_format or ""):
            text = text.zfill(len(cell.number_format))
        return text
    return str(value).strip()


def read_roster(source):
    workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
    students, seen = [], set()
    try:
        for sheet in workbook:
            rows = sheet.iter_rows()
            header = [cell_text(c) for c in next(rows)]
            required = ("原班級", "座號", "中文姓名", "學號")
            if any(label not in header for label in required):
                raise ValueError(f"Missing required columns in worksheet {sheet.title}")
            columns = {key: header.index(key) for key in required}
            for number, row in enumerate(rows, 2):
                if not any(c.value is not None for c in row):
                    continue
                values = {key: cell_text(row[index]) if index < len(row) else "" for key, index in columns.items()}
                sid = values["學號"]
                if not re.fullmatch(r"[A-Za-z]{2}[0-9]{5}", sid):
                    raise ValueError(f"Expected a seven-character student ID (two letters and five digits): worksheet {sheet.title}, row {number}")
                if sid.casefold() in seen:
                    raise ValueError(f"Duplicate student ID: worksheet {sheet.title}, row {number}")
                if not values["中文姓名"] or not values["原班級"]:
                    raise ValueError(f"Missing student details: worksheet {sheet.title}, row {number}")
                seen.add(sid.casefold())
                students.append({
                    "id": str(uuid.uuid5(uuid.NAMESPACE_URL, "yuhsin-single-school:" + sid.casefold())),
                    "studentId": sid,
                    "name": values["中文姓名"],
                    "teachingGroup": sheet.title,
                    "originalClass": values["原班級"],
                    "originalSeatNumber": values["座號"],
                    "active": True,
                })
    finally:
        workbook.close()
    return {"schemaVersion": 1, "students": students}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    target = args.output.resolve()
    project = Path(__file__).resolve().parents[1]
    private = project / "work" / "student-login"
    # Keep personal information outside every deployed path and tracked source.
    if private not in target.parents or target.suffix != ".json":
        parser.error("Output must be a JSON file inside work/student-login/")
    roster = read_roster(args.source)
    if target.exists():
        parser.error("Private output already exists; choose a new file to preserve existing data")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(roster, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"students": len(roster["students"]), "teaching_groups": dict(Counter(s["teachingGroup"] for s in roster["students"])), "original_classes": dict(Counter(s["originalClass"] for s in roster["students"]))}, ensure_ascii=True))


if __name__ == "__main__":
    main()
