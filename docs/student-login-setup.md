# 學生正式登入與本機帳號驗證

2026-10-28：已製作主站／探索頁登入入口、學生登入頁、顯示密碼、錯誤提示、帳號資訊與登出。

2026-10-29：正式網站已串接 Supabase Auth 與私人學生資料表，啟用 `provider: supabase`。目前共 231 位學生：G10 81 位、雙語 G11 77 位、雙語 G12 73 位。帳號及初始密碼都是原始學號；新增名單不重設既有密碼。教師後台 `/teacher/` 直接呈現名單、追蹤清單與探索成果，年級／原班級及班別可交叉篩選。新作答與清單操作會保存到帳號，舊訪客紀錄需由學生明確選擇匯入。完整權限及後續工作見 [私人後台規劃](student-backend-roadmap.md)。

2026-11-23：新增「會員註冊」。外校學生可用信箱＋密碼自行註冊，註冊時依縣市選擇學校；原有 231 位學生與 2 位教師的學校欄位設為「新北市／新北市林口康橋國際高中」（教育部代碼 011330），帳號、密碼與紀錄不變。

2026-11-23（下午）：改為一律用信箱登入。原有學生下次以學號登入後，必須綁定信箱（不能略過，只能選「先登出」），可同時設定新密碼（選填，不可與學號相同）。綁定後 Auth 帳號信箱改為學生填的信箱，`login_email_bound_at` 記錄時間，學號登入停用（`lookup_student_login` 只回傳尚未綁定者）。綁定的信箱不寄確認信、直接生效；若學生打錯信箱，需管理者在 Supabase 後台修正該 Auth 帳號信箱與 `students.auth_email`。已綁定帳號在「帳號」視窗顯示「登入信箱」，不能在網站上自行修改。教師帳號不受影響。

## 會員註冊

- 登入視窗下方「註冊會員」：姓名、信箱、密碼（8–72 字元）、縣市→學校、是否接收升學資訊、同意蒐集說明（與既有信箱說明同一版本）。
- 學校清單來自教育部統計處高級中等學校名錄（`site/data/sources/moe_high_schools_115.csv`，115 學年度 506 所，含普通型、技術型、綜合型、實驗高中與進修學校）。更新學年度時下載新的 `https://stats.moe.gov.tw/files/school/<學年度>/high.csv`，執行 `node tools/build_school_list.js <CSV>`，再到 SQL Editor 執行產生的 `supabase/migrations/20261123100000_school_directory.sql`（可重複執行）。
- 資料庫：`public.schools` 為學校表（瀏覽器無權讀取）。`auth.users` 的觸發器 `on_member_signup` 只處理 `user_metadata.account_type = 'member'` 的註冊，驗證姓名、同意版本與學校代碼後建立 `students` 資料列（`account_type = 'member'`、`school_id = 'member'`、`teaching_group = '會員'`、無學號）。`.invalid` 網域不可註冊，避免搶占內部帳號。
- 會員登入：帳號欄輸入含 `@` 時以信箱登入；否則照舊判斷學號或教師帳號。
- 教師權限：會員的 `school_id` 是 `member`，不在任何教師範圍內，選了林口康橋也不會出現在教師後台。管理者確認身分後，如要開放給老師，手動把該生 `school_id` 改為 `yuhsin-school` 並設定 `teaching_group`。網站管理者的全站統計會把會員算在「會員」班群。
- 信箱驗證：專案已開啟 Confirm email。驗證信連結回到 `首頁?verified=1`，網站會清除網址中的憑證、提示「信箱驗證完成，請登入」，不直接採用網址帶來的登入憑證。需在 Supabase Auth → URL Configuration 把 `https://ck1020974.github.io/admitpath-tw/**` 加入 Redirect URLs。Supabase 內建寄信只寄給專案成員，正式開放前須設定自訂 SMTP（Auth → SMTP Settings），或關閉 Confirm email。

## 名單欄位

來源工作表代表「上課班級」，來源的「原班級」欄位是學生原班，必須分開保存：

| 來源 | 私人資料欄位 |
| --- | --- |
| 工作表名稱 | `teachingGroup`，例如上課分組 |
| 原班級 | `originalClass`，不是工作表名稱的覆寫值 |
| 座號 | `originalSeatNumber`，保留文字及前導零 |
| 中文姓名 | `name` |
| 學號 | `studentId`，兩個英文字母及五位數字，以文字保存 |

帳號查找不區分學號英文字母大小寫；初始密碼（學號）也不分大小寫：密碼與學號只差大小寫時，會再用大寫學號驗證一次。學生自行修改過的密碼仍精確比對。帳號與預設密碼皆為學號；不存在於名單的學號即使輸入相同密碼也不能登入。名單轉換會檢查缺漏、學號格式及重複，不會把兩個班級欄位合併。

## 私人名單轉換

G11／G12 使用 `tools/prepare_bilingual_roster.py`，僅讀取目前的「雙G11」「雙G12」兩張表，不匯入留學班、其他年級或任課教師。以原母班、座號與學號建立帳號；G11 班別讀取社會分組 N 欄，G12 理組依 F／G 欄區分理主與理A，文組以 Z 欄區分文主／文H。物理的 12理H 是科目分組，不另作本介面的班別。

所有學號會檢查格式及跨表重複；原班級的數值格式先還原為文字，原表及既有 Auth 密碼不修改。私人輸出仍限於忽略的 `work/student-login/`。

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

此服務僅用於本機驗證，不可直接改綁公網位址當正式服務。正式網站使用獨立的 Supabase 驗證與資料庫權限。正式登入後的探索成果與追蹤清單經驗證端點保存；訪客紀錄由學生明確選擇匯入，私人草稿與訪客資料分開。

## 介面設計

沿用主站字體與配色：頁面 `#f6f5f1`、文字 `#172c38`、青綠 `#137d73`、側欄深綠 `#15342f`、白底 `#ffffff`。桌面左側以探索路徑連接興趣、學群與校系，右側集中學號／密碼表單；手機收斂為短標題與單欄表單。沒有另加首頁照片、統計數字或示意學生資料。

登入後分開顯示姓名、學號、上課班級、原班級與原班座號。一般訪客可直接返回原頁，登入服務未啟用時不阻擋公開網站。頁面不載入第三方追蹤，也不將輸入資料放進網址或瀏覽器儲存。

## 驗證

```powershell
node tools/test_student_login.js
node tools/test_student_supabase.js
node tools/test_student_access_function.mjs
python tools/test_student_roster.py
node tools/test_explorer_integration.js
node tools/check-homepage-layout-contract.js
node tools/check-pages-deploy-contract.js
```

測試使用虛構名單。涵蓋 A 組／原班分離、重複學號、名單外帳號拒絕、登入、登出、到期、頻率限制、私人檔案隔離、公開預覽不送出帳密及返回網址限制。

`tools/verify_student_live.js` 為授權的正式環境抽測，僅從忽略的私人工作目錄讀取名單與公開設定；只輸出檢查結果，不輸出學號、姓名或工作階段。臨時匯入授權限時且只能使用一次，本次已消耗，不可重複匯入；後續匯入須另建授權。
