# AdmitPath

台灣大學升學探索工具，整合校系查詢、個人申請、繁星推薦、分發入學、十八學群與落點分析。

## 網站入口

[直接開啟 AdmitPath](https://ck1020974.github.io/admitpath-tw/)

## 本機預覽

```powershell
node tools/serve-site.js site 5173
```

開啟 `http://127.0.0.1:5173/`。

## 資料範圍

- 115 學年度：個人申請、繁星推薦
- 114 學年度：個人申請、繁星推薦、分發入學

資料以大學甄選入學委員會、考試分發委員會等公開資料為基礎整理；正式使用前仍應以各招生簡章與官方公告為準。

## 個人申請資料稽核

- `tools/refresh_apply_details.py` 依學年度重新抓取甄選委員會校系分則，透過表頭與合併儲存格解析檢定、倍率、二階占比、APCS 與術科欄位。
- `tools/audit_apply_data.py` 產生 `site/data/application_audit.json`。只有附有官方結果圖且已人工核對的資料才會判定為「已核對」；其餘資料會標示「待核對」，不作為落點判定。
- 數學 A、數學 B 同時列在「檢定標準」時，網站以「擇一」處理；兩者若出現在倍率篩選，則依官方倍率表分開計算。APCS 識讀與實作也依簡章欄位保留。

重新整理 115 學年度資料：

```powershell
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" tools/refresh_apply_details.py --year 115
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" tools/audit_apply_data.py
```
