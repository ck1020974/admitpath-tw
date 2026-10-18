'use strict';
const assert=require('node:assert/strict');
const engine=require('../prototypes/interest-explorer/curiosity/engine');
const data=require('../prototypes/interest-explorer/curiosity/data');
const seeded=()=>{let n=78;return()=>((n=(n*1664525+1013904223)>>>0)/4294967296);};
for(const depth of ['quick','deep']){
 const s=engine.createSession({random:seeded()});s.start('interest',depth);
 const batches=s.batches();assert.equal(batches.length,depth==='quick'?3:6);
 assert.deepEqual(s.candidates(),[]);
 assert.throws(()=>s.finalize(s.questions().slice(0,2).map(q=>q.id)));
 const excluded=[];
 batches.forEach((batch,i)=>{
  const ids=batch.map(q=>q.id),skip=ids.slice(0,i%2?3:2);excluded.push(...skip);
  assert.throws(()=>s.screen(i,ids.slice(0,1)));
  assert.throws(()=>s.screen(i,ids.slice(0,4)));
  assert.throws(()=>s.screen(i,[ids[0],ids[0]]));
  assert.throws(()=>s.screen(i,[ids[0],'not-a-question']));
  s.screen(i,skip);
  if(i<batches.length-1)assert.deepEqual(s.candidates(),[]);
 });
 const candidates=s.candidates(),ids=candidates.map(q=>q.id);
 const retained=s.questions().filter(q=>!excluded.includes(q.id)).map(q=>q.id);
 assert.deepEqual(ids.slice().sort(),retained.slice().sort());
 assert.notDeepEqual(ids,retained,'Candidate pool must be shuffled');
 assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(s.candidates(),candidates,'Paging must not reshuffle');
 const copy=s.candidates();copy[0].id='changed';assert.deepEqual(s.candidates(),candidates);
 const picks=s.pickBatches();assert.equal(picks.length,depth==='quick'?2:4);assert.deepEqual(picks.flat(),candidates);assert.ok(picks.every(b=>b.length>=4&&b.length<=6));
 const select=n=>picks.flatMap(b=>b.slice(0,n).map(q=>q.id));
 assert.throws(()=>s.finalize(select(1)));assert.throws(()=>s.finalize(select(4)));
 const uneven=picks.flatMap((b,i)=>b.slice(0,i%2?1:3).map(q=>q.id));assert.throws(()=>s.finalize(uneven));
 assert.throws(()=>s.finalize([ids[0],excluded[0]]));
 assert.throws(()=>s.finalize([ids[0],ids[0]]));
 s.finalize(select(2));assert.equal(s.interestComplete(),true);
 s.finalize(select(3));assert.equal(s.interestComplete(),true);
 if(depth==='quick'){
  data.subjects.filter(q=>q.required).forEach(q=>s.profile(q.id,3));s.finishProfiles();
  const report=s.report();assert.ok(report.groups.every(g=>g.evidence.every(e=>[0,1,3].includes(e.value))));
  const saved=s.snapshot().screens;s.upgrade();assert.deepEqual(s.snapshot().screens,saved);
  assert.equal(s.interestComplete(),false);assert.deepEqual(s.candidates(),[]);assert.deepEqual(s.snapshot().finals,[]);
 }else{
  const chosen=ids[0],batchIndex=batches.findIndex(b=>b.some(q=>q.id===chosen));
  const skip=batches[batchIndex].filter(q=>q.id!==chosen).slice(0,1).map(q=>q.id).concat(chosen);
  s.screen(batchIndex,skip);assert.equal(s.interestComplete(),false);
  assert.ok(!s.snapshot().finals.includes(chosen));assert.ok(!s.candidates().some(q=>q.id===chosen));
  s.finalize(s.pickBatches().flatMap(b=>b.slice(0,2).map(q=>q.id)));assert.equal(s.interestComplete(),true);
 }
}
console.log('Staged interest screening: counts, boundaries, retained shuffle, stable paging, global favourites, scoring and invalidation passed.');
