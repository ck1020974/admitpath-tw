// build_student_records_function.js supplies the exact published scoring modules.
let cachedCatalog: Map<string,unknown[]> | null=null, catalogUntil=0;
async function catalog(){
  if(cachedCatalog&&Date.now()<catalogUntil)return cachedCatalog;
  const response=await fetch('https://ck1020974.github.io/admitpath-tw/data/student-sync-catalog.json',{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('CATALOG_UNAVAILABLE');
  const text=await response.text();if(text.length>6000000)throw Error('CATALOG_TOO_LARGE');
  const rows=JSON.parse(text);if(!Array.isArray(rows)||!rows.length)throw Error('INVALID_CATALOG');
  cachedCatalog=new Map(rows.map(row=>[row[0],row]));catalogUntil=Date.now()+300000;return cachedCatalog;
}
Deno.serve(createRecordsHandler({projectUrl:Deno.env.get('SUPABASE_URL'),publicKey:Deno.env.get('SUPABASE_ANON_KEY'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),engine:globalThis.YuhsinCuriosityEngine,bankVersion:globalThis.YuhsinCuriosityData.version,catalog}));
