/* Transparent spacing heuristic; not a calibrated memory-probability model. */
(function(root){
'use strict';
const DAY=86400000,MIN=60000,DECK_ID='chinese-family-reviewed-1';
const directions=['produce','understand'];
const localDay=t=>{const d=new Date(t);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const empty=()=>({schema:1,deckId:DECK_ID,items:{},logs:[],settings:{newLimit:5,reviewLimit:20,audioMode:'auto',voice:''}});
const track=(due)=>({due,interval:0,lastAt:0,lastGrade:null,reviews:0,lapses:0,delayedPasses:0,phase:'learning'});
function introduce(state,id,now){if(state.items[id])return false;state.items[id]={introducedAt:now,suspended:false,note:'',produce:track(now+MIN),understand:track(now+DAY)};return true}
function dueTasks(state,now,category,deck){const allowed=new Set(deck.filter(c=>!category||c.category===category).map(c=>c.id));const tasks=[];for(const [id,item] of Object.entries(state.items)){if(!allowed.has(id)||item.suspended)continue;for(const direction of directions)if(item[direction].due<=now)tasks.push({id,direction,due:item[direction].due})}return tasks.sort((a,b)=>a.due-b.due||a.id.localeCompare(b.id)||a.direction.localeCompare(b.direction))}
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
function review(state,id,direction,grade,now,{assisted=false,practice=false,input='spoken'}={}){
 const item=state.items[id];if(!item||!directions.includes(direction)||!Number.isInteger(grade)||grade<0||grade>3)throw Error('Invalid review');
 const previous=item[direction];const early=previous.due>now;practice=practice||early;const effective=assisted?0:grade;
 const latestAttempt=state.logs.filter(e=>e.id===id).reduce((n,e)=>Math.max(n,e.at),item.introducedAt);
 const lastExposure=Math.max(latestAttempt,item.produce.lastAt,item.understand.lastAt);
 const delayed=!practice&&now-lastExposure>=20*60*MIN;
 if(!practice){item[direction]=schedule(previous,effective,now);if(delayed&&effective>0)item[direction].delayedPasses++}
 const event={id,direction,grade:effective,requestedGrade:grade,at:now,assisted,practice,delayed,input};state.logs.push(event);state.logs=state.logs.slice(-5000);return event;
}
function plan(state,now,deck,category='',practice=false){
 if(practice)return Object.entries(state.items).filter(([id,s])=>!s.suspended&&deck.some(c=>c.id===id&&(!category||c.category===category))).sort((a,b)=>(b[1].produce.lapses+b[1].understand.lapses)-(a[1].produce.lapses+a[1].understand.lapses)).slice(0,10).map(([id])=>({id,direction:'produce',practice:true,readyAt:now}));
 const usedIds=new Set();
 const tasks=dueTasks(state,now,category,deck).filter(t=>{if(usedIds.has(t.id))return false;usedIds.add(t.id);return true}).slice(0,state.settings.reviewLimit).map(t=>({...t,readyAt:now}));
 const n=newAllowance(state,now,deck).count;
 const fresh=deck.filter(c=>!state.items[c.id]&&(!category||c.category===category)).slice(0,n).map(c=>({id:c.id,direction:'intro',readyAt:now}));return tasks.concat(fresh);
}
function holding(item){return !item.suspended&&directions.every(d=>item[d].phase==='review'&&item[d].interval>=7&&item[d].delayedPasses>=2&&item[d].lastGrade>0)}
function validate(raw,deck){
 if(!raw||raw.schema!==1||raw.deckId!==DECK_ID||!raw.items||typeof raw.items!=='object'||Array.isArray(raw.items)||!Array.isArray(raw.logs))throw Error('Not a compatible Family Coach backup');
 const state=empty(),ids=new Set(deck.map(c=>c.id));
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
const api={DAY,MIN,DECK_ID,directions,localDay,empty,introduce,dueTasks,retention,newAllowance,schedule,review,plan,holding,validate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CoachEngine=api;
})(typeof window!=='undefined'?window:globalThis);
