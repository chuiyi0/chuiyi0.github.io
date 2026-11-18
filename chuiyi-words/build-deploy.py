"""Prepare one shared frontend for public web, protected test and Android release."""
from pathlib import Path
import argparse,hashlib,json,re,shutil,subprocess,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parent
parser=argparse.ArgumentParser();src=parser.add_mutually_exclusive_group(required=True)
src.add_argument('--apk',type=Path,help='signed APK: publish a new Android release')
src.add_argument('--local-release',type=Path,help='reuse local Android release metadata without network access')
src.add_argument('--release-url',help='reuse the Android release currently live at this URL (no new APK)')
parser.add_argument('--release-fallback',type=Path,default=R/'deployment/release-current.json',help='used when --release-url cannot be read')
parser.add_argument('--wordbook',type=Path,default=R/'app/wordbook.md')
parser.add_argument('--out',type=Path,default=R/'dist/pages');args=parser.parse_args()
manifest=ET.parse(R/'android/AndroidManifest.xml').getroot();ns='{http://schemas.android.com/apk/res/android}'
version=manifest.attrib[ns+'versionName'];code=int(manifest.attrib[ns+'versionCode'])
if args.apk:release={'versionName':version,'versionCode':code,'path':f'downloads/chuiyi-words-{version}.apk','sha256':hashlib.sha256(args.apk.read_bytes()).hexdigest(),'size':args.apk.stat().st_size}
elif args.local_release:release=json.loads(args.local_release.read_text(encoding='utf-8'))
else:
 import urllib.request
 try:
  with urllib.request.urlopen(urllib.request.Request(args.release_url,headers={'User-Agent':'Mozilla/5.0 (compatible; chuiyi-deploy/1.0)','Accept':'application/json'}),timeout=30) as r:release=json.load(r)
  print('Android release from',args.release_url)
 except Exception as e:
  print('Could not read',args.release_url,'(',e,') - using',args.release_fallback);release=json.loads(args.release_fallback.read_text(encoding='utf-8'))
 if not all(k in release for k in ('versionName','versionCode','path','sha256','size')):raise SystemExit('Unexpected release JSON: '+json.dumps(release))
 version=release['versionName']
D=args.out;D.mkdir(parents=True,exist_ok=True);(D/'words').mkdir(exist_ok=True);(D/'shared').mkdir(exist_ok=True)
for name in ['app.js','md-book.js','i18n.js','natural-voice.js','voice-manifest.js','sw.js']:shutil.copy2(R/'app'/name,D/'words'/name)
shutil.copytree(R/'app/audio',D/'words/audio',dirs_exist_ok=True);shutil.copy2(R/'app/editor-kit.js',D/'shared/editor-kit.js')
subprocess.run(['node',str(R/'compile-wordbook.cjs'),str(args.wordbook.resolve()),str(D.resolve()/'words/wordbook-release.js'),str(D.resolve()/'words/wordbook.md')],check=True)
worker=(R/'deployment/worker.js').read_text(encoding='utf-8')
worker=re.sub(r"const SHARED_VERSION = [^;]+;",lambda _:"const SHARED_VERSION = "+json.dumps(version)+';',worker)
worker=re.sub(r'const RELEASE = [^\n]+;',lambda _:'const RELEASE = '+json.dumps(release,separators=(',',':'))+';',worker)
asset_version=hashlib.sha256((D/'words/wordbook-release.js').read_bytes()+(D/'words/app.js').read_bytes()).hexdigest()[:12]
worker=worker.replace('v=shared058','v=md-'+asset_version)
(D/'_worker.js').write_text(worker,encoding='utf-8');(D/'index.html').write_text('<!doctype html><title>吹衣单词</title>',encoding='utf-8')
print('Prepared shared frontend',version,'at',D)
