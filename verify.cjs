const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const E=require('./source/engine.js'),deck=JSON.parse(fs.readFileSync(path.join(__dirname,'deck.json'),'utf8'));
let now=new Date(2026,8,29,10).getTime();const id=deck[0].id,id2=deck[1].id;
let s=E.empty();assert.equal(deck.length,366);assert.equal(new Set(deck.map(c=>c.id)).size,366);
assert.equal(E.plan(s,now,deck).length,5);E.introduce(s,id,now);assert(!E.introduce(s,id,now));assert.equal(E.newAllowance(s,now,deck).count,4);
assert.equal(E.dueTasks(s,now,null,deck).length,0);assert.equal(E.dueTasks(s,now+E.MIN,null,deck).length,1);
E.review(s,id,'produce',2,now+E.MIN);assert.equal(s.items[id].produce.interval,1);assert.equal(s.logs.at(-1).delayed,false);
const scheduled=s.items[id].produce.due;
E.review(s,id,'produce',3,now+2*E.MIN);assert.equal(s.items[id].produce.due,scheduled);assert(s.logs.at(-1).practice);
now=scheduled;E.review(s,id,'produce',2,now);assert.equal(s.items[id].produce.interval,2);assert(s.logs.at(-1).delayed);
E.review(s,id,'understand',2,now+1);assert.equal(s.logs.at(-1).delayed,false,'Sibling cue must not count as another delayed pass');
now=s.items[id].produce.due;E.review(s,id,'produce',3,now,{assisted:true});assert.equal(s.items[id].produce.interval,0);assert.equal(s.items[id].produce.delayedPasses,0);assert.equal(s.logs.at(-1).grade,0);
assert.equal(s.items[id].produce.due,now+10*E.MIN);E.review(s,id,'produce',2,now+10*E.MIN);assert.equal(s.items[id].produce.interval,1);assert.equal(s.logs.at(-1).delayed,false);
s.items[id].suspended=true;assert(!E.dueTasks(s,now+10*E.DAY,null,deck).some(x=>x.id===id));assert(!E.plan(s,now,deck,'',true).some(x=>x.id===id));
let busy=E.empty();for(const c of deck.slice(0,11))E.introduce(busy,c.id,now-2*E.DAY);assert.equal(E.newAllowance(busy,now,deck).count,0);const plan=E.plan(busy,now,deck);assert(plan.every(t=>t.direction!=='intro'));assert.equal(new Set(plan.map(t=>t.id)).size,plan.length);
let state=E.validate(JSON.parse(JSON.stringify(s)),deck);assert.deepEqual(state,s);assert.throws(()=>E.validate({...s,deckId:'other'},deck));const bad=JSON.parse(JSON.stringify(s));bad.items[id].produce.due=-1;assert.throws(()=>E.validate(bad,deck));assert.throws(()=>E.review(s,id,'produce',99,now));
// A card can reach the conservative dashboard criterion only through delayed successes in both directions.
let stable=E.empty();E.introduce(stable,id,now);let time=now;
for(let i=0;i<12;i++){const dir=i%2?'understand':'produce';time=Math.max(time+E.DAY,stable.items[id][dir].due);E.review(stable,id,dir,2,time)}
assert(E.holding(stable.items[id]));E.review(stable,id,'produce',0,stable.items[id].produce.due);assert(!E.holding(stable.items[id]));
console.log('PASS engine: due-only plans, separate directions, limits/backlog, spacing, assisted failures, early practice, delayed metrics, suspension, backups and multi-week retention criterion.');
// Execute the actual bundled UI script with a controlled clock, DOM, audio and storage.
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);assert.equal(scripts.length,2);
assert.equal(scripts[0].trim(),fs.readFileSync(path.join(__dirname,'source/engine.js'),'utf8').trim());
assert.equal(scripts[1].trim(),fs.readFileSync(path.join(__dirname,'source/app.js'),'utf8').trim());
const elements=new Map(),timers=new Map(),storage=new Map();let tick=0,spoken=[];
function el(id){return {id,hidden:false,disabled:false,textContent:'',innerHTML:'',value:'',dataset:{},files:[],events:{},addEventListener(n,fn){this.events[n]=fn},click(){this.events.click?.({preventDefault(){}})}}}
const get=id=>{if(!elements.has(id))elements.set(id,el(id));return elements.get(id)};get('deck-data').textContent=JSON.stringify(deck);get('category').value='';
const grades=[0,1,2,3].map(n=>{let e=el('grade'+n);e.dataset.grade=String(n);return e});
const document={getElementById:get,querySelectorAll(sel){return sel==='[data-grade]'?grades:[]},createElement:()=>el('new')};
let wall=now;class FakeDate extends Date{constructor(...args){super(...(args.length?args:[wall]))}static now(){return wall}}
const speech={getVoices:()=>[{name:'Mandarin test',lang:'zh-CN'}],cancel(){},resume(){},addEventListener(){},speak(u){spoken.push(u);u.onstart?.()}};
const sandbox={document,Date:FakeDate,console,Blob,URL,location:{protocol:'file:'},navigator:{},setTimeout(fn){timers.set(++tick,fn);return tick},clearTimeout(id){timers.delete(id)},setInterval(){},scrollTo(){},addEventListener(){},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},speechSynthesis:speech,SpeechSynthesisUtterance:function(text){this.text=text}};sandbox.window=sandbox;
const context=vm.createContext(sandbox),run=x=>vm.runInContext(x,context);scripts.forEach(script=>run(script));
run('start()');assert.equal(run('current.direction'),'intro');run('studied();studied()');assert.equal(run('session.studied'),1);assert.equal(run('Object.keys(state.items).length'),1);
run('advance()');assert.equal(run('current.direction'),'intro');run('studied()');wall+=E.MIN;run('advance()');assert.equal(run('current.direction'),'produce');assert(get('answer').hidden);
run('help("pinyin");reveal();rate(3)');assert.equal(run('state.logs.at(-1).grade'),0);const attempts=run('state.logs.length');run('rate(2)');assert.equal(run('state.logs.length'),attempts);
run('finish()');assert.equal(run('session'),null);assert(!get('done').hidden);
// Listening requires actual playback or an explicit reading prompt before grading.
wall+=2*E.DAY;run("state.settings.newLimit=0;start()");run("current.direction='understand';revealed=false;heard=false;inputMode='listening';reveal()");assert.equal(run('revealed'),false);
run('readInstead();reveal();rate(2)');assert.equal(run('state.logs.at(-1).input'),'reading');
run('audioSettings();play({id:"test",zh:"你想喝水吗？"},false,false,true)');assert.equal(spoken.at(-1).text,'你想喝水吗？');assert(get('settingsAudioStatus').textContent.includes('Test sentence'));
run('play(byId.get(DECK[0].id),true)');assert.equal(spoken.at(-1).rate,.65);
run('stopAudio()');const before=spoken.length;speech.getVoices=()=>[{name:'Cantonese',lang:'zh-HK'}];run('play(byId.get(DECK[0].id))');for(let i=0;i<8&&timers.size;i++){const callbacks=[...timers.values()];timers.clear();callbacks.forEach(fn=>fn())}assert.equal(spoken.length,before);assert(get('notice').textContent.includes('No Mandarin'));
const beforeImport=run('JSON.stringify(state)');run('importCandidate=null;confirmImport()');assert.equal(run('JSON.stringify(state)'),beforeImport);
assert.equal(run('esc("<img onerror=bad()>")'),'&lt;img onerror=bad()&gt;');
console.log('PASS UI logic: actual bundled scripts, new-card introduction, hidden recall, hint cap, repeated-tap guard, session exit, reading fallback, whole-phrase speech, Mandarin voice filtering and safe rendering.');
// Future-dated imports cannot inflate the recent recall panel.
const future=E.empty();future.logs=[{at:now+E.DAY,delayed:true,practice:false,grade:2}];assert.equal(E.retention(future,now).total,0);
// Unreadable saved data is retained; a valid restore unlocks persistence.
const key='mandarin-remember:reviewed:v1';storage.set(key,'{bad json');run('state=load();save()');assert.equal(storage.get(key),'{bad json');assert.equal(run('storageLocked'),true);
storage.set(key,JSON.stringify(E.empty()));run('state=load()');assert.equal(run('storageLocked'),false);assert(get('storageWarning').hidden);
const realSet=sandbox.localStorage.setItem;sandbox.localStorage.setItem=()=>{throw Error('quota')};run('save()');assert(!get('storageWarning').hidden);assert(get('storageWarning').textContent.includes('could not save'));
const beforeFailedImport=run('JSON.stringify(state)');run('importCandidate=E.empty();confirmImport()');assert.equal(run('JSON.stringify(state)'),beforeFailedImport);assert(get('notice').textContent.includes('Import cancelled'));sandbox.localStorage.setItem=realSet;
run('confirmImport()');assert.equal(run('importCandidate'),null);assert(storage.has(key+':before-import'));
// Cancelled online playback must not unlock the next listening question.
let media=[];sandbox.ONLINE_VOICE_ENABLED=true;sandbox.Audio=function(url){this.url=url;this.play=()=>({catch(){}});this.pause=()=>{};this.removeAttribute=()=>{};this.load=()=>{};media.push(this)};
run('play(byId.get(DECK[0].id),true)');assert(media.at(-1).url.endsWith('&slow=1'));const stale=media.at(-1);run('stopAudio()');get('notice').textContent='unchanged';stale.onplaying();assert.equal(get('notice').textContent,'unchanged');
run('play(byId.get(DECK[0].id))');media.at(-1).onerror();assert(get('notice').textContent.includes('Online audio could not load'));
console.log('PASS resilience: future timestamps, corrupt storage preservation/recovery, quota failures, confirmed backup restore and cancelled/failed online audio.');
