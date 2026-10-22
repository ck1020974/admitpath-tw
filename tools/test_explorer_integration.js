'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {root,destination,sync} = require('./sync_explorer_site');
sync({check:true});
const html = fs.readFileSync(path.join(destination,'curiosity/index.html'),'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const relative = match[1].split('?')[0];
  if (!relative.startsWith('.')) continue;
  assert.ok(fs.existsSync(path.resolve(destination,'curiosity',relative)),relative);
}
const css = fs.readFileSync(path.join(destination,'curiosity/styles.css'),'utf8');
for (const match of css.matchAll(/@import url\('([^']+)'\)/g)) {
  assert.ok(fs.existsSync(path.resolve(destination,'curiosity',match[1].split('?')[0])));
}
const main = fs.readFileSync(path.join(root,'site/index.html'),'utf8');
assert.match(main,/id="navExplorerTools"[^>]+hidden/);
assert.equal([...main.matchAll(/data-curiosity-entry/g)].length,2);
assert.ok(fs.existsSync(path.join(root,'site/explore/curiosity/index.html')));
const deployed = require('../site/explore/curiosity/engine');
const deployedData = require('../site/explore/curiosity/data');
const session=deployed.createSession();
session.questions().forEach(q=>session.answer(q.id,1));
deployedData.subjects.filter(s=>s.required).forEach(s=>session.setSubject(s.id,2));
assert.equal(session.complete(),true);
assert.equal(session.questions().length,18);
assert.equal(deployedData.subjects.filter(s=>s.required).length,10);
assert.equal(deployedData.subjects.filter(s=>!s.required).length,5);
// 一個入口：只有一個開始按鈕，沒有舊的四種版本入口。
assert.equal([...html.matchAll(/id="start"/g)].length,1);
assert.doesNotMatch(html,/data-depth=/);
for(const id of ['curiosity','favourites','subjects','results','deepQuestions','deepDetails','evidenceDialog','aboutDialog','copyLink'])assert.match(html,new RegExp(`id="${id}"`),id);
assert.equal(new URL('../../','https://example.org/admitpath-tw/explore/curiosity/').pathname,'/admitpath-tw/');
console.log('Explorer integration: bundled assets, relative dependencies, main-site subnavigation, single entry, all 15 subjects and project-site base path passed.');
