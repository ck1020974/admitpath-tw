'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('../site/teacher/teacher-model');
const source=fs.readFileSync(require.resolve('../site/teacher/teacher.js'),'utf8');
// Render the real detail function with a minimal DOM so classification loss is caught.
class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.textContent='';}
  append(...children){this.children.push(...children);}
}
const text=(tag,value,className)=>Object.assign(new Element(tag),{textContent:value,className});
const context={model,text,document:{createElement:tag=>new Element(tag)},window:{YuhsinCuriosityData:{subjects:[],resultTypes:Object.fromEntries(['priority','develop','interest','potential'].map(type=>[type,{name:type}]))}}};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('  function renderResult('),source.indexOf('  // One attempt')),context);
const types=['priority','develop','interest','potential'];
const groups=types.flatMap(type=>Array.from({length:4},(_,i)=>({id:type+i,name:type+i,type,subjects:[]})));
const render=groups=>context.renderResult({report:{groups},answers:{}}).children.find(e=>e.className==='result-groups');
let cards=render(groups);
assert.equal(cards.children.length,4);
assert.equal(cards.children.reduce((n,card)=>n+card.children[1].children.length,0),16,'Details must retain all groups, even when overview caps at six');
assert.equal(model.directions(groups).length,6);
cards=render(groups.filter(g=>g.type==='develop'));
assert.equal(cards.children.length,4,'All four category headings remain visible');
assert.equal(cards.children[0].children[1].textContent,'本次無此類學群。');
assert.equal(cards.children[1].children[1].children.length,4);
console.log('Teacher result detail: all classified groups retained, four sections visible, empty categories explicit.');
