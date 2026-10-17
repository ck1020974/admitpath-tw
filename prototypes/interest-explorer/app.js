/* Local author/teacher review only. See modifications.html. */
(() => {
  'use strict';
  const api = window.YuhsinInterest;
  const flowApi = window.YuhsinInterestFlow;
  if (!api || !flowApi) return;
  const session = flowApi.createSession();
  const byId = id => document.getElementById(id);
  const labels = ['非常不喜歡','不喜歡','不確定','喜歡','非常喜歡'];
  let showAll = false;
  let currentResult = null;
  const escape = text => String(text).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  function stage(name) {
    ['intro','quiz','results'].forEach(id => { byId(id).hidden = id !== name; });
    document.body.dataset.stage = name;
    if (name === 'quiz') byId('questionTitle').focus();
    if (name === 'results') byId('resultsTitle').focus();
    window.scrollTo({top:0,behavior:'instant'});
  }
  function updateProgress() {
    byId('answeredCount').textContent = `已回答 ${session.answered} / 30 題`;
    byId('progress').value = session.answered;
  }
  function renderQuestion() {
    const item = api.items[session.index];
    byId('questions').innerHTML = `<fieldset class="question" id="item-${item.id}" aria-describedby="questionPrompt"><legend id="questionTitle" tabindex="-1">${escape(item.text)}</legend><p class="question-prompt" id="questionPrompt">你對這項活動的感覺是？</p><div class="answer-options">${labels.map((label,value) => `<label class="answer choice-${value}"><input type="radio" name="item-${item.id}" value="${value}" ${session.answers[session.index] === value ? 'checked' : ''}><span class="answer-visual"><span class="answer-circle" aria-hidden="true"></span><span class="answer-label">${label}</span><kbd aria-hidden="true">${value+1}</kbd></span></label>`).join('')}</div></fieldset>`;
    byId('progressText').textContent = `${String(item.id).padStart(2,'0')} / 30`;
    byId('previous').disabled = session.index === 0;
    byId('next').textContent = session.index === 29 ? '查看結果 →' : '下一題 →';
    byId('quizError').textContent = ''; updateProgress();
  }
  function renderGroups() {
    const list = showAll || currentResult.flat ? api.groups : api.readingSuggestions(currentResult);
    byId('showAllGroups').textContent = showAll ? '返回建議學群' : '全部十八學群';
    byId('showAllGroups').hidden = currentResult.flat;
    byId('readingTitle').textContent = currentResult.flat || showAll ? '十八學群' : '延伸探索';
    byId('groupCards').innerHTML = list.map(group => `<article class="group-card"><h3>${escape(group.name)}</h3><p>${escape(group.topics)}</p><details><summary>探索建議</summary><p>${escape(group.action)}</p></details></article>`).join('');
  }
  function renderResults() {
    currentResult = api.score(session.answers); showAll = false;
    const leadTypes = api.types.filter(type => currentResult.leading.includes(type.code));
    byId('resultSummary').innerHTML = currentResult.flat
      ? '<p class="eyebrow">六類同分</p><h2>目前沒有明顯偏好</h2><p>可以先從想嘗試的學群開始。</p>'
      : `<p class="eyebrow">目前較偏好的活動${leadTypes.length>1 ? ' · 同分並列':''}</p><h2>${leadTypes.map((type,index) => `<span class="result-type">${index ? '<span class="type-divider" aria-hidden="true">×</span><span class="sr-only">、</span>':''}${escape(type.name)} <small>${type.code}</small></span>`).join('')}</h2><p>${leadTypes.map(type=>escape(type.subtitle)).join(' · ')}</p>`;
    byId('scores').innerHTML = currentResult.rankings.map(type => `<div class="score-row"><div class="score-label"><span><b>${type.code}</b> ${escape(type.name)}</span><strong>${type.score}<small> / 20</small></strong></div><meter min="0" max="20" value="${type.score}" aria-label="${escape(type.name)}原始分數 ${type.score}，滿分20"></meter></div>`).join('');
    byId('actions').innerHTML = currentResult.flat ? '<p>挑兩個陌生領域，各試一項小活動，記錄想繼續做的部分。</p>' : leadTypes.map(type => `<article><h3>${escape(type.subtitle)}</h3><p>${escape(type.action)}</p><details><summary>認識${escape(type.name)}</summary><p>${escape(type.description)}</p></details></article>`).join('');
    byId('downloadStatus').textContent = ''; renderGroups(); stage('results');
  }
  byId('start').textContent = '開始探索 →'; byId('start').disabled = false;
  byId('start').addEventListener('click', () => { renderQuestion(); stage('quiz'); });
  byId('backToIntro').addEventListener('click', () => { stage('intro'); byId('start').textContent = '繼續作答 →'; byId('start').focus(); });
  byId('questions').addEventListener('change', event => {
    if (!event.target.matches('input[type="radio"]')) return;
    session.choose(Number(event.target.value)); byId('quizError').textContent = ''; updateProgress();
  });
  byId('quizForm').addEventListener('submit', event => {
    event.preventDefault(); const outcome = session.next();
    if (outcome === 'missing') { byId('quizError').textContent = '請先選擇一個選項。'; byId('questions').querySelector('input').focus(); return; }
    if (outcome === 'complete') renderResults(); else { renderQuestion(); stage('quiz'); }
  });
  byId('previous').addEventListener('click', () => { if (session.back()) { renderQuestion(); stage('quiz'); } });
  document.addEventListener('keydown', event => {
    if (document.body.dataset.stage !== 'quiz' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const target = event.target;
    if (target.closest('a,summary,button') || target.matches('textarea,select,input:not([type="radio"])')) return;
    if (/^[1-5]$/.test(event.key)) {
      event.preventDefault(); const value = Number(event.key)-1; session.choose(value);
      const input = byId('questions').querySelector(`input[value="${value}"]`); input.checked = true; input.focus();
      byId('quizError').textContent = ''; updateProgress();
    } else if (event.key === 'Enter') { event.preventDefault(); byId('quizForm').requestSubmit(); }
  });
  byId('editAnswers').addEventListener('click', () => { session.first(); renderQuestion(); stage('quiz'); });
  byId('showAllGroups').addEventListener('click', () => { showAll = !showAll; renderGroups(); });
  byId('restart').addEventListener('click', () => {
    if (!window.confirm('清除回答並重新開始？')) return;
    session.reset(); currentResult = null; showAll = false; byId('start').textContent = '開始探索 →'; stage('intro'); byId('start').focus();
  });
  byId('downloadAnswers').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(api.makeRecord(session.answers),null,2)],{type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${api.version}-answers.json`;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
    byId('downloadStatus').textContent = '已建立匿名作答檔案，僅下載至你的裝置。';
  });
})();
