import json
import re
import sys
from pathlib import Path


def safe_print(*parts):
    text = " ".join(str(part) for part in parts)
    sys.stdout.buffer.write(text.encode("utf-8", "backslashreplace") + b"\n")


def main():
    if len(sys.argv) < 3:
        raise SystemExit("usage: python tools/debug_ocr_rows.py <school_code> <program_code> [program_code...]")
    school_code = sys.argv[1]
    program_codes = set(sys.argv[2:])
    path = Path(f"work/apply114_sieve/{school_code}.ocr.json")
    rows = json.load(path.open(encoding="utf-8-sig"))
    for index, line in enumerate(rows):
        text = re.sub(r"\s+", "", line.get("text", ""))
        if any(code in text for code in program_codes):
            safe_print(f"IDX {index} {line.get('text','')}")
            for offset in range(max(0, index - 4), min(len(rows), index + 7)):
                safe_print(offset, rows[offset].get("text", ""))
            safe_print("")


if __name__ == "__main__":
    main()
