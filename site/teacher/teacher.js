/* Teacher records are fetched with the teacher's token and enforced by RLS. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let storage; try { storage = window.sessionStorage; } catch {}
  const client = window.YuhsinSupabaseAuth.createClient({ config: { ...window.YUHSIN_STUDENT_AUTH_CONFIG, accountType: 'teacher' }, fetcher: window.fetch.bind(window), storage });
  const form = $('login').querySelector('form'), submit = form.querySelector('button');
  let students = [], epoch = 0;
  function message(id, text) { $(id).textContent = text; $(id).hidden = !text; }
  function clearWorkspace() {
    epoch++; students = []; $('students').replaceChildren(); $('search').value = '';
    for (const id of ['group','original']) while ($(id).options.length > 1) $(id).remove(1);
    $('workspace').hidden = true; $('scope').textContent = ''; $('count').textContent = ''; $('empty').hidden = true;
  }
  function showLogin() { clearWorkspace(); $('login').hidden = false; }
  function render() {
    const search = $('search').value.trim().toLocaleLowerCase();
    const filtered = students.filter(s => (!search || s.name.toLocaleLowerCase().includes(search) || s.student_id.toLowerCase().includes(search)) && (!$('group').value || s.teaching_group === $('group').value) && (!$('original').value || s.original_class === $('original').value));
    const fragment = document.createDocumentFragment();
    for (const s of filtered) {
      const row = document.createElement('tr');
      for (const value of [s.student_id,s.name,s.teaching_group,s.original_class,s.original_seat_number || '—',s.active ? '啟用' : '停用']) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
      fragment.append(row);
    }
    $('students').replaceChildren(fragment); $('count').textContent = '顯示 ' + filtered.length + ' 位／共 ' + students.length + ' 位學生'; $('empty').hidden = filtered.length !== 0;
  }
  async function workspace() {
    const version = ++epoch;
    $('login').hidden = true; $('workspace').hidden = true; message('status', '正在載入學生名單…');
    const rows = await client.listStudents();
    if (version !== epoch) return;
    students = rows;
    for (const [id,field] of [['group','teaching_group'],['original','original_class']]) {
      while ($(id).options.length > 1) $(id).remove(1);
      for (const value of [...new Set(students.map(s=>s[field]))].sort()) { const option = document.createElement('option'); option.value = option.textContent = value; $(id).append(option); }
    }
    $('scope').textContent = client.current.allGroups ? '查看範圍：本校所有上課班級' : '查看範圍：已授權的上課班級';
    render(); message('status',''); $('workspace').hidden = false;
  }
  $('showPassword').addEventListener('change', event => { form.elements.password.type = event.target.checked ? 'text' : 'password'; });
  function resetPassword() { form.elements.password.value = ''; form.elements.password.type = 'password'; $('showPassword').checked = false; }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (submit.disabled) return;
    submit.disabled = true; submit.textContent = '正在登入…'; message('loginError','');
    try { await client.login(form.elements.username.value.trim(), form.elements.password.value); resetPassword(); await workspace(); $('rosterTitle').setAttribute('tabindex','-1'); $('rosterTitle').focus(); }
    catch (error) { showLogin(); message('status',''); message('loginError',error.message); resetPassword(); form.elements.password.focus(); }
    finally { submit.disabled = false; submit.textContent = '登入教師後台'; }
  });
  $('logout').addEventListener('click', async () => {
    clearWorkspace(); $('login').hidden = true; message('status','正在登出…');
    try { await client.logout(); message('status','已登出。'); }
    catch { message('status','本機登入已清除；網路連線中斷，請稍後再試。'); }
    finally { showLogin(); resetPassword(); form.elements.username.value = ''; form.elements.username.focus(); }
  });
  for (const id of ['search','group','original']) $(id).addEventListener(id === 'search' ? 'input' : 'change',render);
  // Returning to a backgrounded teacher page revalidates authorization before displaying records.
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) { clearWorkspace(); return; }
    try { if (await client.session()) await workspace(); else { showLogin(); message('status','請登入教師帳號。'); } }
    catch (error) { showLogin(); message('status',error.message); }
  });
  (async () => { try { if (await client.session()) await workspace(); else { showLogin(); message('status',''); } } catch(error) { showLogin(); message('status',error.message); } })();
})();
