/*
 * Adapted from the O*NET® Mini Interest Profiler (2016), Appendix A.
 * Source: https://www.onetcenter.org/dl_files/Mini-IP.pdf
 * Used under https://www.onetcenter.org/license_toolsdev.html
 * See modifications.html and README.md for notices and validation status.
 */
(function (root) {
  'use strict';
  const version = 'yuhsin-mini-ip-zh-TW-review-20261015-v1';
  const source = 'https://www.onetcenter.org/dl_files/Mini-IP.pdf';
  const types = [
    {code:'R', name:'實作型', subtitle:'動手與操作', description:'在工具、設備、材料與具體任務之間，找出動手完成事情的樂趣。', action:'找一門木工、電子或模型製作入門體驗，記錄自己喜歡哪個步驟。'},
    {code:'I', name:'研究型', subtitle:'觀察與探究', description:'對現象背後的原因感到好奇，願意運用觀察、資料與實驗尋找解釋。', action:'選一個生活問題，比較兩份可信資料，寫下證據與仍想追問的事。'},
    {code:'A', name:'藝術型', subtitle:'創作與表達', description:'透過文字、聲音、影像或視覺設計，表達自己的觀點與想像。', action:'用文字、影像或聲音做一件小作品，觀察哪種表達方式最讓你投入。'},
    {code:'S', name:'社會型', subtitle:'陪伴與教學', description:'願意理解他人的需要，透過協助、教學或陪伴與人建立連結。', action:'參與一次有帶領者的志工或同儕學習活動，記錄投入與耗力的部分。'},
    {code:'E', name:'企業型', subtitle:'帶領與推動', description:'喜歡提出方向、溝通協商、整合資源，讓一個想法逐步成為現實。', action:'為班級活動提出小企畫，試著說明目標、分工與需要的資源。'},
    {code:'C', name:'事務型', subtitle:'整理與規劃', description:'喜歡清楚的流程與可查核的紀錄，從分類、核對及安排中建立秩序。', action:'替活動整理一份物資或進度表，看看自己是否享受核對與安排。'},
  ];
  // Original IDs and RIASEC classifications are retained from Appendix A.
  const rows = [
    [1,'R','Build kitchen cabinets','製作廚房櫥櫃'],
    [2,'I','Develop a new medicine','研發一種新藥物'],
    [3,'A','Write books or plays','創作書籍或戲劇作品'],
    [4,'S','Help people with personal or emotional problems','協助人們處理個人或情緒上的困擾'],
    [5,'E','Manage a department within a large company','管理一家大型公司的部門'],
    [6,'C','Install software across computers on a large network','替大型網路中的多台電腦安裝軟體'],
    [7,'R','Repair household appliances','修理家用電器'],
    [8,'I','Study ways to reduce water pollution','研究減少水污染的方法'],
    [9,'A','Compose or arrange music','作曲或編曲'],
    [10,'S','Give career guidance to people','協助他人探索與規劃職涯'],
    [11,'E','Start your own business','創辦自己的事業'],
    [12,'C','Operate a calculator','使用計算機進行計算'],
    [13,'R','Assemble electronic parts','組裝電子零件'],
    [14,'I','Conduct chemical experiments','進行化學實驗'],
    [15,'A','Create special effects for movies','製作電影特效'],
    [16,'S','Perform rehabilitation therapy','為他人進行復健治療'],
    [17,'E','Negotiate business contracts','協商商業合約'],
    [18,'C','Keep shipping and receiving records','維護出貨與收貨紀錄'],
    [19,'R','Drive a truck to deliver packages to offices and homes','駕駛貨車，將包裹送到辦公室與住家'],
    [20,'I','Examine blood samples using a microscope','使用顯微鏡檢查血液樣本'],
    [21,'A','Paint sets for plays','繪製戲劇演出的舞台布景'],
    [22,'S','Do volunteer work at a non-profit organization','在非營利組織擔任志工'],
    [23,'E','Market a new line of clothing','行銷一個新的服裝系列'],
    [24,'C','Inventory supplies using a hand-held computer','使用手持式電腦盤點物資'],
    [25,'R','Test the quality of parts before shipment','在出貨前檢驗零件品質'],
    [26,'I','Develop a way to better predict the weather','研發能更準確預測天氣的方法'],
    [27,'A','Write scripts for movies or television shows','撰寫電影或電視節目的劇本'],
    [28,'S','Teach a high-school class','為高中班級授課'],
    [29,'E','Sell merchandise at a department store','在百貨公司銷售商品'],
    [30,'C','Stamp, sort, and distribute mail for an organization','為組織的郵件蓋章、分類與分發'],
  ];
  const items = rows.map(([id,type,original,text]) => Object.freeze({id,type,original,text}));
  // Editorial reading paths, NOT O*NET occupation matching or a validated major crosswalk.
  const groups = [
    ['資訊學群',['I','R','C'],'程式設計、資料與資訊系統','從一個入門程式課程了解「設計、除錯、測試」的實際過程。'],
    ['工程學群',['R','I'],'材料、結構、電子與系統','看看工程科系的基礎課程與實作專題，分辨喜歡操作還是分析。'],
    ['數理化學群',['I'],'數學推理、物理與化學','比較兩種科學領域的入門課程，選一個想深入理解的問題。'],
    ['醫藥衛生學群',['I','S'],'生命科學、健康與照護','訪談相關科系學生，了解科學課程、照護互動及實習安排。'],
    ['生命科學學群',['I'],'生命現象、生物與實驗','閱讀生物研究的入門介紹，記錄最想探究的生命問題。'],
    ['生物資源學群',['R','I'],'農業、動植物與資源','參加植物觀察或農業體驗，了解自然資源與實作的關係。'],
    ['地球環境學群',['I','R'],'氣候、地球與環境','選一項在地環境議題，看看如何用觀測與資料理解它。'],
    ['建築設計學群',['A','R','I'],'空間、視覺與設計方法','替熟悉的空間畫一張改善草圖，想想人的使用需求。'],
    ['藝術學群',['A'],'表演、音樂與視覺創作','比較創作、練習與理論課程，找一場作品或展演深入觀察。'],
    ['社會心理學群',['S','I'],'社會議題、人類行為與研究','挑一個社會議題，看看研究者如何訪談、調查或分析資料。'],
    ['大眾傳播學群',['A','E','S'],'內容製作、媒體與受眾','為同一則議題製作不同形式的內容，思考要讓誰看懂。'],
    ['外語學群',['A','S'],'語言、文學與跨文化理解','比較語言訓練、文學、翻譯等課程，找出真正想學的內容。'],
    ['文史哲學群',['A','I'],'文本、歷史與思想','閱讀一篇短文或史料，練習提出自己的解釋與問題。'],
    ['教育學群',['S'],'學習、教學與人的發展','嘗試把一個觀念教給同學，觀察如何調整說明方式。'],
    ['法政學群',['E','I','S'],'法律、公共政策與制度','比較一項公共政策的不同立場，練習說明各自的理由。'],
    ['管理學群',['E','C'],'組織、決策與資源配置','替活動規劃分工、預算與流程，體會協調與執行的差異。'],
    ['財經學群',['C','E','I'],'經濟、會計與財務分析','用公開資料理解一個經濟現象，再看看科系課程如何研究它。'],
    ['遊憩運動學群',['R','S','E'],'運動、休閒服務與活動規劃','了解運動科學、活動設計與服務管理等不同學習路線。'],
  ].map(([name,types,topics,action]) => Object.freeze({name,types,topics,action}));

  function score(answers) {
    if (!Array.isArray(answers) || answers.length !== 30) throw new Error('需有30題回答。');
    const scores = Object.fromEntries(types.map(type => [type.code,0]));
    items.forEach((item,index) => {
      const value = answers[index];
      if (!Number.isInteger(value) || value < 0 || value > 4) throw new Error(`第${index+1}題回答尚未完成或不正確。`);
      scores[item.type] += value;
    });
    const rankings = types.map(type => ({...type,score:scores[type.code]})).sort((a,b) => b.score-a.score);
    rankings.forEach(row => { row.rank = 1 + rankings.filter(other => other.score > row.score).length; });
    const flat = rankings.every(row => row.score === rankings[0].score);
    const leading = flat ? [] : rankings.filter(row => row.rank === 1).map(row => row.code);
    return {scores,rankings,flat,leading};
  }
  function readingSuggestions(result) {
    if (result.flat) return [];
    return groups.filter(group => group.types.some(type => result.leading.includes(type)));
  }
  function makeRecord(answers) {
    const result = score(answers);
    return {version,source,validated:false,answers:items.map((item,index) => ({id:item.id,type:item.type,value:answers[index]})),scores:result.scores};
  }
  const api = Object.freeze({version,source,types,items,groups,score,readingSuggestions,makeRecord});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YuhsinInterest = api;
})(typeof window !== 'undefined' ? window : globalThis);
