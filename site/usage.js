/* 使用次數統計：只記錄「哪個功能被用了幾次」，不記錄作答內容、成績、名字或任何可以辨識學生的資料。
   送到 GoatCounter（不用 cookie、不建立個人識別碼）；沒有設定代碼時什麼都不送。
   用法：YuhsinUsage.page('workbench','查詢工作台')  YuhsinUsage.event('curiosity-start','開始學群探索',{once:true}) */
(function (root) {
  "use strict";
  const config = root.YUHSIN_USAGE_CONFIG || {};
  const code = /^[a-z0-9-]{2,50}$/.test(config.goatcounterCode || "") ? config.goatcounterCode : "";
  const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test((root.location && root.location.hostname) || "");
  const enabled = Boolean(code) && !local;
  const queue = [];
  const sent = new Set();
  // 事件名稱只能是英文小寫、數字、連字號與斜線後的學群名稱，避免不小心把作答或名字當成事件送出。
  const NAME = /^[a-z0-9-]+(\/[一-鿿A-Za-z0-9-]{1,20})?$/;

  function deliver(item) {
    const gc = root.goatcounter;
    if (gc && typeof gc.count === "function") gc.count(item);
    else queue.push(item);
  }
  function record(item) {
    if (config.debug) console.info("[usage]", item.event ? "event" : "page", item.path, item.title || "");
    if (enabled) deliver(item);
  }
  function load() {
    if (!enabled || !root.document) return;
    root.goatcounter = Object.assign(root.goatcounter || {}, { no_onload: true });
    const script = root.document.createElement("script");
    script.async = true;
    script.src = "https://gc.zgo.at/count.js";
    script.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
    script.addEventListener("load", () => { while (queue.length) deliver(queue.shift()); });
    root.document.head.appendChild(script);
  }

  const api = {
    enabled,
    // 頁面瀏覽：同一次開啟同一頁只算一次（切回來不重算）。
    page(name, title = "") {
      if (!NAME.test(name) || sent.has("page:" + name)) return false;
      sent.add("page:" + name);
      record({ path: "/" + name, title });
      return true;
    },
    // 事件：once 為 true 時，同一次開啟只算一次（例如重複按「複製連結」）。
    event(name, title = "", options = {}) {
      if (!NAME.test(name)) return false;
      if (options.once) { if (sent.has(name)) return false; sent.add(name); }
      record({ path: name, title, event: true });
      return true;
    },
    _queue: queue,
  };
  load();
  root.YuhsinUsage = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
