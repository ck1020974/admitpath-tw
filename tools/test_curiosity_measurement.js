'use strict';
const assert=require('node:assert/strict');
const {create}=require('../prototypes/interest-explorer/curiosity/measurement');
const events=[];
const send=(name,title,options)=>{events.push({name,title,options});return true;};
const tracker=create(send);
tracker.start();tracker.start();
tracker.completed({deep:false,extraRounds:0});
tracker.completed({deep:false,extraRounds:0});
assert.deepEqual(events.map(e=>e.name),['curiosity-assessment-start','curiosity-assessment-complete']);
// 重新整理後重看結果、調整學科、重做深入探索，不重複計入同一階段。
const restored=create(send);restored.restore(JSON.parse(JSON.stringify(tracker.snapshot())));
restored.completed({deep:false,extraRounds:0});assert.equal(events.length,2);
restored.completed({deep:false,extraRounds:1});
restored.completed({deep:true,extraRounds:1});
restored.completed({deep:true,extraRounds:1});
restored.completed({deep:true,extraRounds:2});
assert.equal(events.filter(e=>e.name==='curiosity-retest-complete').length,2);
assert.equal(events.filter(e=>e.name==='curiosity-deep-complete').length,1);
// 開始全新測驗後，可以再記一次；不受 GoatCounter 的訪客去重影響。
restored.reset();restored.start();restored.completed({deep:false,extraRounds:0});
assert.equal(events.filter(e=>e.name==='curiosity-assessment-complete').length,2);
assert.ok(events.every(e=>e.options.total===true));
// 舊的已完成存檔不補算，之後新完成的階段才計入。
const legacy=create(send);legacy.restore(undefined,{deep:true,extraRounds:2});
const before=events.length;
legacy.completed({deep:true,extraRounds:2});assert.equal(events.length,before);
legacy.completed({deep:true,extraRounds:3});assert.equal(events.length,before+1);
// 阻擋統計或服務出錯，不影響測驗，也不把失敗標成已送出。
const unavailable=create(()=>false);unavailable.completed({deep:true,extraRounds:1});assert.deepEqual(unavailable.snapshot(),{});
const broken=create(()=>{throw Error('offline');});assert.doesNotThrow(()=>broken.completed({deep:true,extraRounds:1}));
console.log('Assessment counting: persisted deduplication, independent retest/deep completions, fresh attempts, legacy migration and unavailable analytics passed.');
