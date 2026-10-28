/* Local-only authentication preview. Personal data stays in ignored work/.
   This is not a production server and does not provide cloud data syncing. */
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const scrypt = promisify(crypto.scrypt);
const SITE_ROOT = path.resolve(__dirname, "../site");
const COOKIE = "yuhsin_student_preview";
const SESSION_AGE = 2 * 60 * 60 * 1000;
const digest = token => crypto.createHash("sha256").update(token).digest("hex");

function loadRoster(filename) {
  const file = path.resolve(filename);
  const privateRoot = path.resolve(__dirname, "../work/student-login");
  const relative = path.relative(privateRoot, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw Error("Roster must be inside work/student-login/");
  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  if (payload.schemaVersion !== 1 || !Array.isArray(payload.students)) throw Error("Unsupported private roster format");
  return payload.students;
}

function createPreviewServer(students, options = {}) {
  const users = new Map(), sessions = new Map(), attempts = new Map();
  const salt = crypto.randomBytes(32);
  for (const student of students) {
    if (!/^[A-Za-z]{2}[0-9]{5}$/.test(student.studentId) || users.has(student.studentId.toUpperCase()) || !student.id || !student.name) throw Error("Invalid private roster");
    users.set(student.studentId.toUpperCase(), { student, hash: crypto.scryptSync(student.studentId, salt, 32) });
  }
  const dummy = crypto.scryptSync(crypto.randomBytes(32), salt, 32);
  const now = options.now || Date.now;
  function json(response, status, data, headers = {}) {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers });
    response.end(JSON.stringify(data));
  }
  function publicStudent(student) {
    return Object.fromEntries(["id", "studentId", "name", "teachingGroup", "originalClass", "originalSeatNumber"].map(key => [key, String(student[key] || "")]));
  }
  function sessionFrom(request) {
    const token = (request.headers.cookie || "").split(";").map(v => v.trim()).find(v => v.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const key = digest(token), session = sessions.get(key);
    if (!session) return null;
    if (session.expires <= now() || !users.get(session.studentId.toUpperCase())?.student.active) { sessions.delete(key); return null; }
    return { ...session, key };
  }
  async function body(request) {
    let text = "";
    for await (const chunk of request) { text += chunk; if (Buffer.byteLength(text) > 2048) throw Error("BODY_TOO_LARGE"); }
    return JSON.parse(text);
  }
  const server = http.createServer(async (request, response) => {
    try {
      const expectedHost = `127.0.0.1:${server.address().port}`;
      if (request.headers.host !== expectedHost) return json(response, 403, { error: "FORBIDDEN" });
      const expectedOrigin = "http://" + expectedHost;
      const url = new URL(request.url, expectedOrigin);
      if (url.pathname.startsWith("/api/")) {
        if (request.headers.origin && request.headers.origin !== expectedOrigin) return json(response, 403, { error: "FORBIDDEN" });
        if (request.method === "POST" && (request.headers.origin !== expectedOrigin || !/^application\/json(?:;|$)/.test(request.headers["content-type"] || ""))) return json(response, 403, { error: "FORBIDDEN" });
        if (url.pathname === "/api/student-auth/login" && request.method === "POST") {
          const payload = await body(request);
          const sid = typeof payload.studentId === "string" ? payload.studentId : "";
          const password = typeof payload.password === "string" ? payload.password : "";
          // Do not log either input or retain it in browser storage.
          if (!/^[A-Za-z]{2}[0-9]{5}$/.test(sid) || !password || password.length > 128) return json(response, 401, { error: "INVALID_CREDENTIALS" });
          for (const [key, value] of attempts) if (value.until <= now()) attempts.delete(key);
          const attemptKey = digest(sid.toUpperCase()), limit = attempts.get(attemptKey) || { count: 0, until: now() + 10 * 60 * 1000 };
          attempts.set(attemptKey, limit);
          const totalKey = "all", total = attempts.get(totalKey) || { count: 0, until: now() + 10 * 60 * 1000 };
          attempts.set(totalKey, total);
          if (limit.count >= 10 || total.count >= 100) return json(response, 429, { error: "RATE_LIMIT" });
          const user = users.get(sid.toUpperCase()), candidate = await scrypt(password, salt, 32);
          if (!user || !crypto.timingSafeEqual(candidate, user.hash || dummy) || !user.student.active) { limit.count++; total.count++; return json(response, 401, { error: "INVALID_CREDENTIALS" }); }
          attempts.delete(attemptKey);
          const previous = sessionFrom(request); if (previous) sessions.delete(previous.key);
          for (const [key, value] of sessions) if (value.expires <= now()) sessions.delete(key);
          const token = crypto.randomBytes(32).toString("hex");
          sessions.set(digest(token), { studentId: sid, expires: now() + SESSION_AGE });
          return json(response, 200, { student: publicStudent(user.student) }, { "Set-Cookie": `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_AGE / 1000}` });
        }
        if (url.pathname === "/api/student-auth/session" && request.method === "GET") {
          const session = sessionFrom(request);
          return session ? json(response, 200, { student: publicStudent(users.get(session.studentId).student) }) : json(response, 401, { error: "NOT_SIGNED_IN" });
        }
        if (url.pathname === "/api/student-auth/logout" && request.method === "POST") {
          const session = sessionFrom(request); if (session) sessions.delete(session.key);
          return json(response, 200, { ok: true }, { "Set-Cookie": `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` });
        }
        return json(response, 404, { error: "NOT_FOUND" });
      }
      if (!["GET", "HEAD"].includes(request.method)) return json(response, 405, { error: "METHOD_NOT_ALLOWED" });
      if (url.pathname === "/student-auth-config.js") {
        response.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store" });
        return response.end('window.YUHSIN_STUDENT_AUTH_CONFIG=Object.freeze({enabled:true,apiBasePath:"/api/student-auth"});');
      }
      let decoded;
      try { decoded = decodeURIComponent(url.pathname); } catch { return json(response, 400, { error: "BAD_PATH" }); }
      if (decoded.includes("\\") || decoded.includes("\0")) return json(response, 404, { error: "NOT_FOUND" });
      let file = path.resolve(SITE_ROOT, "." + decoded);
      const relative = path.relative(SITE_ROOT, file);
      if (relative.startsWith("..") || path.isAbsolute(relative)) return json(response, 404, { error: "NOT_FOUND" });
      let stat; try { stat = await fs.promises.stat(file); } catch { return json(response, 404, { error: "NOT_FOUND" }); }
      if (stat.isDirectory()) {
        if (!url.pathname.endsWith("/")) { response.writeHead(302, { Location: url.pathname + "/" + url.search }); return response.end(); }
        file = path.join(file, "index.html");
      }
      let content; try { content = await fs.promises.readFile(file); } catch { return json(response, 404, { error: "NOT_FOUND" }); }
      const mime = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon" };
      const headers = { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin" };
      if (url.pathname.startsWith("/login/")) headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
      response.writeHead(200, headers); response.end(request.method === "HEAD" ? undefined : content);
    } catch { if (!response.headersSent) json(response, 400, { error: "INVALID_REQUEST" }); else response.end(); }
  });
  return server;
}

if (require.main === module) {
  const rosterArg = process.argv[2], port = Number(process.argv[3] || 5180);
  if (!rosterArg || !Number.isInteger(port) || port < 1024 || port > 65535) { console.error("Usage: node tools/serve-student-login.js work/student-login/roster.json [port]"); process.exit(1); }
  try {
    const students = loadRoster(rosterArg), server = createPreviewServer(students);
    server.on("error", () => { console.error("Unable to start local login preview; check the port."); process.exitCode = 1; });
    server.listen(port, "127.0.0.1", () => console.log(`Local student login preview: http://127.0.0.1:${port}/login/ (${students.length} private accounts; local preview only)`));
  } catch { console.error("Unable to load private roster. Run prepare_student_roster.py first."); process.exitCode = 1; }
}
module.exports = { createPreviewServer, loadRoster };
