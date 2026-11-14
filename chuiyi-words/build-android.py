"""Build with Python 3, Node, JDK 17 and Android SDK 35 (no signing secrets in source)."""
from pathlib import Path
import argparse, os, shutil, subprocess, sys, zipfile
from apk_checks import verify_resources

R=Path(__file__).resolve().parent
args=argparse.ArgumentParser()
args.add_argument('--sign',action='store_true',help='Use CHUIYI_KEYSTORE and CHUIYI_KEYSTORE_PASSWORD_FILE')
args=args.parse_args()
sdk=Path(os.environ.get('ANDROID_SDK_ROOT') or os.environ['ANDROID_HOME'])
jdk=Path(os.environ['JAVA_HOME'])
bt=sdk/'build-tools'/'35.0.0'
android_jar=sdk/'platforms'/'android-35'/'android.jar'
B=R/'android'/'build'
D=R/'dist'
windows=os.name=='nt'
def exe(name,bat=False):
 return name+('.bat' if bat else '.exe') if windows else name
def run(*cmd):
 subprocess.run([str(x) for x in cmd],check=True,cwd=R)
run('node','--check',R/'app'/'app.js')
run(sys.executable,R/'build-web.py')
for p in [B/'generated',B/'classes',B/'dex',D]:p.mkdir(parents=True,exist_ok=True)
shutil.copytree(R/'app',B/'assets'/'app',dirs_exist_ok=True)
for name in ['catalog.json','shared.json','editor-kit.js']:(B/'assets'/'app'/name).unlink(missing_ok=True)
run(bt/exe('aapt2'),'compile','--dir',R/'android'/'res','-o',B/'resources.zip')
run(bt/exe('aapt2'),'link','-o',B/'base.apk','-I',android_jar,'--manifest',R/'android'/'AndroidManifest.xml','--java',B/'generated','-A',B/'assets','-0','arsc',B/'resources.zip')
sources=list((R/'android'/'src').rglob('*.java'))+list((B/'generated').rglob('*.java'))
run(jdk/'bin'/exe('javac'),'-J-Dfile.encoding=UTF-8','-source','8','-target','8','-bootclasspath',android_jar,'-d',B/'classes',*sources)
with zipfile.ZipFile(B/'classes.jar','w',zipfile.ZIP_DEFLATED) as z:
 for p in (B/'classes').rglob('*.class'):z.write(p,p.relative_to(B/'classes'))
run(bt/exe('d8',True),'--release','--min-api','28','--lib',android_jar,'--output',B/'dex',B/'classes.jar')
with zipfile.ZipFile(B/'base.apk') as src,zipfile.ZipFile(B/'unsigned.apk','w',zipfile.ZIP_DEFLATED) as dst:
 for info in src.infolist():
  if info.filename=='resources.arsc':info.compress_type=zipfile.ZIP_STORED
  dst.writestr(info,src.read(info.filename))
 for p in (B/'dex').glob('*.dex'):dst.write(p,p.name)
unsigned=D/'chuiyi-words-unsigned.apk'
run(bt/exe('zipalign'),'-f','-p','4',B/'unsigned.apk',unsigned)
run(bt/exe('zipalign'),'-c','4',unsigned)
verify_resources(unsigned)
if args.sign:
 apk=D/'chuiyi-words.apk'
 run(bt/exe('apksigner',True),'sign','--ks',os.environ['CHUIYI_KEYSTORE'],'--ks-key-alias',os.environ.get('CHUIYI_KEY_ALIAS','chuiyi-words'),'--ks-pass','file:'+os.environ['CHUIYI_KEYSTORE_PASSWORD_FILE'],'--out',apk,unsigned)
 run(bt/exe('apksigner',True),'verify','--verbose',apk)
 run(bt/exe('zipalign'),'-c','4',apk)
 verify_resources(apk)
print('Built',D)
