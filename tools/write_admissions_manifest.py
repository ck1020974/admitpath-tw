import csv
import json
from pathlib import Path


OUT_DIR = Path("outputs/admissions_data")


DATASETS = [
    {
        "file_stem": "admissions_115_personal_application_index",
        "admission_year": 115,
        "channel": "個人申請",
        "source_organization": "大學甄選入學委員會",
        "source_url": "https://www.cac.edu.tw/apply115/system/ColQry_115xappLyfOrStu_Azd5gP29/TotalGsdShow.htm",
        "data_level": "招生校系分則索引；含官方校系代碼、學校、學系、名額及列表頁欄位，細節頁網址已保留。",
    },
    {
        "file_stem": "admissions_115_star_recommendation_index",
        "admission_year": 115,
        "channel": "繁星推薦",
        "source_organization": "大學甄選入學委員會",
        "source_url": "https://www.cac.edu.tw/star115/system/ColQry_115xStarFoRstU_BT65fwZ9z/TotalGsdShow.htm",
        "data_level": "招生校系分則索引；含官方校系代碼、學校、學系、名額及列表頁欄位，細節頁網址已保留。",
    },
    {
        "file_stem": "admissions_114_personal_application_index",
        "admission_year": 114,
        "channel": "個人申請",
        "source_organization": "大學甄選入學委員會",
        "source_url": "https://www.cac.edu.tw/apply114/system/ColQry_114applyXForStu_Fd87eO2q/TotalGsdShow.htm",
        "data_level": "招生校系分則索引；含官方校系代碼、學校、學系、名額及列表頁欄位，細節頁網址已保留。",
    },
    {
        "file_stem": "admissions_114_star_recommendation_index",
        "admission_year": 114,
        "channel": "繁星推薦",
        "source_organization": "大學甄選入學委員會",
        "source_url": "https://www.cac.edu.tw/star114/system/ColQry_114starForStu_4wSdO6dz/TotalGsdShow.htm",
        "data_level": "招生校系分則索引；含官方校系代碼、學校、學系、名額及列表頁欄位，細節頁網址已保留。",
    },
    {
        "file_stem": "admissions_114_exam_distribution_index",
        "admission_year": 114,
        "channel": "分發入學",
        "source_organization": "大學考試入學分發委員會",
        "source_url": "https://www.uac.edu.tw/114data/114inform.pdf + https://www.uac.edu.tw/114data/114recruit.pdf",
        "data_level": "招生規則主表；正式系組代碼、核定名額、外加名額來自登記相關資訊，檢定標準與採計科目來自招生簡章 PDF 抽取。",
    },
    {
        "file_stem": "admissions_114_exam_distribution_results",
        "admission_year": 114,
        "channel": "分發入學",
        "source_organization": "大學考試入學分發委員會",
        "source_url": "https://www.uac.edu.tw/114data/114_result_school_data.pdf",
        "data_level": "放榜後結果表；各系組最低錄取標準及錄取人數，與招生規則資料分開保存。",
    },
]


def count_csv_rows(path):
    if not path.exists():
        return 0
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        return max(sum(1 for _ in reader) - 1, 0)


def main():
    manifest = []
    for dataset in DATASETS:
        stem = dataset["file_stem"]
        csv_path = OUT_DIR / f"{stem}.csv"
        json_path = OUT_DIR / f"{stem}.json"
        item = dict(dataset)
        item["csv_path"] = str(csv_path)
        item["json_path"] = str(json_path)
        item["row_count"] = count_csv_rows(csv_path)
        manifest.append(item)

    with (OUT_DIR / "admissions_sources_manifest.json").open("w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    with (OUT_DIR / "admissions_sources_manifest.csv").open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(manifest[0].keys()))
        writer.writeheader()
        writer.writerows(manifest)

    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
