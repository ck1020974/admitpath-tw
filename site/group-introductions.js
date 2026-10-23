(function(root){
  'use strict';
  const aliases={
    '一般跨學類':'不分系跨域學類','外語跨學類':'外語應用學類','工業管理學類':'工業工程管理學類',
    '工程跨學類':'工程跨域學類','數理化跨學類':'理學跨域學類','文史哲跨學類':'人文跨域學類',
    '營建安全學類':'營建與消防安全學類','管理跨學類':'管理跨域學類','藝術跨學類':'藝術跨域學類','電機資訊學類':'電機資訊整合學類'
  };
  const display=name=>aliases[name]||name;
  // 每個學群一句話介紹，主站學群頁與學群探索共用。
  const summaries={"資訊學群": "用程式、演算法與資料處理，設計系統並解決問題。", "工程學群": "結合數理與設計實作，探索材料、機械、電子與各種工程系統。", "數理化學群": "從數學模型與實驗出發，理解物質、能量和自然規律。", "醫藥衛生學群": "認識人體與健康，探索疾病、照護及醫療相關專業。", "生命科學學群": "研究生命如何運作，從細胞、遺傳到生態與生物科技。", "生物資源學群": "探索動植物、食物生產與資源利用，連結生命與環境。", "地球環境學群": "認識地球系統與環境變化，結合觀測、空間資料與問題分析。", "建築設計學群": "從人的需求出發，運用設計與實作規劃產品、建築及空間。", "藝術學群": "透過視覺、音樂與表演創作，探索表達、文化與美感。", "社會心理學群": "理解個人、群體與社會制度，探索行為、關係與公共議題。", "大眾傳播學群": "研究訊息如何製作、傳遞與被理解，結合內容、媒體與科技。", "外語學群": "透過語言、閱讀與跨文化溝通，理解不同世界與觀點。", "文史哲學群": "從文本、歷史與思想出發，探究人類的經驗、文化與價值。", "教育學群": "理解學習與成長，探索教學、課程及不同教育情境。", "法政學群": "理解法律、政治與公共制度，練習分析規範、權利與政策。", "管理學群": "探索組織如何運作，結合決策、資源配置與經營管理。", "財經學群": "運用數據與經濟思考，分析市場、金融及資源選擇。", "遊憩運動學群": "結合運動、健康、旅遊與活動規劃，探索休閒服務與體驗。", "不分系學群": "大一大二先不分系，修習不同領域的課程後再選擇主修。"};
  function describe(name,categories){
    const names=categories.slice(0,4).map(display).join('、');
    return names?`${name}常見的學類包含${names}，雖然同屬一個學群，但實際在學的課程與訓練方向仍有差異。`:`${name}的介紹整理中，可繼續查看相關學類與校系。`;
  }
  function build(rows){
    const groups=new Map();
    rows.forEach(row=>{if(!groups.has(row.groupName))groups.set(row.groupName,new Map());const counts=groups.get(row.groupName);counts.set(row.categoryName,(counts.get(row.categoryName)||0)+1);});
    return Object.fromEntries([...groups].map(([name,counts])=>{
      const categories=[...counts.keys()].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
      // 學群探索結果頁列出校系數較多的學類，name 是主站使用的原始學類名稱。
      const topCategories=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-Hant')).slice(0,4).map(([category,count])=>({name:category,label:display(category),count}));
      return [name,{name,categories:categories.map(display),description:describe(name,categories),topCategories}];
    }));
  }
  const api={aliases,summaries,describe,build};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GroupIntroductions=api;
})(typeof window!=='undefined'?window:globalThis);
