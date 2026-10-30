// 回到頂端：往下捲超過一個畫面就出現在右下角，點了平滑捲回頁首。
// 出現時在 body 加上 back-to-top-visible，讓「查看清單」浮動鈕往左讓出位置，箭頭排在它右邊。
(() => {
  const style = document.createElement("style");
  style.textContent = `
    .back-to-top {
      position: fixed; right: 28px; bottom: 24px; z-index: 9;
      display: grid; place-items: center; width: 46px; height: 46px; padding: 0;
      border: 1px solid rgba(8, 115, 119, .25); border-radius: 50%;
      background: #fff; color: #087377; cursor: pointer;
      box-shadow: 0 8px 22px rgba(16, 32, 51, .18);
      opacity: 0; transform: translateY(12px); pointer-events: none;
      transition: opacity .2s, transform .2s, bottom .2s, background .15s;
    }
    .back-to-top.show { opacity: 1; transform: none; pointer-events: auto; }
    .back-to-top:hover { background: #e8f7f5; }
    .back-to-top:focus-visible { outline: 3px solid #176b88; outline-offset: 3px; }
    @media (max-width: 720px) { .back-to-top { right: 16px; bottom: 16px; } }
    @media print { .back-to-top { display: none; } }
  `;
  document.head.appendChild(style);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "back-to-top";
  button.setAttribute("aria-label", "回到頂端");
  button.title = "回到頂端";
  button.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  button.addEventListener("click", () => {
    const smooth = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
  });
  const update = () => {
    const show = window.scrollY > window.innerHeight * 0.8;
    button.classList.toggle("show", show);
    document.body?.classList.toggle("back-to-top-visible", show);
  };
  const mount = () => { document.body.appendChild(button); update(); };
  window.addEventListener("scroll", update, { passive: true });
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
