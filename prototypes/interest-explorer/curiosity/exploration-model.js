/* Editorial group weights and contextual tasks; references point to the stored curriculum excerpts. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const model=node?require('./subjects.js'):root.YuhsinSubjectModel;
 const weights={
 A:{math:3,computing:3,english:2,chinese:1},B:{math:3,physics:3,technology:2,english:1},C:{math:3,physics:3,chemistry:3,english:1},
 D:{biology:3,chemistry:3,english:2,math:1},E:{biology:3,chemistry:3,math:2,english:1},F:{biology:3,chemistry:2,earth:2,geography:1},
 G:{earth:3,geography:3,physics:2,math:1},H:{art:3,technology:3,math:2,chinese:1},I:{art:3,music:3,chinese:1},
 J:{civics:3,chinese:2,math:2,biology:1},K:{chinese:3,art:2,computing:2,english:1},L:{english:3,chinese:3,history:1},
 M:{chinese:3,history:3,english:1},N:{chinese:3,civics:3,english:1},O:{civics:3,history:2,chinese:2,english:1},
 P:{math:3,civics:3,computing:2,english:1},Q:{math:3,civics:3,english:2,computing:1},R:{english:2,chinese:2,biology:2,geography:1}
 };
 const additions={
 chinese:[['比較同一事件的用字，辨認敘事立場','viewpoints'],['依目的安排段落，清楚表達主張','writing'],['以文本線索支持自己的解讀','text']],
 english:[['從上下文推測英文詞句的意思','context'],['找出英文說明文的重點與支持理由','englishPurpose'],['比較兩篇英文文章的觀點','englishPurpose']],
 math:[['從資料圖表找出趨勢與異常','statistics'],['檢查抽樣資料能支持哪些推論','statistics'],['比較機率與預期結果，說明決策差異','probability']],
 history:[['比較不同立場的史料，說明差異','historyInterpret'],['把歷史事件放回當時的社會背景','historyContext'],['依證據評估一項歷史主張','historyCollect']],
 geography:[['比較交通與土地使用，說明區位差異','land'],['依研究問題規劃地方觀察','fieldwork'],['用空間資料解釋人口與活動分布','gis']],
 civics:[['比較政策對不同群體的影響','inequality'],['以理由與證據討論權利衝突','argument'],['運用供需解釋價格與交易變化','demand']],
 physics:[['用受力與平衡分析日常結構','forces'],['比較不同條件下聲音與波的變化','waves'],['從圖示辨認作用力與平衡條件','equilibrium']],
 chemistry:[['由粒子間作用解釋材料性質','bonding'],['判斷生活溶液的酸鹼變化','ph'],['以電子轉移解釋電池反應','redox']],
 biology:[['用遺傳訊息解釋性狀的傳遞','dna'],['說明身體如何回應環境變化','homeostasis'],['用細胞構造解釋特定功能','cells']],
 earth:[['從氣候資料描述環境變化','climate'],['用板塊運動解釋地震與火山分布','plates'],['比較天氣圖中的觀測資料','weather']],
 computing:[['把問題拆成可執行的判斷步驟','algorithms'],['比較兩種搜尋方法的步驟與效率','efficiency'],['用資料結構整理資訊之間的關係','structures']],
 technology:[['依使用需求提出可測試的設計','engineering'],['用機構與結構說明產品功能','mechanisms'],['比較設計方案的成本、限制與影響','techIssues']],
 art:[['運用色彩與構圖傳達指定感受','color'],['說明圖像符號如何影響訊息解讀','visual'],['依傳達目的調整影像編排','digitalMedia']],
 music:[['辨認樂曲中節奏與音色的差異','music'],['用唱奏表現樂句與情緒','musicPerform'],['連結音樂表現與文化背景','musicCulture']],
 sport:[['依目標與身體條件安排運動','sportPlan'],['辨認活動風險並提出預防方式','safety'],['分析團隊運動中的配合與戰術','sportTeam']]
 };
 const pools={};
 model.subjects.forEach(s=>{pools[s.id]=s.goals.concat(additions[s.id].map(([text,ref],i)=>({id:s.id+'-context-'+i,subject:s.name,text,references:[ref],practice:'選一個熟悉的例子，先整理條件與觀察，再練習說明你的判斷。',explore:'比較兩個不同情境，說明判斷依據與適用限制。'})));});
 // New paraphrases stay within the stored curriculum excerpts; these are self-ratings,
 // not official exam questions or claims to cover an entire subject curriculum.
 const expansion={
  chinese:[['從段落安排說明文章結構與主旨的關係','text'],['比較不同文本的論點，整理自己的觀點','viewpoints'],['依題目要求選取支持主張的寫作材料','writing'],['修改段落順序，使文章的論述更連貫','writing']],
  english:[['整理英文短文的段落結構與內容關係','reading'],['由英文句型與篇章組織推測陌生字詞','context'],['分辨英文作者的態度與文章提供的資訊','englishPurpose'],['從英文書信中找出主要訊息與段落安排','reading']],
  math:[['依條件列出事件的等可能結果','probability'],['用交集或聯集描述複合事件並計算機率','probability'],['比較資料的集中與分散情形','statistics'],['檢查統計圖的刻度是否影響資料解讀','statistics']],
  history:[['從作者、時代與對象判斷史料的使用限制','historyContext'],['為歷史解釋找出支持或不支持它的史料','historyInterpret'],['依研究主題分類史料並說明分類理由','historyCollect'],['比較兩份史料如何呈現同一歷史事件','historyInterpret']],
  geography:[['從資料來源判斷是否適合回答地理問題','fieldwork'],['說明不同土地利用與地價的關聯','land'],['選擇適合的地圖圖層回答空間問題','gis'],['整理觀察或訪查資料，描述地方的差異','fieldwork']],
  civics:[['用生活例子說明社會規範如何形成社會控制','norms'],['說明家庭資源影響教育機會的可能途徑','inequality'],['區分公民議題中的主張與支持理由','argument'],['回應不同立場，修正自己的公民議題論述','argument']],
  physics:[['由物體的運動變化推論合力方向','forces'],['判斷物體受到的力是否符合平衡條件','equilibrium'],['由波速與頻率求出波長','waves'],['區分作用力與反作用力各作用在哪個物體','forces']],
  chemistry:[['比較材料的化學鍵與結構如何影響用途','bonding'],['依 pH 數值排列水溶液的酸鹼程度','ph'],['從反應中的電子得失辨認氧化與還原','redox'],['說明同類元素形成的不同結構為何可能有不同性質','bonding']],
  biology:[['從細胞構造的差異說明功能差異','cells'],['區分遺傳訊息與環境對性狀的影響','dna'],['說明外在條件改變時身體如何維持恆定','homeostasis'],['由人體調節的例子指出回饋作用','homeostasis']],
  earth:[['由觀測資料說明天氣圖的資訊來源','weather'],['連結板塊邊界類型與地震、火山分布','plates'],['區分氣候變遷的觀測證據與原因解釋','climate'],['比較連續天氣圖並描述天氣變化','weather']],
  computing:[['用樹狀結構整理具有階層關係的資料','structures'],['依輸入資料追蹤演算法的執行結果','algorithms'],['比較資料量增加時兩種演算法的步驟數','efficiency'],['說明同一組資料用不同結構表示的差異','structures']],
  technology:[['依測試結果指出設計方案需要修改的地方','engineering'],['由零件的運動關係說明機構如何傳遞動作','mechanisms'],['整理工程科技議題中不同立場的理由','techIssues'],['在材料與功能限制下提出可測試的改良','engineering']],
  art:[['依表達目的調整作品的色彩與造形','color'],['比較同一符號在不同圖像中的意涵','visual'],['用鏡頭順序或剪輯安排傳達訊息','digitalMedia'],['說明構圖與色彩如何共同影響視覺感受','color']],
  music:[['用音樂語彙描述兩段樂曲的表現差異','music'],['依樂譜調整唱奏的節奏與樂句','musicPerform'],['由創作背景解釋樂曲的文化特色','musicCulture'],['比較兩種唱奏詮釋並說明表現上的選擇','musicPerform']]
 };
 model.subjects.forEach(s=>{
  pools[s.id].push(...expansion[s.id].map(([text,ref],i)=>({id:s.id+'-curriculum-'+i,subject:s.name,text,references:[ref],practice:'依課綱對應內容，選一個課堂例子說明自己的判斷。',explore:'比較不同條件下的例子，說明判斷依據及限制。'})));
 });
 // Different group contexts select different content, never duplicate the same task within a subject page.
 const variants={A:1,B:1,C:2,D:0,E:2,F:1,G:2,H:1,I:0,J:2,K:1,L:2,M:0,N:2,O:1,P:1,Q:0,R:2};
 // Editorial extension choices for the groups that can select each subject.
 // Indices refer to the stable ten-item pool, never to an external curriculum code.
 const contextSelections={
  chinese:{K:[3,9],L:[5,7],M:[6,7],N:[4,7],O:[3,8],R:[4,5]},
  english:{A:[3,4],D:[3,6],L:[5,9],Q:[4,9],R:[6,8]},
  math:{A:[4,6],B:[3,7],C:[8,7],E:[3,6],H:[3,6],J:[8,6],P:[5,9],Q:[5,8]},
  history:{M:[3,8],O:[4,5]},geography:{G:[3,8]},
  civics:{J:[3,9],N:[6,8],O:[6,7],P:[5,8],Q:[5,7]},
  physics:{B:[5,9],C:[4,6],G:[8,7]},chemistry:{C:[3,8],D:[4,8],E:[5,9],F:[4,9]},
  biology:{D:[5,8],E:[3,6],F:[3,8],R:[5,7]},earth:{F:[3,7],G:[5,8]},
  computing:{A:[3,8],K:[5,7],P:[4,6]},technology:{B:[4,9],H:[3,7]},
  art:{H:[3,8],I:[4,6],K:[5,7]},music:{I:[4,8]}
 };
 function detailGoals(id,group,version=7){
  const pool=pools[id];
  if(version<=6){const indices=[[0,1,2],[3,4,5],[0,2,4]][variants[group]??0];return indices.map(i=>({...pool[i]}));}
  const selected=contextSelections[id]?.[group];
  if(selected)return [...pool.slice(0,3),...selected.map(i=>pool[i])].map(g=>({...g}));
  // Three stable core items, plus two distinct extensions selected by group context.
  // Rotate over all seven extensions; avoid two extensions citing the same primary entry.
  const extensions=pool.slice(3),index=Math.max(0,String(group||'A').charCodeAt(0)-65)%extensions.length;
  const first=extensions[index];
  const second=Array.from({length:extensions.length-1},(_,offset)=>extensions[(index+3+offset)%extensions.length])
   .find(g=>g.id!==first.id&&g.references[0]!==first.references[0])||extensions[(index+1)%extensions.length];
  return [...pool.slice(0,3),first,second].map(g=>({...g}));
 }
 const descriptions={A:'用程式、演算法與資料處理，設計系統並解決問題。',B:'結合數理與設計實作，探索材料、機械、電子與各種工程系統。',C:'從數學模型與實驗出發，理解物質、能量和自然規律。',D:'認識人體與健康，探索疾病、照護及醫療相關專業。',E:'研究生命如何運作，從細胞、遺傳到生態與生物科技。',F:'探索動植物、食物生產與資源利用，連結生命與環境。',G:'認識地球系統與環境變化，結合觀測、空間資料與問題分析。',H:'從人的需求出發，運用設計與實作規劃產品、建築及空間。',I:'透過視覺、音樂與表演創作，探索表達、文化與美感。',J:'理解個人、群體與社會制度，探索行為、關係與公共議題。',K:'研究訊息如何製作、傳遞與被理解，結合內容、媒體與科技。',L:'透過語言、閱讀與跨文化溝通，理解不同世界與觀點。',M:'從文本、歷史與思想出發，探究人類的經驗、文化與價值。',N:'理解學習與成長，探索教學、課程及不同教育情境。',O:'理解法律、政治與公共制度，練習分析規範、權利與政策。',P:'探索組織如何運作，結合決策、資源配置與經營管理。',Q:'運用數據與經濟思考，分析市場、金融及資源選擇。',R:'結合運動、健康、旅遊與活動規劃，探索休閒服務與體驗。'};
 const api={weights,detailGoals,goalPools:pools,descriptions};
 if(node)module.exports=api;else root.YuhsinExplorationModel=api;
})(typeof window!=='undefined'?window:globalThis);
