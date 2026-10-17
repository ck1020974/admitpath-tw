/* Subject coverage and group links are editorial rules, not ColleGo ability weights. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const units=node?require('./units.js'):root.YuhsinLearningUnits;
 const existing=id=>JSON.parse(JSON.stringify(units.flatMap(u=>u.goals).find(g=>g.id===id)));
 const goal=(id,subject,text,ref,practice,explore)=>({id,subject,text,references:[ref],practice,explore});
 const subject=(id,name,label,core,goals)=>({id,name,label,core,goals:goals.map(g=>({...g,text:g.text.replace(/^你能/,'').replace(/嗎？$/,'')}))});
 const subjects=[
  subject('chinese','國語文','國文',true,[existing('language-style'),existing('media-perspectives'),existing('media-writing')]),
  subject('english','英語文','英文',true,[existing('language-context'),existing('language-structure'),goal('english-purpose','英語文','辨認英文文章的觀點與寫作目的','englishPurpose','讀一段短文，找出支持作者觀點的文字。','比較兩篇同主題文章，說明作者立場與目的的差異。')]),
  subject('math','數學','數學',true,[existing('economy-probability'),existing('economy-expectation'),goal('math-statistics','數學','用散布圖判斷資料關係，區分相關與因果','statistics','用少量公開資料畫散布圖，先描述形狀與趨勢。','比較相關與因果的解釋，提出還需要的證據。')]),
  subject('history','歷史','歷史',false,[goal('history-context','歷史','連結史料的生成背景與內容','historyContext','找一份史料，記錄作者、時代、對象與目的。','比較不同背景的史料，解釋其選材與觀點。'),goal('history-interpret','歷史','區分歷史事實、史料證據與歷史解釋','historyInterpret','將課文中的一句主張與支持證據分開整理。','為同一事件比較兩種解釋，檢查各自的證據。'),goal('history-collect','歷史','依研究問題蒐集、整理與分類史料','historyCollect','從一個明確問題出發，整理三份可用史料。','比較史料的適用範圍與限制，指出還缺少的資料。')]),
  subject('geography','地理','地理',false,[existing('place-land'),existing('place-field'),goal('geography-layers','地理','利用地圖圖層比較地方的空間特徵','gis','用公開地圖比較交通、人口或土地使用資訊。','疊合不同圖層，檢查空間關係能支持哪些推論。')]),
  subject('civics','公民與社會','公民',false,[existing('society-norms'),existing('society-opportunity'),existing('society-argument')]),
  subject('physics','物理','物理',false,[existing('mechanics-force'),existing('mechanics-balance'),goal('physics-waves','物理','連結波速、頻率與波長，解釋波的變化','waves','用一組簡單數值，練習波速、頻率與波長的關係。','比較不同介質或頻率的情境，說明模型的條件。')]),
  subject('chemistry','化學','化學',false,[existing('chemistry-bonds'),existing('chemistry-ph'),existing('chemistry-redox')]),
  subject('biology','生物','生物',false,[existing('life-dna'),goal('biology-cells','生物','連結不同細胞的構造與功能','cells','比較兩種細胞，整理構造如何配合功能。','選一種特化細胞，說明其構造優勢與限制。'),existing('life-regulation')]),
  subject('earth','地球科學','地科',false,[existing('ecology-climate'),existing('ecology-plates'),goal('earth-weather','地球科學','從天氣圖辨認觀測資訊並描述天氣','weather','閱讀官方天氣圖，分別標出觀測資訊與你的判讀。','比較連續幾日天氣圖，檢查自己的解釋與預測。')]),
  subject('computing','資訊科技','資訊',false,[existing('digital-tree'),existing('digital-search'),existing('digital-cost')]),
  subject('technology','生活科技','生活科技',false,[existing('mechanics-design'),goal('technology-mechanism','生活科技','說明常見機構或結構如何完成預期功能','mechanisms','觀察一件日常物品，畫出主要零件與作用關係。','改變一項設計條件，提出可測試的改良。'),goal('technology-issue','生活科技','比較工程方案的需求、限制與社會影響','techIssues','選一項工程議題，列出不同使用者的需求。','比較兩個方案的效益、限制與影響，說明取捨。')]),
  subject('art','美術','美術',false,[existing('arts-color'),existing('arts-symbols'),existing('media-editing')]),
  subject('music','音樂','音樂',false,[existing('arts-listening'),goal('music-perform','音樂','運用讀譜與唱奏技巧表現一段樂曲','musicPerform','選熟悉的短曲，練習節奏、讀譜與唱奏。','錄下不同表現版本，具體說明詮釋選擇。'),goal('music-culture','音樂','連結樂曲的創作背景與文化特色','musicCulture','查找一首樂曲的背景，連結聽到的音樂特徵。','比較不同文化的作品，說明觀點及資料來源。')]),
  subject('sport','體育','體育',false,[existing('place-risk'),goal('sport-plan','體育','依自身條件規劃可持續的運動安排','sportPlan','記錄活動需求與可用時間，擬一份可調整的安排。','與合格教師討論計畫，依實際紀錄調整目標。'),goal('sport-team','體育','在熟悉的陣地球類中運用技術與團隊戰術','sportTeam','選一項熟悉的陣地球類，分析一次技術與配合。','與同學比較不同戰術選擇，練習後記錄成效。')])
 ];
 const courses={chinese:['語文表達與傳播應用','各類文學選讀','專題閱讀與研究'],english:['英文閱讀與寫作','英語聽講','英文作文'],math:['數學甲','數學乙'],history:['探究與實作：歷史學探究','族群、性別與國家的歷史'],geography:['空間資訊科技','社會環境議題','探究與實作：地理與人文社會科學研究'],civics:['民主政治與法律','現代社會與經濟','探究與實作：公共議題與社會探究'],physics:['力學一','力學二與熱學','波動、光與聲音'],chemistry:['物質構造與反應速率','化學反應與平衡一','化學反應與平衡二'],biology:['細胞與遺傳','動物體的構造與功能','生態、演化及生物多樣性'],earth:['地質與環境','大氣、海洋及天文'],computing:['進階程式設計','機器人專題'],technology:['工程設計專題','科技應用專題'],art:['基本設計','新媒體藝術','科技、環境與藝術的歷史'],music:['多媒體音樂','表演創作'],sport:['運動與健康','安全教育與傷害防護']};
 subjects.forEach(s=>s.courses=courses[s.id]);
 const focus={A:['math','computing'],B:['math','physics'],C:['math','physics','chemistry'],D:['biology','chemistry'],E:['biology','chemistry'],F:['biology','chemistry'],G:['earth','geography','physics'],H:['art','technology'],I:['art','music'],J:['civics','chinese'],K:['chinese','art','computing'],L:['english','chinese'],M:['chinese','history'],N:['chinese','civics'],O:['civics','history'],P:['math','civics','computing'],Q:['math','civics'],R:['sport','biology']};
 const related={A1:['A'],A5:['A','C'],A10:['A','B'],B1:['B','C'],B2:['B','H'],B9:['B','H','G'],C2:['C','B'],C3:['C','B'],C7:['C','G'],D1:['D','E'],D3:['D','E','C'],D9:['D','E'],E3:['E','D'],E6:['E','J'],E7:['E','J','N'],F3:['F','D','P'],F6:['F','E'],F9:['F','E','G'],G1:['G','C'],G5:['G','C'],G6:['G','E','F'],H2:['H','I'],H3:['H','B'],H4:['H','G','P'],I2:['I','K'],I5:['I','H'],I9:['I','K','H'],J4:['J','O','Q'],J5:['J','A','K'],J7:['J','P','Q'],K4:['K','P','Q'],K6:['K','J','O'],K10:['K','J'],L3:['L','M'],L5:['L','M','K'],L8:['L','M'],M3:['M','L'],M4:['M','O','J'],M9:['M','N'],N1:['N','J'],N4:['N','J'],N5:['N','A'],O1:['O','J'],O2:['O','M'],O6:['O','A','J'],P2:['P','Q','R'],P7:['P','B','A'],P10:['P','R','K'],Q1:['Q','P'],Q2:['Q','P'],Q5:['Q','P','K'],R2:['R','P','G'],R3:['R','D'],R9:['R','G','F']};
 const resultTypes={priority:{name:'優先探索',text:'興趣明確，基礎較穩。'},develop:{name:'能力培養',text:'保留熱情，逐步補強。'},potential:{name:'潛力發掘',text:'已有優勢，值得試試。'},interest:{name:'興趣延伸',text:'先從興趣與選修接觸。'},pending:{name:'資料待補',text:'補充自評，再看方向。'},observe:{name:'暫留觀察',text:'保留彈性，日後再探索。'}};
 const result={subjects,focus,related,resultTypes};
 if(node)module.exports=result;else root.YuhsinSubjectModel=result;
})(typeof window!=='undefined'?window:globalThis);
