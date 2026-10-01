const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const E=require('./source/engine.js'),deck=JSON.parse(fs.readFileSync(path.join(__dirname,'deck.json'),'utf8'));
let now=new Date(2026,8,29,10).getTime();const id=deck[0].id,id2=deck[1].id;
let s=E.empty();assert.equal(deck.length,1034);assert.equal(new Set(deck.map(c=>c.id)).size,1034);
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
const windowEvents={};let wall=now;class FakeDate extends Date{constructor(...args){super(...(args.length?args:[wall]))}static now(){return wall}}
const speech={getVoices:()=>[{name:'Mandarin test',lang:'zh-CN'}],cancel(){},resume(){},addEventListener(){},speak(u){spoken.push(u);u.onstart?.()}};
const sandbox={document,Date:FakeDate,console,Blob,URL,location:{protocol:'file:'},navigator:{},setTimeout(fn){timers.set(++tick,fn);return tick},clearTimeout(id){timers.delete(id)},setInterval(){},scrollTo(){},addEventListener(n,fn){windowEvents[n]=fn},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},speechSynthesis:speech,SpeechSynthesisUtterance:function(text){this.text=text}};sandbox.window=sandbox;
const context=vm.createContext(sandbox),run=x=>vm.runInContext(x,context);scripts.forEach(script=>run(script));
run('start()');assert.equal(run('current.direction'),'intro');run('studied();studied()');assert.equal(run('session.studied'),1);assert.equal(run('Object.keys(state.items).length'),1);
run('advance()');assert.equal(run('current.direction'),'intro');run('studied()');wall+=E.MIN;run('advance()');assert.equal(run('current.direction'),'produce');assert(get('answer').hidden);
run('help("pinyin");reveal();rate(3)');assert.equal(run('state.logs.at(-1).grade'),0);const attempts=run('state.logs.length');run('rate(2)');assert.equal(run('state.logs.length'),attempts);
run('finish()');assert.equal(run('session'),null);assert(!get('done').hidden);
// Listening requires actual playback or an explicit reading prompt before grading.
wall+=2*E.DAY;run("state.settings.newLimit=0;start()");run("current.direction='understand';revealed=false;heard=false;inputMode='listening';reveal()");assert.equal(run('revealed'),false);
run('readInstead();reveal();rate(2)');assert.equal(run('state.logs.at(-1).input'),'reading');
run('audioSettings();play({id:"test",zh:"你想喝水吗？"},false,false,true)');assert.equal(spoken.at(-1).text,'你想喝水吗？');assert(get('settingsAudioStatus').textContent.includes('Test sentence'));
run('play(byId.get(DECK[0].id),true)');assert.equal(spoken.at(-1).rate,.4);
run('stopAudio()');const before=spoken.length;speech.getVoices=()=>[{name:'Cantonese',lang:'zh-HK'}];run('play(byId.get(DECK[0].id))');for(let i=0;i<8&&timers.size;i++){const callbacks=[...timers.values()];timers.clear();callbacks.forEach(fn=>fn())}assert.equal(spoken.length,before);assert(get('settingsAudioStatus').textContent.includes('No Mandarin'));
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
run('play(byId.get(DECK[0].id))');media.at(-1).onerror();assert(get('settingsAudioStatus').textContent.includes('Online audio could not load'));
console.log('PASS resilience: future timestamps, corrupt storage preservation/recovery, quota failures, confirmed backup restore and cancelled/failed online audio.');

