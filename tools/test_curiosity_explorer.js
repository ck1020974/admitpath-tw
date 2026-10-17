'use strict';
const assert=require('node:assert/strict');
const engine=require('../prototypes/interest-explorer/curiosity/engine');
const data=require('../prototypes/interest-explorer/curiosity/data');
const rng=()=>{let n=39;return()=>((n=(n*1664525+1013904223)>>>0)/4294967296);};
function screen(s){for(let b=0;b<s.batches().length;b++){const ids=s.batches()[b].map(q=>q.id);assert.throws(()=>s.screen(b,[ids[0]],[ids[1]]));s.screen(b,ids.slice(0,2),ids.slice(2,4));}s.finalize(s.candidates().slice(0,3).map(q=>q.id));}
function overview(s){for(const x of data.subjects.filter(x=>x.required))s.profile(x.id,3);s.finishProfiles();}
function details(s){s.prepareDetails();const rows=s.detailPlan();assert.ok(rows.length>=3&&rows.length<=4);for(const row of rows){assert.equal(row.goals.length,3);assert.equal(new Set(row.goals.map(g=>g.id)).size,3);row.goals.forEach(g=>{assert.ok(g.references.every(k=>data.curriculum[k]));s.goal(g.id,3);});}}
assert.equal(data.subjects.filter(s=>s.required).length,10);
for(const mode of ['interest','ability'])for(const depth of ['quick','deep']){
 const s=engine.createSession({random:rng()});s.start(mode,depth);
 if(mode==='ability'){assert.throws(()=>s.prepareAbility());overview(s);s.prepareAbility();assert.equal(s.questions().length,depth==='quick'?10:15);assert.equal(s.snapshot().sampling.strength,depth==='quick'?6:9);s.questions().forEach((q,i)=>s.answer(i,3));}
 else{assert.equal(s.questions().length,depth==='quick'?18:36);assert.equal(new Set(s.questions().map(q=>q.id)).size,s.questions().length);screen(s);if(depth==='quick')overview(s);}
 if(depth==='deep')details(s);
 const report=s.report();assert.equal(report.mode,mode);assert.equal(report.depth,depth);assert.ok(report.groups.every(g=>['priority','develop','potential','interest','other'].includes(g.type)));assert.ok(!report.groups.some(g=>g.type==='pending'));
 assert.equal(report.profiles.art,null);assert.ok(report.groups.every(g=>(g.basis==='details')===(depth==='deep')));
 const clone=s.snapshot();clone.profiles.math=0;assert.equal(s.snapshot().profiles.math,mode==='interest'&&depth==='deep'?null:3);
}
const up=engine.createSession({random:rng()});up.start('interest','quick');screen(up);overview(up);const before=up.questions().map(q=>q.id),saved=up.snapshot().screens;up.upgrade();assert.equal(up.questions().length,36);assert.deepEqual(up.questions().slice(0,18).map(q=>q.id),before);assert.deepEqual(up.snapshot().screens,saved);assert.equal(up.interestComplete(),false);assert.equal(up.snapshot().profiles.math,3);
const au=engine.createSession({random:rng()});au.start('ability','quick');overview(au);au.prepareAbility();au.questions().forEach((q,i)=>au.answer(i,2));const aq=au.questions().map(q=>q.id);au.upgrade();assert.deepEqual(au.questions().slice(0,10).map(q=>q.id),aq);assert.equal(au.questions().length,15);assert.equal(au.interestComplete(),false);
assert.equal(engine.weighted({math:3,computing:null},{math:3,computing:3}).score,3);
assert.equal(engine.weighted({math:3,computing:0},{math:3,computing:3}).score,1.5);
assert.equal(engine.classify({interest:2.5,score:3,coverage:1}),'priority');
assert.equal(engine.classify({interest:2.5,score:0.5,coverage:1}),'interest');
assert.equal(engine.classify({interest:1,score:3,coverage:1}),'potential');
assert.equal(engine.classify({interest:2.5,score:2,coverage:1}),'develop');
assert.equal(engine.classify({interest:null,score:3,coverage:1}),'other');
assert.equal(engine.classify({interest:3,score:4,coverage:0.2}),'other');
assert.ok(Object.values(data.weights).every(w=>Object.values(w).every(v=>[1,2,3].includes(v))));
assert.equal(data.weights.I.music,3);assert.equal(data.weights.H.art,3);
assert.notDeepEqual(data.detailGoals('math','A').map(g=>g.id),data.detailGoals('math','Q').map(g=>g.id));
console.log('Four routes: screening constraints, 18/36 and 10/15 counts, optional profiles, detail-only scores, weighting, upgrades and no pending classifications passed.');
// Preserve a real art/music strength even when the interest ratings are flat.
const arts=engine.createSession({random:rng()});arts.start('ability','deep');
data.subjects.filter(s=>s.required).forEach(s=>arts.profile(s.id,0));arts.profile('art',4);arts.profile('music',4);arts.finishProfiles();arts.prepareAbility();arts.questions().forEach((q,i)=>arts.answer(i,0));arts.prepareDetails();assert.ok(arts.detailPlan().some(p=>p.subject==='art'));assert.ok(arts.detailPlan().some(p=>p.subject==='music'));
// An unassessed optional field must not be treated as an art strength through Chinese alone.
const sparse=engine.createSession({random:rng()});sparse.start('ability','quick');data.subjects.filter(s=>s.required).forEach(s=>sparse.profile(s.id,s.id==='chinese'?4:0));sparse.finishProfiles();sparse.prepareAbility();assert.ok(sparse.questions().slice(0,6).every(q=>!['H','I'].includes(q.group)));
const early=engine.createSession({random:rng()});early.start('ability','quick');early.profile('math',3);assert.doesNotThrow(()=>early.upgrade());assert.equal(early.snapshot().depth,'deep');assert.equal(early.snapshot().profiles.math,3);assert.equal(early.profileComplete(),false);
const seeded=n=>()=>((n=(n*1664525+1013904223)>>>0)/4294967296);
const missingContext=engine.createSession({random:seeded(2)});missingContext.start('ability','deep');const marks={chinese:0,english:3,math:2,history:4,geography:2,civics:1,physics:3,chemistry:4,biology:2,earth:0,computing:3,technology:2,art:3,music:4,sport:4};Object.entries(marks).forEach(([id,v])=>missingContext.profile(id,v));missingContext.finishProfiles();missingContext.prepareAbility();missingContext.questions().forEach((q,i)=>missingContext.answer(i,2));assert.doesNotThrow(()=>missingContext.prepareDetails());assert.ok(missingContext.detailPlan().every(p=>data.groups.some(g=>g.id===p.context)));
// Exercise diverse optional/missing/zero profiles and contextual plans across deterministic banks.
for(let seed=1;seed<=16;seed++)for(const mode of ['interest','ability'])for(const depth of ['quick','deep']){
 const r=seeded(seed),s=engine.createSession({random:r});s.start(mode,depth);
 if(mode==='ability'||depth==='quick'){for(const x of data.subjects){if(x.required||r()>.5)s.profile(x.id,Math.floor(r()*5));}s.finishProfiles();}
 if(mode==='ability'){s.prepareAbility();s.questions().forEach((q,i)=>s.answer(i,Math.floor(r()*4)));}else screen(s);
 if(depth==='deep'){s.prepareDetails();s.detailPlan().forEach(row=>row.goals.forEach(g=>s.goal(g.id,Math.floor(r()*5))));}
 assert.doesNotThrow(()=>s.report());
}
console.log('64 deterministic mixed-profile sessions, early upgrades, sparse optional strengths and missing-context regression checks passed.');
