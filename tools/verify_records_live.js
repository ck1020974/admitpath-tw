/* Uses isolated synthetic accounts from ignored work/, never real student answers. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{createClient}=require('../site/student-supabase');
const engine=require('../prototypes/interest-explorer/curiosity/engine');
const config={...JSON.parse(fs.readFileSync('work/student-login/public-config.json','utf8')),enabled:true};
const fixture=JSON.parse(fs.readFileSync('work/records-verification/fixture.private.json','utf8'));
const fetcher=(url,options)=>fetch(url,{...options,headers:{...options.headers,...(url.includes('/functions/')?{Origin:'https://ck1020974.github.io'}:{})}});
const a=createClient({config,fetcher}),b=createClient({config,fetcher}),teacher=createClient({config:{...config,accountType:'teacher'},fetcher});
(async()=>{
 try{
  await a.login(fixture.students[0].username,fixture.students[0].password);await b.login(fixture.students[1].username,fixture.students[1].password);await teacher.login(fixture.teacher.username,fixture.teacher.password);
  const attemptId=crypto.randomUUID(),context={attemptId,source:'live'};
  await a.syncRecords({action:'assessment-start',...context},a.current.id);
  const session=engine.createSession();session.questions().forEach(q=>session.answer(q.id,2));session.setFavourites(session.wanted().slice(0,3));session.setLevel('mid');session.setPicks('strong',['math','english']);session.setPicks('weak',['history','earth']);
  const save=()=>a.syncRecords({action:'assessment-result',...context,snapshot:session.snapshot()},a.current.id);
  await save();await save();assert.equal((await a.readResults()).length,1,'Repeated completion is deduplicated');
  session.startDeep();await assert.rejects(save(),e=>e.status===422);session.deepQuestions().forEach(q=>session.answer(q.id,1));session.detailPlan().forEach(row=>row.goals.forEach(goal=>session.goal(goal.id,3)));await save();
  session.startExtra();session.extraQuestions().forEach(q=>session.answer(q.id,1));await save();session.answer(session.questions()[4].id,1);await save();
  const results=await teacher.readResults(a.current.id);assert.equal(results.length,4);assert.equal(new Set(results.map(r=>r.attempt_id)).size,1);assert.equal((await a.readAttempts()).filter(x=>x.status==='complete').length,1);
  assert(results.some(r=>r.stage==='quick')&&results.some(r=>r.stage==='deep')&&results.some(r=>r.stage==='extra')&&results.some(r=>r.stage==='revision'));
  assert.equal((await b.readResults(a.current.id)).length,0);
  await assert.rejects(b.syncRecords({action:'assessment-result',...context,snapshot:session.snapshot()},b.current.id),e=>e.status===403);
  await assert.rejects(teacher.syncRecords({action:'assessment-start',...context},teacher.current.id));
  const catalog=await (await fetch('https://ck1020974.github.io/admitpath-tw/data/student-sync-catalog.json')).json(),recordId=catalog[0][0],op=crypto.randomUUID();
  const track=(removed,revision,operationId=crypto.randomUUID())=>a.syncRecords({action:'tracking',operationId,changes:[{recordId,removed,revision,school:'forged'}]},a.current.id);
  await track(false,0,op);await track(false,0,op);let rows=await teacher.readTracking(a.current.id);assert.equal(rows.length,1);assert.equal(rows[0].revision,1);assert.equal(rows[0].school_name,catalog[0][1]);
  await assert.rejects(track(true,0),e=>e.status===409);await track(true,1);await assert.rejects(track(false,1),e=>e.status===409);await track(false,2);
  rows=await teacher.readTracking(a.current.id);assert.equal(rows[0].revision,3);assert.equal(rows[0].removed_at,null);assert.equal((await b.readTracking(a.current.id)).length,0);
  fs.writeFileSync('work/records-verification/test-state.private.json',JSON.stringify({attemptId,recordId}));
  console.log(JSON.stringify({syntheticAccounts:true,resultSnapshots:results.length,completedAttempts:1,phasesPreserved:true,deduplicated:true,trackingConflictProtected:true,canonicalCatalog:true,crossStudentDenied:true,teacherReadVerified:true}));
 }finally{await Promise.allSettled([a.logout(),b.logout(),teacher.logout()]);}
})().catch(error=>{console.error('Record verification failed:',error.message);process.exitCode=1;});
