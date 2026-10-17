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
 P:{math:3,civics:3,computing:2,english:1},Q:{math:3,civics:3,english:2,computing:1},R:{sport:3,biology:2,geography:2,chinese:1}
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
 // Different group contexts select different content, never duplicate the same task within a subject page.
 const variants={A:1,B:1,C:2,D:0,E:2,F:1,G:2,H:1,I:0,J:2,K:1,L:2,M:0,N:2,O:1,P:1,Q:0,R:2};
 function detailGoals(id,group){const indices=[[0,1,2],[3,4,5],[0,2,4]][variants[group]??0];return indices.map(i=>({...pools[id][i]}));}
 const descriptions={A:'用程式、演算法與資料處理，設計系統並解決問題。',B:'結合數理與設計實作，探索材料、機械、電子與各種工程系統。',C:'從數學模型與實驗出發，理解物質、能量和自然規律。',D:'認識人體與健康，探索疾病、照護及醫療相關專業。',E:'研究生命如何運作，從細胞、遺傳到生態與生物科技。',F:'探索動植物、食物生產與資源利用，連結生命與環境。',G:'認識地球系統與環境變化，結合觀測、空間資料與問題分析。',H:'從人的需求出發，運用設計與實作規劃產品、建築及空間。',I:'透過視覺、音樂與表演創作，探索表達、文化與美感。',J:'理解個人、群體與社會制度，探索行為、關係與公共議題。',K:'研究訊息如何製作、傳遞與被理解，結合內容、媒體與科技。',L:'透過語言、閱讀與跨文化溝通，理解不同世界與觀點。',M:'從文本、歷史與思想出發，探究人類的經驗、文化與價值。',N:'理解學習與成長，探索教學、課程及不同教育情境。',O:'理解法律、政治與公共制度，練習分析規範、權利與政策。',P:'探索組織如何運作，結合決策、資源配置與經營管理。',Q:'運用數據與經濟思考，分析市場、金融及資源選擇。',R:'結合運動、健康、旅遊與活動規劃，探索休閒服務與體驗。'};
 const api={weights,detailGoals,goalPools:pools,descriptions};
 if(node)module.exports=api;else root.YuhsinExplorationModel=api;
})(typeof window!=='undefined'?window:globalThis);
