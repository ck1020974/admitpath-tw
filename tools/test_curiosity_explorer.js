'use strict';
// 學群探索單一路線：題組、作答限制、計分、深入確認、存檔與結果連結。
const assert=require('node:assert/strict');
const engine=require('../prototypes/interest-explorer/curiosity/engine');
const data=require('../prototypes/interest-explorer/curiosity/data');
const item=id=>data.items.find(q=>q.id===id);
// 大部分測試用原本的固定題組，方便指定題號；隨機抽題另外測。
const fixed=()=>engine.createSession({quick:data.quickSet});
const required=data.subjects.filter(s=>s.required);

// 題庫 108 題：每個學群 6 題，沒有重複題文；體育已取消。
assert.equal(data.items.length,108);
for(const g of data.groups)assert.equal(data.items.filter(q=>q.group===g.id).length,6,g.id);
assert.equal(new Set(data.items.map(q=>q.text)).size,108);
assert.ok(data.items.every(q=>q.interestGroups.includes(q.group)&&q.units.length&&q.concept&&q.reason));
assert.ok(!data.subjects.some(s=>s.id==='sport')&&!data.weights.R.sport);

// 學群順序：18 個學群各 1 題，順序固定（題目本身隨機抽）。
assert.equal(data.quickSet.length,18);
assert.equal(new Set(data.quickSet.map(id=>item(id).group)).size,18);
// 隨機抽題：每個學群 1 題、學群順序固定；不同學生題目會不同；存檔與連結還原同一組。
{
 const draws=Array.from({length:30},()=>engine.createSession().questions());
 draws.forEach(d=>assert.deepEqual(d.map(q=>q.group),data.quickSet.map(id=>item(id).group)));
 assert.ok(new Set(draws.map(d=>d.map(q=>q.id).join())).size>20,'不同學生抽到不同題組');
 const counts={};draws.flat().forEach(q=>{counts[q.id]=1;});assert.ok(Object.keys(counts).length>60,'題庫大部分題目都可能出現在第 1 步');
 const s=engine.createSession();const ids=s.questions().map(q=>q.id);
 const t=engine.createSession();t.load(JSON.parse(JSON.stringify(s.snapshot())));assert.deepEqual(t.questions().map(q=>q.id),ids,'存檔還原同一組題目');
 s.reset();assert.equal(s.questions().length,18);
 // 第 1 步抽到的題目不會再出現在深入確認或換一批題目。
 const u=engine.createSession();u.questions().forEach(q=>u.answer(q.id,2));u.setFavourites(u.wanted().slice(0,3));u.setLevel('mid');u.setPicks('strong',['math','english']);u.setPicks('weak',['history','earth']);
 const first=new Set(u.questions().map(q=>q.id));u.startDeep();assert.ok(u.deepQuestions().every(q=>!first.has(q.id)));
 u.startExtra();assert.ok(u.extraQuestions().every(q=>!first.has(q.id)));
 u.extraQuestions().forEach(q=>u.answer(q.id,1));
 const back=engine.decodeShare(engine.encodeShare(u.snapshot())).session;assert.deepEqual(back.questions().map(q=>q.id),[...first]);
 assert.equal(JSON.stringify(back.report()),JSON.stringify(u.report()));
 // v5 連結（沒有 k）用原本的固定題組。
 const v5=Buffer.from(JSON.stringify({v:5,a:'111111111111111111',f:[],l:'m',s:[0,1],w:[3,4]})).toString('base64url');
 assert.deepEqual(engine.decodeShare(v5).session.questions().map(q=>q.id),data.quickSet);
}

function student({likes={},level='mid',strong=['history','geography'],weak=['earth','biology'],favourite=[]}={}){
 const s=fixed();
 s.questions().forEach(q=>s.answer(q.id,likes[q.group]??1));
 if(s.favouritesNeeded())s.setFavourites(favourite.length?favourite:s.wanted().slice(0,3));
 s.setLevel(level);s.setPicks('strong',strong);s.setPicks('weak',weak);
 return s;
}
const typeOf=(report,id)=>report.groups.find(g=>g.id===id).type;

