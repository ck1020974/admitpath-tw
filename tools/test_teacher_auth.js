'use strict';
const assert = require('node:assert/strict');
const { createClient } = require('../site/student-supabase');
const config = { enabled:true,accountType:'teacher',supabaseUrl:'https://abcdefghijklmnopqrst.supabase.co',publishableKey:'sb_publishable_fixture' };
const access = { id:'teacher-fixture',name:'測試教師',active:true,all_groups:true,teaching_groups:[] };
const result = (data,status=200)=>({ok:status<400,status,json:async()=>data});
const token = {access_token:'teacher-token',refresh_token:'teacher-refresh',expires_in:3600};
(async()=>{
  const data = new Map(); const storage = {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  let pages=0;
  const fetcher=async(path,options)=>{
    if(path.includes('grant_type=password')) {assert.deepEqual(JSON.parse(options.body),{email:'tt00001@teacher.invalid',password:'fixture-password'});return result(token);}
    if(path.includes('/auth/v1/user')) return result({id:access.id});
    if(path.includes('/teacher_access?')) return result([access]);
    if(path.includes('/students?')) {assert.equal(options.headers.Authorization,'Bearer teacher-token');pages++;return result(pages===1?Array.from({length:200},(_,n)=>({id:'student-'+n})):[]);}
    if(path.includes('/logout')) return result(null,204);
    throw Error('Unexpected endpoint');
  };
  const client=createClient({config,storage,fetcher});
  assert.equal((await client.login('TT00001','fixture-password')).role,'teacher');
  assert.equal((await client.listStudents()).length,200);assert.equal(pages,2);
  assert.equal(await createClient({config:{...config,accountType:'student'},storage,fetcher}).session(),null,'Teacher sessions must be separate from student sessions');
  assert([...data.values()].every(v=>!v.includes('fixture-password')));
  await client.logout();assert.equal(data.size,0);
  const rejected=createClient({config,storage,fetcher:async path=>path.includes('grant_type=password')?result(token):path.includes('/auth/v1/user')?result({id:'student-fixture'}):result([])});
  await assert.rejects(rejected.login('TT00001','fixture-password'),/沒有教師權限/);assert.equal(data.size,0);
  console.log('Teacher Auth: role validation, paginated roster, separate sessions, denied unassigned accounts, logout and no credential persistence passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
