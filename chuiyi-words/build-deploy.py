"""Prepare one shared frontend for public web, protected test and Android release."""
from pathlib import Path
import argparse,hashlib,json,re,shutil,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('--apk',type=Path,required=True);parser.add_argument('--out',type=Path,default=R/'dist/pages');args=parser.parse_args()
manifest=ET.parse(R/'android/AndroidManifest.xml').getroot();ns='{http://schemas.android.com/apk/res/android}'
version=manifest.attrib[ns+'versionName'];code=int(manifest.attrib[ns+'versionCode'])
release={'versionName':version,'versionCode':code,'path':f'downloads/chuiyi-words-{version}.apk','sha256':hashlib.sha256(args.apk.read_bytes()).hexdigest(),'size':args.apk.stat().st_size}
D=args.out;D.mkdir(parents=True,exist_ok=True);(D/'words').mkdir(exist_ok=True);(D/'shared').mkdir(exist_ok=True)
for name in ['app.js','i18n.js','natural-voice.js','voice-manifest.js','sw.js']:shutil.copy2(R/'app'/name,D/'words'/name)
shutil.copytree(R/'app/audio',D/'words/audio',dirs_exist_ok=True);shutil.copy2(R/'app/editor-kit.js',D/'shared/editor-kit.js')
worker=(R/'deployment/worker.js').read_text(encoding='utf-8')
worker=re.sub(r"const SHARED_VERSION = [^;]+;",lambda _:"const SHARED_VERSION = "+json.dumps(version)+';',worker)
worker=re.sub(r'const RELEASE = [^\n]+;',lambda _:'const RELEASE = '+json.dumps(release,separators=(',',':'))+';',worker)
worker=worker.replace('v=shared054','v=shared'+version.replace('.',''))
(D/'_worker.js').write_text(worker,encoding='utf-8');(D/'index.html').write_text('<!doctype html><title>吹衣单词</title>',encoding='utf-8')
print('Prepared shared frontend',version,'at',D)
