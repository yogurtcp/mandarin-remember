// Run the bundled UI with controlled storage/time to exercise real session transitions.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const registry=JSON.parse(html.match(/<script id="courses-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
function boot(courseId='en-zh'){
 const elements=new Map(),storage=new Map([['remember:active-course:v1',courseId]]);
 const get=id=>{if(!elements.has(id))elements.set(id,{textContent:'',value:'',hidden:false,innerHTML:'',dataset:{},addEventListener(){}});return elements.get(id)};
 get('courses-data').textContent=JSON.stringify(registry);let now=Date.now();
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
 const box={document:{getElementById:get,querySelectorAll:()=>[]},Date:Clock,console,URL,location:{protocol:'file:'},navigator:{},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  setTimeout(){},clearTimeout(){},setInterval(){},scrollTo(){},addEventListener(){}};
 box.window=box;const context=vm.createContext(box),run=code=>vm.runInContext(code,context);
 scripts.forEach(run);
 return {run,get,tick:()=>now+=120000};
}
function grade(t){t.run('readInstead();reveal();rate(2)')}

// Learning-only sessions stay word-only, including the one-minute retrieval steps.
const learn=boot();
learn.run('for(const c of DECK.filter(c=>!E.isSentence(c)&&!c.id.startsWith("zh-int-")))E.introduce(state,c.id,Date.now()-E.DAY);startExtra()');
let introductions=0,recalls=0;
for(let n=0;n<30&&learn.run('!!session');n++){
 if(!learn.run('!!current')){learn.tick();learn.run('advance()');continue}
 assert.equal(learn.run('!!current.sentence'),false,'Learn more must never insert sentences');
 if(learn.run('current.direction')==='intro'){introductions++;learn.run('studied()')}else{recalls++;grade(learn)}
 learn.run('advance()');
}
assert.equal(introductions,5);assert.equal(recalls,5);assert.equal(learn.run('session'),null);

// A single old learned word can trigger a sentence in a one-task recall session.
const single=boot();
single.run('const wake=DECK.find(c=>c.text==="起床");E.introduce(state,wake.id,Date.now()-10*E.DAY);beginSession([{id:wake.id,direction:"understand",readyAt:Date.now()}],false)');
assert(single.run('current.sentence'));assert.equal(single.run('current.direction'),'understand');
assert(single.run('current.words.includes(wake.id)'));assert.equal(single.run('session.queue.length'),0);
grade(single);assert.equal(single.run('state.items[current.id]'),undefined);
assert.equal(single.run('state.items[wake.id].understand.reviews'),1);

// Topic matching follows the scheduled vocabulary, not the sentence's category.
const topic=boot();
topic.run('const good=DECK.find(c=>c.text==="好");E.introduce(state,good.id,Date.now()-E.DAY);$("category").value=good.category;beginSession([{id:good.id,direction:"produce",readyAt:Date.now()}],false)');
assert(topic.run('current.sentence'));assert(topic.run('current.words.includes(good.id)'));

// Ten recalls select sentences dynamically, rather than adding one fixed sentence
// at session creation. Every replacement covers its original scheduled word.
const recall=boot();
recall.run('for(const c of DECK.filter(c=>!E.isSentence(c)))E.introduce(state,c.id,Date.now()-10*E.DAY);const anchors=["起床","水","妈妈","高兴","想","苹果","茶","喝水","睡觉","好"];beginSession(anchors.map(text=>({id:DECK.find(c=>c.text===text).id,direction:"understand",readyAt:Date.now()})),false)');
let sentenceCount=0,total=0;const seen=new Set();
while(recall.run('!!session')&&total<20){
 assert(recall.run('!!current'));total++;
 if(recall.run('!!current.sentence')){
  sentenceCount++;const id=recall.run('current.id');assert(!seen.has(id));seen.add(id);
  assert(recall.run('current.words.includes(current.reviewWord)'));
  assert(recall.run('current.words.every(id=>state.items[id]&&!state.items[id].suspended)'));
  assert.equal(recall.run('current.direction'),'understand');
 }
 grade(recall);recall.run('advance()');
}
assert.equal(total,10);assert.equal(sentenceCount,5);

// Eligibility is recalculated after the session begins; a future recall can use
// a word learned in the meantime. Paused or missing components still block it.
const dynamic=boot('en-ja-japanese');
dynamic.run('E.introduce(state,"ja-drink",Date.now()-E.DAY);beginSession(["produce","understand","produce"].map(direction=>({id:"ja-drink",direction,readyAt:Date.now()})),false)');
assert.equal(dynamic.run('!!current.sentence'),false);
grade(dynamic);
dynamic.run('E.introduce(state,"ja-coffee",Date.now()-E.DAY);advance()');grade(dynamic);dynamic.run('advance()');
assert(dynamic.run('current.sentence'));assert(dynamic.run('current.words.includes("ja-coffee")'));
dynamic.run('state.items["ja-coffee"].suspended=true');
assert.equal(dynamic.run('E.sentenceRecall(state,Date.now(),DECK,{id:"ja-drink",direction:"produce"})'),null);

// Extra review sentences retain practice-only scheduling.
const practice=boot();
practice.run('const w=DECK.find(c=>c.text==="起床");E.introduce(state,w.id,Date.now()-E.DAY);var before=JSON.stringify(state.items);beginSession([{id:w.id,direction:"produce",practice:true,readyAt:Date.now()}],true)');
assert(practice.run('current.sentence&&current.practice'));grade(practice);
assert.equal(practice.run('JSON.stringify(state.items)'),practice.run('before'));
console.log('PASS recall flow: word-only learning, retroactive single-task sentences, vocabulary topics, 5/10 dynamic sentence recalls, per-word credit, newly eligible words, paused gates and practice-only scheduling.');
