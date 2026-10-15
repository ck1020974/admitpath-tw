function resolveSupportPaymentUrl(config) {
  if (config?.enabled !== true || typeof config.paymentUrl !== "string") return "";
  try {
    const url = new URL(config.paymentUrl.trim());
    const supported = ["ecpay.com.tw", "opay.tw"].some(
      host => url.hostname === host || url.hostname.endsWith(`.${host}`)
    );
    if (url.protocol !== "https:" || url.username || url.password || url.port || !supported) return "";
    return url.href;
  } catch {
    return "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const opener = document.getElementById("supportAuthorButton");
  const dialog = document.getElementById("supportDialog");
  const paymentLink = document.getElementById("supportPaymentLink");
  const pending = document.getElementById("supportPaymentPending");
  const note = document.getElementById("supportPaymentNote");
  if (!opener || !dialog || !paymentLink || !pending || !note || typeof dialog.showModal !== "function") return;

  const paymentUrl = resolveSupportPaymentUrl(window.YUHSIN_SUPPORT_CONFIG);
  if (paymentUrl) {
    paymentLink.href = paymentUrl;
    paymentLink.hidden = false;
    pending.hidden = true;
    note.hidden = false;
  }
  opener.hidden = false;
  opener.addEventListener("click", () => dialog.showModal());
  // 原生 dialog 提供焦點限制、Escape 關閉及關閉後焦點回復。
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
});
