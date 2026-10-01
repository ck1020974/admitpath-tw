/* 115 軍校正期班個人申請分則；僅收錄國防大學及國防醫學大學。
 * 每筆保留簡章頁碼、原文檢定及名額類別，不與 CAC 倍率篩選結果混用。
 * Run: node tools/import_military115_application.js
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'site/data', name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(root, 'site/data', name), JSON.stringify(value));
const sourceUrl = 'https://air.mnd.gov.tw/TW/News/News_Detail.aspx?CID=46&ID=58677';
const pdfUrl = 'https://www.rocafa.edu.tw/df_ufiles/a/115學年度軍校正期班甄選入學簡章.pdf';
const score = (s, standard) => ({ kind: 'score', subjects: [s], standard });
const sum = (subjects, standard, label, standards) => ({ kind: 'sum', subjects, standard, label, ...(standards ? { standards } : {}) });
const any = (options, label) => ({ kind: 'any', subjects: [...new Set(options.flatMap(o => o.subjects))], options, label });
function combinations(items, n) {
  if (!n) return [[]];
  return items.flatMap((v, i) => combinations(items.slice(i + 1), n - 1).map(tail => [v, ...tail]));
}
const choose = (subjects, n, standard) => any(combinations(subjects, n).map(s => sum(s, standard)), `${subjects.join('、')}任${n}科成績加總${standard}`);
const rows = [];
function add(schoolName, departmentName, page, quotas, rules, weights, categories, extra = {}) {
  // 115 年 1 月修正版刪除政戰學院前的一頁，後段印刷頁碼減一。
  if (page >= 140) page -= 1;
  const id = `115-personal_application-military-${String(rows.length + 1).padStart(3, '0')}`;
  const quotaText = Object.entries(quotas).map(([k, v]) => `${k} ${v} 名`).join('；');
  const labels = rules.map(r => r.label || `${r.subjects.join('+')}${r.standard}`).join('；');
  const notes = [`（軍校）軍校正期班個人申請，非大學甄選會一般個申。`, `招生名額：${quotaText}。名額依身分及性別分別辦理，非全部可互通。`,
    '報名：115.3.2－115.3.31；口試：115.4.18（60 分以上合格）。',
    '另須符合簡章報考資格與體檢規定，智力測驗須達 100 分，並繳交全民國防測驗成績證明。',
    `學測檢定原文：${labels}。`,
    ...(rules.some(r => r.kind === 'sum' || (r.options || []).some(o => o.kind === 'sum')) ? ['加總檢定依各科五標相加試算，非大考中心另訂的組合五標；實際資格以招生單位認定為準。'] : []),
    '軍費、自費及代訓生之修業與服役／服務義務不同，請詳閱簡章。', extra.note || '', `來源：115 軍校正期班甄選入學簡章，第 ${page} 頁（頁碼以原分則標示為準）。`].filter(Boolean).join('\n');
  const weightedSubjects = Object.entries(weights).map(([subject, weight], i) => ({ subject, weight: String(weight), raw: `${subject} × ${weight}`, exam_type: '學測', tie_break_order: extra.tie?.indexOf(subject) + 1 || '' }));
  rows.push({ id, year: 115, channel: '個人申請（軍校）', channelKey: 'personal_application', dataType: '軍校正期班個人申請分則', sourceKey: '115_military_apply', sourceOrganization: '國防部', sourceUrl,
    schoolCode: schoolName === '國防大學' ? 'MND-NDU' : 'MND-NDMU', schoolName, programCode: id, departmentName,
    quota: String(Object.values(quotas).reduce((a, b) => a + b, 0)), extraQuota: '無', category: '軍校', genderRequirement: '依招生類別及性別名額', screeningDate: extra.art ? '115.4.18－115.4.19' : '115.4.18', examRequired: extra.art ? '是' : '否',
    weightedSubjects, weightedSubjectsText: weightedSubjects.map(w => w.raw).join('、'), selectionNotes: notes, detailUrl: pdfUrl,
    militaryAdmission: { rules, quotas, sourcePage: page, sourceUrl, pdfUrl, thresholdText: labels, categories },
    cacDetail: { kind: 'military_application_detail', screeningSubjects: weightedSubjects.map(w => ({ subject: w.subject, standard: rules.find(r => r.kind === 'score' && r.subjects[0] === w.subject)?.standard || '--', score_weight: `*${w.weight}`, screening_multiplier: '--' })),
      academicPercentage: extra.art ? '40%' : '100%', secondStageItems: [{ item: '口試', standard: '60分以上合格', percentage: '--' }, ...(extra.art ? [{ item: '專長測驗', standard: '依簡章', percentage: '60%' }] : [])], apcsSubjects: [], layout: 'general', notes, detailUrl: pdfUrl, sameScoreOrder: extra.tie || [], importantDates: { screening_date: '115.4.18' } },
  });
}
const engRule = any(['英文', '數A', '自然'].map(s => score(s, '均標')), '英文、數A、自然任一科達均標');
const engineering = [
  ['資訊工程學系', 6, 1, ['資訊學群/資訊工程學類', '工程學群/資訊工程學類']],
  ['化學及材料工程學系', 5, 1, ['工程學群/化學工程學類', '工程學群/材料工程學類']],
  ['環境資訊及工程學系', 5, 1, ['地球環境學群/環境工程學類', '工程學群/環境工程學類']],
  ['電機電子工程學系', 5, 1, ['工程學群/電機工程學類', '資訊學群/電機工程學類']],
  ['動力及系統工程學系', 7, 1, ['工程學群/機械工程學類']],
  ['機械及航太工程學系', 3, 1, ['工程學群/機械工程學類']],
];
engineering.forEach(([dept, male, female, groups], i) => add('國防大學', `理工學院${dept}`, 94 + i, { 軍費生男: male, 軍費生女: female }, [engRule], { 英文: 1.5, 數A: 1.5, 自然: 1 }, groups,
  { tie: ['數A', '自然', '英文'], note: '國防大學與國立陽明交通大學教育合作計畫；入學後依成績、志願及名額選組。部分男性名額含中正預校應屆畢業生。' }));
['資訊工程學系', '電機電子工程學系', '動力及系統工程學系造船及海洋工程組'].forEach((dept, i) => add('國防大學', `理工學院${dept}（台船代訓生）`, 100 + i, { 台船代訓生不分男女: 1 },
  [sum(['數A', '自然'], '均標', '數A、自然兩科加總均標')], { 國文: 1, 英文: 1.5, 數A: 1.5, 自然: 1 }, engineering[[0, 3, 4][i]][3], { tie: ['數A', '自然', '英文', '國文'], note: '國防大學與國立陽明交通大學教育合作計畫；台船代訓名額不等同軍費生名額。' }));
add('國防大學', '管理學院法律學系', 117, { 軍費生男: 3, 軍費生女: 2 }, [score('國文', '均標'), score('英文', '後標'), score('社會', '後標')], { 國文: 1, 英文: 1, 社會: 1 }, ['法政學群/法律學類'], { tie: ['國文', '英文', '社會'] });
add('國防大學', '管理學院財務管理學系（數B）', 118, { 軍費生男: 8, 軍費生女: 2 }, [sum(['國文', '英文', '數B'], '均標', '國文及英文後標、數學均標三科成績加總', ['後標', '後標', '均標'])], { 國文: 1, 英文: 1.5, 數B: 1.5 }, ['財經學群/財務金融學類'], { tie: ['數B', '英文', '國文'], note: '男性軍費生名額含中正預校應屆畢業生。' });
for (const math of ['數A', '數B']) {
  const subjects = ['國文', '英文', math, '社會', '自然'];
  add('國防大學', `管理學院運籌管理學系（${math}）`, 119, { 軍費生男: 5, 軍費生女: 1 }, [choose(subjects, 3, '後標')], { 國文: 1.5, 英文: 1.5, [math]: 1, 社會: 1, 自然: 1 }, ['管理學群/運輸物流學類', '工程學群/運輸物流學類'], { tie: ['英文', '國文', math, '社會', '自然'] });
  add('國防大學', `管理學院資訊管理學系（${math}）`, 120, { 軍費生男: math === '數A' ? 4 : 5, 軍費生女: 1 }, [choose(subjects, 3, '後標')], { 國文: 1, 英文: 1.5, [math]: 1, 社會: 1, 自然: 1 }, ['資訊學群/資訊管理學類', '管理學群/資訊管理學類'], { tie: ['英文', math, '國文', '社會', '自然'] });
}
const humanities = ['國文', '英文', '社會'];
for (const group of ['國際關係組', '行政管理暨公共安全組']) add('國防大學', `政戰學院政治學系${group}`, 140, { 軍費生男: 1, 軍費生女: 1 }, [choose(humanities, 2, '後標')], { 國文: 1, 英文: 1.5, 社會: 1 }, ['法政學群/政治學類'], { tie: ['英文', '國文', '社會'] });
add('國防大學', '政戰學院新聞學系', 141, { 軍費生男: 2, 軍費生女: 2 }, [any(['數A', '數B'].map(math => choose([...humanities, math], 2, '後標')), '國文、英文、社會、數學（A或B）任兩科加總後標')], { 國文: 1, 英文: 1.5, 社會: 1, '數A或數B': 1 }, ['大眾傳播學群/大眾傳播學類'], { tie: ['英文', '國文', '社會', '數A或數B'] });
for (const math of ['數A', '數B']) add('國防大學', `政戰學院心理及社會工作學系心理組（${math}）`, 142, { 軍費生男: math === '數A' ? 1 : 2, 軍費生女: 2 }, [sum(['國文', '英文', math], '後標', `國文、英文、${math}三科加總後標`)], { 國文: 1, 英文: 1.5, [math]: 1 }, ['社會心理學群/心理學類'], { tie: ['英文', math, '國文'] });
add('國防大學', '政戰學院心理及社會工作學系社工組', 143, { 軍費生男: 2, 軍費生女: 3 }, [choose(humanities, 2, '後標')], { 國文: 1, 英文: 1.5, 社會: 1 }, ['社會心理學群/社會工作學類'], { tie: ['英文', '國文', '社會'] });
add('國防大學', '政戰學院應用藝術學系', 144, { 軍費生男: 4, 軍費生女: 2 }, [choose(humanities, 2, '後標')], { 國文: 1, 英文: 1.5, 社會: 1 }, ['藝術學群/藝術設計學類'], { art: true, tie: ['國文', '英文', '社會'], note: '口試與專長測驗日期：115.4.18－115.4.19；專長測驗占60%，同分先比較專長測驗，另依簡章規定準備作品／演出。' });
const medicalSubjects = ['國文', '英文', '數A', '自然'];
const medical = [
  ['醫學院醫學系', 157, { 軍費生男: 21, 軍費生女: 9, 自費生: 4, 輔導會公費代訓生: 8 }, ['前標', '前標', '頂標', '頂標'], [1, 1.5, 1.5, 1.5], '醫學學類', ['數A', '自然', '英文', '國文']],
  ['口腔醫學院牙醫學系', 158, { 軍費生男: 3, 軍費生女: 2, 自費生: 7 }, ['前標', '前標', '前標', '前標'], [1, 1.5, 1, 1.5], '牙醫學類', ['自然', '英文', '數A', '國文']],
  ['藥學院藥學系', 159, { 軍費生男: 2, 軍費生女: 2, 自費生: 2 }, ['均標', '均標', '均標', '均標'], [1, 1.67, 2, 2], '藥學學類', ['自然', '數A', '英文', '國文']],
];
medical.forEach(([dept, page, quotas, standards, weights, category, tie]) => add('國防醫學大學', dept, page, quotas, medicalSubjects.map((s, i) => score(s, standards[i])), Object.fromEntries(medicalSubjects.map((s, i) => [s, weights[i]])), [`醫藥衛生學群/${category}`], { tie, note: `修業6年。${category === '藥學學類' ? '' : '實習醫院為三軍總醫院。'}${category === '醫學學類' ? '男性軍費生名額含中正預校應屆畢業生。' : ''}` }));
add('國防醫學大學', '護理學院護理學系', 160, { 軍費生男: 1, 軍費生女: 4, 輔導會公費代訓生: 2 }, [sum(['英文', '自然'], '均標', '英文、自然兩科成績加總均標')], { 國文: 1, 英文: 1, '數A或數B': 1, 自然: 1 }, ['醫藥衛生學群/護理學類'], { tie: ['英文', '自然', '國文', '數A或數B'] });
add('國防醫學大學', '公共衛生學院公共衛生學系', 161, { 軍費生男: 1, 軍費生女: 1, 自費生: 1 }, [sum(['國文', '英文', '數A'], '均標', '國文、英文、數A三科成績加總均標')], { 國文: 1.5, 英文: 1.5, 數A: 1, 自然: 1 }, ['醫藥衛生學群/公共衛生學類'], { tie: ['英文', '國文', '自然', '數A'] });
const records = [...read('admissions_records.json').filter(r => r.sourceKey !== '115_military_apply'), ...rows];
const groups = read('group_departments.json').filter(g => !String(g.sourceDepartmentId).startsWith('military-'));
for (const r of rows) for (const pair of r.militaryAdmission.categories) {
  const [groupName, categoryName] = pair.split('/');
  const reference = groups.find(g => g.groupName === groupName && g.categoryName === categoryName);
  if (!reference) throw new Error(`Unknown category: ${pair}`);
  groups.push({ groupId: reference.groupId, groupName, categoryId: reference.categoryId, categoryName, schoolDepartmentName: r.schoolName + r.departmentName, sourceDepartmentId: `military-${r.programCode}`, crossGroupNames: [] });
}
const manifest = read('site_manifest.json');
manifest.recordCount = records.length;
manifest.groupDepartmentCount = groups.length;
manifest.militaryApplicationCount = rows.length;
// Keep the ordinary 個人申請 dataset intact; military is a separately attributed dataset.
manifest.datasets = manifest.datasets.filter(d => d.channel !== '個人申請（軍校）');
manifest.datasets.push({ year: 115, channel: '個人申請（軍校）', count: rows.length });
write('admissions_records.json', records);
write('group_departments.json', groups);
write('site_manifest.json', manifest);
console.log(`Imported ${rows.length} military application records, ${rows.reduce((n, r) => n + Number(r.quota), 0)} places.`);
