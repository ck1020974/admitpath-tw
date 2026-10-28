"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { once } = require("node:events");
const { createPreviewServer } = require("./serve-student-login");
const { createClient, safeReturnUrl } = require("../site/student-auth");

async function main() {
  // All fixtures are invented. No real student identity belongs in source/tests.
  const student = { id: "test-student-one", studentId: "ZZ00001", name: "測試學生", teachingGroup: "10A", originalClass: "1002", originalSeatNumber: "08", active: true };
  let clock = Date.now();
  const server = createPreviewServer([student], { now: () => clock });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (route, data, cookie = "", origin = base) => fetch(base + "/api/student-auth" + route, {
    method: data === undefined ? "GET" : "POST", headers: { ...(data === undefined ? {} : { "Content-Type": "application/json", Origin: origin }), ...(cookie ? { Cookie: cookie } : {}) },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  try {
    assert.equal((await call("/session")).status, 401);
    assert.equal((await call("/login", { studentId: "ZZ99999", password: "ZZ99999" })).status, 401, "matching values alone cannot create a login");
    assert.equal((await call("/login", { studentId: student.studentId, password: "incorrect" })).status, 401);
    assert.equal((await call("/login", { studentId: student.studentId, password: student.studentId }, "", "https://other.example")).status, 403);
    let response = await call("/login", { studentId: student.studentId, password: student.studentId });
    assert.equal(response.status, 200);
    const cookieHeader = response.headers.get("set-cookie"), cookie = cookieHeader.split(";")[0];
    assert.match(cookieHeader, /HttpOnly/); assert.match(cookieHeader, /SameSite=Strict/);
    const result = await response.json();
    assert.deepEqual(result.student, Object.fromEntries(Object.entries(student).filter(([key]) => key !== "active")));
    assert.equal(result.student.teachingGroup, "10A"); assert.equal(result.student.originalClass, "1002", "A group and original class must remain distinct");
    assert.equal((await call("/session", undefined, cookie)).status, 200);
    clock += 2 * 60 * 60 * 1000 + 1;
    assert.equal((await call("/session", undefined, cookie)).status, 401, "expired sessions are rejected");
    response = await call("/login", { studentId: student.studentId.toLowerCase(), password: student.studentId });
    assert.equal(response.status, 200, "case-insensitive account lookup retains the original identifier");
    const nextCookie = response.headers.get("set-cookie").split(";")[0];
    assert.equal((await call("/logout", {}, nextCookie)).status, 200);
    assert.equal((await call("/session", undefined, nextCookie)).status, 401);
    for (let i = 0; i < 10; i++) await call("/login", { studentId: student.studentId, password: "wrong" });
    assert.equal((await call("/login", { studentId: student.studentId, password: student.studentId })).status, 429);
    assert.equal((await fetch(base + "/work/student-login/roster.json")).status, 404);
    assert.equal((await fetch(base + "/%2e%2e%5cwork/student-login/roster.json")).status, 404);
    assert.match(await (await fetch(base + "/student-auth-config.js")).text(), /enabled:true/);
    assert.equal((await fetch(base + "/login/")).status, 200);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }

  let fetches = 0;
  const disabled = createClient({ config: { enabled: false }, origin: base, fetcher: async () => { fetches++; } });
  assert.equal(await disabled.session(), null);
  await assert.rejects(disabled.login("ZZ00001", "ZZ00001"), /尚未開放/);
  assert.equal(fetches, 0, "public preview must never send account inputs");
  const external = createClient({ config: { enabled: true, apiBasePath: "https://other.example/api" }, origin: base });
  assert.equal(external.enabled, false, "configuration cannot send credentials to an arbitrary origin");
  const client = createClient({ config: { enabled: true, apiBasePath: "/api/student-auth" }, origin: base,
    fetcher: async (url, options) => { assert.equal(new URL(url).origin, base); assert.equal(options.credentials, "same-origin"); assert.equal(options.cache, "no-store"); return { ok: false, status: 401, json: async () => ({}) }; } });
  await assert.rejects(client.login("ZZ00001", "x"), /學號或密碼不正確/);
  const urlBase = "https://example.org/admitpath-tw/";
  assert.equal(safeReturnUrl("/admitpath-tw/#compare", urlBase), urlBase + "#compare");
  for (const invalid of ["https://other.example", "//other.example/", "javascript:alert(1)", "/another-site/", "/admitpath-tw/login/"]) assert.equal(safeReturnUrl(invalid, urlBase), urlBase);
  const config = fs.readFileSync(path.resolve(__dirname, "../site/student-auth-config.js"), "utf8");
  assert.match(config, /enabled: false/);
  console.log("Student login: roster-only verification, A/original class separation, cookie sessions, logout/expiry, rate limits, private-file isolation, disabled public preview and safe return links passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
