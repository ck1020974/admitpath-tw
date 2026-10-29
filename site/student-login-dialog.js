/* Compact login: one primary action, 44px controls, 16px field spacing. */
(function () {
  "use strict";
  const auth = window.YuhsinStudentAuth;
  const { client } = auth;
  const dialog = document.createElement("dialog");
  dialog.className = "student-login-dialog";
  dialog.setAttribute("aria-labelledby", "studentDialogTitle");
  dialog.innerHTML = `
    <button class="student-dialog-close" type="button" aria-label="關閉登入視窗">×</button>
    <section class="student-dialog-login">
      <h2 id="studentDialogTitle" tabindex="-1">登入</h2>
      <p class="student-dialog-status" role="status" hidden></p>
      <form class="student-dialog-form" method="post">
        <label>帳號<input name="username" type="text" pattern="[A-Za-z][A-Za-z0-9]{5,31}" maxlength="32" autocomplete="username" spellcheck="false" autocapitalize="off" placeholder="學生學號或教師帳號" required></label>
        <label>密碼<span class="student-password-wrap"><input name="password" type="password" maxlength="128" autocomplete="current-password" placeholder="請輸入密碼" required><button class="student-password-toggle" type="button" aria-label="顯示密碼" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></svg></button></span></label>
        <p class="student-dialog-hint">學生輸入學號，教師輸入教師帳號。</p>
        <p class="student-dialog-error" role="alert" hidden></p>
        <button class="student-dialog-submit" type="submit">登入</button>
      </form>
    </section>
    <section class="student-dialog-account" hidden>
      <h2 tabindex="-1">我的帳號</h2>
      <p class="student-dialog-name"></p>
      <dl></dl>
      <p class="student-dialog-hint">登入後完成的探索成果與追蹤清單會儲存到你的帳號，供授權教師輔導使用。訪客紀錄需由你選擇匯入。</p>
      <p class="student-dialog-error" role="alert" hidden></p>
      <button class="student-dialog-logout" type="button">登出</button>
    </section>`;
  document.body.append(dialog);
  const query = selector => dialog.querySelector(selector);
  const login = query(".student-dialog-login");
  const account = query(".student-dialog-account");
  const form = query("form");
  const username = form.elements.username;
  const password = form.elements.password;
  const submit = query(".student-dialog-submit");
  const toggle = query(".student-password-toggle");
  const status = query(".student-dialog-status");
  const error = query(".student-dialog-login .student-dialog-error");
  let teacherClient;
  if (window.YUHSIN_STUDENT_AUTH_CONFIG?.provider === 'supabase' && window.YuhsinSupabaseAuth) {
    let storage; try { storage = window.sessionStorage; } catch {}
    teacherClient = window.YuhsinSupabaseAuth.createClient({ config: { ...window.YUHSIN_STUDENT_AUTH_CONFIG, accountType: 'teacher' }, fetcher: window.fetch.bind(window), storage });
  }
  let busy = false;
  let opener;
  function message(element, text) { element.textContent = text; element.hidden = !text; }
  function hidePassword() {
    password.type = "password";
    toggle.setAttribute("aria-pressed", "false");
    toggle.setAttribute("aria-label", "顯示密碼");
  }
  function setBusy(value) {
    busy = value;
    submit.disabled = busy || !client.enabled;
    submit.textContent = busy ? "正在登入…" : "登入";
    form.setAttribute("aria-busy", String(busy));
    username.readOnly = password.readOnly = busy;
  }
  function render() {
    const student = client.current;
    login.hidden = Boolean(student);
    account.hidden = !student;
    if (student) {
      query(".student-dialog-name").textContent = student.name;
      const list = query("dl");
      list.replaceChildren();
      for (const [label, key] of [["學號", "studentId"], ["上課班級", "teachingGroup"], ["原班級", "originalClass"], ["座號", "originalSeatNumber"]]) {
        const row = document.createElement("div");
        const term = document.createElement("dt"), value = document.createElement("dd");
        term.textContent = label; value.textContent = student[key] || "—";
        row.append(term, value); list.append(row);
      }
    }
    auth.renderLinks();
  }
  function close() { dialog.close(); }
  query(".student-dialog-close").addEventListener("click", close);
  dialog.addEventListener("click", event => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  } });
  dialog.addEventListener("close", () => {
    password.value = ""; hidePassword();
    message(error, "");
    document.documentElement.classList.remove("student-dialog-open");
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  toggle.addEventListener("click", () => {
    if (password.type === "text") return hidePassword();
    password.type = "text";
    toggle.setAttribute("aria-pressed", "true");
    toggle.setAttribute("aria-label", "隱藏密碼");
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !client.enabled) return;
    message(error, "");
    username.removeAttribute("aria-invalid"); password.removeAttribute("aria-invalid");
    setBusy(true);
    try {
      const accountId = username.value.trim();
      // Format selects the login flow only. Teacher authorization is verified
      // against Auth and the RLS-protected teacher_access record by the client.
      if (teacherClient && !/^[A-Za-z]{2}[0-9]{5}$/.test(accountId)) {
        await teacherClient.login(accountId, password.value);
        password.value = ""; hidePassword();
        if (dialog.open) close();
        window.location.assign(new URL('teacher/', auth.baseUrl).href);
        return;
      }
      await client.login(accountId, password.value);
      password.value = ""; hidePassword(); render();
      if (dialog.open) close();
    } catch (failure) {
      password.value = ""; hidePassword(); message(error, failure.message);
      if (failure.status === 401) { username.setAttribute("aria-invalid", "true"); password.setAttribute("aria-invalid", "true"); }
      if (dialog.open) password.focus();
    } finally { setBusy(false); }
  });
  query(".student-dialog-logout").addEventListener("click", async event => {
    event.target.disabled = true;
    const accountError = query(".student-dialog-account .student-dialog-error");
    message(accountError, "");
    try { await client.logout(); form.reset(); hidePassword(); render(); query("#studentDialogTitle").focus(); }
    catch (failure) { message(accountError, failure.message); }
    finally { render(); event.target.disabled = false; }
  });
  message(status, client.enabled ? "" : "登入尚未開放");
  setBusy(false);
  auth.openDialog = async () => {
    if (dialog.open) return;
    opener = document.activeElement;
    render();
    document.documentElement.classList.add("student-dialog-open");
    dialog.showModal();
    // Focus the heading so mobile keyboards do not cover the form on opening.
    query(client.current ? ".student-dialog-account h2" : "#studentDialogTitle").focus();
    try { await auth.ready; render(); } catch (failure) { message(error, failure.message); }
  };
})();
