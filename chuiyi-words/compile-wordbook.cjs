/* Compile the single edited Markdown source against the retained catalog. */
const fs=require('node:fs');
const md=require('./app/md-book.js');
const root=__dirname+'/app/';
const read=file=>fs.readFileSync(file,'utf8');
const json=file=>JSON.parse(read(file));
const catalog=json(root+'catalog.json');
const shared=json(root+'shared.json');
const byId=new Map(catalog.entries.map(w=>[w.id,w]));
const current=id=>({...byId.get(id),...shared.words[id]});

function initialize(legacy){
 const parsed=md.splitBook(read(legacy));
 const check=md.verifyBook(parsed,catalog);
 if(!check.ok)throw Error(check.errors.slice(0,10).join('\n'));
 const layout={
  groups:Object.fromEntries(parsed.groups.map(g=>[g.key,g.id])),
  words:Object.fromEntries(parsed.entries.map(w=>[w.id,w.groupId]))
 };
 const notes=new Map(parsed.entries.filter(w=>w.markdown).map(w=>[w.id,w.markdown]));
 const output=md.composeBook(parsed,id=>({...current(id),markdown:notes.get(id)||current(id).markdown}),catalog.extraPhrases);
 fs.writeFileSync(root+'wordbook-layout.json',JSON.stringify(layout));
 fs.writeFileSync(root+'wordbook.md',output);
}
function compile(input){
 const layout=json(root+'wordbook-layout.json');
 const isBundle=input.endsWith('.json');
 const source=isBundle?json(input):{markdown:read(input)};
 if(isBundle&&(source.format!=='chuiyi-markdown-release'||source.version!==1))throw Error('此 JSON 文件不是 test 导出的发布构建包');
 const parsed=md.splitBook(source.markdown,layout);
 const renames=new Map(Object.entries(source.renames||{}));
 const check=md.verifyBook(parsed,catalog,layout,current,renames);
 if(!check.ok)throw Error(check.errors.slice(0,12).join('\n'));
 if(!parsed.extraPhrases||parsed.entries.some(w=>!w.collocations))throw Error('构建需要完整短语区');
 const changes=md.compareBook(parsed,catalog,current);
 if(!isBundle&&(changes.some(c=>c.removed.length)||md.removedPhrases(catalog.extraPhrases,parsed.extraPhrases).length))throw Error('有原短语收录被替换或删除。请在 test 核对差异后下载发布构建包。');
 const edits=Object.fromEntries(changes.map(({id,patch})=>[id,patch]));
 return {layout,edits,extraPhrases:parsed.extraPhrases,markdown:source.markdown};
}
module.exports={compile};
if(process.argv[2]==='--initialize')initialize(process.argv[3]);
else if(require.main===module){
 const value=compile(process.argv[2]||root+'wordbook.md');
 const {markdown,...projection}=value;
 const out=process.argv[3];
 fs.writeFileSync(out,'window.CY_MD_RELEASE='+JSON.stringify(projection)+';\n');
 if(process.argv[4])fs.writeFileSync(process.argv[4],markdown);
}