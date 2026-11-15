const fs=require('fs'),vm=require('vm'),assert=require('assert');
const root=__dirname+'/app/',played=[],pending=[];
const ctx={console,TextEncoder,atob,btoa,Map,Set,Promise,Number,Object,Array,String,Error,JSON,
 AndroidBridge:{playOfflineAudio:d=>played.push(d),stopOfflineAudio:()=>{}},
 document:{createElement:()=>({remove(){}}),head:{append(script){pending.push(script)}}}};
ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root+'voice-manifest.js','utf8'),ctx);
vm.runInContext(fs.readFileSync(root+'natural-voice.js','utf8'),ctx);
const {CYVoiceAudio:audio,CY_DEFAULT_VOICE:manifest}=ctx;
async function drain(){while(pending.length){const script=pending.shift();vm.runInContext(fs.readFileSync(root+script.src,'utf8'),ctx);script.onload()}await Promise.resolve()}
async function run(p){let done=false,result,failure;p.then(v=>{done=true;result=v},e=>{done=true;failure=e});for(let i=0;i<200&&!done;i++){await drain();await new Promise(setImmediate)}assert(done,'audio loading must finish');if(failure)throw failure;return result}
(async()=>{
 assert(!('age' in manifest.lookup));assert(!('add' in manifest.lookup));
 const first=audio.play('January',manifest),last=audio.play('density',manifest);
 await drain();await Promise.all([first,last]);assert.equal(played.length,1,'stale playback');
 assert(played[0].startsWith('data:audio/mpeg;base64,'));
 const pack=await run(audio.exportPack(manifest,['density','resort']));
 assert.deepEqual(Object.keys(pack.clips).sort(),['density','resort']);assert(audio.validatePack(pack));
 await assert.rejects(audio.getClip('not-in-current-pack',pack),/没有离线音频/);
 assert.throws(()=>audio.validatePack({format:'chuiyi-voice-pack',version:1}),/旧版机械/);
 assert.throws(()=>audio.validatePack({...pack,clips:{density:'bad'}}),/不完整/);
 const catalog=JSON.parse(fs.readFileSync(root+'catalog.json','utf8'));
 for(let i=0;i<manifest.parts.length;i++)vm.runInContext(fs.readFileSync(root+manifest.parts[i],'utf8'),ctx);
 const full=await audio.exportPack(manifest);assert(audio.validatePack(full));
 assert.equal(Object.keys(full.clips).length,manifest.count);
 const active=catalog.entries.filter(w=>!['age','add','up','ox'].includes(w.word.toLowerCase())&&!w.family_only);
 assert(active.every(w=>Object.hasOwn(full.clips,w.word.toLowerCase())),'complete learning-word coverage');
 assert(Buffer.byteLength(JSON.stringify(full))<50*1024*1024);
 console.log('PASS complete offline audio, playback order, export filtering, import validation and 50MB limit');
})().catch(e=>{console.error(e);process.exit(1)});