// Explicit extra batches ignore the daily intake limit without moving existing reviews.
let capped=E.empty();capped.settings.newLimit=0;for(const c of deck.slice(0,12))E.introduce(capped,c.id,now-2*E.DAY);
const oldSchedule=JSON.stringify(capped.items),extra=E.extraPlan(capped,now,deck);assert.equal(extra.length,5);assert(extra.every(t=>t.extra&&!capped.items[t.id]));assert.equal(JSON.stringify(capped.items),oldSchedule);
assert(E.extraPlan(capped,now,deck,'Breakfast').every(t=>deck.find(c=>c.id===t.id).category==='Breakfast'));
run('home();state=E.empty();state.settings.newLimit=0;startExtra()');
for(let i=0;i<5;i++){assert.equal(run('current.direction'),'intro');run('studied();advance()')}
assert.equal(run('Object.keys(state.items).length'),5);assert.equal(run('state.settings.newLimit'),0);assert.equal(run('current'),null);
run('finish();startExtra()');assert(!run('state.items[current.id]'));assert.equal(run('session.queue.length'),4);run('finish()');
// A v1 backup remains valid with the expanded deck.
assert.equal(E.validate(s,deck).items[id].introducedAt,s.items[id].introducedAt);
// Speech uses whole phrases at clearly distinct rates; late callbacks cannot mark a newer prompt heard.
sandbox.ONLINE_VOICE_ENABLED=false;speech.getVoices=()=>[{name:'Mandarin test',lang:'zh-CN'}];run('audioSettings();play({id:"test",zh:"你想喝水吗？"},false,false,true)');assert.equal(spoken.at(-1).rate,1);wall+=2000;spoken.at(-1).onend();
run('play({id:"test",zh:"你想喝水吗？"},true,false,true)');assert.equal(spoken.at(-1).rate,.4);wall+=2050;spoken.at(-1).onend();assert(get('settingsAudioStatus').textContent.includes('may ignore speed'));
run('play({id:"test",zh:"你想喝水吗？"},true,false,true)');wall+=5000;spoken.at(-1).onend();assert(!get('settingsAudioStatus').textContent.includes('may ignore speed'));
// Deck additions remain distinct and each new-card plan follows the edited topic order.
assert.equal(new Set(deck.map(c=>c.zh.replace(/[\s。？！?!，,.]/g,''))).size,deck.length,'No punctuation-only duplicate cards');
for(const c of deck)for(const key of ['id','zh','pinyin','meaning','category'])assert(typeof c[key]==='string'&&c[key].trim(),`${c.zh}: missing ${key}`);
assert.equal(JSON.stringify(JSON.parse(html.match(/<script id="deck-data" type="application\/json">([\s\S]*?)<\/script>/)[1])),JSON.stringify(deck),'Built page must contain the current full deck');
assert(html.includes(`${deck.length} cards · English → Mandarin · v1.4`));
const family=deck.filter(c=>c.category==='Family'),grandparents=['奶奶','爷爷','外婆','外公'];
assert.deepEqual(family.filter(c=>grandparents.includes(c.zh)).map(c=>c.zh),grandparents);
assert(family.findIndex(c=>c.zh==='外公')-family.findIndex(c=>c.zh==='奶奶')<=5);
const familyProgress=E.empty();for(const c of family.slice(0,family.findIndex(c=>c.zh==='外婆')))E.introduce(familyProgress,c.id,now-2*E.DAY);
assert.equal(deck.find(c=>c.id===E.extraPlan(familyProgress,now,deck,'Family')[0].id).zh,'外婆');
const homeCards=deck.filter(c=>c.category==='Home & Routine'),wakeIndex=homeCards.findIndex(c=>c.zh==='起床');
assert.deepEqual(homeCards.slice(wakeIndex,wakeIndex+3).map(c=>c.zh),['起床','我起床了。','该起床了。']);
get('search').value='姥姥';run('renderLibrary()');assert(get('libraryList').innerHTML.includes('外婆'));get('search').value='';
console.log('PASS expanded curriculum: unique complete cards, embedded deck parity, grouped grandparents, maternal-name search, word/sentence order and unseen-card selection.');

