// Shared school catalog for the workbench and its advanced filters.
window.AdmissionCatalog = (() => {
  let schools = [];
  const key = name => String(name || '').replace(/台/g, '臺').replace(/\s/g, '');
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
    records.forEach(record => {
      const name = record.schoolName;
      if (!name) return;
      const code = record.schoolCode || '';
      const current = map.get(key(name));
      if (!current) map.set(key(name), { name, code, areas: new Set() });
      else if (code && (!current.code || code < current.code)) current.code = code;
    });
    special.forEach(record => {
      if (!map.has(key(record.school))) map.set(key(record.school), { name: record.school, code: '', areas: new Set() });
      map.get(key(record.school)).areas.add(record.area);
    });
    Object.entries(completedAreas).forEach(([name, area]) => {
      const school = map.get(key(name));
      if (school) school.areas.add(area);
    });
    schools = [...map.values()].sort((a,b) => (a.code || '999').localeCompare(b.code || '999', 'en') || a.name.localeCompare(b.name, 'zh-Hant'));
    return special.map(record => {
      const school = map.get(key(record.school));
      return { id: record.id, year: record.year, channel: '特殊選才', channelKey: 'special_selection', schoolName: school.name, schoolCode: school.code, departmentName: record.department, quota: record.quota, programCode: '', category: record.plan, weightedSubjects: [], weightedSubjectsText: '', selectionNotes: `${record.target}\n${record.exam}`, rawFields: {}, specialSelection: record, sourceUrl: 'https://srecruit.moe.edu.tw/', detailUrl: record.url };
    });
  }
  function schoolOptions(area = '') { return schools.filter(school => !area || (area === 'unknown' ? !school.areas.size : school.areas.has(area))); }
  function matchesArea(record, area) {
    if (!area) return true;
    if (record.specialSelection) return record.specialSelection.area === area;
    const school = schools.find(school => key(school.name) === key(record.schoolName));
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
