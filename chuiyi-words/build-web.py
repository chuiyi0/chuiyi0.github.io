from pathlib import Path
import argparse,json,hashlib,base64,re,subprocess
R=Path(__file__).parent;A=R/'app';D=R/'dist';D.mkdir(exist_ok=True)
parser=argparse.ArgumentParser()
parser.add_argument('--wordbook',type=Path,default=A/'wordbook')
args=parser.parse_args()
projection=D/'wordbook-release.js'
source=D/'wordbook.md'
subprocess.run(['node',str(R/'compile-wordbook.cjs'),str(args.wordbook.resolve()),str(projection),str(source)],check=True)
embedded='window.CY_MD_SOURCE='+json.dumps(source.read_text(encoding='utf-8'),ensure_ascii=False)+';\n'
for editor,name in [(False,'吹衣单词_学习版预览.html'),(True,'吹衣单词_本地编辑.html')]:
 html=(A/'index.html').read_text(encoding='utf-8');html=re.sub(r'<link rel="(?:icon|manifest)"[^>]+>','',html);html=re.sub(r'<link rel="stylesheet"[^>]+>','<style>'+(A/'styles.css').read_text(encoding='utf-8')+'</style>',html)
 html=html.replace('</head>','<link rel="icon" href="data:image/svg+xml;base64,'+base64.b64encode((A/'icon.svg').read_bytes()).decode()+'"></head>')
 for script in ['themes','config','i18n','art','local-state','catalog','shared','voice-manifest','natural-voice','app']:
  code='window.CY_CONFIG='+json.dumps({'editor':editor,'localServer':False})+';' if script=='config' else (A/(script+'.js')).read_text(encoding='utf-8')
  if script in ['catalog','shared']:
   code='window.CY_'+script.upper()+'='+(A/(script+'.json')).read_text(encoding='utf-8')+';'
  if script=='app':
   code=projection.read_text(encoding='utf-8')+'\n'+embedded+code
   code=(A/'md-book.js').read_text(encoding='utf-8')+'\n'+code
   if editor:code=(A/'editor-kit.js').read_text(encoding='utf-8')+'\n'+code
   icon='data:image/svg+xml;base64,'+base64.b64encode((A/'icon.svg').read_bytes()).decode();code=code.replace('src="icon.svg"','src="'+icon+'"')
  pattern=r'<script src="'+script+r'\.js(?:\?[^"]*)?"[^>]*></script>'
  html=re.sub(pattern,lambda m:'<script data-toolbar="off">'+code.replace('</script',r'<\/script')+'</script>',html)
 # Embed clips so standalone HTML also works fully offline.
 for part in sorted((A/'audio').glob('voice-*.js')):
  before,after=html.rsplit('</body>',1)
  html=before+'<script>'+part.read_text(encoding='utf-8')+'</script></body>'+after
 (D/name).write_text(html,encoding='utf-8')
print('Built public preview and local editor HTML')

