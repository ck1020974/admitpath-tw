/* One rule model for application thresholds, summaries and placement. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AdmissionRules = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const valid = v => v != null && !['', '--', '---'].includes(String(v).trim());
  const subject = v => String(v || '').replace(/\s/g, '').replace('數學A', '數A').replace('數學B', '數B')
    .replace(/^(程式識讀|APCS識讀)$/, 'APCS識讀').replace(/^(程式實作|APCS實作)$/, 'APCS實作');
  const listening = { A: 4, B: 3, C: 2, F: 1 };
  const canonical = v => ({ 數A: '數學A', 數B: '數學B' }[subject(v)] || subject(v));
  function threshold(item, year, standards) {
    if (!valid(item.standard)) return null;
    const s = subject(item.subject);
    if (s === '英聽') {
      const level = String(item.standard).replace(/級|\s/g, '');
      return listening[level] ? { kind: 'listening', subjects: [s], threshold: listening[level], level, source: '檢定' } : { kind: 'note', subjects: [s], source: '英聽檢定待核對' };
    }
    const score = s.startsWith('APCS') ? Number(String(item.standard).replace('級', '')) : standards?.[year]?.[canonical(s)]?.[item.standard];
    if (score == null || !Number.isFinite(Number(score))) return { kind: 'note', subjects: [s], source: `${s}檢定待核對` };
    return { kind: 'score', subjects: [s], threshold: Number(score), standard: item.standard, source: '檢定' };
  }
  function thresholds(record, standards) {
    const detail = record.cacDetail || {};
    const rules = [...(detail.screeningSubjects || []), ...(detail.apcsSubjects || [])]
      .filter(item => !subject(item.subject).startsWith('APCS'))
      .map(i => threshold(i, String(record.year), standards)).filter(Boolean);
    const math = rules.filter(r => ['數A', '數B'].includes(r.subjects[0]));
    if (math.length === 2 && math.every(r => r.kind === 'score')) {
      return [...rules.filter(r => !math.includes(r)), { kind: 'any', subjects: ['數A', '數B'], options: math, source: '數學檢定' }];
    }
    return rules;
  }
  function verifiedResults(record) {
    const method = record.applySieveResult?.verification?.method;
    return (record.admissionAudit?.resultStatus === 'verified' || method === 'university_tw_crosscheck')
      ? (record.applySieveResult?.rankedItems || [])
        .filter(i => !(i.subjects || []).some(name => subject(name).startsWith('APCS')))
        .map(i => ({ ...i, subjects: i.subjects.map(subject) })) : [];
  }
  function hasUsableApplicationDetail(record) {
    const detail = record.cacDetail || {};
    return [...(detail.screeningSubjects || [])]
      .some(item => valid(item.subject) && valid(item.standard));
  }
  function hasSpecialConditions(record) {
    const detail = record.cacDetail || {};
    return /APCS/.test(record.departmentName)
      || (detail.apcsSubjects || []).length > 0
      || record.examRequired === '是'
      || detail.layout === 'art';
  }
  function importedOfficialResults(record) {
    const audit = record.admissionAudit;
    const sourceImageUrl = String(record.applySieveResult?.sourceImageUrl || '');
    const rows = record.applySieveResult?.rankedItems || [];
    if (audit?.resultStatus === 'verified' || !hasUsableApplicationDetail(record)
      || !sourceImageUrl.startsWith('https://www.cac.edu.tw/') || !rows.length) return [];
    const complete = rows.every((item) => {
      const subjects = (item.subjects || []).map(subject).filter(Boolean);
      const score = Number(item.score);
      const maximum = subjects.reduce((total, name) => total + (name.startsWith('APCS') ? 5 : 15), 0);
      return subjects.length && Number.isFinite(score) && score >= 0 && score <= maximum;
    });
    return complete ? rows
      .filter(i => !(i.subjects || []).some(name => subject(name).startsWith('APCS')))
      .map(i => ({ ...i, subjects: i.subjects.map(subject) })) : [];
  }
  function requirements(record, standards) {
    const rules = thresholds(record, standards);
    const detail = record.cacDetail || {};
    const audit = record.admissionAudit;
    const specialConditions = hasSpecialConditions(record);
    const verified = verifiedResults(record);
    const importedResults = importedOfficialResults(record);
    // 第一階段落點只需要篩選科目與檢定；第二階段占比或舊版解析狀態
    // 不應讓已具備官方一階結果的校系整筆消失。
    const resultRows = verified.length ? verified : importedResults;
    const resultSource = importedResults.length ? '官方篩選暫估' : '倍率篩選';
    resultRows.forEach(i => {
      if (valid(i.score)) rules.push({ kind: i.subjects.length > 1 ? 'sum' : 'score', subjects: i.subjects, threshold: Number(i.score), rank: i.rank, source: resultSource });
      // 未公布的順位級分不使用推測值，保留其他已公布條件進行判定。
    });
    return rules.filter(rule => rule.kind !== 'note');
  }
  function score(profile, s) {
    const raw = profile.scores?.[subject(s)] ?? profile.scores?.[canonical(s)];
    // 空白成績依落點分析設定視為 0 分，避免把「尚未輸入」誤列為資料不足。
    if (raw == null || String(raw).trim() === '') return 0;
    if (subject(s) === '英聽') return listening[String(raw).trim().toUpperCase()] ?? null;
    const n = Number(raw), max = subject(s).startsWith('APCS') ? 5 : 15;
    return Number.isInteger(n) && n >= (max === 5 ? 1 : 0) && n <= max ? n : null;
  }
  function check(rule, profile) {
    if (rule.kind === 'note') return { ...rule, status: 'missing', gap: 0, actual: '' };
    if (rule.kind === 'any') {
      const checked = rule.options.map(r => check(r, profile));
      const passed = checked.find(r => r.status === 'match');
      // An unprovided alternative is not required once either math exam is supplied.
      const supplied = checked.filter(r => r.status !== 'missing');
      const best = passed || supplied.sort((a, b) => a.gap - b.gap)[0];
      return {
        ...rule,
        status: best?.status || 'missing',
        gap: best?.gap || 0,
        actual: best?.actual ?? '',
        chosen: best?.subjects[0],
        checkedOptions: checked,
      };
    }
    const scores = rule.subjects.map(s => score(profile, s));
    if (scores.some(s => s == null)) return { ...rule, status: 'missing', actual: '', gap: 0 };
    const actual = rule.kind === 'sum' ? scores.reduce((a, b) => a + b, 0) : scores[0];
    const gap = rule.threshold - actual;
    return { ...rule, status: gap <= 0 ? 'match' : 'miss', actual, gap };
  }
  function describe(rule) {
    if (rule.kind === 'any') return rule.options.map(describe).join(' 或 ');
    if (rule.kind === 'note') return rule.source;
    if (rule.kind === 'listening') return `英聽 ${rule.level}級`;
    if (rule.source === '檢定' && rule.standard) return `${rule.subjects.join('+')} ${rule.standard}`;
    return `${rule.subjects.join('+')} ≥ ${rule.threshold}${rule.subjects.some(s => s.startsWith('APCS')) ? '級' : '級分'}`;
  }
  function evaluate(record, profile, standards) {
    const checked = requirements(record, standards).map(r => check(r, profile));
    const missingCount = 0;
    const missCount = checked.filter(r => r.status === 'miss').length;
    const gapTotal = checked.reduce((sum, r) => sum + Math.max(0, r.gap), 0);
    const specialConditions = hasSpecialConditions(record);
    return { status: missCount ? (gapTotal <= 3 ? 'near' : 'miss') : 'match',
      requirements: checked, missingCount, missCount, gapTotal, application: true,
      pendingData: false,
      importedOfficialData: checked.some(r => r.source === '官方篩選暫估'),
      specialConditions,
      caveat: '僅比對已收錄條件；不代表通過超額篩選或錄取。' };
  }
  return { subject, thresholds, requirements, verifiedResults, importedOfficialResults, hasUsableApplicationDetail, hasSpecialConditions, check, describe, evaluate };
});
