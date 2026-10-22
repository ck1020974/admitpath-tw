(function(root){
  'use strict';
  const aliases={
    '一般跨學類':'不分系跨域學類','外語跨學類':'外語應用學類','工業管理學類':'工業工程管理學類',
    '工程跨學類':'工程跨域學類','數理化跨學類':'理學跨域學類','文史哲跨學類':'人文跨域學類',
    '營建安全學類':'營建與消防安全學類','管理跨學類':'管理跨域學類','藝術跨學類':'藝術跨域學類','電機資訊學類':'電機資訊整合學類'
  };
  const display=name=>aliases[name]||name;
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
  const api={aliases,describe,build};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GroupIntroductions=api;
})(typeof window!=='undefined'?window:globalThis);
