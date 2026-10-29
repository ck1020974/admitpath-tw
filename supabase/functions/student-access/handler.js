/* No SDK or customer data is bundled here. Compatible with Deno and Node tests. */
export function createHandler({ projectUrl, publicKey, serviceKey, allowedOrigins, fetcher = fetch, cryptoApi = crypto }) {
  const allowed = new Set(allowedOrigins);
  return async function handle(request) {
    const origin = request.headers.get('origin') || '';
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Vary': 'Origin' };
    if (allowed.has(origin)) Object.assign(headers, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' });
    const json = (status, data) => new Response(JSON.stringify(data), { status, headers });
    if (!allowed.has(origin)) return json(403, { error: 'FORBIDDEN_ORIGIN' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });
    if (!projectUrl || !publicKey || !serviceKey) return json(503, { error: 'NOT_CONFIGURED' });
    if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || '')) return json(400, { error: 'INVALID_REQUEST' });
    try {
      const raw = await request.text();
      if (raw.length > 2048) return json(413, { error: 'INVALID_REQUEST' });
      const { studentId, password } = JSON.parse(raw);
      if (typeof studentId !== 'string' || !/^[A-Za-z]{2}[0-9]{5}$/.test(studentId) || typeof password !== 'string' || !password || password.length > 128) return json(401, { error: 'INVALID_CREDENTIALS' });
      const sid = studentId.toUpperCase();
      const bucket = [...new Uint8Array(await cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode('student-login:' + sid)))].map(n => n.toString(16).padStart(2, '0')).join('');
      const serverHeaders = { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json' };
      const post = (url, body, header = serverHeaders) => fetcher(projectUrl + url, { method: 'POST', headers: header, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
      const limit = await post('/rest/v1/rpc/consume_student_login_attempt', { bucket_key: bucket });
      if (!limit.ok) return json(503, { error: 'SERVICE_UNAVAILABLE' });
      if ((await limit.json()) !== true) return json(429, { error: 'RATE_LIMITED' });
      const lookup = await post('/rest/v1/rpc/lookup_student_login', { account_id: sid });
      if (!lookup.ok) return json(503, { error: 'SERVICE_UNAVAILABLE' });
      const email = await lookup.json();
      // Missing accounts also take the Auth path; do not reveal roster membership.
      const result = await post('/auth/v1/token?grant_type=password', { email: email || 'unregistered@student.invalid', password }, { apikey: publicKey, 'Content-Type': 'application/json' });
      if (!result.ok || !email) return json(401, { error: 'INVALID_CREDENTIALS' });
      const token = await result.json();
      return json(200, { access_token: token.access_token, refresh_token: token.refresh_token, expires_in: token.expires_in, expires_at: token.expires_at });
    } catch { return json(503, { error: 'SERVICE_UNAVAILABLE' }); }
  };
}
