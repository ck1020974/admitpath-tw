/* Receives credentials and private roster on hidden stdin; prints counts only. */
'use strict';
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
let input = '';
console.log('Ready for private import JSON on stdin (input is hidden).');
process.stdin.on('data', async chunk => {
  if (chunk.includes('\u0003')) process.exit(130);
  input += chunk;
  if (!/[\r\n]/.test(input)) return;
  process.stdin.pause();
  try {
    const { projectUrl, anonKey, token, students } = JSON.parse(input.trim());
    input = '';
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(projectUrl) || !/^eyJ/.test(anonKey) || !/^[a-f0-9]{64}$/.test(token)) throw Error('Invalid import configuration');
    const result = await fetch(projectUrl + '/functions/v1/roster-import', { method: 'POST', headers: { apikey: anonKey, Authorization: 'Bearer ' + anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ token, students }), signal: AbortSignal.timeout(120000) });
    const data = await result.json();
    if (!result.ok || data.failed) throw Error('Import did not complete: HTTP ' + result.status + ', failed rows: ' + (data.failed ?? 'unknown'));
    console.log(JSON.stringify({ created: data.created, updated: data.updated, failed: data.failed }));
    process.exit(0);
  } catch (error) { console.error(error.message); process.exit(1); }
});
