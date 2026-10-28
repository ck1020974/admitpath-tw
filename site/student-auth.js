/* Student login API. Identity is verified by the server; never by browser storage. */
(function(root) {
  "use strict";
  function safeReturnUrl(value, base) {
    const fallback = new URL("./", base);
    try {
      const url = new URL(value || "./", fallback);
      if (url.origin !== fallback.origin || !url.pathname.startsWith(fallback.pathname) || url.username || url.password || url.pathname.startsWith(new URL("login/", fallback).pathname)) return fallback.href;
      return url.href;
    } catch { return fallback.href; }
  }
  function createClient({ config = {}, fetcher, origin }) {
    const enabled = config.enabled === true && /^\/api\/[a-z0-9/-]+$/.test(config.apiBasePath || "");
    let current = null;
    async function request(path, body) {
      if (!enabled) throw Object.assign(new Error("學生登入尚未開放，仍可直接使用網站。"), { code: "NOT_ENABLED" });
      let response;
      try {
        response = await fetcher(new URL(config.apiBasePath + path, origin).href, {
          method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Accept": "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: AbortSignal.timeout(12000),
        });
      } catch { throw new Error("目前無法連線，請稍後再試。你可以先繼續使用網站。"); }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const messages = { 401: "學號或密碼不正確，請重新輸入。", 403: "目前無法使用這個帳號，請聯絡授課老師。", 429: "登入嘗試較頻繁，請稍後再試。" };
        throw Object.assign(new Error(messages[response.status] || "登入服務暫時無法使用，請稍後再試。"), { status: response.status });
      }
      return data;
    }
    return {
      enabled,
      get current() { return current; },
      async session() {
        if (!enabled) return null;
        try { const data = await request("/session"); current = data.student || null; return current; }
        catch (error) { current = null; if (error.status === 401) return null; throw error; }
      },
      async login(studentId, password) {
        const data = await request("/login", { studentId, password });
        if (!data.student?.id || !data.student?.name) throw new Error("無法讀取帳號資料，請稍後再試。");
        current = data.student;
        return current;
      },
      async logout() { await request("/logout", {}); current = null; },
    };
  }
  if (typeof module !== "undefined" && module.exports) { module.exports = { createClient, safeReturnUrl }; return; }
  const script = root.document.currentScript;
  const base = new URL("./", script.src);
  const client = createClient({ config: root.YUHSIN_STUDENT_AUTH_CONFIG, fetcher: root.fetch.bind(root), origin: root.location.origin });
  const ready = client.session();
  function renderLinks() {
    root.document.querySelectorAll("[data-student-account]").forEach(link => {
      const target = new URL("login/", base);
      const current = new URL(root.location.href);
      if (!current.pathname.startsWith(target.pathname)) target.searchParams.set("return", current.pathname + current.search + current.hash);
      link.href = target.href;
      const label = link.querySelector("[data-student-account-label]");
      if (label) label.textContent = client.current ? "我的帳號" : "登入";
    });
  }
  root.YuhsinStudentAuth = { client, ready, baseUrl: base.href, safeReturnUrl, renderLinks };
  let dialogLoading;
  function openDialog() {
    if (!dialogLoading) dialogLoading = new Promise((resolve, reject) => {
      const entry = root.document.createElement("script");
      entry.src = new URL("student-login-dialog.js?v=20261028-modal1", base).href;
      entry.onload = resolve;
      entry.onerror = () => { entry.remove(); dialogLoading = null; reject(new Error("無法載入登入視窗，請稍後再試。")); };
      root.document.body.append(entry);
    });
    return dialogLoading.then(() => root.YuhsinStudentAuth.openDialog());
  }
  const boot = () => {
    renderLinks(); ready.then(renderLinks).catch(() => {});
    root.document.addEventListener("click", event => {
      const link = event.target.closest("[data-student-account]");
      if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openDialog().catch(error => root.alert(error.message));
    });
    const url = new URL(root.location.href);
    if (url.searchParams.get("login") === "1") {
      url.searchParams.delete("login");
      root.history.replaceState(root.history.state, "", url);
      openDialog().catch(error => root.alert(error.message));
    }
  };
  if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", boot); else boot();
})(typeof window !== "undefined" ? window : globalThis);
