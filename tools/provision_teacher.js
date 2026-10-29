/* Explicitly authorized one-use bootstrap. Inputs remain in ignored work/. */
'use strict';
const fs = require('node:fs');
const { supabaseUrl: url, publishableKey: key } = JSON.parse(fs.readFileSync('work/student-login/public-config.json','utf8'));
const payload = JSON.parse(fs.readFileSync('work/teacher-login/credentials.private.json','utf8'));
(async () => {
  const result = await fetch(url + '/functions/v1/teacher-provision', { method:'POST', headers:{ apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json' },body:JSON.stringify(payload),signal:AbortSignal.timeout(45000) });
  const data = await result.json();
  if (!result.ok || data.created !== 1) throw Error('Teacher provisioning failed: HTTP ' + result.status);
  console.log('One teacher account created; no credentials printed.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
