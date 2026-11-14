from pathlib import Path
import json,tarfile
R=Path(__file__).parent;A=R/'app';V=R/'vendor'
engine=(V/'src/ESpeak.js').read_text(encoding='latin-1');api=(V/'src/index.js').read_text(encoding='utf-8');config=(V/'src/mespeak_config.json').read_text(encoding='utf-8');voice=(V/'voices/en/en-us.json').read_text(encoding='utf-8')
bundle='''/* meSpeak/eSpeak, GPL; original source is included in vendor and mespeak-2.0.2.tgz. */
window.CY_DEFAULT_VOICE={format:'chuiyi-voice-pack',version:1,name:'离线美式英语',voice:'''+voice+'''};
window.CYVoiceFactory=function(){const e={exports:{}};(function(module){'''+engine+'''})(e);const m={exports:{}};(function(module,require){'''+api+'''})(m,()=>e.exports);m.exports.loadConfig('''+config+''');return m.exports};
'''
(A/'voice-engine.js').write_text(bundle,encoding='utf-8')
p=A/'index.html';s=p.read_text(encoding='utf-8')
if '<script src="voice-engine.js"' not in s:s=s.replace('<script src="app.js','<script src="voice-engine.js"></script><script src="app.js')
p.write_text(s,encoding='utf-8')
p=R/'build-web.py';s=p.read_text(encoding='utf-8').replace("'shared','app'", "'shared','voice-engine','app'");p.write_text(s,encoding='utf-8')
print('Offline speech engine and default voice bytes:',len(bundle.encode()))
