(function() {
  "use strict";
  const auth = window.YuhsinStudentAuth;
  if (!auth) return;
  const el = id => document.getElementById(id);
  const { client } = auth;
  const returnUrl = auth.safeReturnUrl(new URLSearchParams(location.search).get("return"), auth.baseUrl);
  ["continueGuest", "continueWebsite"].forEach(id => { el(id).href = returnUrl; });
  function message(id, text) { el(id).textContent = text; el(id).hidden = !text; }
  function render(student) {
    el("loginContent").hidden = Boolean(student);
    el("studentAccount").hidden = !student;
    if (!student) return;
    const fields = { accountName: "name", accountStudentId: "studentId", accountTeachingGroup: "teachingGroup", accountOriginalClass: "originalClass", accountOriginalSeat: "originalSeatNumber" };
    Object.entries(fields).forEach(([id, key]) => { el(id).textContent = student[key] || "—"; });
    auth.renderLinks();
  }
  function setBusy(busy) {
    el("loginSubmit").disabled = busy || !client.enabled;
    el("loginSubmit").textContent = busy ? "正在登入…" : "登入";
    el("studentLoginForm").setAttribute("aria-busy", String(busy));
    el("studentId").readOnly = busy;
    el("studentPassword").readOnly = busy;
  }
  function hidePassword() {
    el("studentPassword").type = "password";
    el("togglePassword").setAttribute("aria-pressed", "false");
    el("togglePassword").setAttribute("aria-label", "顯示密碼");
    el("passwordSlash").setAttribute("hidden", "");
  }
  el("togglePassword").addEventListener("click", () => {
    const visible = el("studentPassword").type === "password";
    if (!visible) return hidePassword();
    el("studentPassword").type = "text";
    el("togglePassword").setAttribute("aria-pressed", "true");
    el("togglePassword").setAttribute("aria-label", "隱藏密碼");
    el("passwordSlash").removeAttribute("hidden");
  });
  el("studentLoginForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (el("loginSubmit").disabled) return;
    message("loginError", "");
    el("studentId").removeAttribute("aria-invalid");
    el("studentPassword").removeAttribute("aria-invalid");
    setBusy(true);
    try {
      const student = await client.login(el("studentId").value.trim(), el("studentPassword").value);
      el("studentPassword").value = ""; hidePassword(); render(student);
      el("accountTitle").focus();
    } catch (error) {
      el("studentPassword").value = ""; hidePassword();
      message("loginError", error.message);
      if (error.status === 401) ["studentId", "studentPassword"].forEach(id => el(id).setAttribute("aria-invalid", "true"));
      el("studentPassword").focus();
    } finally { setBusy(false); }
  });
  el("logoutStudent").addEventListener("click", async () => {
    el("logoutStudent").disabled = true;
    message("accountError", "");
    try {
      await client.logout();
      el("studentLoginForm").reset(); hidePassword(); render(null); auth.renderLinks();
      ["accountName", "accountStudentId", "accountTeachingGroup", "accountOriginalClass", "accountOriginalSeat"].forEach(id => { el(id).textContent = ""; });
      el("studentId").focus();
    } catch (error) { message("accountError", error.message); }
    finally { el("logoutStudent").disabled = false; }
  });
  if (!client.enabled) {
    el("loginAvailability").textContent = "目前提供登入介面預覽，學生帳號尚未開放登入。你仍可直接使用網站。";
    el("loginAvailability").classList.add("is-pending");
    setBusy(false);
  } else {
    el("loginAvailability").textContent = "帳號與預設密碼皆為學號。";
    auth.ready.then(render).catch(error => message("loginError", error.message)).finally(() => setBusy(false));
  }
  window.addEventListener("pageshow", event => {
    if (event.persisted && client.enabled) {
      render(null);
      client.session().then(render).catch(() => {});
    }
  });
})();
