/* Transparent spacing heuristic; not a calibrated memory-probability model. */
(function(root){
'use strict';
const DAY=86400000,MIN=60000;
const directions=['produce','understand'];
const localDay=t=>{const d=new Date(t);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function empty(deckId){if(typeof deckId!=='string'||!deckId)throw Error('A course progress ID is required');return {schema:1,deckId,items:{},logs:[],settings:{newLimit:5,reviewLimit:20,audioMode:'auto',voice:''}}}
const track=(due)=>({due,interval:0,lastAt:0,lastGrade:null,reviews:0,lapses:0,delayedPasses:0,phase:'learning'});
function introduce(state,id,now){if(state.items[id])return false;state.items[id]={introducedAt:now,suspended:false,note:'',produce:track(now+MIN),understand:track(now+DAY)};return true}
function dueTasks(state,now,category,deck){const allowed=new Set(deck.filter(c=>!isSentence(c)&&(!category||c.category===category)).map(c=>c.id));const tasks=[];for(const [id,item] of Object.entries(state.items)){if(!allowed.has(id)||item.suspended)continue;for(const direction of directions)if(item[direction].due<=now)tasks.push({id,direction,due:item[direction].due})}return tasks.sort((a,b)=>a.due-b.due||a.id.localeCompare(b.id)||a.direction.localeCompare(b.direction))}
function retention(state,now){const logs=state.logs.filter(e=>e.delayed&&e.at>=now-7*DAY&&e.at<=now&&!e.practice);return {total:logs.length,passed:logs.filter(e=>e.grade>0).length}}
function newAllowance(state,now,deck){const used=Object.values(state.items).filter(i=>localDay(i.introducedAt)===localDay(now)).length;const r=retention(state,now);const backlog=dueTasks(state,now,null,deck).length;const paused=backlog>=20||(r.total>=10&&r.passed/r.total<.7);return {count:paused?0:Math.max(0,state.settings.newLimit-used),used,reason:backlog>=20?'Review backlog':paused?'Consolidate recent material':''}}
function schedule(previous,grade,now){const t={...previous};t.reviews++;t.lastAt=now;t.lastGrade=grade;
 if(grade===0){t.lapses++;t.interval=0;t.phase='relearning';t.due=now+(previous.phase==='review'?10:1)*MIN;t.delayedPasses=0;return t}
 if(previous.phase!=='review'){
  if(grade===1){t.interval=0;t.due=now+10*MIN;t.phase='learning'}
  else {t.interval=grade===3?3:1;t.due=now+t.interval*DAY;t.phase='review'}
 }else {const factor=grade===1?1.2:grade===2?2:2.8;t.interval=Math.min(180,Math.max(1,Math.round(previous.interval*factor*10)/10));t.due=now+t.interval*DAY}
 return t;
}
function review(state,id,direction,grade,now,{assisted=false,practice=false,input='spoken',force=false}={}){
 const item=state.items[id];if(!item||!directions.includes(direction)||!Number.isInteger(grade)||grade<0||grade>3)throw Error('Invalid review');
 const previous=item[direction];const early=previous.due>now;practice=practice||early;if(force)practice=false;const effective=assisted?0:grade;
 const latestAttempt=state.logs.filter(e=>e.id===id).reduce((n,e)=>Math.max(n,e.at),item.introducedAt);
 const lastExposure=Math.max(latestAttempt,item.produce.lastAt,item.understand.lastAt);
 const delayed=!practice&&now-lastExposure>=20*60*MIN;
 if(!practice){item[direction]=schedule(previous,effective,now);if(delayed&&effective>0)item[direction].delayedPasses++}
 const event={id,direction,grade:effective,requestedGrade:grade,at:now,assisted,practice,delayed,input};state.logs.push(event);state.logs=state.logs.slice(-5000);return event;
}
function newCards(state,deck,category=''){const rank=c=>Number.isInteger(c.featured)&&c.featured>=0?c.featured:Number.MAX_SAFE_INTEGER;return deck.filter(c=>!isSentence(c)&&!state.items[c.id]&&(!category||c.category===category)).sort((a,b)=>rank(a)-rank(b))}
function plan(state,now,deck,category='',practice=false){
 if(practice)return Object.entries(state.items).filter(([id,s])=>!s.suspended&&deck.some(c=>c.id===id&&!isSentence(c)&&(!category||c.category===category))).sort((a,b)=>(b[1].produce.lapses+b[1].understand.lapses)-(a[1].produce.lapses+a[1].understand.lapses)).slice(0,10).map(([id])=>({id,direction:'produce',practice:true,readyAt:now}));
 const usedIds=new Set();
 const tasks=dueTasks(state,now,category,deck).filter(t=>{if(usedIds.has(t.id))return false;usedIds.add(t.id);return true}).slice(0,state.settings.reviewLimit).map(t=>({...t,readyAt:now}));
 const n=newAllowance(state,now,deck).count;
 const fresh=newCards(state,deck,category).slice(0,n).map(c=>({id:c.id,direction:'intro',readyAt:now}));return tasks.concat(fresh);
}
function extraPlan(state,now,deck,category=''){return newCards(state,deck,category).slice(0,5).map(c=>({id:c.id,direction:'intro',readyAt:now,extra:true}))}
function holding(item){return !item.suspended&&directions.every(d=>item[d].phase==='review'&&item[d].interval>=7&&item[d].delayedPasses>=2&&item[d].lastGrade>0)}
function progress(state,deck,now){const words=deck.filter(c=>!isSentence(c)),byCategory=new Map();for(const c of words){if(!byCategory.has(c.category))byCategory.set(c.category,{category:c.category,total:0,seen:0,holding:0,learning:0,paused:0,unseen:0,due:0,seenPct:0,holdingPct:0});byCategory.get(c.category).total++}
 const byId=new Map(deck.map(c=>[c.id,c])),dueByCategory=new Map();for(const t of dueTasks(state,now,null,deck)){const card=byId.get(t.id);if(card)dueByCategory.set(card.category,(dueByCategory.get(card.category)||0)+1)}
 let seen=0,held=0,paused=0,due=0;for(const c of words){const row=byCategory.get(c.category),item=state.items[c.id];if(!item){row.unseen++;continue}row.seen++;seen++;if(item.suspended){row.paused++;paused++}else if(holding(item)){row.holding++;held++}else row.learning++}
 for(const row of byCategory.values()){row.due=dueByCategory.get(row.category)||0;due+=row.due;row.seenPct=row.total?Math.round(row.seen/row.total*100):0;row.holdingPct=row.total?Math.round(row.holding/row.total*100):0}
 const total=words.length,holdingCount=held;return {total,seen,holding:holdingCount,learning:seen-holdingCount-paused,paused,unseen:total-seen,due,categories:[...byCategory.values()]}}
function isSentence(card){const text=(card.text||'').trim();return card.sentence===true||/[。？！.!?؟]$/.test(text)||card.category==='Everyday Sentences'}
const SENTENCE_PARTICLES=new Set([...'了的吗呢吧啊呀嘛着过']);
const SENTENCE_GLUE=['我们','你们','他们','这是','那是','我','你','他','她','它','这','那','是','在','不','没','有','和','会','能','就','也','都','还','很','个','地','得'];
const JAPANESE_GLUE=['です','ます','でした','ません','ない','は','が','を','に','へ','で','と','も','の','か','から','まで','より','や','ね','よ','て'];
function wordDictionary(deck){const map=new Map();for(const c of deck){if(isSentence(c))continue;const add=(text,form=null)=>{const key=(text||'').trim();if(key&&!map.has(key))map.set(key,{card:c,form})};add(c.text);for(const form of c.forms||[])add(form.text,form)}return map}
const CONNECTOR_MEANINGS={'我':'I','你':'you','他':'he','她':'she','我们':'we','你们':'you (plural)','他们':'they','这是':'this is','那是':'that is','这':'this','那':'that','是':'is / to be','在':'at / in','不':'not','没':'not / have not','有':'have / there is','会':'can / will','能':'can / be able to','就':'then / right away','也':'also','都':'all / both','还':'still / also','很':'very','个':'general measure word','了':'completed / new situation','吗':'yes-no question','吧':'suggestion (let’s / shall we)','呢':'follow-up question','着':'ongoing state','的':'possessive / descriptive','啊':'softening / exclamation','呀':'softening / exclamation','嘛':'obvious / persuasive','过':'experienced before','地':'adverbial marker','得':'complement marker','和':'and / with','は':'topic marker','が':'subject marker','を':'direct-object marker','に':'destination / time marker','へ':'direction marker','で':'place of an action','と':'with / and','も':'also / too','の':'possession / noun linker','か':'question marker','から':'from / because','まで':'until / as far as','より':'than / from','や':'and, among others','ね':'seeking agreement','よ':'emphasis','て':'linking form','です':'polite copula','ます':'polite verb ending','でした':'polite past copula','ません':'polite negative ending','ない':'negative ending'};
function sentenceParts(card,deck){const dict=wordDictionary(deck),text=(card.text||'').trim();if(!text)return null;const ids=[],connectors=[],matches=[],add=(entry,surface)=>{if(!ids.includes(entry.card.id))ids.push(entry.card.id);matches.push({id:entry.card.id,text:surface,form:entry.form||null})},connect=(token)=>{const meaning=CONNECTOR_MEANINGS[token];if(meaning&&!connectors.some(c=>c.text===token))connectors.push({text:token,meaning})};
 if(/\s/.test(text)){const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u064b-\u0652\u0640]/g,'').replace(/[。？！.!?？、，,;؛:]/g,'');const byNorm=new Map([...dict.entries()].map(([key,value])=>[norm(key),value]));for(const raw of text.split(/\s+/)){const token=raw.replace(/^[。？！.!?？、，,;؛:]+|[。？！.!?？、，,;؛:]+$/g,'');if(!token)continue;const hit=dict.get(token)||byNorm.get(norm(token));if(!hit)return null;add(hit,token)}return ids.length?{words:ids,connectors,matches}:null}
 const clean=text.replace(/[。？！.!?？\s，、；：,.]/g,''),keys=[...dict.keys()].sort((a,b)=>b.length-a.length),isJapanese=/[ぁ-んァ-ヶ]/.test(clean),glue=isJapanese?JAPANESE_GLUE:SENTENCE_GLUE;let i=0;while(i<clean.length){const key=keys.find(k=>clean.startsWith(k,i));if(key){add(dict.get(key),key);i+=key.length;continue}const token=glue.find(k=>clean.startsWith(k,i));if(token){connect(token);i+=token.length;continue}if(!isJapanese&&SENTENCE_PARTICLES.has(clean[i])){connect(clean[i]);i++;continue}return null}return ids.length?{words:ids,connectors,matches}:null}
function sentenceWords(card,deck){const parts=sentenceParts(card,deck);return parts?parts.words:null}
function sentenceFrame(card,deck,words,parts){let frame=card.text;const matches=(parts||sentenceParts(card,deck)||{}).matches||[];if(matches.length){for(const surface of [...new Set(matches.map(m=>m.text))].sort((a,b)=>b.length-a.length))frame=frame.split(surface).join('___');return frame}const byId=new Map(deck.map(c=>[c.id,c]));for(const id of [...words].sort((a,b)=>(byId.get(b)?.text.length||0)-(byId.get(a)?.text.length||0))){const word=byId.get(id);if(word)frame=frame.split(word.text).join('___')}return frame}
function sentencePlan(state,now,deck,category='',limit=5){const shownAt=new Map();for(const e of state.logs||[]){if(e.practice)shownAt.set(e.id,Math.max(shownAt.get(e.id)||0,e.at))}
 const eligible=[];for(const c of deck){if(!isSentence(c)||(category&&c.category!==category))continue;const parts=sentenceParts(c,deck);if(!parts)continue;if(!parts.words.every(id=>state.items[id]&&!state.items[id].suspended))continue;const earliest=Math.min(...parts.words.map(id=>Math.min(state.items[id].produce.due,state.items[id].understand.due)));eligible.push({id:c.id,words:parts.words,connectors:parts.connectors,matches:parts.matches,frame:sentenceFrame(c,deck,parts.words,parts),earliest,shown:shownAt.get(c.id)||0})}
 eligible.sort((a,b)=>a.shown-b.shown||a.earliest-b.earliest||a.id.localeCompare(b.id));
 const picked=[],usedFrames=new Set();for(const t of eligible){if(picked.length>=Math.max(0,limit))break;if(usedFrames.has(t.frame))continue;usedFrames.add(t.frame);picked.push(t)}for(const t of eligible){if(picked.length>=Math.max(0,limit))break;if(!picked.includes(t))picked.push(t)}
 return picked.map((t,i)=>({id:t.id,direction:i%2?'understand':'produce',sentence:true,words:t.words,connectors:t.connectors,matches:t.matches,frame:t.frame,readyAt:now}))}
// Build a sentence recall at the moment a vocabulary recall is displayed.
// Its anchor remains the scheduled word, so topic and recall direction carry over.
function sentenceRecall(state,now,deck,task,excluded=[]){
 if(!task||task.sentence||!directions.includes(task.direction)||!state.items[task.id]||state.items[task.id].suspended)return null;
 const skip=new Set(excluded);
 const candidate=sentencePlan(state,now,deck,'',deck.length).find(t=>t.words.includes(task.id)&&!skip.has(t.id));
 return candidate?{...candidate,direction:task.direction,practice:!!task.practice,reviewWord:task.id}:null;
}
function validate(raw,deck,deckId){
 if(typeof deckId!=='string'||!deckId)throw Error('A course progress ID is required');
 if(!raw||raw.schema!==1||raw.deckId!==deckId||!raw.items||typeof raw.items!=='object'||Array.isArray(raw.items)||!Array.isArray(raw.logs))throw Error('Not a compatible backup for this course');
 const state=empty(deckId),ids=new Set(deck.map(c=>c.id));
 const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
 for(const [id,item] of Object.entries(raw.items)){
  if(!ids.has(id))throw Error('Backup contains unknown card IDs');
  if(!item||!num(item.introducedAt,0,1e15)||typeof item.suspended!=='boolean'||typeof item.note!=='string'||item.note.length>1000)throw Error('Invalid item');
  const copy={introducedAt:item.introducedAt,suspended:item.suspended,note:item.note};
  for(const d of directions){const t=item[d];if(!t||!['learning','relearning','review'].includes(t.phase)||!num(t.due,0,1e15)||!num(t.lastAt,0,1e15)||!num(t.interval,0,180)||![null,0,1,2,3].includes(t.lastGrade)||!['reviews','lapses','delayedPasses'].every(k=>Number.isInteger(t[k])&&t[k]>=0&&t[k]<=1e7))throw Error('Invalid schedule');copy[d]={due:t.due,interval:t.interval,lastAt:t.lastAt,lastGrade:t.lastGrade,reviews:t.reviews,lapses:t.lapses,delayedPasses:t.delayedPasses,phase:t.phase}}
  state.items[id]=copy;
 }
 if(raw.logs.length>5000)throw Error('Backup has too many log entries');
 for(const e of raw.logs){if(!e||!ids.has(e.id)||!directions.includes(e.direction)||!num(e.at,0,1e15)||![0,1,2,3].includes(e.grade)||![0,1,2,3].includes(e.requestedGrade)||!['assisted','practice','delayed'].every(k=>typeof e[k]==='boolean')||!['spoken','listening','reading'].includes(e.input))throw Error('Invalid review history');state.logs.push({id:e.id,direction:e.direction,at:e.at,grade:e.grade,requestedGrade:e.requestedGrade,assisted:e.assisted,practice:e.practice,delayed:e.delayed,input:e.input})}
 const s=raw.settings||{};state.settings={newLimit:Number.isInteger(s.newLimit)&&s.newLimit>=0&&s.newLimit<=15?s.newLimit:5,reviewLimit:[10,20,30].includes(s.reviewLimit)?s.reviewLimit:20,audioMode:['auto','device','online'].includes(s.audioMode)?s.audioMode:'auto',voice:typeof s.voice==='string'?s.voice.slice(0,200):''};return state;
}
const api={DAY,MIN,directions,localDay,empty,introduce,dueTasks,retention,newAllowance,schedule,review,plan,extraPlan,holding,progress,isSentence,sentenceWords,sentenceParts,sentenceFrame,sentencePlan,sentenceRecall,validate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CoachEngine=api;
})(typeof window!=='undefined'?window:globalThis);
