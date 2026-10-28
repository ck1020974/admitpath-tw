# 學生登入介面與本機帳號驗證

2026-10-28：已製作主站／探索頁登入入口、學生登入頁、顯示密碼、錯誤提示、帳號資訊與登出。

正式網站的 `site/student-auth-config.js` 維持 `enabled: false`，登入頁明確顯示尚未開放，送出按鈕停用且不傳送輸入資料。本機預覽服務可依私人名單實際驗證學生帳號。追蹤清單與施測歷程的帳號同步、教師後台及正式私人後端尚未實作。

## 名單欄位

來源工作表代表「上課班級」，來源的「原班級」欄位是學生原班，必須分開保存：

| 來源 | 私人資料欄位 |
| --- | --- |
| 工作表名稱 | `teachingGroup`，例如上課分組 |
| 原班級 | `originalClass`，不是工作表名稱的覆寫值 |
| 座號 | `originalSeatNumber`，保留文字及前導零 |
| 中文姓名 | `name` |
| 學號 | `studentId`，兩個英文字母及五位數字，以文字保存 |

帳號查找不區分學號英文字母大小寫；密碼按照原始學號精確比對，不自動修改大小寫。帳號與預設密碼皆為學號；不存在於名單的學號即使輸入相同密碼也不能登入。名單轉換會檢查缺漏、學號格式及重複，不會把兩個班級欄位合併。

## 私人名單轉換

使用已提供的 Python 環境（需 `openpyxl`）：

```powershell
python tools/prepare_student_roster.py <學生名單.xlsx> --output work/student-login/roster.json
```

輸出僅允許位於 `work/student-login/`，不允許輸出到公開 `site/`。該目錄已被 Git 忽略。原始工作簿不變；輸出不建立額外的明文密碼欄位，命令只顯示人數和班級彙總。既有輸出不覆寫，重新匯入需指定新檔並另行處理更新。

## 本機預覽

```powershell
node tools/serve-student-login.js work/student-login/roster.json 5180
```

開啟 `http://127.0.0.1:5180/login/`。服務只綁定本機回送位址，提供相同網站與 `/api/student-auth/`，並在執行時提供啟用的本機設定，不修改公開設定檔。

API：`POST /login` 驗證帳號；`GET /session` 取得目前學生資訊；`POST /logout` 撤銷工作階段。工作階段存在伺服器記憶體，憑證使用 HttpOnly／SameSite=Strict cookie，兩小時到期，重開服務即失效。密碼驗證採 scrypt；錯誤登入有頻率限制。服務不提供私人名單靜態下載、教師權限或雲端紀錄。

此服務僅用於本機驗證，不可直接改綁公網位址當正式服務。正式部署仍需私人後端、HTTPS、持久性工作階段／撤銷策略、資料庫權限與備份。登入前後目前都沿用既有瀏覽器追蹤與測驗存檔，介面已明確提示帳號同步尚未開放。

## 介面設計

沿用主站字體與配色：頁面 `#f6f5f1`、文字 `#172c38`、青綠 `#137d73`、側欄深綠 `#15342f`、白底 `#ffffff`。桌面左側以探索路徑連接興趣、學群與校系，右側集中學號／密碼表單；手機收斂為短標題與單欄表單。沒有另加首頁照片、統計數字或示意學生資料。

登入後分開顯示姓名、學號、上課班級、原班級與原班座號。一般訪客可直接返回原頁，登入服務未啟用時不阻擋公開網站。頁面不載入第三方追蹤，也不將輸入資料放進網址或瀏覽器儲存。

## 驗證

```powershell
node tools/test_student_login.js
python tools/test_student_roster.py
node tools/test_explorer_integration.js
node tools/check-homepage-layout-contract.js
node tools/check-pages-deploy-contract.js
```

測試使用虛構名單。涵蓋 A 組／原班分離、重複學號、名單外帳號拒絕、登入、登出、到期、頻率限制、私人檔案隔離、公開預覽不送出帳密及返回網址限制。
