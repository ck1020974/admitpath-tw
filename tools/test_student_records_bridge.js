'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
class Storage{getItem(k){return this[k]??null;}setItem(k,v){this[k]=String(v);}removeItem(k){delete this[k];}}
const local=new Storage(),session=new Storage(),listeners={},client={current:null,syncRecords:async()=>({saved:true})};
const window={localStorage:local,sessionStorage:session,YuhsinStudentAuth:{ready:Promise.resolve(),client},addEventListener:(name,fn)=>listeners[name]=fn};
vm.runInNewContext(fs.readFileSync('site/student-records.js','utf8'),{window,crypto});
(async()=>{
 const records=window.YuhsinStudentRecords;await records.ready;records.write('draft','visitor');
 client.current={id:'fixture-a',role:'student'};listeners['yuhsin-auth-change']();records.write('draft','a-private');const context=records.begin();
 assert.equal(records.guest('draft'),'visitor');assert.equal(records.read('draft'),'a-private');
 client.current={id:'fixture-b',role:'student'};listeners['yuhsin-auth-change']();assert.equal(records.read('draft'),null);assert(!Object.keys(session).some(k=>k.includes('fixture-a')));
 await assert.rejects(records.saveResult({},context),/請登入後開始/);records.write('draft','b-private');
 client.current=null;listeners['yuhsin-auth-change']();assert.equal(records.read('draft'),'visitor');assert.equal(Object.keys(session).length,0);
 console.log('Student record bridge: guest preservation, account isolation, draft cleanup and stale-owner write rejection passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
