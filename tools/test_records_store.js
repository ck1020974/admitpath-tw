// 校系分檔要完整、歸檔正確，且單檔遠低於 GitHub 的檔案大小限制。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fileNameOf, readIndex, recordsDir, mergedPath } = require('./records_store');

const MAX_FILE_BYTES = 40 * 1024 * 1024;
const files = readIndex();
assert.deepEqual([...files].sort(), fs.readdirSync(recordsDir).filter((name) => name !== 'index.json').sort());

const merged = JSON.parse(fs.readFileSync(mergedPath, 'utf8'));
const ids = new Set();
let total = 0;
for (const name of files) {
  const file = path.join(recordsDir, name);
  assert(fs.statSync(file).size < MAX_FILE_BYTES, `${name} 太大，請再細分`);
  const lines = fs.readFileSync(file, 'utf8').trim().slice(1, -1).split(/,\r?\n/);
  for (const line of lines) {
    const record = JSON.parse(line);
    assert.equal(fileNameOf(record), name, record.id);
    assert(!ids.has(record.id), record.id);
    ids.add(record.id);
    total += 1;
  }
}
assert.equal(total, merged.length);
merged.forEach((record) => assert(ids.has(record.id), record.id));
console.log(`Records store: ${total} records in ${files.length} files, largest file within limit.`);
