/* 學生首次登入：邀請填寫信箱與同意事項。可以按「略過」先不填，之後在「帳號」補填。
   說明文字有修改時，請把 VERSION 改成修改當天的日期，學生下次登入會重新確認。 */
(function (root) {
  "use strict";
  const VERSION = "2026-10-30";
  const CONTACT = "yuhsinlee@kcislk.ntpc.edu.tw";
  const NOTICE = `<p class="student-contact-notice-text">本網站蒐集你的信箱，將用於帳號聯絡與服務通知；若經勾選也會寄送升學相關資訊。資料僅由本網站管理者使用，存放於雲端資料庫，不公開、不提供給第三方，保存至你要求刪除或帳號停用為止。你可隨時在「帳號」修改信箱或取消接收；如需查詢、更正或刪除，請來信 <a href="mailto:${CONTACT}">${CONTACT}</a>。</p>`;
  const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  let dialog, checking = null;

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
      <p class="student-contact-lead">留下信箱，可以收到帳號通知；也可以先略過，之後在「帳號」補填。</p>
      <form class="student-dialog-form" novalidate>
        <label>信箱<input name="email" type="email" maxlength="254" autocomplete="email" spellcheck="false" autocapitalize="off" placeholder="name@example.com" required></label>
        <label class="student-contact-check"><input name="updates" type="checkbox"><span>我想要收到升學相關資訊</span></label>
        <label class="student-contact-check"><input name="consent" type="checkbox" required><span>我同意<button class="student-contact-notice-toggle" type="button" aria-expanded="false">蒐集說明</button><em>（送出時必勾）</em></span></label>
        <div class="student-contact-notice" hidden>${NOTICE}</div>
        <p class="student-dialog-error" role="alert" hidden></p>
        <button class="student-dialog-submit" type="submit">送出</button>
        <button class="student-contact-skip" type="button">略過，先不填</button>
      </form>`;
    root.document.body.append(dialog);
    const form = dialog.querySelector("form");
    const { email, consent, updates } = form.elements;
    const submit = dialog.querySelector(".student-dialog-submit");
    const error = dialog.querySelector(".student-dialog-error");
    const toggle = dialog.querySelector(".student-contact-notice-toggle");
    const notice = dialog.querySelector(".student-contact-notice");
    const show = text => { error.textContent = text; error.hidden = !text; };
    // 不填也能使用：按「略過」或 Esc 都會關閉，並記住這次的選擇。
    const skip = () => { const id = auth.client.current?.id; if (id) remember(id); close(); };
    dialog.querySelector(".student-contact-skip").addEventListener("click", skip);
    dialog.addEventListener("cancel", event => { event.preventDefault(); skip(); });
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
      .then(info => { if (auth.client.current?.id === student.id && needsSetup(info) && !skipped(student.id)) open(auth, info); })
      .catch(() => {})
      .finally(() => { checking = null; });
    return checking;
  }

  // 帳號視窗補填信箱時使用：還沒同意蒐集說明的學生，改開這個視窗一起勾選。
  function openSetup(auth, info) { open(auth, info); }

  root.YuhsinStudentContact = { VERSION, NOTICE, EMAIL_PATTERN, check, needsSetup, openSetup };
})(window);
