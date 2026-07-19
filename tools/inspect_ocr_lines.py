import json

j = json.load(open("work/apply115_sieve_001_ocr.json", encoding="utf-8-sig"))
for i, line in enumerate(j):
    if "001012" in line["text"] or "001582" in line["text"] or "資 訊" in line["text"] or "中 國" in line["text"] or "英 文 10" in line["text"]:
        print("IDX", i, line["text"])
        for k in range(max(0, i - 5), min(len(j), i + 8)):
            print(k, j[k]["text"])
        print("words", line["words"])