// 作答限制
{
 const s=fixed();
 assert.throws(()=>s.answer('A1',3));assert.throws(()=>s.answer('A5',2),/找不到/);
 s.answer('A1',2);assert.equal(s.interestComplete(),false);assert.throws(()=>s.report());
 s.questions().forEach(q=>s.answer(q.id,2));
 assert.equal(s.favouritesNeeded(),true);assert.equal(s.favouritesComplete(),false);
 assert.throws(()=>s.setFavourites(s.wanted().slice(0,4)));
 assert.throws(()=>s.setFavourites(['A5']));
 s.setFavourites(s.wanted().slice(0,2));assert.equal(s.favouritesComplete(),false,'2 題還不夠');
 s.setFavourites(s.wanted().slice(0,3));assert.equal(s.favouritesComplete(),true);
 s.answer(s.wanted()[0],1);assert.equal(s.snapshot().favourites.length,2,'改成「還好」的題目會從最想知道移除');
 assert.throws(()=>s.setLevel('top'));assert.equal(s.subjectsComplete(),false,'整體程度必填');
 s.setLevel('mid');assert.equal(s.subjectsComplete(),false,'強項與吃力都要選 2–3 科');
 assert.throws(()=>s.setPicks('strong',['math','physics','english','chinese']),/最多選 3 科/);
 assert.throws(()=>s.setPicks('weak',['math','physics','english','chinese']),/最多選 3 科/);
 s.setPicks('strong',['english','chinese']);s.setPicks('weak',['earth']);assert.equal(s.subjectsComplete(),false,'吃力只選 1 科還不夠');
 s.setPicks('weak',['earth','art']);assert.equal(s.subjectsComplete(),true);s.setPicks('strong',[]);s.setPicks('weak',[]);
 assert.throws(()=>s.setPicks('strong',['pe']),/找不到/);
 s.setPicks('strong',['math']);assert.throws(()=>s.setPicks('weak',['math']),/不能同時/);
}
// 想知道不超過 3 題時，不需要第 2 步。
{
 const s=fixed();s.questions().forEach((q,i)=>s.answer(q.id,i<2?2:0));
 assert.equal(s.favouritesNeeded(),false);assert.equal(s.favouritesComplete(),true);assert.equal(s.effectiveFavourites().length,2);
}

