// Shipped-course parity checks plus a test-only course with colliding card IDs.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./source/engine.js'),html=fs.readFileSync(__dirname+'/index.html','utf8');
const registry=JSON.parse(html.match(/<script id="courses-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const original=registry.courses[0],sharedId=original.cards[0].id;
const second={id:'ru-he-test',label:'Русский → עברית',progressId:'test-ru-he-1',storageKey:'remember:progress:ru-he-test:v1',source:{name:'Russian',lang:'ru',dir:'ltr',translateCode:'ru'},target:{name:'Hebrew',textLabel:'Hebrew',lang:'he-IL',dir:'rtl',translateCode:'iw'},voiceLanguages:['he','he-IL'],testText:'אני כאן',pronunciationLabel:'Transliteration',cards:[{id:sharedId,text:'שלום',pronunciation:'shalom',meaning:'привет',category:'Test greetings',usage:'Test usage',examples:[{text:'שלום',pronunciation:'shalom',meaning:'привет'}]},{id:'no-reading',text:'כן',pronunciation:'',meaning:'да',category:'Test greetings'}]};
registry.courses.push(second);
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
function boot(storage=new Map()){
 const elements=new Map(),events={},spoken=[],media=[],audioObjects=[],timers=new Map(),downloads=[];let created;
 const get=id=>{if(!elements.has(id))elements.set(id,{value:'',hidden:false,innerHTML:'',textContent:'',dataset:{},events:{},addEventListener(type,fn){this.events[type]=fn},focus(){},select(){},scrollIntoView(){}});return elements.get(id)};
 get('courses-data').textContent=JSON.stringify(registry);
 const document={getElementById:get,querySelectorAll:()=>[],createElement:()=>({click(){downloads.push(this.download)}})};
 const speech={getVoices:()=>[{name:'Chinese',lang:'zh-CN'},{name:'Cantonese',lang:'zh-HK'},{name:'Japanese',lang:'ja-JP'},{name:'Hebrew',lang:'he-IL'}],addEventListener(){},resume(){},cancel(){},speak(u){spoken.push(u);u.onstart?.()}};
 const sandbox={document,console,URL:{createObjectURL(blob){created=blob;return 'blob:test'},revokeObjectURL(){}},Blob,Date,location:{protocol:'file:'},navigator:{},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},speechSynthesis:speech,SpeechSynthesisUtterance:function(text){this.text=text},Audio:function(url){media.push(url);audioObjects.push(this);this.play=()=>({catch(){}});this.pause=()=>{};this.removeAttribute=()=>{};this.load=()=>{}},setTimeout(fn){const id=Symbol();timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)},setInterval(){},scrollTo(){},addEventListener:(type,fn)=>events[type]=fn};
 sandbox.window=sandbox;const context=vm.createContext(sandbox),run=s=>vm.runInContext(s,context);scripts.forEach(run);
 return {get,run,storage,events,sandbox,spoken,media,audioObjects,timers,downloads,blob:()=>created};
}
(async()=>{
 // Simulate a real v1.4 backup, including both-direction schedules and personal settings.
 const legacy=E.empty(original.progressId),when=Date.now()-3*E.DAY;
 E.introduce(legacy,sharedId,when);E.review(legacy,sharedId,'produce',2,when+E.MIN);
 legacy.items[sharedId].note='My original memory cue';legacy.settings.voice='Chinese';legacy.settings.newLimit=8;
 const storage=new Map([[original.storageKey,JSON.stringify(legacy)]]),a=boot(storage);
 assert.deepEqual(JSON.parse(a.run('JSON.stringify(state)')),legacy,'Existing key must load without migration or loss');
 assert.deepEqual(JSON.parse(storage.get(original.storageKey)),legacy,'Startup must not rewrite old progress');
 assert.equal(a.run('KEY'),original.storageKey);
 assert.equal(a.get('courseSelect').value,'en-zh');
 a.run('start();play(DECK[0])');const lateSpeech=a.spoken.at(-1);assert(a.run('session'));
 assert(a.run('switchCourse("ru-he-test")'));assert.equal(a.run('session'),null);assert.equal(a.run('current'),null);
 assert.equal(a.run('Object.keys(state.items).length'),0);assert.equal(a.run('state.settings.newLimit'),5);assert.equal(a.get('startedCount').textContent,0);
 assert.equal(a.get('targetText').dir,'rtl');assert.equal(a.get('targetText').lang,'he-IL');assert.equal(a.get('meaning').lang,'ru');
 assert.equal(a.get('copyTarget').textContent,'Copy Hebrew');assert.equal(a.get('appVersion').textContent,'2 cards · Русский → עברית · v1.6.12');
 assert(a.get('category').innerHTML.includes('Test greetings'));assert(!a.get('category').innerHTML.includes('Family'));
 a.run('startExtra();studied();state.items[current.id].note="Hebrew cue";state.settings.voice="Hebrew";state.settings.newLimit=3;save()');
 assert.equal(a.run('state.deckId'),second.progressId);assert.equal(a.run('state.items[DECK[0].id].note'),'Hebrew cue');
 assert.deepEqual(JSON.parse(storage.get(original.storageKey)),legacy,'Studying a colliding ID must not modify Mandarin');
 a.run('audioSettings();play(DECK[0])');assert.equal(a.spoken.at(-1).voice.name,'Hebrew');assert.equal(a.spoken.at(-1).text,'שלום');
 a.get('audioStatus').textContent='unchanged';lateSpeech.onstart();assert.equal(a.get('audioStatus').textContent,'unchanged','Cancelled Mandarin callbacks must be ignored');
 assert.deepEqual(Array.from(a.run('voices().map(v=>v.lang)')),['he-IL']);
 const link=new URL(a.run('translateURL(DECK[0].text)'));assert.equal(link.searchParams.get('sl'),'iw');assert.equal(link.searchParams.get('tl'),'ru');
 a.run('renderLibrary()');assert(a.get('libraryList').innerHTML.includes('dir="rtl"'));assert(a.get('libraryList').innerHTML.includes('lang="ru"'));
 a.sandbox.ONLINE_VOICE_ENABLED=true;a.run('state.settings.audioMode="online";play(DECK[0])');assert.equal(a.media.length,0);assert(a.get('audioStatus').textContent.includes('not available for this course'));
 a.run('state.settings.audioMode="device";save();exportBackup()');const exported=JSON.parse(await a.blob().text());assert.equal(exported.deckId,second.progressId);assert(a.downloads[0].startsWith('remember-ru-he-test-'));
 // Reject a backup from another language even when every card ID also exists here.
 a.sandbox.wrongFile={size:100,text:async()=>JSON.stringify(legacy)};await a.run('readImport(wrongFile)');assert.equal(a.run('importCandidate'),null);assert(a.get('notice').textContent.includes('compatible backup for this course'));
 assert(a.run('switchCourse("en-zh")'));assert.deepEqual(JSON.parse(a.run('JSON.stringify(state)')),legacy);assert.equal(a.get('targetText').dir,'ltr');assert.equal(a.get('startedCount').textContent,1);
 assert(a.run('switchCourse("ru-he-test")'));assert.equal(a.run('state.items[DECK[0].id].note'),'Hebrew cue');assert.equal(a.run('state.settings.newLimit'),3);
 // Switching is blocked on a save failure instead of silently losing in-memory work.
 const setItem=a.sandbox.localStorage.setItem;a.sandbox.localStorage.setItem=()=>{throw Error('quota')};assert.equal(a.run('switchCourse("en-zh")'),false);assert.equal(a.run('course.id'),'ru-he-test');assert.equal(a.get('courseSelect').value,'ru-he-test');a.sandbox.localStorage.setItem=setItem;
 // Import in flight must not appear after a course change (including away and back).
 let resolveFile;a.sandbox.slowFile={size:100,text:()=>new Promise(resolve=>resolveFile=resolve)};
 const pending=a.run('readImport(slowFile)');a.run('switchCourse("en-zh");switchCourse("ru-he-test")');resolveFile(JSON.stringify(exported));await pending;assert.equal(a.run('importCandidate'),null);assert(a.get('importPreview').hidden);
 a.sandbox.goodFile={size:100,text:async()=>JSON.stringify(exported)};await a.run('readImport(goodFile)');assert(!a.get('importPreview').hidden);a.run('confirmImport()');assert.deepEqual(JSON.parse(storage.get(original.storageKey)),legacy);assert(storage.has(second.storageKey+':before-import'));
 const restarted=boot(storage);assert.equal(restarted.run('course.id'),'ru-he-test');assert.equal(restarted.run('state.items[DECK[0].id].note'),'Hebrew cue');
 restarted.run('home();beginSession([{id:"no-reading",direction:"intro",readyAt:Date.now()}],false)');assert(restarted.get('pronunciation').hidden);assert(restarted.get('hintBtn').hidden);
 // Other-course storage changes do not stop the current lesson; active-course changes do.
 restarted.events.storage({key:original.storageKey});assert(restarted.run('session'));restarted.events.storage({key:second.storageKey});assert.equal(restarted.run('session'),null);
 storage.set(second.storageKey,'{corrupt');const corrupt=boot(storage);assert(corrupt.run('storageLocked'));corrupt.run('save()');assert.equal(storage.get(second.storageKey),'{corrupt');assert.deepEqual(JSON.parse(storage.get(original.storageKey)),legacy);
 storage.set('remember:active-course:v1','removed-course');assert.equal(boot(storage).run('course.id'),'en-zh');
 assert.throws(()=>E.empty());assert.throws(()=>E.validate(legacy,original.cards,second.progressId));

 // Exercise the identical public feature paths with each actual course.
 const published=registry.courses.filter(c=>c.id!=='ru-he-test');assert.equal(published.length,2);
 const japanese=published.find(c=>c.id==='en-ja-japanese');assert(japanese);
 assert.equal(japanese.cards.length,60);assert.equal(new Set(japanese.cards.map(c=>c.id)).size,60);
 assert.deepEqual(japanese.cards,JSON.parse(fs.readFileSync(__dirname+'/decks/en-ja-japanese.json','utf8')));
 assert.equal(new Set(japanese.cards.map(c=>c.category)).size,7);
 assert(japanese.cards.filter(c=>c.usage).length>=3);
 for(const c of japanese.cards){
  for(const key of ['id','text','pronunciation','meaning','category'])assert(typeof c[key]==='string'&&c[key].trim());
  assert(/[\u3040-\u30ff\u3400-\u9fff]/u.test(c.text));
  if(c.examples){assert(c.usage);assert(c.examples.length<=2);for(const example of c.examples)for(const key of ['text','pronunciation','meaning'])assert(example[key]?.trim());}
 }
 for(const target of published){
  const t=boot();t.run('switchCourse('+JSON.stringify(target.id)+')');
  assert.equal(t.run('course.id'),target.id);assert.equal(t.get('targetText').dir,target.target.dir);
  assert.equal(t.get('startedCount').textContent,0);
  t.run('start()');assert.equal(t.run('current.direction'),'intro');assert(!t.get('answer').hidden);const firstId=t.run('current.id');
  assert.equal(t.get('pronunciation').textContent,t.run('byId.get('+JSON.stringify(firstId)+').pronunciation'));
  t.run('studied();home();state.settings.newLimit=0;startExtra()');
  for(let i=0;i<5;i++){assert.equal(t.run('current.direction'),'intro');t.run('studied();advance()')}
  assert.equal(t.run('Object.keys(state.items).length'),6);t.run('home()');
  assert.equal(t.get('startedCount').textContent,6);
  t.run('state.items['+JSON.stringify(firstId)+'].produce.due=Date.now()-1;start()');
  assert.equal(t.run('current.direction'),'produce');assert(t.get('answer').hidden);
  t.run('help("pronunciation");reveal();rate(3)');assert.equal(t.run('state.logs.at(-1).grade'),0);
  t.run('home();state.items['+JSON.stringify(firstId)+'].produce.due=Date.now()+E.DAY;state.items['+JSON.stringify(firstId)+'].understand.due=Date.now()-1;start();reveal()');
  assert.equal(t.run('current.direction'),'understand');assert.equal(t.run('revealed'),false);
  t.run('readInstead();reveal();rate(2)');assert.equal(t.run('state.logs.at(-1).input'),'reading');
  t.run('home();state.items['+JSON.stringify(firstId)+'].understand.due=Date.now()-1;start();play(byId.get(current.id),false,true);reveal()');
  assert.equal(t.run('heard'),true);assert.equal(t.run('revealed'),true);
  t.run('rate(2)');assert.equal(t.run('state.logs.at(-1).input'),'listening');
  t.run('home();start(true)');assert(t.run('current.practice'));const pausedId=t.run('current.id');
  t.get('memoryCue').value='My course-specific cue';t.run('saveCue();pauseCurrent();home()');
  assert.equal(t.run('state.items['+JSON.stringify(pausedId)+'].suspended'),true);
  assert.equal(t.run('state.items['+JSON.stringify(pausedId)+'].note'),'My course-specific cue');
  assert(!t.run('E.plan(state,Date.now(),DECK,"",true).some(t=>t.id==='+JSON.stringify(pausedId)+')'));
  const categoryCard=[...target.cards].reverse().find(c=>!E.isSentence(c));t.get('category').value=categoryCard.category;t.run('startExtra()');
  assert.equal(t.run('byId.get(current.id).category'),categoryCard.category);
  t.run('home();audioSettings();play(DECK[0]);play(DECK[0],true)');
  assert.equal(t.spoken.at(-2).rate,1);assert.equal(t.spoken.at(-1).rate,.4);
  assert.equal(t.spoken.at(-1).text,target.cards[0].text);
  const annotated=target.cards.find(c=>c.examples?.length);assert(annotated?.usage&&annotated.examples[0].pronunciation);
  let copied;t.sandbox.navigator.clipboard={writeText:async text=>copied=text};await t.run('copyTarget(DECK[0])');assert.equal(copied,target.cards[0].text);
  const url=new URL(t.run('translateURL(DECK[0].text)'));assert.equal(url.searchParams.get('sl'),target.target.translateCode);assert.equal(url.searchParams.get('text'),copied);
  t.run('home();save();exportBackup()');const backup=JSON.parse(await t.blob().text());assert.equal(backup.deckId,target.progressId);
  t.sandbox.backupFile={size:100,text:async()=>JSON.stringify(backup)};await t.run('readImport(backupFile)');t.run('confirmImport()');
  assert.deepEqual(JSON.parse(t.run('JSON.stringify(state)')),backup);
  assert.equal(boot(t.storage).run('course.id'),target.id);
 }
 const sentence=japanese.cards.find(c=>c.id==='ja-sentence-drink-water'),parts=E.sentenceParts(sentence,japanese.cards);
 assert.deepEqual(parts.words,['ja-i','ja-water','ja-drink']);assert.equal(parts.matches.find(m=>m.id==='ja-drink').text,'飲みます');assert.equal(parts.matches.find(m=>m.id==='ja-drink').form.label,'polite non-past form');
 assert(parts.connectors.some(c=>c.text==='は')&&parts.connectors.some(c=>c.text==='を'));
 const allJapaneseSentences=japanese.cards.filter(E.isSentence);assert.equal(allJapaneseSentences.length,15);assert(allJapaneseSentences.every(c=>E.sentenceParts(c,japanese.cards)),'Every Japanese sentence must have a complete validated composition');
 const known=E.empty(japanese.progressId);for(const id of parts.words)E.introduce(known,id,Date.now()-E.DAY);const planned=E.sentencePlan(known,Date.now(),japanese.cards,'',5).find(t=>t.id===sentence.id);assert(planned);assert(planned.frame.includes('___'));assert.equal(planned.matches.find(m=>m.id==='ja-drink').text,'飲みます');
 console.log('PASS published parity: Mandarin and 60 Japanese cards, isolated course state, audio/rates, examples, hints, categories, backups, and full sentence-component validation.');

 // Exercise the actual bundled playback paths for every Japanese word and sentence.
 const ja=boot();ja.run('switchCourse("en-ja-japanese")');
 assert.equal(japanese.cards.find(c=>c.id==='ja-i').speechText,'わたし');
 assert.equal(japanese.cards.find(c=>c.id==='ja-home').speechText,'いえ');
 assert.equal(japanese.cards.find(c=>c.id==='ja-tomorrow').speechText,'あした');
 assert.equal(japanese.cards.find(c=>c.id==='ja-come').speechText,'くる');
 const unchangedState=ja.run('JSON.stringify(state)');
 for(const card of japanese.cards){
  const expected=card.speechText||card.text;
  assert(!/[\u3400-\u9fff]/u.test(expected),card.id+': speech must specify the kana reading');
  for(const example of card.examples||[])assert(!/[\u3400-\u9fff]/u.test(example.speechText||example.text));
  for(const slow of [false,true]){
   ja.run('state.settings.audioMode="device";play(byId.get('+JSON.stringify(card.id)+'),'+slow+')');
   assert.equal(ja.spoken.at(-1).text,expected);assert.equal(ja.spoken.at(-1).lang,'ja-JP');
   assert.equal(ja.spoken.at(-1).rate,slow?.4:1);
   ja.run('state.settings.audioMode="online";play(byId.get('+JSON.stringify(card.id)+'),'+slow+')');
   const request=new URL(ja.media.at(-1));assert.equal(request.searchParams.get('q'),expected);assert.equal(request.searchParams.get('tl'),'ja');
   assert.equal(ja.audioObjects.at(-1).playbackRate,slow?.65:1);
  }
 }
 ja.run('state.settings.audioMode="auto";play(byId.get("ja-i"))');ja.spoken.at(-1).onerror({error:'language-unavailable'});
 assert.equal(new URL(ja.media.at(-1)).searchParams.get('q'),'わたし','Device failure must keep the explicit reading');
 ja.audioObjects.at(-1).onerror();assert.equal(new URL(ja.get('audioFallback').href).searchParams.get('text'),'わたし');
 ja.sandbox.speechSynthesis.getVoices=()=>[];ja.run('play(byId.get("ja-i"),true)');
 assert.equal(new URL(ja.media.at(-1)).searchParams.get('q'),'わたし','Missing device voice must keep the explicit reading');
 let copiedJapanese;ja.sandbox.navigator.clipboard={writeText:async text=>copiedJapanese=text};await ja.run('copyTarget(byId.get("ja-i"))');
 assert.equal(copiedJapanese,'私');assert.equal(new URL(ja.run('translateURL(byId.get("ja-i").text)')).searchParams.get('text'),'私');
 ja.run('state.settings.audioMode="auto"');assert.equal(ja.run('JSON.stringify(state)'),unchangedState,'Playback must not change progress');
 console.log('PASS Japanese readings: all 60 cards, normal/slow device and Google inputs, fallback, no-voice recovery, canonical copy/translation and unchanged progress.');

 // Regress the real Linux failure: zero installed voices, not a mock course voice.
 for(const target of published){
  const t=boot();t.run('switchCourse('+JSON.stringify(target.id)+')');t.sandbox.speechSynthesis.getVoices=()=>[];
  assert.equal(t.media.length,0,'No phrase should be sent on startup or course selection');
  t.run('beginSession([{id:DECK[0].id,direction:"understand",readyAt:Date.now()}],false);play(DECK[0],false,true)');
  const request=new URL(t.media.at(-1));assert.equal(request.origin,'https://translate.googleapis.com');assert.equal(request.searchParams.get('tl'),target.onlineSpeech.language);assert.equal(request.searchParams.get('q'),target.cards[0].text);
  assert.equal(t.run('heard'),false,'Creating/loading audio must not unlock the listening answer');
  t.audioObjects.at(-1).onplaying();assert.equal(t.run('heard'),true);assert.equal(t.audioObjects.at(-1).playbackRate,1);
  t.run('play(DECK[0],true)');assert.equal(t.audioObjects.at(-1).playbackRate,.65);assert.equal(t.audioObjects.at(-1).preservesPitch,true);
  const cancelled=t.audioObjects.at(-1);t.run('stopAudio()');t.get('audioStatus').textContent='unchanged';cancelled.onplaying();assert.equal(t.get('audioStatus').textContent,'unchanged');
  t.run('play(DECK[0])');const failed=t.audioObjects.at(-1);failed.onerror();const failure=t.get('audioStatus').textContent;assert(failure.includes('could not load'));assert(!t.get('audioFallback').hidden);failed.onplaying();assert.equal(t.get('audioStatus').textContent,failure);
  assert.equal(new URL(t.get('audioFallback').href).searchParams.get('text'),target.cards[0].text);
  t.run('play(DECK[0])');assert(t.get('audioFallback').hidden);[...t.timers.values()].forEach(fn=>fn());assert(t.get('audioStatus').textContent.includes('timed out'));
  t.sandbox.speechSynthesis.getVoices=()=>[{name:'Broken voice',lang:target.target.lang}];
  const count=t.media.length;t.run('play(DECK[0])');assert.equal(t.media.length,count);t.spoken.at(-1).onerror({error:'language-unavailable'});assert.equal(t.media.length,count+1,'Automatic must recover from a listed but broken voice');
  t.run('state.settings.audioMode="online";play(DECK[0])');assert.equal(t.media.length,count+2,'Explicit Online must work even when a device voice exists');
  t.run('state.settings.audioMode="device";play(DECK[0])');t.spoken.at(-1).onerror({error:'language-unavailable'});assert.equal(t.media.length,count+2,'Device-only preference must be respected');
 }
 assert(html.includes('<meta name="referrer" content="no-referrer">'),'Cross-origin speech requests must not send the page referrer');
 assert(published.every(c=>c.cards.every(card=>card.text.length<=200)&&c.testText.length<=200));
 console.log('PASS online fallback: zero installed voices in both courses, exact phrase/locale, no eager requests, normal/slow rates, actual-playback gate, error/timeout recovery, cancellation, explicit source preferences and Translate escape hatch.');
 console.log('PASS courses: legacy progress, colliding-ID isolation, statistics/settings/notes, course switching, RTL, voice/translation selection, helper guard, restart, per-course exports/imports, async import races, quota/corrupt storage, and cross-tab events.');
})().catch(error=>{console.error(error);process.exitCode=1});
