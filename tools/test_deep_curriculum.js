'use strict';
const assert = require('node:assert/strict');
const data = require('../prototypes/interest-explorer/curiosity/data');
const engine = require('../prototypes/interest-explorer/curiosity/engine');

// Every new item must retain the project's stored curriculum trail.
for (const subject of data.subjects) {
  const pool = data.goalPools[subject.id];
  assert.equal(pool.length, 10, `${subject.id}: ten curriculum-based items`);
  assert.equal(new Set(pool.map(g => g.id)).size, 10);
  assert.equal(new Set(pool.map(g => g.text)).size, 10);
  for (const goal of pool) {
    assert.ok(goal.references.length, goal.id);
    for (const ref of goal.references) {
      const entry = data.curriculum[ref];
      assert.ok(entry?.code && entry.official && entry.page && data.sources[entry.source]?.url, `${goal.id}: ${ref}`);
    }
  }
  const combinations = new Set();
  for (const group of data.groups) {
    const goals = data.detailGoals(subject.id, group.id);
    assert.equal(goals.length, 5);
    assert.equal(new Set(goals.map(g => g.id)).size, 5);
    assert.deepEqual(goals.slice(0, 3).map(g => g.id), pool.slice(0, 3).map(g => g.id));
    assert.deepEqual(goals, data.detailGoals(subject.id, group.id), 'stable selection on repeat');
    combinations.add(goals.map(g => g.id).join(','));
    assert.equal(data.detailGoals(subject.id, group.id, 6).length, 3, 'legacy plan remains three items');
  }
  assert.ok(combinations.size > 1, 'context changes extension items');
}

function student() {
  const s = engine.createSession({ quick: data.quickSet });
  s.questions().forEach(q => s.answer(q.id, 1));
  s.setLevel('mid'); s.setPicks('strong', ['math', 'physics']); s.setPicks('weak', ['history', 'earth']);
  s.startDeep(); s.deepQuestions().forEach(q => s.answer(q.id, 1));
  return s;
}
const current = student();
assert.equal(current.snapshot().v, 7);
for (const row of current.detailPlan()) {
  assert.equal(row.goals.length, 5);
  row.goals.forEach(g => current.goal(g.id, 3));
}
assert.equal(current.deepComplete(), true);
assert.deepEqual(engine.decodeShare(engine.encodeShare(current.snapshot())).session.report(), current.report());
const loaded = engine.createSession(); loaded.load(current.snapshot());
assert.deepEqual(loaded.report(), current.report());
// A five-item average stays on 0–4, without increasing that subject's group weight.
for (const row of current.detailPlan()) {
  for (const group of current.report().groups) {
    const subject = group.subjects.find(s => s.id === row.subject);
    if (subject) assert.equal(subject.value, 3);
  }
}
// Old completed work survives both local save and result-link round trips.
const old = student().snapshot(); old.v = 6;
old.deep.plan.forEach(row => {
  row.goals = data.detailGoals(row.subject, row.context, 6).map(g => g.id);
  delete row.goalVersion;
  row.goals.forEach(id => { old.deep.goals[id] = 2; });
});
const legacy = engine.createSession(); legacy.load(old);
assert.deepEqual(engine.decodeShare(engine.encodeShare(old)).session.report(), legacy.report());
assert.equal(legacy.deepComplete(), true);
assert.ok(legacy.detailPlan().every(row => row.goals.length === 3));
const savedAgain = engine.createSession(); savedAgain.load(legacy.snapshot());
assert.deepEqual(savedAgain.report(), legacy.report());
assert.deepEqual(engine.decodeShare(engine.encodeShare(legacy.snapshot())).session.report(), legacy.report());
// Incomplete new five-item work must not partially replace the baseline.
const partial = student();
partial.detailPlan().forEach(row => row.goals.slice(0, 4).forEach(g => partial.goal(g.id, 4)));
assert.equal(partial.deepComplete(), false);
assert.equal(partial.report().deep, false);
console.log('Deep curriculum: 14 ten-item pools, traceable references, shared core plus contextual extensions, five-item scoring, incomplete-work exclusion and legacy saves/links passed.');
