/* Cross-origin Auth uses bearer tokens, so third-party cookies are not required.
   Only a public publishable/anon key is accepted. Passwords are never persisted. */
(function(root) {
  'use strict';
  function publicKeyValid(key) {
    if (typeof key !== 'string') return false;
    if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
    try {
      const encoded = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(encoded)).role === 'anon';
    } catch { return false; }
  }
  function createClient({ config = {}, fetcher, storage, now = () => Date.now() }) {
    const teacher = config.accountType === 'teacher';
    const url = String(config.supabaseUrl || '').replace(/\/$/, '');
    const enabled = config.enabled === true && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && publicKeyValid(config.publishableKey);
    const key = (teacher ? 'yuhsin-teacher-session:' : 'yuhsin-student-session:') + new URL(enabled ? url : 'https://disabled.invalid').hostname;
    let tokens = null, current = null, refreshPromise = null;
    try { const saved = JSON.parse(storage?.getItem(key) || 'null'); if (saved?.access_token && saved?.refresh_token) tokens = saved; } catch {}
    function clear() { tokens = null; current = null; try { storage?.removeItem(key); } catch {} }
    function save(data) {
      if (typeof data.access_token !== 'string' || typeof data.refresh_token !== 'string' || !data.access_token || !data.refresh_token) throw new Error('登入服務回覆不完整，請稍後再試。');
      tokens = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Number(data.expires_at) || Math.floor(now() / 1000) + Number(data.expires_in || 3600) };
      try { storage?.setItem(key, JSON.stringify(tokens)); } catch {}
    }
    async function request(path, { body, token, method } = {}) {
      if (!enabled) throw Object.assign(new Error('學生登入尚未開放，仍可直接使用網站。'), { code: 'NOT_ENABLED' });
      let response;
      try {
        response = await fetcher(url + path, { method: method || (body === undefined ? 'GET' : 'POST'), credentials: 'omit', cache: 'no-store', redirect: 'error',
          headers: { apikey: config.publishableKey, Accept: 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : config.publishableKey.startsWith('eyJ') ? { Authorization: 'Bearer ' + config.publishableKey } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
      } catch { throw new Error('目前無法連線，請稍後再試。'); }
      const data = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) {
        const invalid = teacher ? '帳號或密碼不正確，請重新輸入。' : '學號或密碼不正確，請重新輸入。';
        const message = { 400: invalid, 401: invalid, 403: '帳號暫時無法使用，請聯絡管理者。', 409: '清單已在其他分頁更新，已重新載入，請再試一次。', 422: '資料尚未完整或版本不同，請確認後再儲存。', 429: '操作較頻繁，請稍後再試。' }[response.status];
        throw Object.assign(new Error(message || '登入服務暫時無法使用，請稍後再試。'), { status: response.status });
      }
      return data;
    }
    async function refresh() {
      if (!tokens?.refresh_token) { clear(); return false; }
      if (refreshPromise) return refreshPromise;
      refreshPromise = (async () => {
        try { save(await request('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: tokens.refresh_token } })); return true; }
        catch (error) { if ([400, 401, 403].includes(error.status)) clear(); throw error; }
        finally { refreshPromise = null; }
      })();
      return refreshPromise;
    }
    async function profile() {
      const user = await request('/auth/v1/user', { token: tokens.access_token });
      if (!user?.id) throw new Error('無法確認帳號，請重新登入。');
      if (teacher) {
        const query = new URLSearchParams({ select: 'id,school_id,name,active,all_groups,teaching_groups,can_manage_accounts,can_export', id: 'eq.' + user.id, limit: '1' });
        const rows = await request('/rest/v1/teacher_access?' + query, { token: tokens.access_token });
        const access = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
        if (!access?.active || access.id !== user.id) throw Object.assign(new Error('此帳號沒有教師權限，請聯絡管理者。'), { status: 403 });
        current = { id: access.id, name: access.name, role: 'teacher', allGroups: access.all_groups, teachingGroups: access.teaching_groups || [], canManageAccounts: access.can_manage_accounts === true };
        return current;
      }
      const query = new URLSearchParams({ select: 'id,student_id,name,teaching_group,original_class,original_seat_number,active', id: 'eq.' + user.id, limit: '1' });
      const rows = await request('/rest/v1/students?' + query, { token: tokens.access_token });
      const student = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
      if (!student?.active || student.id !== user.id) throw Object.assign(new Error('帳號暫時無法使用，請聯絡老師。'), { status: 403 });
      current = { id: student.id, studentId: student.student_id, name: student.name, teachingGroup: student.teaching_group, originalClass: student.original_class, originalSeatNumber: student.original_seat_number, role: 'student' };
      return current;
    }
    async function authorized(path,options={},expectedOwner){
      if(!tokens)throw new Error('請先登入帳號。');
      if(tokens.expires_at*1000<now()+30000)await refresh();
      await profile();
      if(expectedOwner&&current.id!==expectedOwner)throw new Error('帳號已切換，請重新操作。');
      return request(path,{...options,token:tokens.access_token});
    }
    return {
      enabled,
      provider: 'supabase',
      get current() { return current; },
      async session() {
        if (!enabled || !tokens) return null;
        try {
          if (tokens.expires_at * 1000 < now() + 30000) await refresh();
          try { return await profile(); } catch (error) { if (error.status !== 401) throw error; await refresh(); return await profile(); }
        } catch (error) { current = null; if ([400, 401, 403].includes(error.status)) { clear(); return null; } throw error; }
      },
      async login(studentId, password) {
        if (teacher && !/^[A-Za-z][A-Za-z0-9]{5,31}$/.test(studentId)) throw new Error('帳號或密碼不正確，請重新輸入。');
        const data = teacher
          ? await request('/auth/v1/token?grant_type=password', { body: { email: studentId.toLowerCase() + '@teacher.invalid', password } })
          : await request('/functions/v1/student-access', { body: { studentId, password } });
        save(data);
        try { return await profile(); } catch (error) { clear(); throw error; }
      },
      async logout() {
        try { if (tokens) await request('/auth/v1/logout?scope=local', { token: tokens.access_token, method: 'POST' }).catch(error => { if (error.status !== 401) throw error; }); }
        finally { clear(); }
      },
      async listStudents() {
        if (!teacher || !tokens) throw new Error('請先登入教師帳號。');
        if (tokens.expires_at * 1000 < now() + 30000) await refresh();
        await profile();
        const students = [];
        for (let offset = 0; ; offset += 200) {
          const query = new URLSearchParams({ select: 'id,student_id,name,teaching_group,original_class,original_seat_number,active', order: 'teaching_group.asc,original_class.asc,original_seat_number.asc,student_id.asc', limit: '200', offset: String(offset) });
          const rows = await request('/rest/v1/students?' + query, { token: tokens.access_token });
          if (!Array.isArray(rows)) throw new Error('無法讀取學生名單，請稍後再試。');
          students.push(...rows);
          if (rows.length < 200) break;
        }
        return students;
      },
      async rosterSummary(){
        if(!teacher)throw new Error('請先登入教師帳號。');
        const rows=await authorized('/rest/v1/rpc/teacher_roster_summary',{body:{}});
        if(!Array.isArray(rows))throw new Error('無法讀取名單摘要。');
        return rows;
      },
      async readContact(){
        if(teacher)return null;
        const rows=await authorized('/rest/v1/rpc/student_contact_info',{body:{}});
        const row=Array.isArray(rows)?rows[0]:rows;
        return row?{email:row.contact_email||'',wantsUpdates:Boolean(row.wants_updates),consentVersion:row.consent_version||'',consentAt:row.consent_at||null}:null;
      },
      async saveContact({email,wantsUpdates,consentVersion}){
        if(teacher)throw new Error('教師帳號不需要填寫信箱。');
        const value=String(email||'').trim();
        if(value.length>254||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value))throw Object.assign(new Error('信箱格式不正確，請重新輸入。'),{status:400,field:'email'});
        if(!/^\d{4}-\d{2}-\d{2}$/.test(consentVersion||''))throw new Error('請先勾選同意蒐集說明。');
        try{const rows=await authorized('/rest/v1/rpc/student_save_contact',{body:{email_value:value,updates_value:Boolean(wantsUpdates),consent_value:consentVersion}});const row=Array.isArray(rows)?rows[0]:rows;return{email:row?.contact_email||value,wantsUpdates:Boolean(row?.wants_updates),consentVersion:row?.consent_version||consentVersion,consentAt:row?.consent_at||null};}
        catch(error){if(error.status===400)throw Object.assign(new Error('信箱格式不正確，請重新輸入。'),{status:400,field:'email'});if(error.status===404)throw Object.assign(new Error('信箱功能尚未開放，請稍後再試。'),{status:404});throw error;}
      },
      async adminContacts(){
        if(!teacher||!current?.canManageAccounts)return [];
        const rows=await authorized('/rest/v1/rpc/admin_student_contacts',{body:{}});
        return Array.isArray(rows)?rows:[];
      },
      async syncRecords(body,expectedOwner){
        if(teacher)throw new Error('教師帳號不能代替學生儲存探索資料。');
        return authorized('/functions/v1/student-records',{body},expectedOwner);
      },
      async readTracking(studentId=current?.id){
        if(!studentId)throw new Error('請先登入帳號。');
        const all=[];
        for(let offset=0;;offset+=200){
          const query=new URLSearchParams({select:'record_id,school_name,department_name,admission_year,admission_channel,added_at,removed_at,revision',user_id:'eq.'+studentId,order:'added_at.asc,record_id.asc',limit:'200',offset:String(offset)});
          const rows=await authorized('/rest/v1/tracking_items?'+query);if(!Array.isArray(rows))throw new Error('無法讀取追蹤清單。');all.push(...rows);if(rows.length<200)break;
        }
        return all;
      },
      async readResults(studentId=current?.id,limit=100,offset=0){
        if(!studentId)throw new Error('請先登入帳號。');
        const query=new URLSearchParams({select:'id,attempt_id,stage,round_number,answers,report,completed_at,attempt:assessment_attempts(source,started_at,bank_version,scoring_version)',user_id:'eq.'+studentId,order:'completed_at.desc,id.desc',limit:String(Math.max(1,Math.min(100,limit))),offset:String(Math.max(0,offset))});
        return authorized('/rest/v1/assessment_results?'+query);
      },
      async readAttempts(studentId=current?.id){
        const all=[];
        for(let offset=0;;offset+=200){
          const query=new URLSearchParams({select:'id,status,started_at,completed_at,source',user_id:'eq.'+studentId,order:'started_at.desc,id.desc',limit:'200',offset:String(offset)});
          const rows=await authorized('/rest/v1/assessment_attempts?'+query);if(!Array.isArray(rows))throw new Error('無法讀取施測次數。');all.push(...rows);if(rows.length<200)break;
        }
        return all;
      },
    };
  }
  const api = { createClient, publicKeyValid };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.YuhsinSupabaseAuth = api;
})(typeof window !== 'undefined' ? window : globalThis);
