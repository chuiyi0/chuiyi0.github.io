const fs=require('fs'),vm=require('vm'),assert=require('assert');
fs.mkdirSync(__dirname+'/dist',{recursive:true});
const ctx={console,setTimeout,clearTimeout,atob,btoa,Uint8Array,Int8Array,Uint16Array,Int16Array,Uint32Array,Int32Array,Float32Array,Float64Array,ArrayBuffer,DataView,Math,Date,JSON,navigator:{userAgent:'Node offline test'},document:{createElement:()=>({canPlayType:()=>false})},addEventListener:()=>{}};ctx.window=ctx;ctx.self=ctx;
vm.runInNewContext(fs.readFileSync(__dirname+'/app/voice-engine.js','utf8'),ctx);
const engine=ctx.CYVoiceFactory();engine.loadVoice(ctx.CY_DEFAULT_VOICE.voice);assert(engine.isConfigLoaded());assert(engine.isVoiceLoaded('en/en-us'));
for(const word of ['density','resort','January','physician']){const wav=engine.speak(word,{rawdata:'data-url',speed:150});assert(wav.startsWith('data:audio/'));const buffer=Buffer.from(wav.split(',')[1],'base64');assert.equal(buffer.subarray(0,4).toString(),'RIFF');assert(buffer.length>1000);console.log('PASS offline synthesis',word,buffer.length);if(word==='density')fs.writeFileSync(__dirname+'/dist/density-offline-sample.wav',buffer)}
