/* Management-only provisioning. A job must be explicitly authorized in the
   private schema; its unguessable token expires and can be claimed only once.
   No student records, credentials, or bootstrap tokens are bundled in source. */
const url = Deno.env.get('SUPABASE_URL')!;
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers = { apikey: secret, Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json' };
const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
async function api(path: string, method = 'GET', body?: unknown, extra = {}) {
  const result = await fetch(url + path, { method, headers: { ...headers, ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
  if (!result.ok) throw new Error('PROVISION_REQUEST_FAILED');
  return result.status === 204 || result.headers.get('content-length') === '0' ? null : result.json().catch(() => null);
}
Deno.serve(async request => {
  if (request.method !== 'POST' || request.headers.has('origin')) return json(403, { error: 'FORBIDDEN' });
  let hash = '';
  let created = 0, updated = 0, failed = 0;
  try {
    const text = await request.text();
    if (text.length > 250000) return json(413, { error: 'INVALID_REQUEST' });
    const { token, students } = JSON.parse(text);
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || !Array.isArray(students) || !students.length || students.length > 1000) return json(400, { error: 'INVALID_REQUEST' });
    const seen = new Set();
    for (const s of students) {
      if (!/^[A-Za-z]{2}[0-9]{5}$/.test(s.studentId) || !/^[a-f0-9-]{36}$/.test(s.id) || typeof s.name !== 'string' || !s.name || !s.originalClass || !s.teachingGroup || seen.has(s.studentId.toUpperCase())) return json(400, { error: 'INVALID_ROSTER' });
      seen.add(s.studentId.toUpperCase());
    }
    hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))].map(n => n.toString(16).padStart(2, '0')).join('');
    if (!(await api('/rest/v1/rpc/claim_student_provision', 'POST', { token_hash_value: hash }))) return json(403, { error: 'IMPORT_NOT_AUTHORIZED' });
    const profiles = await api('/rest/v1/students?select=id,student_id,auth_email');
    const existing = new Map(profiles.map((s: any) => [s.student_id, s]));
    const users = new Map();
    for (let page = 1; page <= 100; page++) {
      const result = await api('/auth/v1/admin/users?page=' + page + '&per_page=200');
      for (const user of result.users || []) users.set(user.email, user);
      if ((result.users || []).length < 200) break;
    }
    for (const s of students) {
      try {
        const sid = s.studentId.toUpperCase();
        const previous: any = existing.get(sid);
        const email = previous?.auth_email || s.id + '@student.invalid';
        let user: any = previous ? { id: previous.id } : users.get(email);
        if (!user) { const made = await api('/auth/v1/admin/users', 'POST', { email, password: s.studentId, email_confirm: true }); user = made.user || made; users.set(email, user); }
        const fields = { name: s.name, teaching_group: s.teachingGroup, original_class: s.originalClass, original_seat_number: String(s.originalSeatNumber || '') };
        if (previous) { await api('/rest/v1/students?id=eq.' + previous.id, 'PATCH', fields); updated++; }
        else { await api('/rest/v1/students', 'POST', { id: user.id, student_id: sid, auth_email: email, ...fields }); created++; }
      } catch { failed++; }
    }
    await api('/rest/v1/rpc/finish_student_provision', 'POST', { token_hash_value: hash, created_value: created, updated_value: updated, failed_value: failed });
    return json(failed ? 500 : 200, { created, updated, failed });
  } catch { return json(500, { error: 'PROVISION_FAILED', created, updated, failed }); }
});
