// Scope the cache to this installation, including GitHub Pages project paths.
const PREFIX='mandarin-remember:'+self.registration.scope+':';
const CACHE=PREFIX+'v7';
const HOME=new URL('./',self.registration.scope).href;
const ASSETS=['manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'].map(path=>new URL(path,HOME).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([HOME,...ASSETS]))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin||event.request.method!=='GET'||!url.href.startsWith(HOME))return;
 const isAppPage=url.pathname===new URL(HOME).pathname||url.pathname===new URL('index.html',HOME).pathname;
 if(event.request.mode==='navigate'&&isAppPage){
  const response=fetch(event.request);
  event.waitUntil(response.then(result=>result.ok?caches.open(CACHE).then(cache=>cache.put(HOME,result.clone())):undefined).catch(()=>{}));
  event.respondWith(response.catch(()=>caches.open(CACHE).then(cache=>cache.match(HOME))));
 }
 else if(ASSETS.includes(url.href))event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request)).then(cached=>cached||fetch(event.request)));
 // All other requests, including speech, remain network-only.
});
