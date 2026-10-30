/* 學生首次登入：填寫信箱與同意事項（必填才能繼續使用登入後的功能）。
   說明文字有修改時，請把 VERSION 改成修改當天的日期，學生下次登入會重新確認。 */
(function (root) {
  "use strict";
  const VERSION = "2026-10-30";
  const CONTACT = "yuhsinlee@kcislk.ntpc.edu.tw";
  const NOTICE = `<p class="student-contact-notice-text">本網站蒐集你的信箱，將用於帳號聯絡與服務通知；若經勾選也會寄送升學相關資訊。資料僅由本網站管理者使用，存放於雲端資料庫，不公開、不提供給第三方，保存至你要求刪除或帳號停用為止。你可隨時在「帳號」修改信箱或取消接收；如需查詢、更正或刪除，請來信 <a href="mailto:${CONTACT}">${CONTACT}</a>。</p>`;
  const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  let dialog, checking = null;

  function needsSetup(info) { return !info || !info.email || info.consentVersion !== VERSION; }

  function build(auth) {
    dialog = root.document.createElement("dialog");
    dialog.className = "student-login-dialog student-contact-dialog";
    dialog.setAttribute("aria-labelledby", "studentContactTitle");
    dialog.innerHTML = `
      <h2 id="studentContactTitle" tabindex="-1">帳號設定</h2>
      <p class="student-contact-lead">請留下你的信箱，完成後即可開始使用。</p>
      <form class="student-dialog-form" novalidate>
        <label>信箱<input name="email" type="email" maxlength="254" autocomplete="email" spellcheck="false" autocapitalize="off" placeholder="name@example.com" required></label>
        <label class="student-contact-check"><input name="updates" type="checkbox"><span>我想要收到升學相關資訊</span></label>
        <label class="student-contact-check"><input name="consent" type="checkbox" required><span>我同意<button class="student-contact-notice-toggle" type="button" aria-expanded="false">蒐集說明</button><em>（必勾）</em></span></label>
        <div class="student-contact-notice" hidden>${NOTICE}</div>
        <p class="student-dialog-error" role="alert" hidden></p>
        <button class="student-dialog-submit" type="submit">送出</button>
      </form>`;
    root.document.body.append(dialog);
    const form = dialog.querySelector("form");
    const { email, consent, updates } = form.elements;
    const submit = dialog.querySelector(".student-dialog-submit");
    const error = dialog.querySelector(".student-dialog-error");
    const toggle = dialog.querySelector(".student-contact-notice-toggle");
    const notice = dialog.querySelector(".student-contact-notice");
    const show = text => { error.textContent = text; error.hidden = !text; };
    // 必填：Esc 與點背景都不能關閉。
    dialog.addEventListener("cancel", event => event.preventDefault());
    toggle.addEventListener("click", () => {
      notice.hidden = !notice.hidden;
      toggle.setAttribute("aria-expanded", String(!notice.hidden));
    });
    email.addEventListener("input", () => email.removeAttribute("aria-invalid"));
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (submit.disabled) return;
      show(""); email.removeAttribute("aria-invalid");
      if (!EMAIL_PATTERN.test(email.value.trim())) { email.setAttribute("aria-invalid", "true"); email.focus(); return show("請輸入正確的信箱。"); }
      if (!consent.checked) { consent.focus(); return show("請勾選同意蒐集說明，才能繼續使用。"); }
      submit.disabled = true; submit.textContent = "送出中…";
      try {
        const info = await auth.client.saveContact({ email: email.value, wantsUpdates: updates.checked, consentVersion: VERSION });
        close();
        root.dispatchEvent(new CustomEvent("yuhsin-contact-change", { detail: info }));
      } catch (failure) {
        if (failure.field === "email") email.setAttribute("aria-invalid", "true");
        show(failure.message);
      } finally { submit.disabled = false; submit.textContent = "送出"; }
    });
  }

  function close() {
    if (dialog?.open) dialog.close();
    root.document.documentElement.classList.remove("student-contact-open");
  }

  function open(auth, info) {
    if (!dialog) build(auth);
    const form = dialog.querySelector("form");
    form.reset();
    if (info?.email) form.elements.email.value = info.email;
    if (info?.wantsUpdates) form.elements.updates.checked = true;
    if (info?.email) dialog.querySelector(".student-contact-lead").textContent = "蒐集說明已更新，請確認信箱並重新勾選同意。";
    if (!dialog.open) { root.document.documentElement.classList.add("student-contact-open"); dialog.showModal(); }
    dialog.querySelector("h2").focus();
  }

  // 登入狀態改變時呼叫。資料庫尚未設定或暫時連不上時不擋人，下次載入再檢查。
  function check(auth) {
    const student = auth.client.current;
    if (!student || student.role === "teacher" || typeof auth.client.readContact !== "function") { close(); return Promise.resolve(); }
    if (checking) return checking;
    checking = auth.client.readContact()
      .then(info => { if (auth.client.current?.id === student.id && needsSetup(info)) open(auth, info); })
      .catch(() => {})
      .finally(() => { checking = null; });
    return checking;
  }

  root.YuhsinStudentContact = { VERSION, NOTICE, EMAIL_PATTERN, check, needsSetup };
})(window);
