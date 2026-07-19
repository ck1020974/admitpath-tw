import json

j = json.load(open("work/apply115_sieve/001.ocr.json", encoding="utf-8-sig"))
for idx in range(610, 629):
    line = j[idx]
    print(idx, line["text"])
    print(line["words"])
