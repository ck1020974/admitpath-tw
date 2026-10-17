const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '../prototypes/interest-explorer/questionnaire.js');
assert.ok(fs.existsSync(file), 'Mini-IP 繁體中文審閱稿尚未實作');
const { items, types, groups, score, readingSuggestions, makeRecord, version } = require(file);
assert.equal(items.length, 30);
assert.deepEqual(items.map(item => item.id), Array.from({length:30}, (_,i) => i+1));
for (const [index, type] of types.entries()) {
  assert.equal(items.filter(item => item.type === type.code).length, 5);
  assert.deepEqual(items.filter(item => item.type === type.code).map(item => item.id), [1,7,13,19,25].map(id => id + index));
}
assert.ok(items.every(item => item.original && item.text));
assert.equal(groups.length, 18);
assert.equal(new Set(groups.map(group => group.name)).size, 18);
for (const group of groups) assert.ok(group.types.every(code => types.some(type => type.code === code)));
assert.throws(() => score([]), /30/);
for (const invalid of [null, undefined, -1, 5, 1.5, '4', NaN]) {
  const answers = Array(30).fill(2); answers[10] = invalid;
  assert.throws(() => score(answers), /回答/);
}
assert.deepEqual(score(Array(30).fill(0)).scores, Object.fromEntries(types.map(type => [type.code, 0])));
assert.deepEqual(score(Array(30).fill(4)).scores, Object.fromEntries(types.map(type => [type.code, 20])));
const flat = score(Array(30).fill(2));
assert.equal(flat.flat, true);
assert.deepEqual(flat.leading, []);
assert.deepEqual(readingSuggestions(flat), []);
const answers = items.map(item => ['I','S'].includes(item.type) ? 4 : 1);
const result = score(answers);
assert.deepEqual(result.leading, ['I','S']);
assert.equal(result.scores.I, 20); assert.equal(result.scores.C, 5);
assert.equal(result.rankings.find(row => row.code === 'S').rank, 1);
assert.equal(result.rankings.find(row => row.code === 'C').rank, 3);
assert.ok(readingSuggestions(result).some(group => group.name === '社會心理學群'));
const record = makeRecord(answers);
assert.equal(record.version, version);
assert.equal(record.validated, false);
assert.equal(record.answers.length, 30);
assert.deepEqual(Object.keys(record).sort(), ['answers','scores','source','validated','version']);
console.log('Interest explorer: source IDs, six scales, missing/invalid answers, raw scores, ties, flat profiles, editorial suggestions and anonymous export passed.');