// Context is optional, safely rendered, searchable, and only inside the revealed answer.
const annotated=deck.filter(c=>c.usage);assert.equal(annotated.length,138);
assert.equal(annotated.reduce((n,c)=>n+c.examples.length,0),174);
for(const c of annotated){
 assert(c.usage.trim());assert(c.examples.length>=1&&c.examples.length<=2);
 for(const example of c.examples){for(const field of ['zh','pinyin','meaning'])assert.equal(typeof example[field],'string');assert(/[\u3400-\u9fff]/u.test(example.zh));assert(example.pinyin.trim()&&example.meaning.trim());}
}
const wake=deck.find(c=>c.zh==='起床');
run('home();state=E.empty();beginSession([{id:'+JSON.stringify(wake.id)+',direction:"intro",readyAt:Date.now()}],false)');
assert(!get('answer').hidden);assert(!get('usageDetails').hidden);assert.equal(get('usageDetails').open,false);
assert(get('usageContent').innerHTML.includes('亚历克斯'));assert(get('usageContent').innerHTML.includes('qǐchuáng'));
const exampleLinks=[...get('usageContent').innerHTML.matchAll(/href="([^"]+)"/g)].map(m=>new URL(m[1].replaceAll('&amp;','&')));
assert.deepEqual(exampleLinks.map(u=>u.searchParams.get('text')),wake.examples.map(e=>e.zh));
get('usageDetails').open=true;run('studied();advance()');wall+=E.MIN;run('advance()');
assert.equal(run('current.direction'),'produce');assert(get('answer').hidden);assert.equal(get('usageDetails').open,false);assert.equal(get('prompt').textContent,wake.meaning);
run('reveal()');assert(!get('answer').hidden);assert(!get('usageDetails').hidden);
run('home();beginSession([{id:DECK[0].id,direction:"intro",readyAt:Date.now()}],false)');
assert(get('usageDetails').hidden);assert.equal(get('usageContent').innerHTML,'');run('home()');
assert(!run('usageHTML({usage:"<img src=x>",examples:[{zh:"<script>",pinyin:"<b>",meaning:"<svg>"}]})').includes('<img'));
get('search').value='亚历克斯';run('renderLibrary()');assert(get('libraryCount').textContent.startsWith('1 items'));assert(get('libraryList').innerHTML.includes('Usage & examples'));assert(get('libraryList').innerHTML.includes('get out of bed'));
get('search').value='';
// Confirm the disclosure is physically inside #answer, not merely hidden by the test DOM mock.
assert(html.indexOf('id="usageDetails"')>html.indexOf('id="answer"'));assert(html.indexOf('id="usageDetails"')<html.indexOf('id="ratings"'));
console.log('PASS context: 138 annotated cards / 174 examples, full-sentence links, hidden recall, closed disclosures on advance, empty-card cleanup, escaping, and example search.');

let promptCalls=0;run('show("install");renderInstall()');assert(get('requestInstall').hidden);assert(!get('installSteps').hidden);
windowEvents.beforeinstallprompt({preventDefault(){},prompt:async()=>{promptCalls++},userChoice:Promise.resolve({outcome:'dismissed'})});assert(!get('requestInstall').hidden);
(async()=>{await get('requestInstall').events.click();await get('requestInstall').events.click();assert.equal(promptCalls,1);assert(get('installStatus').textContent.includes('later'));windowEvents.appinstalled();assert(get('requestInstall').hidden);assert(get('installSteps').hidden);console.log('PASS new features: extra batches, old progress, category filters, distinct speech rates, speed diagnostics, and install prompt/fallback.');})().catch(e=>{console.error(e);process.exitCode=1});
// Copy works with and without clipboard access; translation keeps exactly the Chinese text.
(async()=>{
 const sample='还书？ A&B #1';const url=new URL(run('translateURL('+JSON.stringify(sample)+')'));
 assert.equal(url.origin,'https://translate.google.com');assert.equal(url.searchParams.get('text'),sample);assert.equal(url.searchParams.get('sl'),'zh-CN');assert.equal(url.searchParams.get('tl'),'en');
 let copied='';sandbox.navigator.clipboard={writeText:async text=>{copied=text}};await run('copyChinese(DECK[0])');assert.equal(copied,deck[0].zh);assert(get('copyFallback').hidden);
 let focused=false,selected=false;get('copyText').focus=()=>focused=true;get('copyText').select=()=>selected=true;get('copyFallback').scrollIntoView=()=>{};
 sandbox.navigator.clipboard.writeText=async()=>{throw Error('denied')};await run('copyChinese(DECK[1])');assert.equal(get('copyText').value,deck[1].zh);assert(!get('copyFallback').hidden);assert(focused&&selected);get('copyDone').click();assert(get('copyFallback').hidden);
 delete sandbox.navigator.clipboard;await run('copyChinese(DECK[2])');assert.equal(get('copyText').value,deck[2].zh);run('show("home")');assert(get('copyFallback').hidden);
 run('renderLibrary()');assert(get('libraryList').innerHTML.includes('data-copy='));assert(get('libraryList').innerHTML.includes('rel="noopener noreferrer"'));
 console.log('PASS reference tools: exact encoded Chinese, clipboard success/denial/unavailability, manual copy dismissal and phrasebook links.');
})().catch(e=>{console.error(e);process.exitCode=1});
