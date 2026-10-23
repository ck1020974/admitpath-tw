'use strict';
// 使用次數統計：沒有代碼時不送出、事件名稱有白名單格式、同一次開啟可以只算一次。
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');
const src=fs.readFileSync(path.join(__dirname,'../site/usage.js'),'utf8');
function load(config,hostname='ck1020974.github.io'){
 const added=[];const counted=[];
 const window={YUHSIN_USAGE_CONFIG:config,location:{hostname},document:{createElement:()=>({dataset:{},addEventListener(){} }),head:{appendChild:s=>added.push(s)}}};
 vm.runInNewContext(src,{window,console:{info(){}}});
 return {api:window.YuhsinUsage,added,window,counted};
}
// 沒有代碼：不載入外部程式、不排隊任何資料。
{const {api,added}=load({goatcounterCode:''});assert.equal(api.enabled,false);assert.equal(added.length,0);api.event('curiosity-start','x');assert.equal(api._queue.length,0);}
// 本機測試不送出。
{const {api,added}=load({goatcounterCode:'yuhsin'},'localhost');assert.equal(api.enabled,false);assert.equal(added.length,0);}
// 有代碼：載入 GoatCounter、事件先排隊，載入後送出。
{
 const {api,added,window}=load({goatcounterCode:'yuhsin'});
 assert.equal(api.enabled,true);assert.equal(added.length,1);
 assert.equal(added[0].src,'https://gc.zgo.at/count.js');assert.equal(added[0].dataset.goatcounter,'https://yuhsin.goatcounter.com/count');
 assert.equal(window.goatcounter.no_onload,true,'單頁網站自己記錄頁面瀏覽');
 assert.equal(api.page('view/workbench','查詢工作台'),true);assert.equal(api.page('view/workbench','查詢工作台'),false,'同一頁只算一次');
 assert.equal(api.event('curiosity-share-copy','',{once:true}),true);assert.equal(api.event('curiosity-share-copy','',{once:true}),false);
 assert.equal(api.event('compare-add'),true);assert.equal(api.event('compare-add'),true,'沒有 once 時每次都算');
 assert.equal(api.event('curiosity-top/資訊學群'),true);
 // 不合格的名稱（含空白、電子郵件、長字串、作答內容）一律不送。
 for(const bad of ['15 號 王小明','a@b.com','curiosity-top/'+'很'.repeat(30),'Answer:2','/view','x/y/z'])assert.equal(api.event(bad),false,bad);
 assert.equal(JSON.stringify(api._queue.map(q=>q.path)),JSON.stringify(['/view/workbench','curiosity-share-copy','compare-add','compare-add','curiosity-top/資訊學群']));
 assert.ok(api._queue.slice(1).every(q=>q.event===true));
}
// 學群探索與主站都載入統計程式，而且只送事件名稱。
const curiosity=fs.readFileSync(path.join(__dirname,'../site/explore/curiosity/index.html'),'utf8');
assert.match(curiosity,/\.\.\/\.\.\/usage\.js/);
const app=fs.readFileSync(path.join(__dirname,'../site/explore/curiosity/app.js'),'utf8');
for(const name of ['curiosity-start','curiosity-step1-done','curiosity-result','curiosity-deep-done','curiosity-extra-done','curiosity-share-copy'])assert.ok(app.includes(`'${name}'`),name);
assert.doesNotMatch(app,/track\([^)]*shareName/,'名字不會送出');
console.log('Usage tracking: disabled without code or on localhost, GoatCounter loading, once-per-visit counting, event-name whitelist and hooks passed.');
