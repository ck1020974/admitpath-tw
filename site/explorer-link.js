(function(root){
 'use strict';
 const names=['資訊學群','工程學群','數理化學群','醫藥衛生學群','生命科學學群','生物資源學群','地球環境學群','建築設計學群','藝術學群','社會心理學群','大眾傳播學群','外語學群','文史哲學群','教育學群','法政學群','管理學群','財經學群','遊憩運動學群'];
 function parse(search,available=names){
  const params=new URLSearchParams(search);
  if(params.getAll('view').length!==1||params.get('view')!=='explorer'||params.getAll('group').length!==1)return null;
  const group=params.get('group');
  if(!names.includes(group)||!available.includes(group))return null;
  return {group,fromCuriosity:params.get('from')==='curiosity'};
 }
 const api={names,parse};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ExplorerLink=api;
})(typeof window!=='undefined'?window:globalThis);
