# 網站造訪與功能統計

目前使用 GoatCounter 站台 `yuhsin`，設定在 `site/usage-config.js`。
站台代碼是公開設定，不是登入信箱，也不是 API 金鑰。登入資訊不放入網站。

網站頁尾的「瀏覽人數」讀取 `/site-visit` 的累計造訪數；各功能頁的瀏覽與事件另外記錄，避免把同一個人切換功能的次數加總成人數。
這是累計造訪人次，不是永久不重複的人數。本機預覽不發送統計。

在 GoatCounter 的 Settings 勾選「Allow adding visitor counts on your website」即可開放公開數字；Dashboard 可維持 Only logged in users。
公開計數 API 會快取，數字不一定即時更新；新站尚未收到資料或讀取失敗時顯示「統計更新中」，不以假造的 0 取代。
官方說明：https://www.goatcounter.com/help/visitor-counter

## TOP 10 學類

目前是十個預設精選學類，並非統計排名。選取學類時，以 `placement-category-<英文代碼>` 記錄匿名功能事件。
可在累積資料後，以最近 30 天的學類選取次數產生排名；未來若需要去重，應以統計服務提供的造訪資料計算，而不是在瀏覽器建立個人識別碼。
如要自動更新預設清單，可由伺服器端或 GitHub Actions 讀取統計後產生公開排名檔；API 金鑰應只放在執行環境的 Secret，不可寫入前端。
