/* Author scenarios and editorial mappings; no publisher chapter claims. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const bank=node?require('./bank.js'):root.YuhsinQuestionBank;
 const profiles=node?require('./collego-reference.js'):root.YuhsinCollego;
 const curriculumData=node?require('./curriculum.js'):root.YuhsinCurriculum;
 const learningUnits=node?require('./units.js'):root.YuhsinLearningUnits;
 const subjectModel=node?require('./subjects.js'):root.YuhsinSubjectModel;
 const exploration=node?require('./exploration-model.js'):root.YuhsinExplorationModel;
 const groups=profiles.map((collego,i)=>({id:String.fromCharCode(65+i),name:collego.name,collego}));
 const rows=[
 ['A1',['digital'],'generative-ai','由 AI 的處理流程，延伸演算法與資料表示。'],
 ['A5',['digital','place'],'routing','由找路問題，連結圖的表示與路線規劃。'],
 ['A10',['digital'],'robot-navigation','由掃地路徑，探索問題拆解與搜尋步驟。'],
 ['B1',['mechanics'],'high-speed-motion','由交通工具的運動，探索受力與工程限制。'],
 ['B2',['mechanics'],'seismic-structures','由耐震設計，探索受力與結構改良。'],
 ['B9',['mechanics'],'bridge-design','由橋梁承重，探索結構測試與設計。'],
 ['C2',['chemistry'],'carbon-structure','由碳的不同形態，探索結構與性質。'],
 ['C3',['chemistry'],'batteries','由充電電池，探索電子轉移與材料性質。'],
 ['C7',['chemistry','ecology'],'plastics','由塑膠回收，探索材料結構與資源使用。'],
 ['D1',['life'],'vaccination','由疫苗，探索防禦機制與免疫記憶的基礎。'],
 ['D3',['life','chemistry'],'medicine','由用藥說明，延伸人體調節與物質作用的基礎。'],
 ['D9',['life','inquiry'],'sleep','由熬夜影響，探索人體調節與可研究的問題。'],
 ['E3',['life'],'dna-identification','由身分辨識，探索遺傳訊息。'],
 ['E6',['life','society'],'genes-environment','由雙胞胎差異，探索遺傳與環境。'],
 ['E7',['inquiry','life'],'memory','由記憶現象，練習形成問題與設計比較。'],
 ['F3',['chemistry','life'],'food-preservation','由食物保存，延伸物質變化與生命作用；此連結是基礎探索，不涵蓋完整冷鏈專業。'],
 ['F6',['life','society'],'genetic-food','由基因改造，探索遺傳訊息與公共議題。'],
 ['F9',['ecology'],'zoos','由動物園，探索物種關係與環境保育。'],
 ['G1',['ecology'],'volcanic-risk','由火山，探索板塊邊界與地球變動。'],
 ['G5',['chemistry','place'],'beach-materials','由海灘材料，延伸物質特性與地方觀察。'],
 ['G6',['ecology'],'climate-ice','由冰川變化，探索氣候與生態影響。'],
 ['H2',['arts'],'lighting-design','由燈光與感受，探索色彩構成與視覺表達。'],
 ['H3',['mechanics','arts'],'chair-design','由椅子設計，探索結構與使用感受。'],
 ['H4',['place'],'bus-stops','由站牌位置，探索區位與地方需求。'],
 ['I2',['arts'],'music-timbre','由同曲異奏，探索音樂語彙與表現。'],
 ['I5',['arts'],'color-expression','由色彩感受，探索視覺構成。'],
 ['I9',['arts','media'],'photography','由攝影差異，探索圖像與訊息表達。'],
 ['J4',['society'],'social-opportunity','由職業與收入差異，探索資源與制度。'],
 ['J5',['inquiry','digital'],'notifications','由通知與行為，提出可研究的問題及資訊設計觀察。'],
 ['J7',['society','economy'],'work-rewards','由工作報酬，探索社會資源與市場。'],
 ['K4',['media','economy'],'advertising','由廣告需求，探索訊息與消費。'],
 ['K6',['media','society'],'crime-news','由新聞影響，探索敘事角度與公共討論。'],
 ['K10',['media','inquiry'],'news-selection','由新聞選擇，探索資訊取捨與研究提問。'],
 ['L3',['language','society'],'language-culture','由語言文化，探索語境與觀點。'],
 ['L5',['language'],'subtitles','由字幕翻譯，探索語境與文本表達。'],
 ['L8',['language'],'grammar','由語言差異，練習語境與文本結構觀察。'],
 ['M3',['language'],'literary-interpretation','由小說解讀，探索文本線索與風格。'],
 ['M4',['society'],'culture-rights','由習俗與人權，探索規範與合理論證。'],
 ['M9',['inquiry','language'],'historical-evidence','由歷史敘事，練習研究限制與文本解讀；不替代歷史學科評量。'],
 ['N1',['inquiry'],'learning-development','由學習能力，練習界定問題與研究設計。'],
 ['N4',['inquiry'],'assessment','由考試與能力，探索測量與推論限制。'],
 ['N5',['inquiry','digital'],'learning-technology','由科技與學習，探索公平比較及資訊設計。'],
 ['O1',['society'],'referendum','由公投，探索制度與公共論證。'],
 ['O2',['society'],'unjust-law','由法律爭議，探索規範與不同立場。'],
 ['O6',['society'],'privacy','由公共安全與個資，探索規範與資訊使用的公共議題。'],
 ['P2',['economy'],'pricing','由票價，探索市場與選擇。'],
 ['P7',['digital','place'],'routing','由配送路線，延伸搜尋與地方區位。'],
 ['P10',['place'],'crowd-planning','由演唱會人流，探索活動風險與空間需求。'],
 ['Q1',['economy'],'stock-prices','由價格變化，探索市場與風險。'],
 ['Q2',['economy'],'insurance','由保費，探索機率與風險分攤。'],
 ['Q5',['economy','media'],'ticket-demand','由演唱會售票，探索需求與訊息。'],
 ['R2',['place','ecology'],'tourism','由觀光衝擊，探索地方需求與資源。'],
 ['R3',['place','life'],'exercise-planning','由運動選擇，延伸參與者需求與身體調節。'],
 ['R9',['ecology','place'],'outdoor-impact','由戶外活動，探索環境代價與活動規劃。']
 ];
 const concise={C2:'同樣是碳，鑽石和鉛筆為何性質不同？',E7:'為什麼有些記憶長存，有些很快就忘記？',G5:'海灘的沙子，為什麼有白色也有黑色？',H2:'誠品燈光昏暗，為什麼卻讓人想久待？',I2:'同一首歌，為什麼換樂器就有不同感受？',K10:'媒體怎麼決定哪些事情值得報導？',L5:'電影字幕如何保留原本的笑點和情緒？',P2:'遊樂園怎麼訂票價，兼顧人氣與獲利？',R9:'享受戶外活動時，如何減少對環境的影響？'};
 const items=rows.map(([id,units,concept,reason])=>{const original=bank.find(q=>q.id===id);return {...original,original:original.text,text:concise[id]||original.text,edited:Boolean(concise[id]),units,concept,reason,interestGroups:subjectModel.related[id],mapping:'editorial'};});
 const units=learningUnits.map(unit=>{
  const related=groups.filter(g=>unit.groups.includes(g.id));
  const subjects=[...new Set(unit.goals.map(g=>g.subject))];
  return {...unit,subjects,importantSubjects:[...new Set(related.flatMap(g=>g.collego.subjects))].filter(s=>subjects.includes(s)),courses:unit.courses.map(course=>({...course,profiles:related.filter(g=>g.collego.advanced.includes(course.name)).map(g=>({id:g.id,name:g.name,url:g.collego.url}))}))};
 });
 const masteryOptions=['非常糟','不好','普通','好','非常強'].map((label,value)=>({label,value}));
 const subjects=subjectModel.subjects.map(s=>({...s,required:!['computing','technology','art','music','sport'].includes(s.id)}));
 const resultTypes={priority:{name:'優先探索',text:'有興趣，也有學習基礎，值得先了解。'},develop:{name:'能力培養',text:'有興趣，可以從相關內容逐步補強。'},potential:{name:'潛力發掘',text:'已有學習優勢，可以試著認識這個方向。'},interest:{name:'興趣延伸',text:'保留喜歡，先從體驗、選修或自主學習接觸。'},other:{name:'其他學群',text:'也可以認識這些方向，保留探索的可能。'}};
 // 快速探索固定 18 題：每個學群 1 題，全班看到同一組、同一順序，方便課堂對照討論。
 // 順序刻意把相近學群錯開；要換題時，改這裡的題號即可（須每群一題）。
 const quickSet=['A1','I9','D9','O2','B2','L5','E3','P7','G1','M9','C3','R3','K10','F3','N4','H2','Q5','J5'];
 // 畫面由左到右：沒興趣、還好、想知道。
 const interestOptions=[{value:0,label:'沒興趣'},{value:1,label:'還好'},{value:2,label:'想知道'}];
 // 學科：先問整體成績，再勾最拿手與比較吃力的科目（各 2–3 科，必選）。
 // 換算：前段＝好 3、中間＝普通 2、後段＝不好 1；強項高一級、吃力低一級，其餘等於整體程度。
 // 不分系推薦：最想知道的 3 題分屬 3 個不同領域、且有興趣的學群也橫跨 3 個以上領域，
 // 或這次沒有任何有興趣的方向時，提出「也可以考慮不分系」。
 const undeclared={group:'不分系學群',domains:{A:'理工',B:'理工',C:'理工',G:'理工',D:'生醫',E:'生醫',F:'生醫',H:'設計藝術',I:'設計藝術',K:'人文語言',L:'人文語言',M:'人文語言',N:'人文語言',J:'社會商管',O:'社會商管',P:'社會商管',Q:'社會商管',R:'社會商管'},minDomains:4};
 // 畫面由左到右：後段、中間、前段（右邊固定是最好）。
 const levelOptions=[{value:'low',label:'後段',base:1},{value:'mid',label:'中間',base:2},{value:'high',label:'前段',base:3}];
 const subjectOptions=masteryOptions;
 const data={version:'yuhsin-single-route-20261023',quickSet,interestOptions,subjectOptions,levelOptions,pickMin:2,strongLimit:3,weakLimit:3,undeclared,profileGroups:[{id:'core',label:'國英數',subjects:['chinese','english','math']},{id:'social',label:'社會',subjects:['history','geography','civics']},{id:'science',label:'自然',subjects:['physics','chemistry','biology','earth']},{id:'other',label:'延伸科目（選填）',optional:true,subjects:['computing','technology','art','music','sport']}],bank,groups,items,units,...subjectModel,...exploration,subjects,resultTypes,masteryOptions,curriculum:curriculumData.references,sources:curriculumData.sources};
 if(node)module.exports=data;else root.YuhsinCuriosityData=data;
})(typeof window!=='undefined'?window:globalThis);
