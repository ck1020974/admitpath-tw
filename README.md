# YUHSIN

台灣大學升學探索工具，整合校系查詢、個人申請、繁星推薦、分發入學、十八學群與落點分析。

## 網站入口

[直接開啟 YUHSIN](https://ck1020974.github.io/admitpath-tw/)

## 本機預覽

```powershell
node tools/build_site_data.js   # 選用：產生部署時使用的精簡資料
node tools/serve-site.js site 5173
```

開啟 `http://127.0.0.1:5173/`。沒有先執行 `build_site_data.js` 也能預覽，網站會改讀完整的 `admissions_records.json`。

## 載入速度

`tools/build_site_data.js` 會把 `site/data/admissions_records.json` 拆成兩部分，部署時由 GitHub Actions 自動執行：

- `records_core.json`：查詢、篩選與落點分析需要的欄位，首頁一次載入（約為原始檔的一半）。
- `records_detail/*.json`：只在「校系詳情」顯示的長文字與來源網址，點開校系時才載入。

這兩者都是產生檔，不需要提交到 git。原始的 `admissions_records.json` 維持不變，覆核頁與各工具腳本照常使用。

若新增會在列表、篩選或落點判定中讀取的欄位，請確認它不在 `build_site_data.js` 的 `DETAIL_FIELDS` 中，並執行 `node tools/test_site_data_split.js` 檢查拆分前後結果一致。

資料檔網址帶有 `site/app.js` 的 `DATA_VERSION`，瀏覽器會快取資料；**更新資料後請一併修改 `DATA_VERSION`**，學生才會拿到新版本。

## 網址與分享

目前頁面、查詢條件與開啟中的校系會記錄在網址 `#` 後面，可直接分享，例如：

- `#workbench?channel=star_recommendation&year=115&q=資工`
- `#placement`
- `#workbench?record=<校系 id>`

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
python tools/refresh_apply_details.py --year 115
python tools/audit_apply_data.py
```