// 換算：前段＝3、中間＝2、後段＝1；強項高一級、吃力低一級；延伸科目只有勾選才計入。
{
 const s=student({level:'mid',strong:['math','art'],weak:['civics','earth']});const v=s.subjectValues();
 assert.equal(v.math,3);assert.equal(v.civics,1);assert.equal(v.chinese,2);assert.equal(v.art,3);assert.equal(v.music,undefined);
 const h=student({level:'high',strong:['math','physics'],weak:['history','earth']}).subjectValues();assert.equal(h.math,4);assert.equal(h.history,2);assert.equal(h.chinese,3);
 const l=student({level:'low',weak:['math','physics']}).subjectValues();assert.equal(l.math,0);assert.equal(l.english,1);
}
// 原本的問題 1：一科「普通」就從有基礎掉到要補強。
{
 const s=student({likes:{A:2,B:2},strong:['math','computing','english'],weak:['history','earth'],favourite:['A1','B2']});
 const r=s.report();
 assert.equal(typeOf(r,'A'),'priority','資訊：數學、資訊、英文是強項，國文普通，仍是優先探索');
 assert.deepEqual(r.groups.find(g=>g.id==='A').strengths,['數學','資訊','英文'],'推薦理由列出學生自己勾的強項');
 assert.equal(typeOf(r,'B'),'priority');
}
// 原本的問題 3：深入確認不會把最感興趣的學群歸到「其他」。
for(const likes of [{A:2},{I:2},{O:2},{D:2},{R:2}]){
 const s=student({likes,strong:['computing','art','music'],weak:['history','earth']});
 const target=Object.keys(likes)[0],before=typeOf(s.report(),target);
 assert.notEqual(before,'other',`${target} 快速版`);
 s.startDeep();
 assert.ok(s.snapshot().deep.focus.includes(target),'前幾個方向一定在深入確認範圍內');
 s.deepQuestions().forEach(q=>s.answer(q.id,q.group===target?2:1));
 s.detailPlan().forEach(row=>row.goals.forEach(g=>s.goal(g.id,2)));
 assert.equal(s.deepComplete(),true);
 assert.notEqual(typeOf(s.report(),target),'other',`${target} 深入確認後仍不是其他學群`);
}
// 選填科目沒填不算低分；相關科目大多沒填時不判斷基礎，有興趣就列為興趣延伸。
{
 const s=student({likes:{I:2}});
 const art=s.report().groups.find(g=>g.id==='I');
 assert.equal(art.level,'unknown');assert.equal(art.type,'interest');
 assert.equal(engine.weighted({math:3,physics:null},{math:3,physics:3}).score,3);
 assert.deepEqual(data.levelOptions.map(o=>o.label),['後段','中間','前段'],'右邊固定是最好');
 assert.deepEqual(data.interestOptions.map(o=>o.label),['沒興趣','還好','想知道']);
}
// 跟自己比：全部普通時不會出現「強」；全部比較吃力的學生，自己的平均就是普通水準。
assert.equal(engine.level({score:2,coverage:1},2),'middle');
assert.equal(engine.level({score:2.4,coverage:1},2),'strong');
assert.equal(engine.level({score:1,coverage:1},1),'middle');
assert.equal(engine.level({score:1.2,coverage:1},2),'weak');
assert.equal(engine.level({score:3,coverage:0.3},2),'unknown');
// 潛力發掘最多 3 個學群（不分系另計），也不列學生明確說「沒興趣」的方向。
{
 const s=student({likes:{A:0,B:0,C:0,D:0,E:0,F:0,G:0,H:0,I:0,J:0,K:0,L:0,M:0,N:0,O:0,P:1,Q:1,R:1},level:'high'});
 const r=s.report(),potential=r.groups.filter(g=>g.type==='potential'&&!g.undeclared);
 assert.ok(potential.length<=3);assert.ok(potential.every(g=>g.primaryAnswer!==0));
}
// 都回答「還好」：沒有推薦，建議也可以考慮不分系，深入確認仍能從學科找方向。
{
 const s=student();const r=s.report();
 assert.ok(r.groups.every(g=>['other','potential'].includes(g.type)),'沒有任何有興趣的方向');
 assert.equal(r.undeclared.reason,'unclear');assert.equal(r.undeclared.group,'不分系學群');
 s.startDeep();const f=s.snapshot().deep.focus.length;assert.ok(f>=1&&f<=4,'從學科強項找方向');
}
// 深入確認：補問題目來自前幾個方向，不檢查沒勾選的延伸科目，改答快速題或勾選會取消深入確認。
{
 const s=student({likes:{A:2,B:2,C:2},strong:['math','physics'],weak:['history','earth']});
 s.startDeep();const deep=s.snapshot().deep;
 assert.ok(s.deepQuestions().every(q=>deep.focus.includes(q.group)&&!data.quickSet.includes(q.id)));
 assert.equal(s.deepQuestions().length,deep.focus.length*3,'每個方向補問 3 題');
 assert.ok(s.detailPlan().length<=4&&s.detailPlan().every(row=>!['computing','technology'].includes(row.subject)));
 s.detailPlan().forEach(row=>assert.equal(row.goals.length,5));
 s.answer('A1',1);assert.equal(s.snapshot().deep,null);
 s.startDeep();s.setPicks('weak',['chinese','earth']);assert.equal(s.snapshot().deep,null);
 assert.equal(s.report().undeclared,null,'興趣集中在理工，不建議不分系');
}
// 最想知道的 3 題分屬 3 個不同領域，且有興趣的學群橫跨至少 4 個領域：建議也可以考慮不分系。
{
 const s=student({likes:{A:2,D:2,L:2,O:2},favourite:['A1','D9','L5']});
 const u=s.report().undeclared;assert.equal(u.reason,'broad');assert.deepEqual(u.domains.slice().sort(),['人文語言','理工','生醫'].sort());
 const t=student({likes:{A:2,B:2,C:2,D:2},favourite:['A1','B2','D9']});assert.equal(t.report().undeclared,null,'最想知道只分屬 2 個領域');
}
// 換一批題目：每個學群 1 題沒看過的題目；答完才計入，可以一直換到題目用完。
{
 const s=student({likes:{A:2,D:2}});
 assert.equal(s.report().canExplore,true);
 const seen=new Set(data.quickSet);let rounds=0;
 while(s.canExplore()){
  s.startExtra();const round=s.extraQuestions();rounds++;
  assert.ok(round.every(q=>!seen.has(q.id)),'不會出現看過的題目');round.forEach(q=>seen.add(q.id));
  assert.equal(new Set(round.map(q=>q.group)).size,round.length,'每個學群最多 1 題');
  const before=s.report().extraRounds;round.forEach(q=>s.answer(q.id,q.group==='O'?2:0));
  assert.equal(s.report().extraRounds,before+1);
 }
 assert.equal(rounds,5,'每個學群 5 題補充題，可以換 5 批');
 assert.ok(s.report().groups.find(g=>g.id==='O').evidence.length>=6,'再探索的答案會計入興趣');
 // 先換題再深入確認：深入確認不會重複再探索問過的題。
 const t=student({likes:{A:2}});t.startExtra();t.extraQuestions().forEach(q=>t.answer(q.id,1));t.startDeep();
 const extraIds=t.snapshot().extra.flat();assert.ok(t.deepQuestions().every(q=>!extraIds.includes(q.id)));
}
// 舊版（v4）結果連結：深入確認每個方向 2 題、勾過體育，仍能顯示。
{
 const v4=Buffer.from(JSON.stringify({v:4,a:'222111111111111111',f:[],l:'m',s:[1,14],w:[3,4],d:{f:'AID',p:'math.A',q:'222222',g:'333'}})).toString('base64url');
 const old=engine.decodeShare(v4).session;assert.equal(old.complete(),true);
 assert.deepEqual(old.snapshot().profile.strong,['english']);assert.equal(old.snapshot().deep.questions.length,6);
 assert.equal(old.report().deep,true);
}
// 存檔與結果連結：還原後結果完全相同；壞掉的連結會被拒絕。
for(let seed=1;seed<=40;seed++){
 let n=seed;const r=()=>((n=(n*1664525+1013904223)>>>0)/4294967296);
 const s=engine.createSession({random:r});
 s.questions().forEach(q=>s.answer(q.id,Math.floor(r()*3)));
 if(s.favouritesNeeded())s.setFavourites(s.wanted().slice(0,3));
 const ids=data.subjects.map(x=>x.id).sort(()=>r()-.5);
 s.setLevel(data.levelOptions[Math.floor(r()*3)].value);s.setPicks('strong',ids.slice(0,2+Math.floor(r()*2)));s.setPicks('weak',ids.slice(5,7+Math.floor(r()*2)));
 if(r()>.6){s.startExtra();s.extraQuestions().forEach(q=>s.answer(q.id,Math.floor(r()*3)));}
 if(r()>.5){s.startDeep();s.deepQuestions().forEach(q=>s.answer(q.id,Math.floor(r()*3)));s.detailPlan().forEach(row=>row.goals.forEach(g=>s.goal(g.id,Math.floor(r()*5))));}
 if(r()>.6&&s.canExplore()){s.startExtra();s.extraQuestions().forEach(q=>s.answer(q.id,Math.floor(r()*3)));}
 const report=JSON.stringify(s.report());
 const restored=fixed();restored.load(JSON.parse(JSON.stringify(s.snapshot())));
 assert.equal(JSON.stringify(restored.report()),report);
 const code=engine.encodeShare(s.snapshot(),'15 號 王小明');
 assert.ok(code.length<500,'結果連結要夠短，方便貼到 LINE');
 const shared=engine.decodeShare(code);
 assert.equal(JSON.stringify(shared.session.report()),report);assert.equal(shared.name,'15 號 王小明');
}
assert.throws(()=>engine.decodeShare('not-a-code'));
assert.throws(()=>engine.decodeShare(Buffer.from(JSON.stringify({v:6,a:'2',l:'m'})).toString('base64url')),/不完整/);
assert.throws(()=>engine.decodeShare(Buffer.from(JSON.stringify({v:3,a:'2',s:'3'})).toString('base64url')),/舊版本/);
assert.throws(()=>fixed().load({v:1}),/版本/);
// 有興趣的學群只橫跨 3 個領域時，即使最想知道的 3 題分屬 3 個領域，也不建議不分系。
{
 const s=student({likes:{A:2,D:2,L:2},favourite:['A1','D9','L5']});
 assert.equal(s.report().undeclared,null,'只橫跨 3 個領域');
}
// 本學群自己的題目選「想知道」就算有興趣，不會被相鄰學群的「沒興趣」拖下來。
{
 const likes=Object.fromEntries(data.groups.map(g=>[g.id,0]));
 for(const g of data.groups){
  const r=student({likes:{...likes,[g.id]:2},level:'mid'}).report().groups.find(x=>x.id===g.id);
  assert.ok(r.interested&&r.type!=='other',`只對 ${g.id} 想知道，仍要列為有興趣`);
 }
 // 相鄰題目的「想知道」仍能把「還好」的學群帶上來（現有規則保留）。
 const kept=student({likes:{Q:1,P:2,J:2,K:2,O:2}}).report().groups.find(x=>x.id==='Q');
 assert.equal(kept.ownScore,1);
}
// 重新測驗：第一題沒興趣、新的一題想知道，就找回來；排序以本學群題目為先。
{
 const s=student({likes:{Q:0,P:2,O:2,L:2}});
 assert.equal(typeOf(s.report(),'Q'),'other');
 s.startExtra();s.extraQuestions().forEach(q=>s.answer(q.id,q.group==='Q'?2:0));
 const q=s.report().groups.find(x=>x.id==='Q');assert.ok(q.interested&&q.type!=='other','重新測驗答想知道就列為有興趣');
}
// 深入確認過的方向看本學群題目平均：補問都沒興趣會被移出，大多想知道則保留。
{
 const run=value=>{const s=student({likes:{O:2,A:2},strong:['civics','chinese'],weak:['physics','chemistry']});s.startDeep();
  assert.ok(s.snapshot().deep.focus.includes('O'));
  s.deepQuestions().forEach(q=>s.answer(q.id,q.group==='O'?value(q):2));s.detailPlan().forEach(row=>row.goals.forEach(g=>s.goal(g.id,2)));
  return s.report().groups.find(x=>x.id==='O');};
 const dropped=run(()=>0);assert.equal(dropped.checked,true);assert.equal(dropped.interested,false,'深入題都沒興趣 → 移出');
 let n=0;const kept=run(()=>n++<2?2:0);assert.equal(kept.ownScore,1.75,'最想知道 3＋想知道 2＋想知道 2＋沒興趣 0');assert.equal(kept.interested,true,'深入題 2 想知道 1 沒興趣 → 保留');
}
// 不分系是一般學群卡片：興趣很廣依國英數基礎分類；沒有方向時前段、中間列潛力發掘，後段不推。
{
 const U=r=>r.groups.find(g=>g.id==='U');
 const broad=(level,strong,weak)=>U(student({likes:{A:2,D:2,L:2,O:2},favourite:['A1','D9','L5'],level,strong,weak}).report());
 assert.equal(broad('high',['history','geography'],['earth','biology']).type,'priority','前段：國英數都強');
 assert.equal(broad('mid',['history','geography'],['earth','biology']).type,'develop','中間：國英數普通');
 assert.equal(broad('mid',['chinese','english'],['earth','biology']).type,'priority','中間但國英是強項');
 assert.equal(broad('low',['history','geography'],['chinese','english']).type,'interest','後段且國英吃力');
 assert.equal(U(student({level:'high'}).report()).type,'potential');
 assert.equal(U(student({level:'mid'}).report()).type,'potential');
 assert.equal(U(student({level:'low'}).report()).type,'other','後段、沒有方向：不推');
 assert.equal(U(student({likes:{A:2,B:2,C:2},strong:['math','physics'],weak:['history','earth']}).report()).type,'other','興趣集中：不推');
 // 不分系放在同一種方向的最後面，而且不會擠掉原本的學群。
 const r=student({likes:{A:2,D:2,L:2,O:2},favourite:['A1','D9','L5'],level:'high'}).report();
 const pri=r.groups.filter(g=>g.type==='priority');assert.equal(pri[pri.length-1].id,'U');
}
// 每種方向最多 6 個學群，其餘移到其他學群；排序最前面的留下。
{
 const likes=Object.fromEntries(data.groups.map(g=>[g.id,2]));
 const r=student({likes,level:'mid',strong:['history','geography'],weak:['earth','biology']}).report();
 for(const t of ['priority','develop','interest','potential'])assert.ok(r.groups.filter(g=>g.type===t&&!g.undeclared).length<=6,t+' 超過 6 個');
 assert.ok(['priority','develop','interest'].some(t=>r.groups.filter(g=>g.type===t&&!g.undeclared).length===6),'全部有興趣時至少一類剛好 6 個');
 const kept=r.groups.filter(g=>g.type!=='other'&&g.type!=='potential');
 assert.equal(r.groups.length,19,'18 學群加不分系');
 assert.equal(r.groups.filter(g=>g.type==='other').length,19-kept.length-r.groups.filter(g=>g.type==='potential').length);
}
console.log('Curiosity explorer: random step-1 draw, 108-question bank, extra rounds, v4 links, fixed 18-question set, max 6 groups per type, option order, level plus 2–3 required subject picks, 不分系 suggestions, answer limits, favourites, relative subject levels, potential cap, deep check coverage, save/restore and 40 result-link round trips passed.');
