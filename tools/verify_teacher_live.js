/* Authorized verification; only prints counts/booleans, never names or tokens. */
'use strict';
const fs = require('node:fs'),assert=require('node:assert/strict');
const {createClient}=require('../site/student-supabase');
const config=JSON.parse(fs.readFileSync('work/student-login/public-config.json','utf8'));
const credentials=JSON.parse(fs.readFileSync('work/teacher-login/credentials.private.json','utf8'));
let token;
const fetcher=async(url,options)=>{const r=await fetch(url,options);if(url.includes('grant_type=password'))token=(await r.clone().json()).access_token;return r;};
const client=createClient({config:{...config,enabled:true,accountType:'teacher'},fetcher});
async function call(path,body,method='POST'){
  const response=await fetch(config.supabaseUrl+path,{method,headers:{apikey:config.publishableKey,Authorization:'Bearer '+(token||config.publishableKey),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,data:await response.json().catch(()=>null)};
}
(async()=>{
  try{
    assert.equal((await client.login(credentials.username,credentials.password)).role,'teacher');
    assert.equal(client.current.allGroups,true);
    const students=await client.listStudents();assert.equal(students.length,81);
    assert.equal(students.filter(s=>s.teaching_group==='10A'&&s.original_class==='1001').length,7);
    assert.equal(students.filter(s=>s.teaching_group==='10A'&&s.original_class==='1002').length,7);
    const write=await call('/rest/v1/students?id=eq.'+students[0].id,{name:'Unauthorized test'},'PATCH');assert(write.status>=400);
    const replay=await call('/functions/v1/teacher-provision',credentials);assert.equal(replay.status,403);
    console.log(JSON.stringify({teacherLogin:true,students:students.length,originalClassesPreserved:true,studentModificationDenied:true,bootstrapReuseDenied:true}));
  }finally{await client.logout();}
})().catch(error=>{console.error('Teacher verification failed:',error.message);process.exitCode=1;});
