# YUHSIN

台灣大學升學探索工具，整合校系查詢、個人申請、繁星推薦、分發入學、十八學群與落點分析。

## 網站入口

[直接開啟 YUHSIN](https://ck1020974.github.io/admitpath-tw/)

## 本機預覽

```powershell
node tools/serve-site.js site 5173
```

開啟 `http://127.0.0.1:5173/`。

## 支持作者

網站另提供「支持作者」入口，預設尚未開放收款。申請金流及填入正式收款連結的方式，請參閱 [支持作者設定指引](docs/author-support-setup.md)。

## 比較清單儲存

比較清單會在加入、移除及清空校系時自動儲存於此瀏覽器（localStorage），下次開啟同一網站時恢復選取順序，並使用目前的招生資料。無法對應的校系會顯示提示。

儲存範圍限同一裝置、同一瀏覽器及同一網站來源；不會跨裝置同步。清除網站資料或結束無痕瀏覽可能使清單消失。瀏覽器阻擋讀寫時會顯示提示，仍可在當次使用比較功能。

驗證比較清單：`node tools/test_compare_list.js`、`node tools/test_compare_storage.js`。

## 資料範圍

- 116 學年度：特殊選才 746 筆（2,288 名）、資安外加 34 筆（89 名），依教育部兩份招生資訊附件匯入；特殊選才入口預設顯示 116 年度，115 年度仍可查詢。
- 115 學年度：個人申請、繁星推薦
- 114 學年度：個人申請、繁星推薦、分發入學

資料以大學甄選入學委員會、考試分發委員會等公開資料為基礎整理；正式使用前仍應以各招生簡章與官方公告為準。

116 特選來源 PDF 保存在 `site/data/sources/`。每筆資料保留來源附件、頁碼、序號與原始儲存格，並將一般特選與資安外加分開建檔；來源中的暫定日期也會顯示於詳情。

重新匯入：`python tools/import_special_admissions_pdf.py <一般特選PDF> <資安外加PDF>`。

## 個人申請資料稽核

- `tools/refresh_apply_details.py` 依學年度重新抓取甄選委員會校系分則，透過表頭與合併儲存格解析檢定、倍率、二階占比、APCS 與術科欄位。
- `tools/audit_apply_data.py` 產生 `site/data/application_audit.json`。只有附有官方結果圖且已人工核對的資料才會判定為「已核對」；其餘資料會標示「待核對」，不作為落點判定。
- 數學 A、數學 B 同時列在「檢定標準」時，網站以「擇一」處理；兩者若出現在倍率篩選，則依官方倍率表分開計算。APCS 識讀與實作也依簡章欄位保留。

重新整理 115 學年度資料：

```powershell
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" tools/refresh_apply_details.py --year 115
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" tools/audit_apply_data.py
```
