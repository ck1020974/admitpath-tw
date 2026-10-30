export const SCORING_VERSION='portal-20261030-engine7-v3';
export function stable(value){
  if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
export function validatedAssessment(raw,engine){
  if(!raw||raw.v!==engine.VERSION)throw Error('VERSION_MISMATCH');
  const session=engine.createSession();session.load(raw);
  const snapshot=session.snapshot();
  if(stable(snapshot)!==stable(raw))throw Error('INVALID_ANSWERS');
  if(!session.complete()||!session.extraComplete()||(snapshot.deep&&!session.deepComplete()))throw Error('INCOMPLETE_ASSESSMENT');
  return {snapshot,report:session.report()};
}
export function createRecordsHandler({projectUrl,publicKey,serviceKey,engine,bankVersion,catalog,fetcher=fetch,cryptoApi=crypto}){
  const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
  return async request=>{
    const origin=request.headers.get('origin')||'';
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
    if(origin==='https://ck1020974.github.io')Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type'});
    const json=(status,data)=>new Response(JSON.stringify(data),{status,headers});
    if(origin!=='https://ck1020974.github.io')return json(403,{error:'FORBIDDEN_ORIGIN'});
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'});
    const bearer=request.headers.get('authorization');
    if(!bearer?.startsWith('Bearer '))return json(401,{error:'UNAUTHORIZED'});
    const userHeaders={apikey:publicKey,Authorization:bearer};
    const serverHeaders={apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'};
    try{
      const auth=await fetcher(projectUrl+'/auth/v1/user',{headers:userHeaders,signal:AbortSignal.timeout(12000)});
      if(!auth.ok)return json(401,{error:'UNAUTHORIZED'});
      const user=await auth.json();
      if(!uuid(user.id))return json(401,{error:'UNAUTHORIZED'});
      const profile=await fetcher(projectUrl+'/rest/v1/students?select=id,active&id=eq.'+user.id,{headers:userHeaders,signal:AbortSignal.timeout(12000)});
      const students=profile.ok?await profile.json():[];
      if(students.length!==1||students[0].id!==user.id||!students[0].active)return json(403,{error:'STUDENT_REQUIRED'});
      const raw=await request.text();if(raw.length>120000)return json(413,{error:'REQUEST_TOO_LARGE'});
      const body=JSON.parse(raw);
      let rpc,args;
      if(body.action==='tracking'){
        if(!uuid(body.operationId)||!Array.isArray(body.changes)||!body.changes.length||body.changes.length>100)return json(422,{error:'INVALID_CHANGES'});
        const seen=new Set(),needsCatalog=body.changes.some(c=>c.removed!==true),records=needsCatalog?await catalog():null;
        const changes=[];
        for(const c of body.changes){
          if(typeof c.recordId!=='string'||c.recordId.length>200||!c.recordId||seen.has(c.recordId)||typeof c.removed!=='boolean'||!Number.isSafeInteger(c.revision)||c.revision<0)return json(422,{error:'INVALID_CHANGES'});
          seen.add(c.recordId);
          const row=c.removed?null:records.get(c.recordId);
          if(!c.removed&&!row)return json(422,{error:'UNKNOWN_RECORD'});
          changes.push({recordId:c.recordId,revision:c.revision,removed:c.removed,position:0,...(row?{school:row[1],department:row[2],year:row[3],channel:row[4]}:{})});
        }
        rpc='portal_tracking';args={owner_id:user.id,operation_key:body.operationId,changes_value:changes};
      }else if(body.action==='assessment-start'||body.action==='assessment-result'){
        if(!uuid(body.attemptId)||!['live','browser_import'].includes(body.source))return json(422,{error:'INVALID_ATTEMPT'});
        args={owner_id:user.id,attempt_key:body.attemptId,bank_value:bankVersion,scoring_value:SCORING_VERSION,source_value:body.source};
        rpc='portal_begin';
        if(body.action==='assessment-result'){
          let assessed;try{assessed=validatedAssessment(body.snapshot,engine);}catch{return json(422,{error:'INVALID_OR_INCOMPLETE_ASSESSMENT'});}
          const hash=[...new Uint8Array(await cryptoApi.subtle.digest('SHA-256',new TextEncoder().encode(stable({snapshot:assessed.snapshot,version:SCORING_VERSION}))))].map(n=>n.toString(16).padStart(2,'0')).join('');
          rpc='portal_result';Object.assign(args,{snapshot_value:assessed.snapshot,report_value:assessed.report,hash_value:hash});
        }
      }else return json(422,{error:'INVALID_ACTION'});
      const response=await fetcher(projectUrl+'/rest/v1/rpc/'+rpc,{method:'POST',headers:serverHeaders,body:JSON.stringify(args),signal:AbortSignal.timeout(15000)});
      const result=await response.json().catch(()=>null);
      if(!response.ok){const status=[403,409,422,429].includes(response.status)?response.status:503;return json(status,{error:status===409?'SYNC_CONFLICT':'SAVE_FAILED'});}
      return json(200,result||{saved:true});
    }catch{return json(503,{error:'SERVICE_UNAVAILABLE'});}
  };
}
