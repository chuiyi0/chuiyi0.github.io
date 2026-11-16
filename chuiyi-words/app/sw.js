const CACHE='chuiyi-words-0.5.7';
const FILES=['./','index.html','styles.css','themes.js','config.js','i18n.js','art.js','local-state.js','catalog.js','shared.js','app.js','natural-voice.js','voice-manifest.js','icon.svg','manifest.webmanifest'];
self.window=self;
importScripts('voice-manifest.js');
FILES.push(...self.CY_DEFAULT_VOICE.parts);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('chuiyi-words-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.includes('/downloads/')||u.pathname.endsWith('.json'))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)))}return r}).catch(async()=>await caches.match(e.request,{ignoreSearch:true})||e.request.mode==='navigate'&&await caches.match('./')||Response.error()))});
