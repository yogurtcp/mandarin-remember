const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=__dirname,manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest')));
assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
for(const size of [192,512]){const icon=manifest.icons.find(i=>i.sizes===`${size}x${size}`);assert(icon);const png=fs.readFileSync(path.join(root,icon.src));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size)}
async function test(scope){
 const handlers={},stores=new Map(),prefix='mandarin-remember:'+scope+':';
 stores.set(prefix+'v1',new Map());stores.set('another-site-cache',new Map());
 let online=true,fetches=0;
 const key=req=>typeof req==='string'?req:req.url;
 const caches={keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),open:async name=>{
  if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);
  return {addAll:async urls=>{for(const url of urls){assert(url.startsWith(scope));data.set(url,{body:'offline app'})}},put:async(req,res)=>data.set(key(req),res),match:async req=>data.get(key(req))}
 }};
 const context=vm.createContext({URL,caches,self:{registration:{scope},location:{origin:new URL(scope).origin},clients:{claim:async()=>{}},addEventListener:(type,handler)=>handlers[type]=handler},fetch:async()=>{fetches++;if(!online)throw Error('offline');return {ok:true,body:'fresh app',clone(){return {...this}}}}});
 vm.runInContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),context);
 for(const type of ['install','activate']){let pending;handlers[type]({waitUntil:p=>pending=p});await pending}
 assert(!stores.has(prefix+'v1'));assert(stores.has('another-site-cache'));
 async function request(url,mode='navigate',method='GET'){let response,pending=[];handlers.fetch({request:{url,mode,method},respondWith:p=>response=p,waitUntil:p=>pending.push(p)});await Promise.all(pending);return response?await response:undefined}
 assert.equal((await request(scope)).body,'fresh app');online=false;
 assert.equal((await request(scope+'index.html')).body,'fresh app','Offline start must return cached app');
 assert.equal(await request(scope+'deck.json'),undefined,'Data navigation must never replace cached home');
 assert.equal(await request(scope+'api/speech?id=test','cors'),undefined,'Speech must stay network-only');
 assert.equal(await request('https://example.org/another-app/'),undefined);
 assert.equal(await request(scope,'navigate','POST'),undefined);
 assert.equal((await request(scope+'icon-192.png','no-cors')).body,'offline app');
 assert.equal(fetches,2);
}
(async()=>{await test('https://example.org/mandarin-remember/');await test('https://example.org/');console.log('PASS PWA: PNG sizes, relative manifest, project/root scopes, offline home, cache isolation, and network-only data/speech.');})().catch(e=>{console.error(e);process.exitCode=1});
