/* Reads authorized private roster; logs only aggregate results. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {createClient}=require('../site/student-supabase');
const config={...JSON.parse(fs.readFileSync('work/student-login/public-config.json','utf8')),enabled:true};
const roster=JSON.parse(fs.readFileSync('work/student-login/g11-g12-115-roster.private.json','utf8')).students;
const samples=[...new Map(roster.map(s=>[s.teachingGroup,s])).values()];
(async()=>{
 for(const s of samples){
  const client=createClient({config,fetcher:(url,options)=>fetch(url,{...options,headers:{...options.headers,...(url.includes('/functions/')?{Origin:'https://ck1020974.github.io'}:{})}})});
  try{
   const student=await client.login(s.studentId,s.studentId);
   assert.equal(student.name,s.name);assert.equal(student.teachingGroup,s.teachingGroup);assert.equal(student.originalClass,s.originalClass);assert.equal(student.originalSeatNumber,s.originalSeatNumber);
   assert.equal(student.role,'student');
  }finally{await client.logout();}
 }
 console.log(JSON.stringify({importedRoster:roster.length,classSamples:samples.length,defaultLoginVerified:true,originalClassAndSeatPreserved:true}));
})().catch(error=>{console.error('Roster verification failed:',error.message);process.exitCode=1;});
