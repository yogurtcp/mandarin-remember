const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),E=require('./source/engine.js');
const html=fs.readFileSync(__dirname+'/index.html','utf8'),registry=JSON.parse(html.match(/<script id="courses-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const reading=registry.courses.find(c=>c.id==='en-zh-reading'),mandarin=registry.courses.find(c=>c.id==='en-zh');
assert.equal(reading.studyMode,'reading');assert.notEqual(reading.storageKey,mandarin.storageKey);
const chars=reading.cards.filter(c=>c.kind==='character'),compounds=reading.cards.filter(c=>c.kind==='compound');
assert.equal(chars.length,94);assert.equal(compounds.length,90);
for(const c of reading.cards){assert(c.readingOnly);assert(!E.isSentence(c));assert(c.pronunciation&&c.meaning)}
for(const c of compounds){
 const parts=c.requires.map(id=>chars.find(c=>c.id===id));assert(parts.every(Boolean));
 assert.deepEqual(new Set(parts.map(c=>c.text)),new Set([...c.text]));
}
function boot(storage=new Map()){
 const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,{textContent:'',value:'',hidden:false,innerHTML:'',dataset:{},addEventListener(){}});return elements.get(id)};
 get('courses-data').textContent=JSON.stringify(registry);let now=Date.now();
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
 const box={document:{getElementById:get,querySelectorAll:()=>[]},Date:Clock,console,URL,location:{protocol:'file:'},navigator:{},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout(){},clearTimeout(){},setInterval(){},scrollTo(){},addEventListener(){}};
 box.window=box;const ctx=vm.createContext(box),run=code=>vm.runInContext(code,ctx);
 for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g))run(script[1]);
 return {run,get,storage,tick:()=>now+=120000};
}
const legacy=E.empty(mandarin.progressId),when=Date.now()-E.DAY;
E.introduce(legacy,mandarin.cards[0].id,when);legacy.items[mandarin.cards[0].id].note='My existing vocabulary cue';
const storage=new Map([[mandarin.storageKey,JSON.stringify(legacy)]]),ui=boot(storage);
assert(!ui.get('characterTrackBtn').hidden);assert(ui.get('characterTrackBtn').textContent.includes('characters'));
ui.run('switchCourse("en-zh-reading")');
assert.equal(ui.run('Object.keys(state.items).length'),0);
assert(!ui.get('readingTrackNote').hidden);assert(ui.get('readingTrackNote').textContent.includes('0 / 94'));
assert.deepEqual(JSON.parse(storage.get(mandarin.storageKey)),legacy);
assert(E.extraPlan(E.empty(reading.progressId),Date.now(),reading.cards).every(t=>chars.some(c=>c.id===t.id)),'Compounds must be locked initially');
ui.run('startExtra()');
for(let i=0;i<5;i++){
 assert.equal(ui.run('current.direction'),'intro');assert.equal(ui.run('byId.get(current.id).kind'),'character');
 assert(ui.get('draftLabel').hidden);ui.run('studied();advance()');
}
ui.tick();ui.run('advance()');
for(let i=0;i<5;i++){
 assert.equal(ui.run('current.direction'),'understand');assert.equal(ui.run('inputMode'),'reading');
 assert(ui.get('answer').hidden);assert(ui.get('listenTools').hidden);assert(ui.get('draftLabel').hidden);
 assert.equal(ui.get('prompt').textContent,ui.run('byId.get(current.id).text'));
 ui.run('reveal()');assert.equal(ui.run('revealed'),true,'Reading recall must not require playback');
 assert(!ui.get('answer').hidden);ui.run('rate(2);advance()');
}
assert.equal(ui.run('session'),null);assert.equal(ui.run('Object.keys(state.items).length'),5);
assert(ui.run('state.logs.every(e=>e.input==="reading"&&e.direction==="understand")'));
ui.run('home();startExtra()');assert.equal(ui.run('byId.get(current.id).kind'),'compound');
assert(!ui.get('characterBreakdown').hidden);assert(ui.get('characterBreakdown').innerHTML.includes('Familiar characters'));
assert(ui.run('byId.get(current.id).requires.every(id=>state.items[id].understand.lastGrade>0)'));
assert(ui.run('E.plan(state,Date.now()+E.DAY,DECK,"",true).every(t=>t.direction==="understand")'));
assert(ui.run('E.dueTasks(state,Date.now()+E.DAY,"",DECK).every(t=>t.direction==="understand")'));
const saved=JSON.parse(storage.get(reading.storageKey));assert.deepEqual(E.validate(saved,reading.cards,reading.progressId),saved);
const restarted=boot(storage);assert.equal(restarted.run('course.id'),reading.id);
assert.equal(restarted.run('Object.keys(state.items).length'),5);
restarted.run('switchCourse("en-zh")');assert.deepEqual(JSON.parse(restarted.run('JSON.stringify(state)')),legacy);

const gate=E.empty(reading.progressId),compound=compounds.find(c=>c.text==='人口');
for(const id of compound.requires)E.introduce(gate,id,when,true);
assert(!E.extraPlan(gate,Date.now(),reading.cards).some(t=>t.id===compound.id),'Introduction alone must not unlock compounds');
for(const id of compound.requires)E.review(gate,id,'understand',2,Date.now(),{force:true,input:'reading'});
assert.equal(E.extraPlan(gate,Date.now(),reading.cards)[0].id,compound.id,'Unlocked compounds have priority over more base characters');
gate.items[compound.requires[0]].suspended=true;
assert(!E.extraPlan(gate,Date.now(),reading.cards).some(t=>t.id===compound.id));
gate.items[compound.requires[0]].suspended=false;
Object.assign(gate.items[compound.requires[0]].understand,{phase:'review',interval:7,delayedPasses:2,lastGrade:2});
assert.equal(E.progress(gate,reading.cards,Date.now()).holding,1,'Reading retention must not require a production track');
console.log('PASS character reading: 94 characters / 90 compounds, recognition-first prerequisites, unlocked-compound priority, hidden pinyin recall, no writing/listening gate, reading-only schedules, isolated legacy progress and backup/restart.');
