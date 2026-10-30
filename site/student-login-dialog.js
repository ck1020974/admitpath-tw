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
      <h2 tabindex="-1">帳號</h2>
      <p class="student-dialog-name"></p>
      <dl></dl>
      <p class="student-dialog-error" role="alert" hidden></p>
      <a class="student-dialog-teacher" href="#" hidden>進入教師後台</a>
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
  const teacherClient = auth.teacherClient;
  const teacherUrl = new URL("teacher/", auth.baseUrl);
  const onTeacherPage = () => window.location.pathname.startsWith(teacherUrl.pathname);
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
  // 信箱與接收升學資訊：顯示首次登入時填寫的資料，按筆圖示即可修改。
  const PEN = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 3.5l3 3L7 16H4v-3z"/><path d="M11.5 5.5l3 3"/></svg>';
  let contact = null, contactFor = null, contactLoad = null;
  const accountError = () => query(".student-dialog-account .student-dialog-error");
  function contactRow(list, label, key) {
    const row = document.createElement("div");
    row.className = "student-contact-row"; row.dataset.contact = key;
    const term = document.createElement("dt"), value = document.createElement("dd");
    term.textContent = label; row.append(term, value); list.append(row);
    return value;
  }
  function showValue(cell, key) {
    const text = !contact ? "—" : key === "email" ? (contact.email || "—") : (contact.wantsUpdates ? "是" : "否");
    const span = document.createElement("span"); span.className = "student-contact-value"; span.textContent = text;
    const edit = document.createElement("button");
    edit.type = "button"; edit.className = "student-contact-edit"; edit.innerHTML = PEN;
    edit.setAttribute("aria-label", key === "email" ? "修改信箱" : "修改是否接收升學資訊"); edit.title = edit.getAttribute("aria-label");
    edit.hidden = !contact;
    edit.addEventListener("click", () => startEdit(cell, key));
    cell.replaceChildren(span, edit);
  }
  function startEdit(cell, key) {
    message(accountError(), "");
    const form = document.createElement("form"); form.className = "student-contact-editor"; form.noValidate = true;
    let input;
    if (key === "email") {
      input = document.createElement("input");
      Object.assign(input, { type: "email", name: "email", maxLength: 254, autocomplete: "email", spellcheck: false, value: contact.email || "" });
      input.setAttribute("aria-label", "信箱"); input.autocapitalize = "off";
      form.append(input);
    } else {
      const label = document.createElement("label"); label.className = "student-contact-toggle";
      input = document.createElement("input"); input.type = "checkbox"; input.checked = contact.wantsUpdates;
      label.append(input, document.createTextNode("接收升學資訊")); form.append(label);
    }
    const save = document.createElement("button"); save.type = "submit"; save.className = "student-contact-save"; save.textContent = "儲存";
    const cancel = document.createElement("button"); cancel.type = "button"; cancel.className = "student-contact-cancel"; cancel.textContent = "取消";
    cancel.addEventListener("click", () => showValue(cell, key));
    form.append(save, cancel);
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (save.disabled) return;
      const next = { email: contact.email, wantsUpdates: contact.wantsUpdates, consentVersion: contact.consentVersion };
      if (key === "email") {
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.value.trim())) { input.setAttribute("aria-invalid", "true"); input.focus(); return message(accountError(), "請輸入正確的信箱。"); }
        next.email = input.value;
      } else next.wantsUpdates = input.checked;
      save.disabled = cancel.disabled = true; save.textContent = "儲存中…";
      try {
        contact = await client.saveContact(next);
        message(accountError(), "");
        showValue(cell, key);
      } catch (failure) {
        if (key === "email") input.setAttribute("aria-invalid", "true");
        message(accountError(), failure.message);
        save.disabled = cancel.disabled = false; save.textContent = "儲存";
      }
    });
    cell.replaceChildren(form);
    input.focus();
  }
  function renderContact(list, student) {
    const cells = { email: contactRow(list, "信箱", "email"), wantsUpdates: contactRow(list, "接收升學資訊", "wantsUpdates") };
    const paint = () => { showValue(cells.email, "email"); showValue(cells.wantsUpdates, "wantsUpdates"); };
    if (contactFor === student.id && contact) return paint();
    paint();
    if (typeof client.readContact !== "function") return;
    if (!contactLoad || contactFor !== student.id) {
      contactFor = student.id;
      contactLoad = client.readContact().then(info => { contact = info; }).catch(() => { contact = null; contactLoad = null; });
    }
    contactLoad.then(() => { if (client.current?.id === student.id && cells.email.isConnected) paint(); });
  }
  window.addEventListener("yuhsin-contact-change", event => { contact = event.detail; contactFor = client.current?.id || null; contactLoad = Promise.resolve(); if (dialog.open) render(); });
  window.addEventListener("yuhsin-auth-change", () => { contact = null; contactFor = null; contactLoad = null; });
  function render() {
    const student = client.current;
    const teacher = !student && teacherClient?.current;
    login.hidden = Boolean(student || teacher);
    account.hidden = !(student || teacher);
    const teacherLink = query(".student-dialog-teacher");
    teacherLink.hidden = !teacher;
    teacherLink.href = teacherUrl.href;
    if (teacher) {
      query(".student-dialog-name").textContent = teacher.name;
      const list = query("dl");
      const row = document.createElement("div");
      const term = document.createElement("dt"), value = document.createElement("dd");
      term.textContent = "身分"; value.textContent = teacher.canManageAccounts ? "網站管理者" : "教師";
      row.append(term, value); list.replaceChildren(row);
      teacherLink.hidden = onTeacherPage();
    }
    if (student) {
      query(".student-dialog-name").textContent = student.name;
      const list = query("dl");
      list.replaceChildren();
      for (const [label, key] of [["學號", "studentId"], ["原班級", "originalClass"], ["座號", "originalSeatNumber"]]) {
        const row = document.createElement("div");
        const term = document.createElement("dt"), value = document.createElement("dd");
        term.textContent = label; value.textContent = student[key] || "—";
        row.append(term, value); list.append(row);
      }
      renderContact(list, student);
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
        if (onTeacherPage()) { window.location.reload(); return; }
        render();
        if (dialog.open) close();
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
    try {
      if (!client.current && teacherClient?.current) {
        await teacherClient.logout();
        if (onTeacherPage()) { window.location.assign(auth.baseUrl); return; }
      } else await client.logout();
      form.reset(); hidePassword(); render(); query("#studentDialogTitle").focus();
    }
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
    query(client.current || teacherClient?.current ? ".student-dialog-account h2" : "#studentDialogTitle").focus();
    try { await Promise.all([auth.ready, auth.teacherReady]); render(); } catch (failure) { message(error, failure.message); }
  };
})();
