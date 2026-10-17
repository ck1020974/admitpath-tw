'use strict';
const assert=require('node:assert/strict');
const rows=require('../site/data/group_departments.json');
const names=require('../site/explorer-link').names;
const content=require('../site/group-introductions');
const intros=content.build(rows);
assert.deepEqual(require('../prototypes/interest-explorer/curiosity/group-introductions'),intros);
assert.deepEqual(require('../site/explore/curiosity/group-introductions'),intros);
for(const name of names){
  assert.ok(intros[name]?.description,name);
  const categories=[...new Set(rows.filter(r=>r.groupName===name).map(r=>r.categoryName))].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
  assert.equal(intros[name].description,content.describe(name,categories));
  assert.ok(intros[name].categories.every(n=>!Object.keys(content.aliases).includes(n)));
}
assert.equal(content.describe('未知學群',[]),'未知學群的介紹整理中，可繼續查看相關學類與校系。');
console.log('Shared group introductions: 18 groups match main-site category ordering, names and descriptions.');
