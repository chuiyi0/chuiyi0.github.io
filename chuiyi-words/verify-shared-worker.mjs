import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=new URL('./dist/pages/',import.meta.url);
const worker=(await import(new URL('_worker.js',base).href)).default;
const env={ASSETS:{async fetch(req){try{return new Response(fs.readFileSync(new URL('.'+new URL(req.url).pathname,base)),{headers:{'content-type':'application/javascript'}})}catch{return new Response('missing',{status:404})}}}};
globalThis.fetch=async req=>{const p=new URL(req.url).pathname;if(p.startsWith('/test/')&&!req.headers.has('cookie'))return new Response('sign in',{status:401});if(p.endsWith('.js'))return new Response('// old script',{headers:{'content-type':'application/javascript'}});return new Response('<head></head><script src="voice-engine.js"></script><script src="app.js?v=old"></script>',{headers:{'content-type':'text/html'}})};
const req=(path,auth=false)=>new Request('https://unit.example'+path,{headers:auth?{cookie:'mock-existing-session'}:{}});
const pub=await(await worker.fetch(req('/words/app.js'),env)).text();
assert(pub.includes("['age','add','up','ox']"));
for(const path of ['/test/app.js','/test/project/app.js']){assert.equal((await worker.fetch(req(path),env)).status,401);const s=await(await worker.fetch(req(path,true),env)).text();assert(s.endsWith(pub));assert(s.includes('CY_EDITOR_KIT'))}
for(const path of ['/test/voice-engine.js','/test/project/voice-engine.js']){const s=await(await worker.fetch(req(path,true),env)).text();assert(s.includes('CYVoiceAudio'));assert(s.includes('CY_VOICE_ASSET_BASE'));assert(!s.includes('CYVoiceFactory'))}
const html=await(await worker.fetch(req('/test/project/',true),env)).text();assert(html.includes('cy-shared-version'));assert(!html.includes('app.js?v=old'));
console.log('PASS shared public/test app, protected aliases, natural speech and cache version');
