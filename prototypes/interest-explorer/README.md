# 祐馨學群探索：O*NET® Mini-IP 繁體中文本機審閱稿

本版本適用範圍是作者與教師的本機審閱。它尚未完成中文及台灣高中生族群的驗證研究，不是已驗證、可公開推出的量表。此目錄位於 prototypes/ 而非 site/，不會被現有 GitHub Pages 工作流程部署。

## 啟動

在專案根目錄執行：

```powershell
node tools/serve-site.js prototypes/interest-explorer 5174
```

開啟 http://127.0.0.1:5174/ 。「回祐馨升學網」連到原本的 http://127.0.0.1:5173/ 。兩者為本機不同頁面，正式網站未加入測驗。

測試：`node tools/test_interest_explorer.js`、`node tools/test_interest_flow.js`。

2026-10-16 介面更新：一次一題、桌面五欄選項／手機大按鈕、進度條、數字鍵1–5選答與Enter前進。原30題、題序與計分不變；返回首頁或上一題會保留本次回答，重新整理則清除。重複說明縮短，結果頁的解釋與匯出工具可展開；來源說明改由左下角「YUHSIN · 學群探索」開啟對話框。教師審題入口已移除；原題號、原文與分類仍保留於資料檔。

介面參考：[Typeform 分步表單設計](https://www.typeform.com/blog/interactive-form-boost-conversions)、[進度條](https://help.typeform.com/hc/en-us/articles/360051557892-Activate-the-Progress-bar)、[鍵盤操作](https://help.typeform.com/hc/en-us/articles/4410017947412-Keyboard-shortcuts-and-text-formatting-in-Typeform)。只借鏡互動形式，未引用其他測驗題目或修改此版本的量尺。

## 來源與計分

來源：[2016 Mini-IP 技術報告](https://www.onetcenter.org/dl_files/Mini-IP.pdf)，附錄A（印刷頁19–20）及計分說明（印刷頁13）。30題，每型5題，題序交錯為 RIASEC。各題0–4分，每型加總0–20分。

保留原題號、英文原文、分類及30題完整題序。中文為初譯而非改寫成另一個活動；C類的電腦網路及計算機題、S類的復健及教學題等，都需在學生理解訪談中特別檢查。

未答題不計零分、不允許直接出結果。原題「不確定」計2分，不當成不喜歡。最高分同分並列，全部同分不指定主類型；同分呈現及解釋皆為本站新增，仍需研究驗證。

十八學群為本站編輯的閱讀方向，不是原工具提供的台灣學群對照，不是科系適合率。採最高分興趣與學群活動標記的可檢查對照，沒有訓練或驗證資料。對照及描述不應被當作標準化推薦。

## 授權、修改與免責聲明

This application includes information from the [O*NET Career Exploration Tools](https://www.onetcenter.org/tools.html) by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the [O*NET Tools Developer License](https://www.onetcenter.org/license_toolsdev.html). O*NET® is a trademark of USDOL/ETA. YUHSIN has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications.

YUHSIN has modified all of, a portion of, or the purpose of the O*NET® Career Exploration Tools. The U.S. Department of Labor, Employment and Training Administration (USDOL/ETA) has not approved, endorsed, or tested these modifications. As such, USDOL/ETA will not be liable to any third party or end-user for any damages arising out of or from the use or misuse of the modified O*NET Career Exploration Tools or any products incorporating or containing the modified O*NET Career Exploration Tools.

原始素材按上述授權提供，無適用性或其他擔保（見授權第5節）。原始素材權利不因放入本專案而改變，不另加限制。中文翻譯、作答說明、結果解釋、同分呈現及學群閱讀方向為 YUHSIN 修改或新增內容，詳見 [modifications.html](modifications.html)。

本工具由美國勞工部就業與訓練管理局贊助，由 National Center for O*NET Development 發展。原始報告作者：James Rounds、Colin Wee Jian Ming、Mengyang Cao、Chelsea Song、Phil Lewis。

## 未完成事項

正式公開推出前，依 [驗證規劃](VALIDATION.md) 執行翻譯審查、目標族群試測與符合授權的驗證研究，不能只增加「僅供參考」文字就視為已完成驗證。

目前只完成程式層面的測試與瀏覽器操作檢查；這不等於心理計量驗證。尚未向官方宣稱認證、登錄研究或提交任何學生資料。

## 檔案

- questionnaire.js：逐題來源、中文稿、純計分函式及可檢查學群標記。
- index.html / app.js / styles.css：審閱、作答、返回修改、結果及下載。
- flow.js：一次一題的會話、必答檢查與返回修改。
- modifications.html：來源說明視窗連結的修改與免責聲明。
- VALIDATION.md：公開推出前所需研究工作。

無學生個資、自動儲存、後端或分析追蹤。匯出只含問卷版本、來源、逐題答案、分數與 validated=false。
