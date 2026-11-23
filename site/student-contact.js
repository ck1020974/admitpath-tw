/* 學生登入後的信箱設定。
   - 名單學生（學號帳號）尚未綁定登入信箱：必填「綁定登入信箱」，不能略過；綁定後改用信箱登入，學號不能再登入。
   - 其他帳號缺信箱或同意版本：邀請填寫，可以按「略過」，之後在「帳號」補填。
   說明文字有修改時，請把 VERSION 改成修改當天的日期，學生下次登入會重新確認。 */
(function (root) {
  "use strict";
  const VERSION = "2026-10-30";
  const CONTACT = "yuhsinlee@kcislk.ntpc.edu.tw";
  const NOTICE = `<p class="student-contact-notice-text">本網站蒐集你的信箱，將用於帳號聯絡與服務通知；若經勾選也會寄送升學相關資訊。資料僅由本網站管理者使用，存放於雲端資料庫，不公開、不提供給第三方，保存至你要求刪除或帳號停用為止。你可隨時在「帳號」修改信箱或取消接收；如需查詢、更正或刪除，請來信 <a href="mailto:${CONTACT}">${CONTACT}</a>。</p>`;
  const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></svg>';
  let dialog, checking = null, binding = false;

  // 略過的紀錄存在這台電腦，同一版說明不再跳出；說明改版（VERSION 改變）才會再詢問一次。
  const skipKey = id => "yuhsin-contact-skip:" + id;
  function skipped(id) { try { return root.localStorage.getItem(skipKey(id)) === VERSION; } catch { return false; } }
  function remember(id) { try { root.localStorage.setItem(skipKey(id), VERSION); } catch {} }
  function needsSetup(info) { return !info || !info.email || info.consentVersion !== VERSION; }

  function build(auth) {
    dialog = root.document.createElement("dialog");
    dialog.className = "student-login-dialog student-contact-dialog";
    dialog.setAttribute("aria-labelledby", "studentContactTitle");
    dialog.innerHTML = `
      <h2 id="studentContactTitle" tabindex="-1">帳號設定</h2>
      <p class="student-contact-lead"></p>
      <form class="student-dialog-form" novalidate>
        <label>信箱<input name="email" type="email" maxlength="254" autocomplete="email" spellcheck="false" autocapitalize="off" placeholder="name@example.com" required></label>
        <label class="student-bind-only">新密碼（選填）<span class="student-password-wrap"><input name="password" type="password" maxlength="72" autocomplete="new-password" placeholder="不改請留空，至少 8 個字元"><button class="student-password-toggle" type="button" aria-label="顯示密碼" aria-pressed="false">${EYE}</button></span></label>
        <p class="student-dialog-hint student-bind-only">目前密碼是你的學號；建議設定新密碼，之後用信箱＋新密碼登入。</p>
        <label class="student-contact-check"><input name="updates" type="checkbox"><span>我想要收到升學相關資訊</span></label>
        <label class="student-contact-check"><input name="consent" type="checkbox" required><span>我同意<button class="student-contact-notice-toggle" type="button" aria-expanded="false">蒐集說明</button><em>（送出時必勾）</em></span></label>
        <div class="student-contact-notice" hidden>${NOTICE}</div>
        <p class="student-dialog-error" role="alert" hidden></p>
        <button class="student-dialog-submit" type="submit">送出</button>
        <button class="student-contact-skip" type="button">略過，先不填</button>
      </form>
      <div class="student-bind-done" hidden>
        <p>綁定完成！之後請用 <strong></strong> 登入，學號不能再用來登入。</p>
        <button class="student-dialog-submit" type="button">好</button>
      </div>`;
    root.document.body.append(dialog);
    const form = dialog.querySelector("form");
    const { email, consent, updates, password } = form.elements;
    const submit = form.querySelector(".student-dialog-submit");
    const error = dialog.querySelector(".student-dialog-error");
    const toggle = dialog.querySelector(".student-contact-notice-toggle");
    const notice = dialog.querySelector(".student-contact-notice");
    const skipButton = dialog.querySelector(".student-contact-skip");
    const eye = dialog.querySelector(".student-password-toggle");
    const done = dialog.querySelector(".student-bind-done");
    const show = text => { error.textContent = text; error.hidden = !text; };
    // 一般信箱設定可以略過；綁定登入信箱時改成「登出」，不能略過。
    const skip = () => { const id = auth.client.current?.id; if (id) remember(id); close(); };
    skipButton.addEventListener("click", async () => {
      if (!binding) return skip();
      skipButton.disabled = true;
      try { await auth.client.logout(); } catch {}
      close();
      auth.renderLinks();
    });
    dialog.addEventListener("cancel", event => { event.preventDefault(); if (!binding) skip(); });
    toggle.addEventListener("click", () => {
      notice.hidden = !notice.hidden;
      toggle.setAttribute("aria-expanded", String(!notice.hidden));
    });
    eye.addEventListener("click", () => {
      const reveal = password.type === "password";
      password.type = reveal ? "text" : "password";
      eye.setAttribute("aria-pressed", String(reveal));
      eye.setAttribute("aria-label", reveal ? "隱藏密碼" : "顯示密碼");
    });
    form.addEventListener("input", event => event.target.removeAttribute?.("aria-invalid"));
    done.querySelector("button").addEventListener("click", () => { close(); auth.renderLinks(); });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (submit.disabled) return;
      show(""); email.removeAttribute("aria-invalid");
      if (!EMAIL_PATTERN.test(email.value.trim())) { email.setAttribute("aria-invalid", "true"); email.focus(); return show("請輸入正確的信箱。"); }
      if (binding && password.value && password.value.length < 8) { password.setAttribute("aria-invalid", "true"); password.focus(); return show("新密碼至少 8 個字元；不改密碼請留空。"); }
      if (!consent.checked) { consent.focus(); return show("請勾選同意蒐集說明，才能繼續使用。"); }
      submit.disabled = true; submit.textContent = "送出中…";
      try {
        const values = { email: email.value, wantsUpdates: updates.checked, consentVersion: VERSION };
        const info = binding
          ? await auth.client.bindLoginEmail({ ...values, password: password.value })
          : await auth.client.saveContact(values);
        password.value = "";
        root.dispatchEvent(new CustomEvent("yuhsin-contact-change", { detail: info }));
        if (binding) {
          binding = false;
          done.querySelector("strong").textContent = info.email;
          form.hidden = true; done.hidden = false;
          dialog.querySelector(".student-contact-lead").hidden = true;
          dialog.querySelector("h2").focus();
          return;
        }
        close();
      } catch (failure) {
        const field = { email, password, consent }[failure.field];
        if (field && field !== consent) field.setAttribute("aria-invalid", "true");
        show(failure.message);
        field?.focus();
      } finally { submit.disabled = false; submit.textContent = "送出"; }
    });
  }

  function close() {
    if (dialog?.open) dialog.close();
    root.document.documentElement.classList.remove("student-contact-open");
  }

  function open(auth, info, mode) {
    if (!dialog) build(auth);
    binding = mode === "bind";
    const form = dialog.querySelector("form");
    form.reset(); form.hidden = false;
    form.querySelectorAll("[aria-invalid]").forEach(element => element.removeAttribute("aria-invalid"));
    dialog.querySelector(".student-bind-done").hidden = true;
    dialog.querySelectorAll(".student-bind-only").forEach(element => { element.hidden = !binding; });
    const skipButton = dialog.querySelector(".student-contact-skip");
    skipButton.textContent = binding ? "先登出" : "略過，先不填";
    skipButton.disabled = false;
    dialog.querySelector(".student-dialog-error").hidden = true;
    dialog.querySelector("h2").textContent = binding ? "綁定登入信箱" : "帳號設定";
    const lead = dialog.querySelector(".student-contact-lead");
    lead.hidden = false;
    lead.textContent = binding ? "網站改為一律用信箱登入。請填寫你常用的信箱，綁定後請用這個信箱登入，學號將不能再登入。"
      : info?.email ? "蒐集說明已更新，請確認信箱並重新勾選同意。"
      : "留下信箱，可以收到帳號通知；也可以先略過，之後在「帳號」補填。";
    if (info?.email) form.elements.email.value = info.email;
    if (info?.wantsUpdates) form.elements.updates.checked = true;
    if (!dialog.open) { root.document.documentElement.classList.add("student-contact-open"); dialog.showModal(); }
    dialog.querySelector("h2").focus();
  }

  // 登入狀態改變時呼叫。資料庫尚未設定或暫時連不上時不擋人，下次載入再檢查。
  function check(auth) {
    const student = auth.client.current;
    if (!student || student.role === "teacher" || typeof auth.client.readContact !== "function") { close(); return Promise.resolve(); }
    if (checking) return checking;
    checking = auth.client.readContact()
      .then(info => {
        if (auth.client.current?.id !== student.id) return;
        if (student.needsEmailBinding && typeof auth.client.bindLoginEmail === "function") open(auth, info, "bind");
        else if (needsSetup(info) && !skipped(student.id)) open(auth, info);
      })
      .catch(() => { if (student.needsEmailBinding && auth.client.current?.id === student.id) open(auth, null, "bind"); })
      .finally(() => { checking = null; });
    return checking;
  }

  // 帳號視窗補填信箱時使用：還沒同意蒐集說明的學生，改開這個視窗一起勾選。
  function openSetup(auth, info) { open(auth, info, auth.client.current?.needsEmailBinding ? "bind" : undefined); }

  root.YuhsinStudentContact = { VERSION, NOTICE, EMAIL_PATTERN, check, needsSetup, openSetup };
})(window);
