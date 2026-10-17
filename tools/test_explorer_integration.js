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
const session=deployed.createSession();session.start('ability','quick');
deployedData.subjects.filter(s=>s.required).forEach(s=>session.profile(s.id,3));
session.finishProfiles();session.prepareAbility();
assert.equal(session.questions().length,10);
assert.equal(deployedData.subjects.filter(s=>s.required).length,10);
assert.equal(deployedData.subjects.filter(s=>!s.required).length,5);
assert.equal([...html.matchAll(/data-depth="(?:quick|deep)"/g)].length,4);
assert.match(html,/role="tablist"/);
assert.match(html,/id="evidenceDialog"/);
assert.equal(new URL('../../','https://example.org/admitpath-tw/explore/curiosity/').pathname,'/admitpath-tw/');
console.log('Explorer integration: bundled assets, relative dependencies, main-site subnavigation, all 15 subjects and project-site base path passed.');
