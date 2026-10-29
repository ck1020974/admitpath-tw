/* Authorized live smoke check. Reads ignored local roster; prints no PII. */
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { supabaseUrl: url, publishableKey: key } = JSON.parse(fs.readFileSync('work/student-login/public-config.json', 'utf8'));
const { students } = JSON.parse(fs.readFileSync('work/student-login/roster.json', 'utf8'));
const sessions = [];
async function call(path, { token = key, body, origin, method } = {}) {
  const response = await fetch(url + path, { method: method || (body === undefined ? 'GET' : 'POST'), headers: { apikey: key, Authorization: 'Bearer ' + token, ...(origin ? { Origin: origin } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000) });
  return { status: response.status, data: await response.json().catch(() => null) };
}
(async () => {
  try {
    const anon = await call('/rest/v1/students?select=id');
    assert(anon.status >= 400 || anon.data.length === 0, 'Anonymous student data must be inaccessible');
    const badOrigin = await call('/functions/v1/student-access', { body: {}, origin: 'https://example.org' });
    assert.equal(badOrigin.status, 403);
    const samples = [students.find(s => s.teachingGroup === '10A'), students.find(s => s.teachingGroup !== '10A')];
    for (const student of samples) {
      const login = await call('/functions/v1/student-access', { body: { studentId: student.studentId.toLowerCase(), password: student.studentId }, origin: 'https://ck1020974.github.io' });
      assert.equal(login.status, 200, 'Sample login must succeed');
      const token = login.data.access_token;
      sessions.push(token);
      const user = await call('/auth/v1/user', { token });
      assert.equal(user.status, 200);
      const profile = await call('/rest/v1/students?select=id,name,student_id,teaching_group,original_class,original_seat_number,active', { token });
      assert.equal(profile.status, 200);
      assert.equal(profile.data.length, 1, 'Student can only read one profile');
      const own = profile.data[0];
      assert.equal(own.id, user.data.id);
      assert.equal(own.student_id, student.studentId.toUpperCase());
      assert.equal(own.name, student.name);
      assert.equal(own.teaching_group, student.teachingGroup);
      assert.equal(own.original_class, student.originalClass);
      assert.equal(own.original_seat_number, String(student.originalSeatNumber || ''));
      const internal = await call('/rest/v1/students?select=auth_email', { token });
      assert(internal.status >= 400, 'Internal login mapping must be private');
      const teacher = await call('/rest/v1/teacher_access?select=id', { token });
      assert(teacher.status >= 400 || teacher.data.length === 0, 'Student has no teacher access');
      const lookup = await call('/rest/v1/rpc/lookup_student_login', { token, body: { account_id: student.studentId } });
      assert(lookup.status >= 400, 'Private lookup RPC must reject student');
      const grant = await call('/rest/v1/teacher_access', { token, body: { id: user.data.id, name: 'Unauthorized', all_groups: true } });
      assert(grant.status >= 400, 'Student cannot grant teacher access');
      const notes = await call('/rest/v1/counseling_notes?select=id', { token });
      assert(notes.status >= 400 || notes.data.length === 0, 'Teacher notes must be private');
    }
    console.log(JSON.stringify({ sampleLogins: samples.length, ownProfileOnly: true, originalClassPreserved: true, anonymousDenied: true, teacherEscalationDenied: true, privateMappingDenied: true, wrongOriginDenied: true }));
  } finally {
    for (const token of sessions) {
      const out = await call('/auth/v1/logout?scope=local', { token, method: 'POST' });
      assert.equal(out.status, 204, 'Logout must succeed');
    }
  }
})().catch(error => { console.error('Live verification failed:', error.message); process.exitCode = 1; });
