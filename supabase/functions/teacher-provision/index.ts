/* Management bootstrap only. Passwords and account identifiers are supplied
   privately at execution; no credentials or token are bundled in source. */
const url = Deno.env.get('SUPABASE_URL')!;
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers = { apikey: secret, Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json' };
const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
async function api(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(url + path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error('MANAGEMENT_REQUEST_FAILED');
  return response.status === 204 ? null : response.json().catch(() => null);
}
Deno.serve(async request => {
  if (request.method !== 'POST' || request.headers.has('origin')) return json(403, { error: 'FORBIDDEN' });
  let hash = '', claimed = false;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return json(413, { error: 'INVALID_REQUEST' });
    const { token, username, password } = JSON.parse(raw);
    if (!/^[a-f0-9]{64}$/.test(token) || !/^[A-Za-z][A-Za-z0-9]{5,31}$/.test(username) || typeof password !== 'string' || password.length < 6 || password.length > 128) return json(400, { error: 'INVALID_REQUEST' });
    hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('teacher-provision:' + token)))].map(n => n.toString(16).padStart(2, '0')).join('');
    claimed = (await api('/rest/v1/rpc/claim_student_provision', 'POST', { token_hash_value: hash })) === true;
    if (!claimed) return json(403, { error: 'NOT_AUTHORIZED' });
    // Create only: never reset or upgrade an existing user's credentials.
    const email = username.toLowerCase() + '@teacher.invalid';
    const result = await api('/auth/v1/admin/users', 'POST', { email, password, email_confirm: true });
    const user = result.user || result;
    if (!user.id) throw Error('USER_NOT_CREATED');
    await api('/rest/v1/teacher_access', 'POST', { id: user.id, name: '教師', all_groups: true, can_manage_accounts: false, can_export: false });
    await api('/rest/v1/rpc/finish_student_provision', 'POST', { token_hash_value: hash, created_value: 1, updated_value: 0, failed_value: 0 });
    return json(200, { created: 1 });
  } catch {
    if (claimed) await api('/rest/v1/rpc/finish_student_provision', 'POST', { token_hash_value: hash, created_value: 0, updated_value: 0, failed_value: 1 }).catch(() => {});
    return json(500, { error: 'PROVISION_FAILED' });
  }
});
