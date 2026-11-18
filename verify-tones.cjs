const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./source/engine.js'),T=require('./source/tones.js');
const html=fs.readFileSync(__dirname+'/index.html','utf8'),registry=JSON.parse(html.match(/<script id="courses-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const course=registry.courses.find(c=>c.id==='en-zh'),deck=course.cards,words=deck.filter(c=>!E.isSentence(c));
assert(course.toneReview);assert.equal(words.length,826);assert(words.every(c=>c.toneSyllables?.length));assert(deck.filter(E.isSentence).every(c=>!c.toneSyllables));
let seed=73;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
const positions=new Set();
for(const c of words){
 assert.equal(c.toneSyllables.join(''),c.pronunciation.replace(/[\s']/g,''));
 for(const s of c.toneSyllables){const tone=T.toneOf(s);if(tone!==null)assert.equal(T.mark(s,tone),s,c.text+': tone-mark placement')}
 for(let repeat=0;repeat<6;repeat++){
  const q=T.quiz(c.toneSyllables,random);assert.equal(q.choices.length,4);assert.equal(new Set(q.choices.map(c=>c.text)).size,4);
  assert.equal(q.choices.filter(c=>c.text===q.answer).length,1);
  for(const choice of q.choices)assert.equal(T.withoutTone(choice.text),T.withoutTone(q.answer),'Only tones may differ');
  positions.add(q.choices.findIndex(c=>c.text===q.answer));
 }
}
assert.equal(positions.size,4);assert.deepEqual(T.quiz(['mā','ma'],random).tones,[1,0]);
assert.equal(T.mark('nü',3),'nǚ');assert.equal(T.mark('lüe',4),'lüè');assert.equal(T.mark('shui',3),'shuǐ');assert.equal(T.mark('liu',2),'liú');assert.equal(T.mark('dou',4),'dòu');
assert.equal(T.mark('T',2),'T');assert.deepEqual(T.quiz(['T','xù'],random).tones,[null,4]);
assert.equal(T.quiz(['yí','huìr'],random).answer,'yí huìr');
const when=Date.now(),old=when-10*E.DAY,id=words[0].id;
const legacy=E.empty(course.progressId);delete legacy.toneProgress;E.introduce(legacy,id,old);
const raw=JSON.stringify(legacy),loaded=E.validate(JSON.parse(raw),deck,course.progressId);
assert.deepEqual(loaded.items,legacy.items);assert.deepEqual(loaded.toneProgress,{});assert.equal(JSON.stringify(legacy),raw);
assert(E.plan(loaded,when,deck).some(t=>t.direction==='tones'&&t.id===id),'Old known words need no reintroduction');
const itemsBefore=JSON.stringify(loaded.items);E.reviewTone(loaded,id,false,when);
assert.equal(loaded.toneProgress[id].lastGrade,0);assert.equal(loaded.toneProgress[id].due,when+E.MIN);assert.equal(JSON.stringify(loaded.items),itemsBefore);
const missed=JSON.stringify(loaded.toneProgress);E.review(loaded,id,'produce',3,when+1);assert.equal(JSON.stringify(loaded.toneProgress),missed,'Self-grading cannot clear a missed tone');
E.reviewTone(loaded,id,true,when+E.MIN);assert.equal(loaded.toneProgress[id].lastGrade,2);assert.equal(loaded.toneProgress[id].interval,1);
assert.deepEqual(E.validate(JSON.parse(JSON.stringify(loaded)),deck,course.progressId),loaded);
assert.equal(E.retention({logs:loaded.logs.filter(e=>e.direction==='tones')},when+E.MIN).total,0,'Tone choices are not delayed speaking/listening retention');
for(const badValue of [null,[],{unknown:loaded.toneProgress[id]},{[id]:{...loaded.toneProgress[id],due:-1}}])assert.throws(()=>E.validate({...loaded,toneProgress:badValue},deck,course.progressId));
assert.throws(()=>E.validate({...loaded,logs:[{...loaded.logs.at(-1),input:'spoken'}]},deck,course.progressId));
const fresh=E.empty(course.progressId);E.introduce(fresh,id,when);assert.equal(E.toneTasks(fresh,when+E.MIN,deck).length,0);assert.equal(E.toneTasks(fresh,when+10*E.MIN,deck).length,1);
const earlyItems=JSON.stringify(fresh.items);E.reviewTone(fresh,id,true,when+E.MIN);assert.deepEqual(fresh.toneProgress,{});assert.equal(fresh.logs.at(-1).practice,true);assert.equal(JSON.stringify(fresh.items),earlyItems);
const mixed=E.empty(course.progressId);for(const c of words.slice(0,40))E.introduce(mixed,c.id,old);mixed.settings.newLimit=0;
const plan=E.plan(mixed,when,deck);assert.equal(plan.length,20);assert.equal(new Set(plan.map(t=>t.id)).size,20);assert(plan.some(t=>t.direction==='tones'));assert(plan.some(t=>E.directions.includes(t.direction)));
const family=E.plan(mixed,when,deck,'Family');assert(family.every(t=>deck.find(c=>c.id===t.id).category==='Family'));
E.reviewTone(mixed,id,false,when);assert.equal(E.tonePlan(mixed,when+E.MIN,deck)[0].id,id,'Due missed tones should precede the untested backlog');
assert(E.plan(mixed,when+E.MIN,deck).some(t=>t.id===id&&t.direction==='tones'),'A due failed tone must not be displaced by ordinary recall of that word');
mixed.items[id].suspended=true;assert(!E.tonePlan(mixed,when,deck).some(t=>t.id===id));
assert(E.extraPlan(mixed,when,deck).every(t=>t.direction==='intro'));
function boot(storage=new Map()){
 const elements=new Map(),spoken=[],media=[];let now=when,blob;
 const get=id=>{if(!elements.has(id))elements.set(id,{textContent:'',value:'',hidden:false,innerHTML:'',dataset:{},events:{},addEventListener(n,f){this.events[n]=f}});return elements.get(id)};
 get('courses-data').textContent=JSON.stringify(registry);
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
 const box={Date:Clock,console,Blob,URL:{createObjectURL(b){blob=b;return 'blob:test'},revokeObjectURL(){}},document:{getElementById:get,querySelectorAll:()=>[],createElement:()=>({click(){}})},location:{protocol:'file:'},navigator:{},
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},setTimeout(){},clearTimeout(){},setInterval(){},scrollTo(){},addEventListener(){},
  speechSynthesis:{getVoices:()=>[{name:'Chinese',lang:'zh-CN'}],addEventListener(){},cancel(){},resume(){},speak(u){spoken.push(u);u.onstart?.()}},SpeechSynthesisUtterance:function(text){this.text=text},Audio:function(url){media.push(url)}};
 box.window=box;const ctx=vm.createContext(box),run=s=>vm.runInContext(s,ctx);for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g))run(script[1]);
 return {run,get,storage,spoken,media,box,blob:()=>blob,tick:()=>now+=2*E.MIN,clickChoice(index){get('toneChoices').events.click({target:{closest:()=>({dataset:{toneChoice:String(index)}})}})}};
}
(async()=>{
 const storage=new Map([['remember:active-course:v1','en-zh'],[course.storageKey,raw]]),ui=boot(storage);
 assert.equal(storage.get(course.storageKey),raw,'Startup must not rewrite old progress');assert.equal(ui.get('tonePracticeBtn').hidden,false);assert.equal(ui.get('tonePracticeBtn').disabled,false);
 ui.get('tonePracticeBtn').events.click();assert.equal(ui.run('current.direction'),'tones');assert.equal(ui.get('toneTask').hidden,false);
 assert(ui.get('answer').hidden);assert(ui.get('revealBtn').hidden);assert(ui.get('helpTools').hidden);assert(ui.get('listenTools').hidden);assert(ui.get('readingPrompt').hidden);
 assert.equal((ui.get('toneChoices').innerHTML.match(/data-tone-choice=/g)||[]).length,4);assert(!ui.get('toneChoices').innerHTML.includes(' correct'));
 assert.equal(ui.spoken.length,0);assert.equal(ui.media.length,0);
 ui.run('help("pinyin");reveal();rate(3)');assert.equal(ui.run('revealed'),false);assert.equal(ui.run('state.logs.length'),0);
 const before=ui.run('JSON.stringify(state.items)'),wrong=ui.run('activeToneQuestion.choices.findIndex(c=>c.text!==activeToneQuestion.answer)');ui.clickChoice(wrong);
 assert.equal(ui.run('state.logs.at(-1).grade'),0);assert.equal(ui.run('state.logs.at(-1).input'),'tone-choice');assert.equal(ui.run('JSON.stringify(state.items)'),before);
 assert(!ui.get('answer').hidden);assert(ui.get('ratings').hidden);assert(ui.get('toneFeedback').textContent.includes('Not quite'));assert(ui.get('toneChoices').innerHTML.includes(' incorrect'));
 ui.clickChoice(ui.run('activeToneQuestion.choices.findIndex(c=>c.text===activeToneQuestion.answer)'));ui.run('rate(3)');assert.equal(ui.run('state.logs.length'),1,'Repeated taps and self-rating cannot override the result');
 assert(ui.run('session.queue.some(t=>t.direction==="tones"&&t.afterAttempts===3)'));
 ui.run('advance()');assert.equal(ui.run('current'),null);ui.tick();ui.run('advance()');assert.equal(ui.run('current.direction'),'tones');
 ui.clickChoice(ui.run('activeToneQuestion.choices.findIndex(c=>c.text===activeToneQuestion.answer)'));assert.equal(ui.run('state.toneProgress[current.id].lastGrade'),2);assert.equal(ui.run('JSON.stringify(state.items)'),before);
 ui.run('home();exportBackup()');const backup=JSON.parse(await ui.blob().text());assert.deepEqual(E.validate(backup,deck,course.progressId),backup);
 ui.box.toneBackup={size:100,text:async()=>JSON.stringify(backup)};await ui.run('readImport(toneBackup)');ui.run('confirmImport()');assert.deepEqual(JSON.parse(ui.run('JSON.stringify(state)')),backup);
 const restart=boot(storage);assert.equal(restart.run('state.toneProgress[DECK[0].id].lastGrade'),2);assert.equal(restart.run('JSON.stringify(state.items)'),before);
 const bounded=boot(new Map([['remember:active-course:v1','en-zh'],[course.storageKey,raw]]));bounded.run('startTones()');
 for(let i=0;i<3;i++){
  bounded.clickChoice(bounded.run('activeToneQuestion.choices.findIndex(c=>c.text!==activeToneQuestion.answer)'));bounded.run('advance()');
  if(i<2){assert.equal(bounded.run('current'),null);bounded.tick();bounded.run('advance()')}
 }
 assert.equal(bounded.run('session'),null);assert.equal(bounded.run('state.logs.length'),3,'Tone retries must be bounded');
 const session=boot();session.run('for(const c of DECK.filter(c=>c.toneSyllables).slice(0,40))E.introduce(state,c.id,Date.now()-10*E.DAY);state.settings.newLimit=0;start()');
 let toneCount=0,wordCount=0;
 for(let i=0;i<25&&session.run('!!current');i++){
  if(session.run('current.direction')==='tones'){toneCount++;session.clickChoice(session.run('activeToneQuestion.choices.findIndex(c=>c.text===activeToneQuestion.answer)'))}
  else{wordCount++;assert(session.run('!current.sentence||!current.words.some(id=>session.queue.some(t=>t.direction==="tones"&&t.id===id))'),'Sentence answers must not disclose upcoming tone quiz words');session.run('readInstead();reveal();rate(2)')}
  session.run('advance()');
 }
 assert(toneCount>0&&wordCount>0);assert.equal(session.run('session'),null);
 for(const id of ['en-ja-japanese','en-zh-reading','en-ar-palestinian','en-ar-reading']){
  const other=boot(new Map([['remember:active-course:v1',id]]));assert(other.get('tonePracticeBtn').hidden);other.run('startTones()');assert.equal(other.run('session'),null);
 }
 console.log('PASS tones: 826 word readings, four unique tone-only choices, shuffled answers, ü/neutral/erhua, legacy progress, independent scheduling, mixed/topic/paused plans, hidden clues, automatic grading, bounded retries, backups/restart and other-course isolation.');
})().catch(error=>{console.error(error);process.exitCode=1});
