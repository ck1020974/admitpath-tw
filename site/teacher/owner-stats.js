/* 網站數據：只有網站管理者（teacher_access.can_manage_accounts）看得到這個視窗。
   上半部「全站使用」來自 GoatCounter 公開計數（不分是否登入、無個人資料）；
   下半部「會員」來自 Supabase owner_site_stats()（只有總數與班群統計）。 */
(function () {
  'use strict';
  const GROUPS = ['資訊學群','工程學群','數理化學群','醫藥衛生學群','生命科學學群','生物資源學群','地球環境學群','建築設計學群','藝術學群','社會心理學群','大眾傳播學群','外語學群','文史哲學群','教育學群','法政學群','管理學群','財經學群','遊憩運動學群','不分系學群'];
  const SITE_EVENTS = [
    ['/site-visit', '網站造訪'],
    ['placement-run', '落點分析'],
    ['curiosity-result', '完成學群探索'],
    ['compare-add', '加入追蹤'],
  ];
  const fmt = new Intl.NumberFormat('zh-Hant-TW');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (part, whole) => whole ? Math.round(part / whole * 100) + '%' : '—';

  function counterBase() {
    const config = window.YUHSIN_USAGE_CONFIG || {};
    const code = /^[a-z0-9-]{2,50}$/.test(config.goatcounterCode || '') ? config.goatcounterCode : '';
    const start = /^\d{4}-\d{2}-\d{2}$/.test(config.visitorStartDate || '') ? config.visitorStartDate : '';
    return code ? { code, start } : null;
  }

  // GoatCounter 的公開計數：沒有紀錄的事件會回 404，視為 0。
  async function count(base, path) {
    const query = base.start ? `?start=${base.start}` : '';
    const response = await fetch(`https://${base.code}.goatcounter.com/counter/${encodeURIComponent(path)}.json${query}`, { credentials: 'omit' });
    if (response.status === 404) return 0;
    if (!response.ok) throw new Error('counter ' + response.status);
    const data = await response.json();
    const value = Number(String(data.count ?? '').replace(/[^\d]/g, ''));
    return Number.isSafeInteger(value) ? value : 0;
  }

  async function countAll(base, paths) {
    const result = new Map(); let index = 0, failed = 0;
    async function worker() {
      while (index < paths.length) {
        const path = paths[index++];
        try { result.set(path, await count(base, path)); } catch { result.set(path, null); failed++; }
      }
    }
    await Promise.all(Array.from({ length: 4 }, worker));
    return { result, failed };
  }

  // 2026/11/02 18:00 以前，登入學生加入追蹤沒有送到 GoatCounter；這段期間的會員追蹤從資料庫補計。
  const BACKFILL_BEFORE = '2026-11-02T10:00:00Z';
  const normalize = value => String(value || '').toLowerCase().replace(/\s+/g, '').replace(/[（(].*?[）)]/g, '');
  let groupIndex = null;
  async function loadGroupIndex() {
    if (groupIndex) return groupIndex;
    const rows = await fetch('../data/group_departments.json', { credentials: 'omit' }).then(r => r.ok ? r.json() : []);
    const index = new Map();
    for (const row of Array.isArray(rows) ? rows : []) {
      if (row.groupName === '跨領域') continue;
      const key = normalize(row.schoolDepartmentName);
      if (!index.has(key)) index.set(key, new Set());
      index.get(key).add(row.groupName);
    }
    return (groupIndex = index);
  }
  async function backfill(client) {
    if (typeof client?.adminTrackingAddedBefore !== 'function') return null;
    const [rows, index] = await Promise.all([client.adminTrackingAddedBefore(BACKFILL_BEFORE), loadGroupIndex().catch(() => new Map())]);
    const groups = new Map();
    for (const row of rows) for (const g of [...(index.get(normalize(row.school_name + row.department_name)) || [])].slice(0, 3)) groups.set(g, (groups.get(g) || 0) + 1);
    return { total: rows.length, groups };
  }

  const num = value => value === null || value === undefined ? '—' : fmt.format(value);

  async function renderSite(box, client) {
    const base = counterBase();
    if (!base) { box.innerHTML = '<p class="os-note">全站統計尚未啟用。</p>'; return; }
    box.innerHTML = '<p class="os-note">正在讀取全站統計…</p>';
    const paths = [...SITE_EVENTS.map(([path]) => path), ...GROUPS.flatMap(g => [`detail-group/${g}`, `compare-group/${g}`])];
    const [{ result, failed }, extra] = await Promise.all([countAll(base, paths), backfill(client).catch(() => null)]);
    // 補計：加入追蹤與各學群的「加入追蹤」加上資料庫裡漏記的會員追蹤。
    if (extra?.total) {
      if (result.get('compare-add') !== null) result.set('compare-add', (result.get('compare-add') || 0) + extra.total);
      for (const [g, n] of extra.groups) { const key = `compare-group/${g}`; if (result.get(key) !== null) result.set(key, (result.get(key) || 0) + n); }
    }
    if (failed === paths.length) { box.innerHTML = '<p class="os-note">全站統計暫時讀不到，請稍後再試，或直接到 GoatCounter 後台查看。</p>'; return; }
    const cards = SITE_EVENTS.map(([path, label]) => `<div class="os-card"><span>${esc(label)}</span><b>${num(result.get(path))}</b></div>`).join('');
    // 依「加入追蹤」排名（比打開詳情更能代表興趣），前 5 名用長條，其餘收合。
    const rows = GROUPS.map(g => ({ g, detail: result.get(`detail-group/${g}`), compare: result.get(`compare-group/${g}`) }))
      .sort((a, b) => (b.compare || 0) - (a.compare || 0) || (b.detail || 0) - (a.detail || 0));
    const max = Math.max(1, ...rows.map(r => r.compare || 0));
    const bar = r => `<li><span class="os-bar-name">${esc(r.g)}</span><span class="os-bar-track"><span class="os-bar" style="width:${Math.round((r.compare || 0) / max * 100)}%"></span></span><b>${num(r.compare)}</b><small>詳情 ${num(r.detail)}</small></li>`;
    box.innerHTML = `<div class="os-cards os-cards-4">${cards}</div>
      <h4>熱門學群 <small>依加入追蹤次數</small></h4>
      <ol class="os-bars">${rows.slice(0, 5).map(bar).join('')}</ol>
      <details class="os-more"><summary>看全部學群</summary><ol class="os-bars" start="6">${rows.slice(5).map(bar).join('')}</ol></details>`;
  }

  function renderMembers(box, stats) {
    const t = stats.totals || {};
    const avg = t.tracking_users ? (t.tracking_items / t.tracking_users).toFixed(1) : '';
    const cards = [
      ['登入過', `${num(t.signed_in)}<em> / ${num(t.students)}</em>`, `${pct(t.signed_in, t.students)}・近 7 天 ${num(t.active_7d)} 人`],
      ['完成探索', num(t.explored), pct(t.explored, t.students)],
      ['有追蹤', num(t.tracking_users), t.tracking_items ? `共 ${num(t.tracking_items)} 個・平均 ${avg} 個` : ''],
    ].map(([label, value, sub]) => `<div class="os-card"><span>${esc(label)}</span><b>${value}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`).join('');
    const groupRows = stats.groups || [];
    const groups = groupRows.map(g => `<tr><th scope="row">${esc(g.group)}</th><td class="num">${num(g.students)}</td><td class="num">${num(g.signed_in)}<small>${pct(g.signed_in, g.students)}</small></td><td class="num">${num(g.explored)}<small>${pct(g.explored, g.students)}</small></td><td class="num">${num(g.tracking_users)}<small>${pct(g.tracking_users, g.students)}</small></td></tr>`).join('');
    const item = (d, i) => `<li><span class="os-rank">${i + 1}</span><span>${esc(d.school)} ${esc(d.department)}</span><b>${num(d.students)} 人</b></li>`;
    const deps = stats.top_departments || [];
    box.innerHTML = `<div class="os-cards os-cards-3">${cards}</div>
      <h4>熱門追蹤校系</h4>
      ${deps.length ? `<ol class="os-top">${deps.slice(0, 5).map(item).join('')}</ol>${deps.length > 5 ? `<details class="os-more"><summary>看全部</summary><ol class="os-top">${deps.slice(5).map((d, i) => item(d, i + 5)).join('')}</ol></details>` : ''}` : '<p class="os-note">還沒有學生追蹤校系。</p>'}
      ${groupRows.length ? `<details class="os-more os-groups"><summary>各班群（${groupRows.length} 個）</summary><table class="os-table"><thead><tr><th scope="col">班群</th><th scope="col" class="num">人數</th><th scope="col" class="num">登入過</th><th scope="col" class="num">完成探索</th><th scope="col" class="num">有追蹤</th></tr></thead><tbody>${groups}</tbody></table></details>` : ''}`;
  }

  window.YuhsinOwnerStats = {
    open(dialog, stats, client) {
      renderMembers(dialog.querySelector('#ownerMembers'), stats);
      const updated = dialog.querySelector('#ownerUpdated');
      if (updated) updated.textContent = stats.generated_at ? '更新時間 ' + new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Taipei' }).format(new Date(stats.generated_at)) : '';
      dialog.showModal();
      renderSite(dialog.querySelector('#ownerSite'), client).catch(() => { dialog.querySelector('#ownerSite').innerHTML = '<p class="os-note">全站統計暫時讀不到，請稍後再試。</p>'; });
    },
  };
})();
