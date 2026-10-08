// Integration checks against the actual shipped scripts; the second course is test-only.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./source/engine.js'),html=fs.readFileSync(__dirname+'/index.html','utf8');
const registry=JSON.parse(html.match(/<script id="courses-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const original=registry.courses[0],sharedId=original.cards[0].id;
const second={id:'ru-he-test',label:'Русский → עברית',progressId:'test-ru-he-1',storageKey:'remember:progress:ru-he-test:v1',source:{name:'Russian',lang:'ru',dir:'ltr',translateCode:'ru'},target:{name:'Hebrew',textLabel:'Hebrew',lang:'he-IL',dir:'rtl',translateCode:'iw'},voiceLanguages:['he','he-IL'],testText:'אני כאן',pronunciationLabel:'Transliteration',cards:[{id:sharedId,text:'שלום',pronunciation:'shalom',meaning:'привет',category:'Test greetings',usage:'Test usage',examples:[{text:'שלום',pronunciation:'shalom',meaning:'привет'}]},{id:'no-reading',text:'כן',pronunciation:'',meaning:'да',category:'Test greetings'}]};
registry.courses.push(second);
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
function boot(storage=new Map()){
 const elements=new Map(),events={},spoken=[],media=[],downloads=[];let created;
 const get=id=>{if(!elements.has(id))elements.set(id,{value:'',hidden:false,innerHTML:'',textContent:'',dataset:{},events:{},addEventListener(type,fn){this.events[type]=fn},focus(){},select(){},scrollIntoView(){}});return elements.get(id)};
 get('courses-data').textContent=JSON.stringify(registry);
 const document={getElementById:get,querySelectorAll:()=>[],createElement:()=>({click(){downloads.push(this.download)}})};
 const speech={getVoices:()=>[{name:'Chinese',lang:'zh-CN'},{name:'Cantonese',lang:'zh-HK'},{name:'Hebrew',lang:'he-IL'}],addEventListener(){},resume(){},cancel(){},speak(u){spoken.push(u);u.onstart?.()}};
 const sandbox={document,console,URL:{createObjectURL(blob){created=blob;return 'blob:test'},revokeObjectURL(){}},Blob,Date,location:{protocol:'file:'},navigator:{},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},speechSynthesis:speech,SpeechSynthesisUtterance:function(text){this.text=text},Audio:function(url){media.push(url);this.play=()=>({catch(){}});this.pause=()=>{};this.removeAttribute=()=>{};this.load=()=>{}},setTimeout(){},clearTimeout(){},setInterval(){},scrollTo(){},addEventListener:(type,fn)=>events[type]=fn};
 sandbox.window=sandbox;const context=vm.createContext(sandbox),run=s=>vm.runInContext(s,context);scripts.forEach(run);
 return {get,run,storage,events,sandbox,spoken,media,downloads,blob:()=>created};
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
 assert.equal(a.get('copyTarget').textContent,'Copy Hebrew');assert.equal(a.get('appVersion').textContent,'2 cards · Русский → עברית · v1.5');
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
 const heSaved=storage.get(second.storageKey);
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
 console.log('PASS courses: legacy progress, colliding-ID isolation, statistics/settings/notes, course switching, RTL, voice/translation selection, helper guard, restart, per-course exports/imports, async import races, quota/corrupt storage, and cross-tab events.');
})().catch(error=>{console.error(error);process.exitCode=1});
