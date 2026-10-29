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
    const url = String(config.supabaseUrl || '').replace(/\/$/, '');
    const enabled = config.enabled === true && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && publicKeyValid(config.publishableKey);
    const key = 'yuhsin-student-session:' + new URL(enabled ? url : 'https://disabled.invalid').hostname;
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
        const message = { 400: '學號或密碼不正確，請重新輸入。', 401: '學號或密碼不正確，請重新輸入。', 403: '帳號暫時無法使用，請聯絡老師。', 429: '登入嘗試較頻繁，請稍後再試。' }[response.status];
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
      const query = new URLSearchParams({ select: 'id,student_id,name,teaching_group,original_class,original_seat_number,active', id: 'eq.' + user.id, limit: '1' });
      const rows = await request('/rest/v1/students?' + query, { token: tokens.access_token });
      const student = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
      if (!student?.active || student.id !== user.id) throw Object.assign(new Error('帳號暫時無法使用，請聯絡老師。'), { status: 403 });
      current = { id: student.id, studentId: student.student_id, name: student.name, teachingGroup: student.teaching_group, originalClass: student.original_class, originalSeatNumber: student.original_seat_number, role: 'student' };
      return current;
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
        const data = await request('/functions/v1/student-access', { body: { studentId, password } });
        save(data);
        try { return await profile(); } catch (error) { clear(); throw error; }
      },
      async logout() {
        if (tokens) await request('/auth/v1/logout?scope=local', { token: tokens.access_token, method: 'POST' }).catch(error => { if (error.status !== 401) throw error; });
        clear();
      },
    };
  }
  const api = { createClient, publicKeyValid };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.YuhsinSupabaseAuth = api;
})(typeof window !== 'undefined' ? window : globalThis);
