// Shared school catalog for the workbench and its advanced filters.
window.AdmissionCatalog = (() => {
  let schools = [];
  const key = name => String(name || '').replace(/台/g, '臺').replace(/\s/g, '');
  // 選單只列一間學校：校區（銘傳大學(桃園)）與改名前的校名併入同一項，資料本身的校名不變。
  const schoolAliases = { '馬偕醫學院': '馬偕醫學大學' };
  const canonicalName = name => {
    const base = String(name || '').replace(/\s*[（(][^（）()]*[）)]\s*$/, '');
    return schoolAliases[base] || base;
  };
  // These schools do not occur in the special-selection source table, so their
  // region is completed from the campus location for the shared school picker.
  const completedAreas = {
    '中信金融管理學院': '南',
    '中國醫藥大學': '中',
    '中華大學': '北',
    '國立彰化師範大學': '中',
    '康寧大學': '北',
    '臺北基督學院': '北',
    '華梵大學': '北',
    '開南大學': '北',
    '馬偕醫學院': '北',
  };
  function initialize(records, special) {
    const map = new Map();
    const spellings = new Map();
    records.forEach(record => {
      const name = record.schoolName;
      if (!name) return;
      const canonical = canonicalName(name);
      if (canonical !== name) record.schoolFilterName = canonical;
      if (!spellings.has(key(name))) spellings.set(key(name), name);
      const code = record.schoolCode || '';
      const current = map.get(key(canonical));
      if (!current) map.set(key(canonical), { name: canonical, code, areas: new Set() });
      else if (code && (!current.code || code < current.code)) current.code = code;
      // 四技申請的校系資料附有依校址判斷的地區。
      if (record.techApplication?.area) map.get(key(canonical)).areas.add(record.techApplication.area);
    });
    special.forEach(record => {
      const canonical = canonicalName(record.school);
      if (!spellings.has(key(record.school))) spellings.set(key(record.school), record.school);
      if (!map.has(key(canonical))) map.set(key(canonical), { name: canonical, code: '', areas: new Set() });
      map.get(key(canonical)).areas.add(record.area);
    });
    Object.entries(completedAreas).forEach(([name, area]) => {
      const school = map.get(key(canonicalName(name)));
      if (school) school.areas.add(area);
    });
    schools = [...map.values()].sort((a,b) => (a.code || '999').localeCompare(b.code || '999', 'en') || a.name.localeCompare(b.name, 'zh-Hant'));
    return special.map(record => {
      const school = map.get(key(canonicalName(record.school)));
      const schoolName = spellings.get(key(record.school));
      return { id: record.id, year: record.year, channel: '特殊選才', channelKey: 'special_selection', schoolName, ...(schoolName !== school.name ? { schoolFilterName: school.name } : {}), schoolCode: school.code, departmentName: record.department, quota: record.quota, programCode: '', category: record.plan, weightedSubjects: [], weightedSubjectsText: '', selectionNotes: `${record.plan}\n${record.target}\n${record.exam}`, rawFields: {}, specialSelection: record, sourceUrl: record.sourceUrl || 'https://srecruit.moe.edu.tw/', detailUrl: record.url };
    });
  }
  function schoolOptions(area = '') { return schools.filter(school => !area || (area === 'unknown' ? !school.areas.size : school.areas.has(area))); }
  function matchesArea(record, area) {
    if (!area) return true;
    if (record.specialSelection) return record.specialSelection.area === area;
    const school = schools.find(school => key(school.name) === key(canonicalName(record.schoolName)));
    return area === 'unknown' ? !school?.areas.size : !!school?.areas.has(area);
  }
  function examTags(record) {
    const text = (record.exam || '').normalize('NFKC');
    const conditional = /必要時|必要者|免複試|逕[行取]|擇優|初試|複試|第一階段|第二階段/.test(text);
    const methods = [['書審','書面審查|資料審查|書審|審查'],['面試','口試|面試|面談'],['筆試','筆試'],['術科','術科'],['實作','實作|實際操作'],['作品審查','作品審查|作品集']];
    const tags = methods.filter(([,pattern]) => new RegExp(pattern).test(text)).map(([label,pattern]) => {
      const values = [...new Set([...text.matchAll(new RegExp(`(?:${pattern})\\s*[:：]?\\s*(\\d+(?:\\.\\d+)?)\\s*%`, 'g'))].map(match => match[1]))];
      return label + (!conditional && values.length === 1 ? ` ${values[0]}%` : '');
    });
    return { tags: tags.length ? tags : ['依簡章規定'], conditional };
  }
  return { initialize, schoolOptions, matchesArea, examTags };
})();
