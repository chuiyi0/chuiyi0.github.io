from pathlib import Path
import json,hashlib,base64,re
R=Path(__file__).parent;A=R/'app';D=R/'dist';D.mkdir(exist_ok=True)
for name in ['catalog','shared']:
 text=(A/(name+'.json')).read_text();(A/(name+'.js')).write_text('window.CY_'+name.upper()+'='+text+';')
c=json.loads((A/'catalog.json').read_text());v={'appVersion':'0.5.7','contentVersion':c['version'],'catalogSha256':hashlib.sha256((A/'catalog.json').read_bytes()).hexdigest(),'sharedSha256':hashlib.sha256((A/'shared.json').read_bytes()).hexdigest()};(A/'version.json').write_text(json.dumps(v,separators=(',',':')))
for editor,name in [(False,'吹衣单词_学习版预览.html'),(True,'吹衣单词_本地编辑.html')]:
 html=(A/'index.html').read_text();html=re.sub(r'<link rel="(?:icon|manifest)"[^>]+>','',html);html=re.sub(r'<link rel="stylesheet"[^>]+>','<style>'+(A/'styles.css').read_text()+'</style>',html)
 html=html.replace('</head>','<link rel="icon" href="data:image/svg+xml;base64,'+base64.b64encode((A/'icon.svg').read_bytes()).decode()+'"></head>')
 for script in ['themes','config','i18n','art','local-state','catalog','shared','voice-manifest','natural-voice','app']:
  code='window.CY_CONFIG='+json.dumps({'editor':editor,'localServer':False})+';' if script=='config' else (A/(script+'.js')).read_text()
  if script=='app':
   if editor:code=(A/'editor-kit.js').read_text()+'\n'+code
   icon='data:image/svg+xml;base64,'+base64.b64encode((A/'icon.svg').read_bytes()).decode();code=code.replace('src="icon.svg"','src="'+icon+'"')
  pattern=r'<script src="'+script+r'\.js(?:\?[^"]*)?"[^>]*></script>'
  html=re.sub(pattern,lambda m:'<script data-toolbar="off">'+code.replace('</script',r'<\/script')+'</script>',html)
 # Embed clips so standalone HTML also works fully offline.
 for part in sorted((A/'audio').glob('voice-*.js')):
  html=html.replace('</body>', '<script>'+part.read_text(encoding='utf-8')+'</script></body>')
 (D/name).write_text(html)
print('Built public preview and local editor HTML')
