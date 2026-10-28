'use strict';
// Keep the local prototype and the deployable main-site entry on the same source.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'prototypes/interest-explorer');
const destination = path.join(root, 'site/explore');
const introductions = require('../site/group-introductions').build(require('../site/data/group_departments.json'));
const generatedName = 'curiosity/group-introductions.js';
const generated = Buffer.from(`/* Generated from the main site's shared group descriptions. */\n(function(root){const rows=${JSON.stringify(introductions)};if(typeof module!=='undefined'&&module.exports)module.exports=rows;else root.YuhsinGroupIntroductions=rows;})(typeof window!=='undefined'?window:globalThis);\n`);
const files = ['styles.css', 'info-dialog.css', 'info-dialog.js',
  generatedName,
  ...['index.html', 'styles.css', 'app.js', 'measurement.js', 'engine.js', 'data.js', 'subjects.js',
    'bank.js', 'units.js', 'curriculum.js', 'collego-reference.js', 'exploration-model.js'].map(name => `curiosity/${name}`)];
function sync({ check = false } = {}) {
  for (const name of files) {
    const content = name === generatedName ? generated : fs.readFileSync(path.join(source, name));
    if (name === generatedName) {
      const original = path.join(source,name);
      if (check) {
        if (!fs.existsSync(original) || !content.equals(fs.readFileSync(original))) throw new Error('Main-site introductions need syncing.');
      } else {
        fs.mkdirSync(path.dirname(original),{recursive:true});
        fs.writeFileSync(original,content);
      }
    }
    const target = path.join(destination, name);
    if (check) {
      if (!fs.existsSync(target) || !content.equals(fs.readFileSync(target))) {
        throw new Error(`Explorer assets need syncing: ${name}`);
      }
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content);
    }
  }
  return files.length;
}
if (require.main === module) console.log(`Explorer assets: ${sync({check:process.argv.includes('--check')})} files ${process.argv.includes('--check')?'verified':'synced'}.`);
module.exports = { root, source, destination, files, sync };
