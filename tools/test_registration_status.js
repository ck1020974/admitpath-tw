const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../site/app.js'), 'utf8');
const context = { REGISTRATION_CLOSING_DAYS: 3, fmt: new Intl.NumberFormat('zh-Hant-TW'), escapeHtml: String };
vm.createContext(context);
for (const name of ['specialRegistrationRange', 'registrationDate', 'specialRegistrationStatus', 'isRegistrationActive', 'compareDisplayOrder', 'compareReminderHtml']) {
  vm.runInContext(source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))[0], context);
}
const dates = (registrationStart, registrationEnd) => ({ dates: { registrationStart, registrationEnd } });
const status = (source, ...day) => context.specialRegistrationStatus(source, new Date(...day)).key;
const range = dates('2026/11/02', '2026/11/10');
assert.equal(status(range, 2026, 10, 1), 'upcoming');
assert.equal(status(range, 2026, 10, 2), 'open');
assert.equal(status(range, 2026, 10, 6), 'open');
assert.equal(status(range, 2026, 10, 7), 'closing', '截止前 3 天算即將截止');
assert.equal(status(range, 2026, 10, 10), 'closing', '截止當天仍可報名');
assert.equal(status(range, 2026, 10, 11), 'closed');
assert.equal(context.isRegistrationActive({ key: 'closing' }), true);
assert.equal(context.isRegistrationActive({ key: 'upcoming' }), false);
assert.equal(context.isRegistrationActive(null), false);

// 依今天日期排序：報名中最快截止優先，其次尚未開始、其他管道，已截止最後。
const now = new Date();
const offset = days => {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};
const special = (id, start, end) => ({ id, specialSelection: dates(offset(start), offset(end)) });
const records = [
  { id: 'apply' }, special('closed', -9, -1), special('upcoming', 5, 9),
  special('later', -1, 20), special('soon', -1, 2), { id: 'star' },
];
assert.deepEqual(Array.from(context.compareDisplayOrder(records), record => record.id), ['soon', 'later', 'upcoming', 'apply', 'star', 'closed']);
const reminder = context.compareReminderHtml(records);
assert.match(reminder, /特選報名中 <b>2<\/b> 筆/);
assert.match(reminder, /<b>1<\/b> 筆即將截止/);
assert.match(reminder, new RegExp(`最快 ${offset(2).slice(5)} 截止`));
assert.equal(context.compareReminderHtml([{ id: 'apply' }, special('closed', -9, -1)]), '');
console.log('Registration status: closing window, tracking order and reminder passed.');
