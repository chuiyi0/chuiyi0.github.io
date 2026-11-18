/* Run against Chromium/Edge through Playwright. */
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
const {once}=require('node:events');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=__dirname,app=root+'/app/', dist=root+'/dist/';
const read=p=>fs.readFileSync(p,'utf8');
const md=require('./app/md-book.js'),catalog=require('./app/catalog.json');
const source=read(app+'wordbook.md'),index=md.phraseIndex(catalog.entries,catalog.extraPhrases);
const [key,occurrences]=[...index].find(([key,rows])=>new Set(rows.filter(row=>row.id).map(row=>row.id)).size>1&&rows.every(r=>r.row[0]===key));
const [first,second]=[...new Set(occurrences.map(r=>r.id).filter(Boolean))];
const byId=new Map(catalog.entries.map(w=>[w.id,w]));
const scripts=['themes','config','i18n','art','local-state','catalog','shared','voice-manifest','natural-voice','md-book','wordbook-release','app'];
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),name=url.pathname.split('/').pop();
 if(!name){
  const editor=url.pathname==='/test/';
  const html=read(app+'index.html').replace(/<script[\s\S]*?<\/script>/g,'').replace('</body>',
    '<script>window.CY_TEST_EDITOR='+editor+';HTMLAnchorElement.prototype.click=function(){fetch(this.href).then(r=>r.text()).then(t=>window.lastDownload=t)};</script>'+
    scripts.map(s=>'<script src="/'+s+'.js"></script>').join('')+'</body>');
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;
 }
 try{
  if(name.endsWith('.js'))res.setHeader('Content-Type','text/javascript; charset=utf-8');
  if(name==='config.js'){res.end('window.CY_CONFIG={editor:window.CY_TEST_EDITOR,localServer:false}');return}
  res.end(fs.readFileSync((name==='wordbook-release.js'?dist:app)+name));
 }catch{res.writeHead(404).end()}
});
const browser=process.env.BROWSER_EXE;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(action){
 for(let i=0;i<150;i++){
  const result=await action().catch(()=>null);
  if(result)return result;
  await sleep(100);
 }
 throw Error('Browser condition timed out');
}

async function verify(){
 assert(browser,'Set BROWSER_EXE to Chrome or Edge');
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 let browserInstance;
 try{
  browserInstance=await chromium.launch({executablePath:browser,headless:true,timeout:10000});
  const page=await browserInstance.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const evaluate=expression=>page.evaluate(expression);
  const route=r=>'#'+encodeURIComponent(JSON.stringify(r));
  const query=selector=>'document.querySelector('+JSON.stringify(selector)+')';
  const click=selector=>evaluate(query(selector)+'.click()');
  const visible=selector=>wait(async()=>evaluate('!!'+query(selector)));
  const selectPhrase=()=>evaluate('Array.from(document.querySelectorAll(".phrase-link")).find(b=>JSON.parse(b.dataset.route).id===' + JSON.stringify(key) + ').click()');
  const open=async (pagePath,r)=>{
   await page.goto(base+pagePath+'?run='+Math.random()+route(r),{waitUntil:'load',timeout:10000});
   await wait(async()=>evaluate('!!document.querySelector("main")'));
  };
  let detail;
  for(const id of [first,second]){
   await open('/words/',{name:'word',id});
   await visible('.word-page-v3 .phrase-link');
   await selectPhrase();
   await visible('.subpage h1');
   const html=await evaluate('document.querySelector("main").innerHTML');
   assert(html.includes(byId.get(first).word)&&html.includes(byId.get(second).word));
   detail??=html;
   assert.equal(html,detail);
  }
  await click('main [data-word="'+second+'"]');
  await visible('.word-page-v3');
  console.log('Checking import and rollback');
  await open('/test/',{name:'books'});
  await visible('#md-import-file');
  const updated=source.replace('#### January\n','#### JanuarY\n').replace('n. **一月**','n. **一月份**');
  await evaluate('(()=>{const dt=new DataTransfer();dt.items.add(new File(['+JSON.stringify(updated)+'],"wordbook.md",{type:"text/markdown"}));const file=document.querySelector("#md-import-file");file.files=dt.files;file.dispatchEvent(new Event("change",{bubbles:true}))})()');
  await visible('[data-md-rename]');
  await evaluate(query('[data-md-rename]')+'.selectedIndex=1');
  await click('[data-md-action=map]');
  await visible('#md-stage-meanings');
  assert.equal(await evaluate(query('#md-stage-meanings')+'.checked'),false);
  await click('#md-stage-meanings');await click('[data-md-action=apply]');await click('[data-action=confirm]');
  await wait(async()=>evaluate('document.body.innerText.includes("导入成功")'));
  await click('[data-md-action=export]');
  const exported=await wait(async()=>evaluate('window.lastDownload'));
  assert(exported.includes('#### JanuarY\n')&&exported.includes('n. **一月份**'));
  await click('[data-md-action=publish]');
  const bundle=JSON.parse(await wait(async()=>evaluate('window.lastDownload?.startsWith("{")&&window.lastDownload')));
  assert.equal(bundle.markdown,exported);assert.equal(bundle.renames.JanuarY,catalog.entries.find(w=>w.word==='January').id);
  await click('[data-md-action=rollback]');await click('[data-action=confirm]');
  await wait(async()=>evaluate('document.body.innerText.includes("已恢复至导入前状态")'));
  await open('/test/',{name:'word',id:first});await visible('[data-md-edit-phrases]');
  await click('[data-md-edit-phrases]');await visible('#md-edit-phrases');
  await evaluate(query('#md-edit-phrases')+'.value+="\\n- regression phrase 浏览器回归测试"');
  await click('[data-action=confirm]');
  await wait(async()=>evaluate('document.body.innerText.includes("regression phrase")'));
  await open('/test/',{name:'books'});await visible('[data-md-action=export]');await click('[data-md-action=export]');
  const edited=await wait(async()=>evaluate('window.lastDownload'));
  assert(edited.includes('- regression phrase 浏览器回归测试'));
  assert(edited.includes('#### January\n')&&!edited.includes('#### JanuarY\n'));
  assert.deepEqual(errors,[]);
  console.log('PASS real browser: shared phrase links and member navigation, import review, rename, edited meanings, export, release bundle, rollback, website phrase edit');
 }finally{
  await browserInstance?.close();
  server.closeAllConnections();
  server.close();
 }
}
verify().catch(e=>{console.error(e);process.exitCode=1;server.close()});
