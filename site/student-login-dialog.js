/* Compact login: one primary action, 44px controls, 16px field spacing. */
(function () {
  "use strict";
  const auth = window.YuhsinStudentAuth;
  const { client } = auth;
  const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const dialog = document.createElement("dialog");
  dialog.className = "student-login-dialog";
  dialog.setAttribute("aria-labelledby", "studentDialogTitle");
  dialog.innerHTML = `
    <button class="student-dialog-close" type="button" aria-label="關閉登入視窗">×</button>
    <section class="student-dialog-login">
      <h2 id="studentDialogTitle" tabindex="-1">登入</h2>
      <p class="student-dialog-status" role="status" hidden></p>
      <form class="student-dialog-form" method="post">
        <label>帳號<input name="username" type="text" maxlength="254" autocomplete="username" spellcheck="false" autocapitalize="off" placeholder="請輸入信箱" required></label>
        <label>密碼<span class="student-password-wrap"><input name="password" type="password" maxlength="128" autocomplete="current-password" placeholder="請輸入密碼" required><button class="student-password-toggle" type="button" aria-label="顯示密碼" aria-pressed="false">${EYE}</button></span></label>
        <p class="student-dialog-hint">請用信箱登入。林口康橋同學若還沒綁定信箱，請先用學號登入完成綁定；教師請輸入教師帳號。</p>
        <p class="student-dialog-error" role="alert" hidden></p>
        <button class="student-dialog-submit" type="submit">登入</button>
        <button class="student-dialog-guest" type="button" hidden>訪客使用</button>
        <p class="student-dialog-switch">還沒有帳號？<button type="button" data-view="register">註冊會員</button></p>
      </form>
    </section>
    <section class="student-dialog-register" hidden>
      <h2 tabindex="-1">註冊會員</h2>
      <form class="student-dialog-form" method="post" novalidate>
        <label>姓名<input name="name" type="text" maxlength="50" autocomplete="name" placeholder="你的姓名" required></label>
        <label>信箱<input name="email" type="email" maxlength="254" autocomplete="email" spellcheck="false" autocapitalize="off" placeholder="name@example.com" required></label>
        <label>密碼<span class="student-password-wrap"><input name="password" type="password" minlength="8" maxlength="72" autocomplete="new-password" placeholder="至少 8 個字元" required><button class="student-password-toggle" type="button" aria-label="顯示密碼" aria-pressed="false">${EYE}</button></span></label>
        <div class="student-register-school">
          <label>縣市<select name="county" required><option value="">載入中…</option></select></label>
          <label>學校<select name="school" required disabled><option value="">請先選縣市</option></select></label>
        </div>
        <p class="student-dialog-hint student-register-source" hidden></p>
        <label class="student-contact-check"><input name="updates" type="checkbox"><span>我想要收到升學相關資訊</span></label>
        <label class="student-contact-check"><input name="consent" type="checkbox" required><span>我同意<button class="student-contact-notice-toggle" type="button" aria-expanded="false">蒐集說明</button><em>（必勾）</em></span></label>
        <div class="student-contact-notice" hidden></div>
        <p class="student-dialog-error" role="alert" hidden></p>
        <button class="student-dialog-submit" type="submit">註冊</button>
        <p class="student-dialog-switch">已經有帳號？<button type="button" data-view="login">登入</button></p>
      </form>
      <div class="student-register-done" hidden>
        <p>驗證信已寄到 <strong></strong>，請點開信中的連結完成註冊，再回來登入。</p>
        <p class="student-dialog-hint">沒收到？請看垃圾郵件匣，或稍後再試。</p>
        <button class="student-dialog-submit" type="button" data-view="login">前往登入</button>
      </div>
    </section>
    <section class="student-dialog-account" hidden>
      <h2 tabindex="-1">帳號</h2>
      <p class="student-dialog-name"></p>
      <dl></dl>
      <p class="student-dialog-error" role="alert" hidden></p>
      <div class="student-dialog-actions">
        <a class="student-dialog-teacher" href="#" hidden>進入教師後台</a>
        <button class="student-dialog-logout" type="button">登出</button>
      </div>
    </section>`;
  document.body.append(dialog);
  const query = selector => dialog.querySelector(selector);
  const login = query(".student-dialog-login");
  const account = query(".student-dialog-account");
  const form = query("form");
  const username = form.elements.username;
  const password = form.elements.password;
  const submit = query(".student-dialog-submit");
  const guest = query(".student-dialog-guest");
  const toggle = query(".student-password-toggle");
  const status = query(".student-dialog-status");
  const error = query(".student-dialog-login .student-dialog-error");
  const teacherClient = auth.teacherClient;
  const teacherUrl = new URL("teacher/", auth.baseUrl);
  const onTeacherPage = () => window.location.pathname.startsWith(teacherUrl.pathname);
  let busy = false;
  let opener;
  let view = "login";
  function message(element, text) { element.textContent = text; element.hidden = !text; }

  // ── 會員註冊 ──────────────────────────────────────────────
  const register = query(".student-dialog-register");
  const regForm = register.querySelector("form");
  const regFields = regForm.elements;
  const regSubmit = regForm.querySelector(".student-dialog-submit");
  const regError = regForm.querySelector(".student-dialog-error");
  const regToggle = regForm.querySelector(".student-password-toggle");
  const regDone = register.querySelector(".student-register-done");
  const regNotice = regForm.querySelector(".student-contact-notice");
  const regNoticeToggle = regForm.querySelector(".student-contact-notice-toggle");
  let schools = null, schoolsLoad = null, contactModule = null;
  function fillSelect(select, placeholder, options) {
    const first = new Option(placeholder, "");
    select.replaceChildren(first, ...options.map(([value, label]) => new Option(label, value)));
  }
  function loadSchools() {
    if (!schoolsLoad) schoolsLoad = fetch(new URL("data/schools.json?v=115", auth.baseUrl).href, { cache: "force-cache" })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => {
        schools = data;
        fillSelect(regFields.county, "請選擇縣市", data.counties.map(c => [c.name, c.name]));
        const source = register.querySelector(".student-register-source");
        source.textContent = `學校名單：教育部 ${data.year} 學年度高級中等學校名錄（${data.total} 所）`;
        source.hidden = false;
      })
      .catch(() => { schoolsLoad = null; fillSelect(regFields.county, "學校名單載入失敗，請重新開啟", []); });
    return schoolsLoad;
  }
  regFields.county.addEventListener("change", () => {
    const county = schools?.counties.find(c => c.name === regFields.county.value);
    fillSelect(regFields.school, county ? "請選擇學校" : "請先選縣市", county ? county.schools : []);
    regFields.school.disabled = !county;
  });
  function loadNotice() {
    if (contactModule) return Promise.resolve(contactModule);
    return auth.loadContact().then(module => { contactModule = module; regNotice.innerHTML = module.NOTICE; return module; });
  }
  regNoticeToggle.addEventListener("click", () => {
    regNotice.hidden = !regNotice.hidden;
    regNoticeToggle.setAttribute("aria-expanded", String(!regNotice.hidden));
  });
  regToggle.addEventListener("click", () => {
    const show = regFields.password.type === "password";
    regFields.password.type = show ? "text" : "password";
    regToggle.setAttribute("aria-pressed", String(show));
    regToggle.setAttribute("aria-label", show ? "隱藏密碼" : "顯示密碼");
  });
  regForm.addEventListener("input", event => event.target.removeAttribute?.("aria-invalid"));
  function invalid(field, text) {
    message(regError, text);
    if (field) { field.setAttribute("aria-invalid", "true"); field.focus(); }
  }
  regForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (regSubmit.disabled || !client.enabled || typeof client.signUp !== "function") return;
    message(regError, "");
    const { name, email, password: secret, county, school, updates, consent } = regFields;
    if (!name.value.trim()) return invalid(name, "請填寫姓名。");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())) return invalid(email, "請輸入正確的信箱。");
    if (secret.value.length < 8) return invalid(secret, "密碼至少需要 8 個字元。");
    if (!county.value) return invalid(county, "請選擇縣市。");
    if (!school.value) return invalid(school, "請選擇學校。");
    if (!consent.checked) return invalid(consent, "請勾選同意蒐集說明，才能註冊。");
    regSubmit.disabled = true; regSubmit.textContent = "註冊中…";
    try {
      const module = await loadNotice();
      const result = await client.signUp({ name: name.value, email: email.value, password: secret.value, schoolCode: school.value,
        wantsUpdates: updates.checked, consentVersion: module.VERSION, redirectTo: new URL("?verified=1", auth.baseUrl).href });
      secret.value = "";
      if (result?.confirm) {
        regDone.querySelector("strong").textContent = result.email;
        regForm.hidden = true; regDone.hidden = false;
        username.value = result.email;
        register.querySelector("h2").focus();
        return;
      }
      render();
      if (dialog.open) close();
    } catch (failure) {
      const field = { name, email, password: secret, school, consent }[failure.field] || (failure.code === "user_already_exists" || failure.code === "email_exists" ? email : null);
      invalid(field, failure.message);
    } finally { regSubmit.disabled = false; regSubmit.textContent = "註冊"; }
  });
  function showView(next) {
    view = next;
    if (next === "register") {
      regForm.hidden = false; regDone.hidden = true;
      message(regError, "");
      loadSchools(); loadNotice().catch(() => {});
    }
    render();
    query(next === "register" ? ".student-dialog-register h2" : "#studentDialogTitle").focus();
  }
  dialog.addEventListener("click", event => {
    const target = event.target.closest("[data-view]");
    if (target && dialog.contains(target)) showView(target.dataset.view);
  });
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
    // 已用信箱登入的帳號：信箱就是登入帳號，這裡只顯示、不能改。
    const loginEmail = key === "email" ? client.current?.email : "";
    if (loginEmail) {
      const span = document.createElement("span"); span.className = "student-contact-value"; span.textContent = loginEmail;
      cell.replaceChildren(span);
      return;
    }
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
    // 先前略過、還沒同意蒐集說明的學生：開啟信箱設定視窗，一次填好信箱並勾選同意。
    const setup = window.YuhsinStudentContact;
    if (!contact?.consentVersion && setup?.openSetup && window.YuhsinStudentAuth) {
      if (dialog.open) dialog.close();
      setup.openSetup(window.YuhsinStudentAuth, contact);
      return;
    }
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
    const cells = { email: contactRow(list, student.email ? "登入信箱" : "信箱", "email"), wantsUpdates: contactRow(list, "接收升學資訊", "wantsUpdates") };
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
    login.hidden = Boolean(student || teacher) || view !== "login";
    register.hidden = Boolean(student || teacher) || view !== "register";
    account.hidden = !(student || teacher);
    guest.hidden = !auth.entryPending;
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
      const school = [student.county, student.schoolName].filter(Boolean).join("／");
      const rows = student.accountType === "member"
        ? [["身分", "會員"], ["學校", school]]
        : [["學號", student.studentId], ["學校", school], ["原班級", student.originalClass], ["座號", student.originalSeatNumber]];
      for (const [label, text] of rows) {
        const row = document.createElement("div");
        const term = document.createElement("dt"), value = document.createElement("dd");
        term.textContent = label; value.textContent = text || "—";
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
    regFields.password.value = "";
    message(error, ""); message(regError, "");
    message(status, client.enabled ? "" : "登入尚未開放");
    view = "login";
    document.documentElement.classList.remove("student-dialog-open");
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    auth.settleEntry();
  });
  guest.addEventListener("click", () => {
    if (busy) return;
    auth.setGuestEntry(true);
    close();
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
      // 含 @ 的是自行註冊會員的信箱。
      if (accountId.includes("@")) {
        await client.loginEmail(accountId, password.value);
        password.value = ""; hidePassword(); render();
        if (dialog.open) close();
        return;
      }
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
      const byStudentId = /^[A-Za-z]{2}[0-9]{5}$/.test(username.value.trim());
      password.value = ""; hidePassword();
      message(error, failure.status === 401 && byStudentId ? failure.message + "已綁定信箱的同學請改用信箱登入。" : failure.message);
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
    if (dialog.open) { render(); return; }
    opener = document.activeElement;
    const notice = auth.takeVerifyNotice?.();
    if (notice) message(status, notice);
    render();
    document.documentElement.classList.add("student-dialog-open");
    dialog.showModal();
    // Focus the heading so mobile keyboards do not cover the form on opening.
    query(client.current || teacherClient?.current ? ".student-dialog-account h2" : "#studentDialogTitle").focus();
    try { await Promise.all([auth.ready, auth.teacherReady]); render(); } catch (failure) { message(error, failure.message); }
  };
})();
