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

function resolveSupportBookingUrl(config) {
  const safeUrl = value => {
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : ""; }
    catch { return ""; }
  };
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config?.email || "") ? config.email : "";
  return safeUrl(config?.bookingUrl) || (email ? `mailto:${email}?subject=${encodeURIComponent("預約諮詢")}` : "") || safeUrl(config?.lineUrl);
}

document.addEventListener("DOMContentLoaded", () => {
  const opener = document.getElementById("supportAuthorButton");
  const dialog = document.getElementById("supportDialog");
  const paymentLink = document.getElementById("supportPaymentLink");
  const pending = document.getElementById("supportPaymentPending");
  const note = document.getElementById("supportPaymentNote");
  if (!opener || !dialog || !paymentLink || !pending || !note || typeof dialog.showModal !== "function") return;

  const paymentUrl = resolveSupportPaymentUrl(window.YUHSIN_SUPPORT_CONFIG);
  const bookingLink = document.getElementById("supportBookingLink");
  const bookingPending = document.getElementById("supportBookingPending");
  const bookingUrl = resolveSupportBookingUrl(window.YUHSIN_CONTACT_CONFIG);
  if (bookingLink && bookingUrl) {
    bookingLink.href = bookingUrl;
    bookingLink.hidden = false;
    if (bookingPending) bookingPending.hidden = true;
    if (bookingUrl.startsWith("https:")) { bookingLink.target = "_blank"; bookingLink.rel = "noopener noreferrer"; }
    bookingLink.addEventListener("click", () => window.YuhsinUsage?.event("contact-click", "預約諮詢"));
  }
  if (paymentUrl) {
    paymentLink.href = paymentUrl;
    paymentLink.hidden = false;
    pending.hidden = true;
    note.hidden = false;
    const pendingNote = document.getElementById("supportPendingNote");
    if (pendingNote) pendingNote.hidden = true;
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
