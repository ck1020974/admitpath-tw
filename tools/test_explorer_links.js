'use strict';
const assert=require('node:assert/strict');
const links=require('../site/explorer-link.js');
const actual=[...new Set(require('../site/data/group_departments.json').map(r=>r.groupName))];
assert.equal(links.names.length,18);
for(const name of links.names){assert.ok(actual.includes(name));const search='?view=explorer&group='+encodeURIComponent(name)+'&from=curiosity';assert.equal(links.parse(search,actual).group,name);}
assert.equal(links.parse('?view=explorer&group='+encodeURIComponent('不分系學群')+'&from=curiosity',actual).group,'不分系學群');
for(const input of ['','?view=unknown&group=資訊學群','?view=explorer&group=unknown','?view=explorer&group=<script>','?view=explorer&group=資訊學群&group=工程學群'])assert.equal(links.parse(input,actual),null);
console.log('Explorer deep links: 18 existing groups plus 不分系, unknown/duplicate/malformed query rejection passed.');
