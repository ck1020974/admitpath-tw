(function () {
  "use strict";
  const auth = window.YuhsinStudentAuth;
  if (!auth) return;
  const target = new URL(auth.safeReturnUrl(new URLSearchParams(location.search).get("return"), auth.baseUrl));
  target.searchParams.set("login", "1");
  location.replace(target.href);
})();
