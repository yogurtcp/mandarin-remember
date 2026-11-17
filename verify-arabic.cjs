// Arabic reading: real bundled lesson flow, dependency gates, search and progress.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),E=require('./source/engine.js');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const registry=JSON.parse(html.match(/<script id="courses-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const vocabulary=registry.courses.find(c=>c.id==='en-ar-palestinian'),guide=registry.courses.find(c=>c.id==='en-ar-reading');
assert.equal(vocabulary.cards.length,350);assert.equal(guide.cards.length,64);
assert.equal(vocabulary.characterCourse,guide.id);assert.equal(guide.characterCourse,vocabulary.id);
assert.notEqual(vocabulary.storageKey,guide.storageKey);assert.equal(guide.readingScript,'arabic');
const base=guide.cards.filter(c=>['letter','mark'].includes(c.kind)),practice=guide.cards.filter(c=>c.requires?.length);
assert.equal(base.length,40);assert.equal(practice.length,24);
assert.equal(guide.cards.filter(c=>c.kind==='letter').length,34);
assert.equal(guide.cards.filter(c=>c.kind==='mark').length,6);
assert(guide.cards.every(c=>c.readingOnly&&!E.isSentence(c)));
for(const c of practice){
 const parts=c.requires.map(id=>base.find(b=>b.id===id));assert(parts.every(Boolean));
 assert.deepEqual(new Set(parts.map(p=>p.text.replace('◌',''))),new Set([...c.text]));
}
// These readings distinguish local vowels and male/female addressees.
for(const [reading,text] of [['marḥaba','مَرْحَبَا'],['biddi','بِدِّي'],['biddak?','بِدَّك؟'],['biddik?','بِدِّك؟'],['ʿindak?','عِنْدَك؟'],['ʿindik?','عِنْدِك؟'],['ʾahwe','قَهْوِة'],['ṣḥīt','صْحِيت'],['mayy','مَيّ'],['mʿallme','مْعَلّمِة']]){
 assert.equal(vocabulary.cards.find(c=>c.pronunciation===reading)?.text,text,reading);
}
for(const c of vocabulary.cards){
 assert(/[\u064b-\u0652\u0670آ]/u.test(c.text),'Missing reading marks: '+c.id);
 for(const e of c.examples||[])assert(/[\u064b-\u0652\u0670آ]/u.test(e.text));
}
function boot(storage=new Map()){
 const elements=new Map(),spoken=[],downloads=[];
 const get=id=>{if(!elements.has(id))elements.set(id,{textContent:'',value:'',hidden:false,innerHTML:'',dataset:{},addEventListener(){}});return elements.get(id)};
 get('courses-data').textContent=JSON.stringify(registry);let now=Date.now(),blob;
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
 const box={document:{getElementById:get,querySelectorAll:()=>[],createElement:()=>({click(){downloads.push(this.download)}})},Date:Clock,console,Blob,
  URL:{createObjectURL(b){blob=b;return 'blob:test'},revokeObjectURL(){}},location:{protocol:'file:'},navigator:{},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout(){},clearTimeout(){},setInterval(){},scrollTo(){},addEventListener(){},
  speechSynthesis:{getVoices:()=>[{name:'Arabic',lang:'ar-JO'}],addEventListener(){},cancel(){},resume(){},speak(u){spoken.push(u);u.onstart?.()}},SpeechSynthesisUtterance:function(text){this.text=text}};
 box.window=box;const ctx=vm.createContext(box),run=code=>vm.runInContext(code,ctx);
 for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g))run(script[1]);
 return {run,get,storage,spoken,box,blob:()=>blob,tick:()=>now+=120000};
}
(async()=>{
 const old=E.empty(vocabulary.progressId),when=Date.now()-E.DAY;
 E.introduce(old,vocabulary.cards[0].id,when);old.items[vocabulary.cards[0].id].note='My old Arabic cue';
 const storage=new Map([['remember:active-course:v1',vocabulary.id],[vocabulary.storageKey,JSON.stringify(old)]]),ui=boot(storage);
 assert.equal(ui.run('state.items[DECK[0].id].note'),'My old Arabic cue');
 assert.equal(ui.get('characterTrackBtn').hidden,false);assert(ui.get('characterTrackBtn').textContent.includes('Arabic letters'));
 ui.run('switchCourse("en-ar-reading")');assert(ui.get('readingTrackNote').textContent.includes('0 / 40'));
 assert.equal(ui.get('libraryBtn').textContent,'Letter guide');assert.equal(ui.get('libraryHeading').textContent,'Arabic letter guide');
 assert.equal(ui.run('Object.keys(state.items).length'),0);
 const empty=E.empty(guide.progressId);assert(E.extraPlan(empty,Date.now(),guide.cards).every(t=>base.some(c=>c.id===t.id)));
 ui.run('startExtra()');
 for(let i=0;i<5;i++){assert.equal(ui.run('current.direction'),'intro');assert(ui.get('draftLabel').hidden);ui.run('studied();advance()')}
 ui.tick();ui.run('advance()');
 for(let i=0;i<5;i++){
  assert.equal(ui.run('current.direction'),'understand');assert.equal(ui.run('inputMode'),'reading');
  assert(ui.get('answer').hidden);assert(ui.get('readingPrompt').hidden,'No Latin reading may leak into recognition prompts');
  assert(ui.get('listenTools').hidden);assert(ui.get('draftLabel').hidden);
  assert.equal(ui.get('prompt').textContent,ui.run('byId.get(current.id).text'));assert.equal(ui.get('prompt').dir,'rtl');assert.equal(ui.get('prompt').lang,'ar-PS');
  ui.run('reveal();rate(2);advance()');
 }
 assert.equal(ui.spoken.length,0);assert.equal(ui.run('session'),null);
 assert(ui.run('state.logs.every(e=>e.direction==="understand"&&e.input==="reading")'));
 ui.run('home();startExtra()');assert.equal(ui.run('byId.get(current.id).kind'),'syllable');
 assert(ui.get('characterBreakdown').innerHTML.includes('Letters and marks you know'));
 assert(ui.run('byId.get(current.id).requires.every(id=>state.items[id].understand.lastGrade>0)'));
 assert.equal(ui.get('prompt').dir,'ltr','A new-card heading resets to the source language');
 ui.run('home();beginSession([{id:"ar-read-ba",direction:"understand",readyAt:Date.now()}],false);reveal()');
 assert(ui.get('characterBreakdown').innerHTML.includes('Beginning'));assert(ui.get('characterBreakdown').innerHTML.includes('ـبـ'));
 assert.equal(ui.get('answerAudio').textContent,'▶ Compare name audio');ui.run('play(byId.get(current.id))');assert.equal(ui.spoken.at(-1).text,'بَاء');
 ui.run('home();state.settings.newLimit=0;save();exportBackup()');
 const backup=JSON.parse(await ui.blob().text());assert.equal(backup.deckId,guide.progressId);assert.deepEqual(E.validate(backup,guide.cards,guide.progressId),backup);
 ui.box.backupFile={size:100,text:async()=>JSON.stringify(backup)};await ui.run('readImport(backupFile)');ui.run('confirmImport()');
 assert.deepEqual(JSON.parse(ui.run('JSON.stringify(state)')),backup);
 const restarted=boot(storage);assert.equal(restarted.run('course.id'),guide.id);assert.equal(restarted.run('Object.keys(state.items).length'),5);
 assert.deepEqual(JSON.parse(storage.get(vocabulary.storageKey)),old);
 const bab=guide.cards.find(c=>c.text==='بَاب'),gate=E.empty(guide.progressId);
 for(const id of bab.requires)E.introduce(gate,id,when,true);
 assert(!E.extraPlan(gate,Date.now(),guide.cards).some(t=>t.id===bab.id));
 for(const id of bab.requires)E.review(gate,id,'understand',2,Date.now(),{force:true,input:'reading'});
 assert(E.extraPlan(gate,Date.now(),guide.cards).some(t=>t.id===bab.id));
 gate.items[bab.requires[0]].suspended=true;assert(!E.extraPlan(gate,Date.now(),guide.cards).some(t=>t.id===bab.id));
 ui.run('home();switchCourse("en-ar-palestinian");show("library")');
 ui.get('search').value='مرحبا';ui.run('renderLibrary()');assert(ui.get('libraryList').innerHTML.includes('مَرْحَبَا'));
 ui.get('search').value='مَرْحَبَا';ui.run('renderLibrary()');assert(ui.get('libraryList').innerHTML.includes('مَرْحَبَا'));
 let copied;ui.box.navigator.clipboard={writeText:async text=>copied=text};await ui.run('copyTarget(DECK[0])');assert.equal(copied,'مَرْحَبَا');
 ui.run('play(DECK[0])');assert.equal(ui.spoken.at(-1).text,'مَرْحَبَا');
 console.log('PASS Arabic: vowel marks, local reading examples, 64-item guide, RTL shapes, hidden reading answers, gated syllables/words, optional name audio, marked/unmarked search, stable vocabulary progress, isolated reading backups/import/restart.');
})().catch(error=>{console.error(error);process.exitCode=1});
