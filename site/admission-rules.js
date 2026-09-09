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
      .map(i => threshold(i, String(record.year), standards)).filter(Boolean);
    const math = rules.filter(r => ['數A', '數B'].includes(r.subjects[0]));
    if (math.length === 2 && math.every(r => r.kind === 'score')) {
      return [...rules.filter(r => !math.includes(r)), { kind: 'any', subjects: ['數A', '數B'], options: math, source: '數學檢定（擇一）' }];
    }
    return rules;
  }
  function verifiedResults(record) {
    return record.admissionAudit?.resultStatus === 'verified'
      ? (record.applySieveResult?.rankedItems || []).map(i => ({ ...i, subjects: i.subjects.map(subject) })) : [];
  }
  function requirements(record, standards) {
    const rules = thresholds(record, standards);
    const detail = record.cacDetail || {};
    const audit = record.admissionAudit;
    if (!audit || audit.detailStatus !== 'parsed' || audit.issues?.length) rules.push({ kind: 'note', subjects: [], source: '簡章條件待核對' });
    if (audit?.resultStatus !== 'verified') rules.push({ kind: 'note', subjects: [], source: '一階結果待核對' });
    else verifiedResults(record).forEach(i => {
      if (valid(i.score)) rules.push({ kind: i.subjects.length > 1 ? 'sum' : 'score', subjects: i.subjects, threshold: Number(i.score), rank: i.rank, source: '倍率篩選' });
      else if (i.status !== 'official_not_listed') rules.push({ kind: 'note', subjects: i.subjects, source: '篩選級分待核對' });
    });
    if (/APCS/.test(record.departmentName) && !detail.apcsSubjects?.length) rules.push({ kind: 'note', subjects: [], source: 'APCS條件待核對' });
    if (record.examRequired === '是' || detail.layout === 'art') rules.push({ kind: 'note', subjects: ['術科'], source: '術科條件請查官方分則' });
    return rules;
  }
  function score(profile, s) {
    const raw = profile.scores?.[subject(s)] ?? profile.scores?.[canonical(s)];
    if (raw == null || String(raw).trim() === '') return null;
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
      return { ...rule, status: best?.status || 'missing', gap: best?.gap || 0, actual: best?.actual ?? '', chosen: best?.subjects[0] };
    }
    const scores = rule.subjects.map(s => score(profile, s));
    if (scores.some(s => s == null)) return { ...rule, status: 'missing', actual: '', gap: 0 };
    const actual = rule.kind === 'sum' ? scores.reduce((a, b) => a + b, 0) : scores[0];
    const gap = rule.threshold - actual;
    return { ...rule, status: gap <= 0 ? 'match' : 'miss', actual, gap };
  }
  function describe(rule) {
    if (rule.kind === 'any') return rule.options.map(describe).join(' 或 ') + '（擇一）';
    if (rule.kind === 'note') return rule.source;
    if (rule.kind === 'listening') return `英聽 ${rule.level}級以上`;
    if (rule.source === '檢定' && rule.standard) return `${rule.subjects.join('+')} ${rule.standard}`;
    return `${rule.subjects.join('+')} ≥ ${rule.threshold}${rule.subjects.some(s => s.startsWith('APCS')) ? '級' : '級分'}`;
  }
  function evaluate(record, profile, standards) {
    const checked = requirements(record, standards).map(r => check(r, profile));
    const missingCount = checked.filter(r => r.status === 'missing').length;
    const missCount = checked.filter(r => r.status === 'miss').length;
    const gapTotal = checked.reduce((sum, r) => sum + Math.max(0, r.gap), 0);
    return { status: missingCount || !checked.length ? 'missing' : missCount ? (gapTotal <= 3 ? 'near' : 'miss') : 'match',
      requirements: checked, missingCount, missCount, gapTotal, application: true,
      pendingData: checked.some(r => r.kind === 'note'),
      caveat: '僅比對已收錄條件；不代表通過超額篩選或錄取。' };
  }
  return { subject, thresholds, requirements, verifiedResults, check, describe, evaluate };
});
