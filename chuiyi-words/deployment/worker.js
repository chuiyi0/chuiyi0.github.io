// Shared learning UI and speech. The protected editor keeps its auth and data APIs.
const SITE_ORIGIN = 'https://7cf5edf3.chuiyi.pages.dev';
const EDITOR_ORIGIN = 'https://7cf5edf3.chuiyi.pages.dev';
const SHARED_VERSION = "0.5.5";
const RELEASE = {"versionName":"0.5.5","versionCode":28,"path":"downloads/chuiyi-words-0.5.5.apk","sha256":"fdd983af2b9249dc46dde7ffae6a8512e7034b35b2d8d24b0ef60287a4db12a0","size":18122257};

function changed(body, original, type) {
 const headers = new Headers(original.headers);
 for (const name of ['content-length','content-encoding','etag']) headers.delete(name);
 headers.set('cache-control','no-store');
 headers.set('x-cy-shared-version',SHARED_VERSION);
 if (type) headers.set('content-type',type);
 return new Response(body,{status:original.status,statusText:original.statusText,headers});
}
async function assetText(env,url,path) {
 const response=await env.ASSETS.fetch(new Request(new URL(path,url)));
 if (!response.ok) throw Error('Missing shared application asset: '+path);
 return response.text(); // Assets are bounded: app < 150KB, kit < 20KB, manifest < 150KB.
}
async function proxy(request,incoming) {
 const isEditor=/^\/test(?:\/|$)/.test(incoming.pathname);
 const upstream=isEditor?EDITOR_ORIGIN:SITE_ORIGIN;
 const target=new URL(incoming.pathname+incoming.search,upstream),headers=new Headers(request.headers);
 headers.delete('host');
 if(headers.get('origin')===incoming.origin)headers.set('origin',upstream);
 const referer=headers.get('referer');
 if(referer)try{const r=new URL(referer);if(r.origin===incoming.origin){r.host=target.host;headers.set('referer',r.href)}}catch{}
 const init={method:request.method,headers,redirect:'manual'};
 if(!['GET','HEAD'].includes(request.method))init.body=request.body;
 const response=await fetch(new Request(target,init));
 if(response.status===101)return response;
 const out=new Headers(response.headers),location=out.get('location');
 if(location)try{const to=new URL(location,target);if(to.origin===upstream){to.host=incoming.host;out.set('location',to.href)}}catch{}
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers:out});
}

export default {async fetch(request,env) {
 const url=new URL(request.url),p=url.pathname,read=['GET','HEAD'].includes(request.method);
 if(read&&['/words/app-release.json','/words/app-update.json'].includes(p))return Response.json(RELEASE,{headers:{'cache-control':'no-store'}});
 if(read&&p==='/words/'+RELEASE.path){
  const object=await env.WORDS_RELEASES.get('chuiyi-words-0.5.5.apk');
  if(!object)return new Response('Not found',{status:404});
  return new Response(request.method==='HEAD'?null:object.body,{headers:{'content-type':'application/vnd.android.package-archive','content-length':String(object.size),'cache-control':'public,max-age=31536000,immutable','content-disposition':'attachment; filename=chuiyi-words-0.5.5.apk'}});
 }
 if(read&&/^\/words\/(?:app\.js|i18n\.js|natural-voice\.js|voice-manifest\.js|sw\.js|audio\/voice-\d{3}\.js)$/.test(p)){
  const response=await env.ASSETS.fetch(request);
  if(p.endsWith('/app.js')||p.endsWith('/natural-voice.js')||p.endsWith('/voice-manifest.js'))return changed(request.method==='HEAD'?null:response.body,response);
  return response;
 }
 const original=await proxy(request,url);
 if(request.method!=='GET'||original.status!==200)return original;
 const type=original.headers.get('content-type')||'';
 // Authenticate using the existing editor before returning any protected asset.
 if(['/test/project/i18n.js','/test/i18n.js'].includes(p)&&!type.includes('html')&&!type.includes('json'))return changed(await assetText(env,url,'/words/i18n.js'),original,'application/javascript; charset=utf-8');
 if(['/test/project/app.js','/test/app.js'].includes(p)&&!type.includes('html')&&!type.includes('json')){
  const [kit,app]=await Promise.all([assetText(env,url,'/shared/editor-kit.js'),assetText(env,url,'/words/app.js')]);
  return changed(kit+'\n'+app,original,'application/javascript; charset=utf-8');
 }
 if(['/test/project/voice-engine.js','/test/voice-engine.js'].includes(p)&&!type.includes('html')&&!type.includes('json')){
  const [manifest,engine]=await Promise.all([assetText(env,url,'/words/voice-manifest.js'),assetText(env,url,'/words/natural-voice.js')]);
  return changed("window.CY_VOICE_ASSET_BASE='/words/';\n"+manifest+'\n'+engine,original,'application/javascript; charset=utf-8');
 }
 if(p==='/words/version.json'){
  const version=await original.json();version.appVersion=SHARED_VERSION;
  return changed(JSON.stringify(version),original,'application/json; charset=utf-8');
 }
 if(type.includes('text/html')&&['/words/','/words/index.html','/test/project/','/test/project/index.html'].includes(p)){
  let html=await original.text();
  html=html.replace(/(src=["'](?:[^"']*\/)?(?:app|voice-engine|natural-voice|voice-manifest)\.js)(?:\?[^"']*)?(["'])/g,'$1?v=shared055b$2');
  html=html.replace('</head>','<meta name="cy-shared-version" content="'+SHARED_VERSION+'"></head>');
  return changed(html,original,'text/html; charset=utf-8');
 }
 return original;
}};
