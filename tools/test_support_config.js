const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = path.join(__dirname, '../site/support.js');
assert.ok(fs.existsSync(script), '支持作者付款設定功能尚未實作');
const context = vm.createContext({ URL, document: { addEventListener() {} }, window: {} });
vm.runInContext(fs.readFileSync(script, 'utf8'), context);
function resolve(config) {
  context.config = config;
  return vm.runInContext('resolveSupportPaymentUrl(config)', context);
}
for (const config of [undefined, {}, { enabled: false, paymentUrl: 'https://payment.ecpay.com.tw/example' },
  { enabled: true, paymentUrl: '' }, { enabled: 'true', paymentUrl: 'https://payment.ecpay.com.tw/example' }]) {
  assert.equal(resolve(config), '', '未設定或未啟用時不得付款');
}
for (const paymentUrl of ['javascript:alert(1)', 'http://payment.ecpay.com.tw/example', '/payment',
  'https://ecpay.com.tw.evil.example/pay', 'https://fakeecpay.com.tw/pay',
  'https://user:secret@payment.ecpay.com.tw/pay', 'not a url', 'https://example.com/pay']) {
  assert.equal(resolve({ enabled: true, paymentUrl }), '', paymentUrl);
}
for (const paymentUrl of ['https://payment.ecpay.com.tw/example', 'https://p.ecpay.com.tw/example?x=1',
  'https://payment.opay.tw/example']) {
  assert.equal(resolve({ enabled: true, paymentUrl }), paymentUrl);
}
// 執行實際初始化流程，確認有效設定才會顯示付款連結。
function initialize(config) {
  const elements = {
    supportAuthorButton: { hidden: true, addEventListener() {} },
    supportDialog: { showModal() {}, addEventListener() {} },
    supportPaymentLink: { hidden: true },
    supportPaymentPending: { hidden: false, disabled: true },
    supportPaymentNote: { hidden: true },
  };
  let initializeListener;
  const page = vm.createContext({ URL, window: { YUHSIN_SUPPORT_CONFIG: config }, document: {
    addEventListener(type, listener) { initializeListener = listener; },
    getElementById(id) { return elements[id]; },
  } });
  vm.runInContext(fs.readFileSync(script, 'utf8'), page);
  initializeListener();
  return elements;
}
for (const config of [undefined, { enabled: false }, { enabled: true, paymentUrl: 'https://example.com/pay' }]) {
  const page = initialize(config);
  assert.equal(page.supportAuthorButton.hidden, false);
  assert.equal(page.supportPaymentLink.hidden, true);
  assert.equal(page.supportPaymentLink.href, undefined);
  assert.equal(page.supportPaymentPending.hidden, false);
  assert.equal(page.supportPaymentPending.disabled, true);
}
const ready = initialize({ enabled: true, paymentUrl: 'https://payment.ecpay.com.tw/example' });
assert.equal(ready.supportPaymentLink.hidden, false);
assert.equal(ready.supportPaymentLink.href, 'https://payment.ecpay.com.tw/example');
assert.equal(ready.supportPaymentPending.hidden, true);
assert.equal(ready.supportPaymentNote.hidden, false);
console.log('Support payment configuration and initialization checks passed.');
