'use strict';
const assert = require('node:assert/strict');
const { createClient, publicKeyValid } = require('../site/student-supabase');
const url = 'https://abcdefghijklmnopqrst.supabase.co';
const config = { enabled: true, supabaseUrl: url, publishableKey: 'sb_publishable_fixture' };
const student = { id: 'student-fixture', student_id: 'ZZ00001', name: '虛構學生', teaching_group: '10A', original_class: '1002', original_seat_number: '08', active: true };
const result = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const token = { access_token: 'access-fixture', refresh_token: 'refresh-fixture', expires_in: 3600 };
function storage() { const data = new Map(); return { getItem: k => data.get(k), setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k), data }; }
async function main() {
  assert.equal(publicKeyValid('sb_secret_never_public'), false);
  assert.equal(publicKeyValid('x.' + Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') + '.x'), false);
  assert.equal(publicKeyValid('x.' + Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url') + '.x'), true);
  const saved = storage(), calls = [];
  const fetcher = async (path, options) => {
    calls.push({ path, options });
    assert.equal(new URL(path).origin, url); assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
    if (path.includes('/functions/')) { assert.deepEqual(JSON.parse(options.body), { studentId: 'ZZ00001', password: 'fixture-password' }); return result(token); }
    if (path.includes('/auth/v1/user')) return result({ id: student.id });
    if (path.includes('/rest/v1/students?')) { assert.equal(options.headers.Authorization, 'Bearer access-fixture'); return result([student]); }
    if (path.includes('/auth/v1/logout')) return result(null, 204);
    throw Error('Unexpected endpoint');
  };
  const client = createClient({ config, storage: saved, fetcher });
  assert.equal(await client.session(), null);
  const profile = await client.login('ZZ00001','fixture-password');
  assert.equal(profile.teachingGroup,'10A'); assert.equal(profile.originalClass,'1002'); assert.equal(profile.role,'student');
  assert.ok([...saved.data.values()].every(s => !s.includes('fixture-password') && !s.includes(student.name)), 'passwords and profile data are not stored');
  const fresh = createClient({ config, storage: saved, fetcher });
  assert.equal((await fresh.session()).id, student.id, 'a restored session is revalidated by Auth and RLS');
  await fresh.logout(); assert.equal(saved.data.size, 0); assert.equal(fresh.current, null);
  const disabled = createClient({ config: { ...config, enabled: false }, fetcher: async () => { throw Error('Must not call'); } });
  assert.equal(disabled.enabled,false); assert.equal(await disabled.session(),null);
  await assert.rejects(disabled.login('ZZ00001','x'), /尚未開放/);
  const blocked = createClient({ config, storage: storage(), fetcher: async path => path.includes('/functions/') ? result(token) : path.includes('/auth/v1/user') ? result({ id: student.id }) : result([]) });
  await assert.rejects(blocked.login('ZZ00001','x'), /帳號暫時無法使用/); assert.equal(blocked.current,null);
  const old = storage(); old.setItem('yuhsin-student-session:abcdefghijklmnopqrst.supabase.co', JSON.stringify({ ...token, expires_at: 1 }));
  let refreshed = 0;
  const rotating = createClient({ config, storage: old, fetcher: async path => {
    if(path.includes('grant_type=refresh_token')) { refreshed++; return result(token); }
    return path.includes('/auth/v1/user') ? result({ id: student.id }) : result([student]);
  }});
  assert.equal((await rotating.session()).id,student.id); assert.equal(refreshed,1);
  console.log('Supabase student client: public-key restrictions, cross-origin bearer auth, no password persistence, profile revalidation, A/original class preservation, disabled accounts, refresh and logout passed.');
}
main().catch(error=>{ console.error(error); process.exitCode=1; });
