/* Per-account drafts stay in this tab; anonymous browser data is never auto-imported. */
(function(){
  'use strict';
  const auth=window.YuhsinStudentAuth;
  let owner=null,initialized=false;
  const listeners=new Set();
  const prefix=id=>'yuhsin-data:'+id+':';
  function storage(privateData){try{return privateData?window.sessionStorage:window.localStorage;}catch{return null;}}
  function change(){
    const next=auth.client.current?.role==='student'?auth.client.current:null;
    if(initialized&&next?.id===owner?.id)return;
    const previous=owner;owner=next;initialized=true;
    if(previous&&previous.id!==next?.id){const s=storage(true);if(s)for(const key of Object.keys(s))if(key.startsWith(prefix(previous.id)))s.removeItem(key);}
    for(const listener of listeners)Promise.resolve().then(listener).catch(()=>{});
  }
  const ready=auth.ready.catch(()=>null).then(change);
  window.addEventListener('yuhsin-auth-change',change);
  window.YuhsinStudentRecords={
    ready,get student(){return owner;},get client(){return auth.client;},
    onChange(listener){listeners.add(listener);return()=>listeners.delete(listener);},
    read(key){try{return storage(Boolean(owner))?.getItem(owner?prefix(owner.id)+key:key)||null;}catch{return null;}},
    write(key,value){try{storage(Boolean(owner))?.setItem(owner?prefix(owner.id)+key:key,value);return true;}catch{return false;}},
    remove(key){try{storage(Boolean(owner))?.removeItem(owner?prefix(owner.id)+key:key);}catch{}},
    guest(key){try{return storage(false)?.getItem(key)||null;}catch{return null;}},
    begin(source='live'){
      const context={attemptId:crypto.randomUUID(),source,ownerId:owner?.id||null};
      if(owner)auth.client.syncRecords({action:'assessment-start',attemptId:context.attemptId,source},owner.id).catch(()=>{});
      return context;
    },
    async saveResult(snapshot,context){
      if(!owner||context?.ownerId!==owner.id)throw new Error('請登入後開始探索，或選擇匯入你自己的瀏覽器紀錄。');
      return auth.client.syncRecords({action:'assessment-result',attemptId:context.attemptId,source:context.source,snapshot},owner.id);
    },
  };
})();
