"""Prepare one shared frontend for public web, protected test and Android."""
from pathlib import Path
import argparse,hashlib,json,re,shutil,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('--apk',type=Path,required=True);p.add_argument('--out',type=Path,default=R/'dist/pages');a=p.parse_args()
m=ET.parse(R/'android/AndroidManifest.xml').getroot();ns='{http://schemas.android.com/apk/res/android}'
v=m.attrib[ns+'versionName'];code=int(m.attrib[ns+'versionCode'])
release={'versionName':v,'versionCode':code,'path':f'downloads/chuiyi-words-{v}.apk','sha256':hashlib.sha256(a.apk.read_bytes()).hexdigest(),'size':a.apk.stat().st_size}
D=a.out;D.mkdir(parents=True,exist_ok=True);(D/'words').mkdir(exist_ok=True);(D/'shared').mkdir(exist_ok=True)
for n in ['app.js','natural-voice.js','voice-manifest.js','sw.js']:shutil.copy2(R/'app'/n,D/'words'/n)
shutil.copytree(R/'app/audio',D/'words/audio',dirs_exist_ok=True);shutil.copy2(R/'app/editor-kit.js',D/'shared/editor-kit.js')
s=(R/'deployment/worker.js').read_text(encoding='utf-8')
s=re.sub(r"const SHARED_VERSION\s*=\s*[^;]+;",lambda _:'const SHARED_VERSION='+json.dumps(v)+';',s)
s=re.sub(r'const RELEASE\s*=\s*[^\n]+;',lambda _:'const RELEASE='+json.dumps(release,separators=(',',':'))+';',s)
(D/'_worker.js').write_text(s,encoding='utf-8');(D/'index.html').write_text('<!doctype html><title>吹衣单词</title>',encoding='utf-8')
print('Prepared shared frontend',v,'at',D)
