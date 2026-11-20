'use strict';
// node organize-wordbook.cjs <输出目录> <旧词表1.md> <旧词表2.md> <旧词表3.md> [--rules=rules.json]
const PINS=['resort','density','massive','nuclear','bet'];
const keepSeparate=['actually','barely','directly','fairly','hardly','largely','lately','literally','merely','presently','pretty','shady','shortly','simply','slightly','specially','surely','virtually'];
const endNames=['独立短语和搭配'];
const noteFields=['联想','词根','提示','注释'];
const definition=/^.*\/.+ · /;
const phraseTitle='短语和搭配';

function parse(text) {
 const parts=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split('\n');
 const modern=parts.some(s=>s==='# 测试词'), words=new Map(), refs=[];
 let top='',sub='', group='', word=null, parent=null, fence='';
 function finish(){
  if(!word)return;
  if(words.has(word.name))throw Error('重复的词条：'+word.name);
  cleanup(word);
  words.set(word.name,word);
  if(top==='其他')refs.push(render(word,4));
  word=null;
 }
 for(let i=0;i<parts.length;i++){
  const line=parts[i], marker=/^ {0,3}([\x60~])\1{2,}/.exec(line)?.[0].trim();
  const heading=fence||marker?null:/^(#{1,4})[ \t]+(.+?)\s*$/.exec(line);
  if(fence&&marker?.[0]===fence[0]&&marker.length>=fence.length&&!line.trim().slice(marker.length).trim())fence='';
  else if(!fence&&marker)fence=marker;
  if(heading){
   const level=heading[1].length,label=heading[2];
   const isWord=definition.test(parts.slice(i+1,i+4).find(s=>s.trim())||'')&&
    (top==='其他'||!modern?level===4:level===2||level===3);
   if(!word||isWord||(level<=3&&word.lines.includes(phraseTitle))){
    finish();
    if(level===1){top=label;sub='';group='';parent=null}
    else if(level===2&&!isWord){
     sub=label;group='';
     if(top==='其他'&&endNames.includes(label)){
      refs.push([line,'',...parts.slice(i+1).filter(s=>s.trim()!=='-')].join('\n'));
      break;
     }
    }else if(level===3&&!isWord){group=label;}
    if(isWord){
     if(modern&&level===2)parent=label;
     word={name:label,lines:[],group:[top,sub,group].join('/'),section:sub,reference:top==='其他',parent:modern&&level===3?parent:null};
    }else if(top==='其他')refs.push(line+'\n\n');
    continue;
   }
  }
  if(word)word.lines.push(line);
  else if(top==='其他'&&line.trim())refs.push(line+'\n');
  else if(line.trim()&&!/^<!-- id: G[\w-]+ -->$/.test(line))throw Error('词条外正文，第 '+(i+1)+' 行');
 }
 finish();
 if(!refs[0]?.startsWith('# 其他'))throw Error('找不到「其他」');
 return {words,other:refs.join('').trimEnd()+'\n',modern};
}
function cleanup(word){
 const lines=word.lines, def=lines.findIndex(s=>definition.test(s));
 if(def<0)throw Error(word.name+' 缺少音标及释义');
 const stop=lines.findIndex((s,i)=>i>def&&s.trim()===phraseTitle), at=stop<0?lines.length:stop;
 let note=lines.slice(def+1,at);
 const hasQuote=note.some(s=>s.trim().startsWith('>')&&s.trim()!=='>');
 const active=new Set();
 for(let i=0;i<note.length;i++)if(noteFields.includes(note[i].trim())){
  const next=note.slice(i+1).find(s=>s.trim())?.trim();
  if(next&&next!=='-'&&!noteFields.includes(next))active.add(i);
 }
 note=note.filter((s,i)=>!(noteFields.includes(s.trim())&&!active.has(i))&&
  !(s.trim()==='-'&&noteFields.includes(note[i-1]?.trim()))&&(s.trim()!=='>'||hasQuote));
 word.lines=[...lines.slice(0,def+1),'',...note.join('\n').trim().split('\n').filter((_,i,a)=>a.length!==1||a[0]),'',...lines.slice(at).filter(s=>s.trim()!=='-')];
 word.lines=word.lines.join('\n').trim().replace(/(\n[ \t]*){3,}/g,'\n\n').split('\n');
}
function render(word,level){
 return '#'.repeat(level)+' '+word.name+'\n'+word.lines.join('\n').trim()+'\n\n';
}
function definitions(word,positions){
 let pos='';
 const text=word.lines.find(s=>definition.test(s)).split(' · ').slice(1).join(' · ').replace(/\*\*/g,'');
 return text.split('；').flatMap(s=>{
  const m=/^(\w+)\.\s*(.+)/.exec(s.trim());
  if(m){pos=m[1];s=m[2];}
  return positions.includes(pos)?[s.trim()]:[];
 });
}
function candidates(name){
 const links=[];
 if(name.endsWith('ly')){
  const stem=name.slice(0,-2), possibilities=[stem,name.slice(0,-1)];
  if(stem.endsWith('i'))possibilities.push(stem.slice(0,-1)+'y');
  if(stem.endsWith('l'))possibilities.push(stem+'e');
  if(stem.endsWith('al'))possibilities.push(stem.slice(0,-2));
  for(const root of possibilities)links.push([root,['adj'],['adv'],'ly']);
 }
 if(name.endsWith('ness')){
  const stem=name.slice(0,-4);
  links.push([stem,['adj'],['n'],'ness']);
  if(stem.endsWith('i'))links.push([stem.slice(0,-1)+'y',['adj'],['n'],'ness']);
 }
 if(name.endsWith('y')){
  const stem=name.slice(0,-1);
  for(const root of [stem,stem+'e',...(/(.)\1$/.test(stem)?[stem.slice(0,-1)]:[])])links.push([root,['n','v'],['adj'],'y']);
 }
 return links;
}
function sharesMeaning(base,derived,suffix){
 return base.some(value=>{
  const stem=suffix==='y'?value:value.replace(/的$/,'');
  const gloss=suffix==='y'?derived:derived.replace(/[的地]$/,'');
  return stem===gloss||stem.length>=2&&gloss.includes(stem)||suffix==='y'&&stem.length===1&&
   ['', '多','有','下','带'].some(prefix=>gloss===prefix+stem+'的');
 });
}
function hash(text){
 let h=0x811c9dc5;
 for(const c of text)h=Math.imul(h^c.charCodeAt(0),0x01000193);
 h=Math.imul(h^(h>>>16),0x7feb352d);
 h=Math.imul(h^(h>>>15),0x846ca68b);
 return (h^(h>>>16))>>>0;
}
function organize(sources,rules={}){
 const {words,other,modern}=parse(sources.map(s=>s.trim()).join('\n\n'));
 const main=new Map([...words].filter(([,w])=>!w.reference)), parents=new Map();
 const skip=new Set([...keepSeparate,...rules.keep||[]]);
 const forced={...(modern?{}:{recruitment:'recruit'}),...rules.merge};
 for(const [name,w] of main){
  if(PINS.includes(name))continue;
  if(Object.hasOwn(forced,name)){
   if(!main.has(forced[name]))throw Error('合并目标缺失：'+forced[name]);
   parents.set(name,forced[name]);continue;
  }
  if(skip.has(name))continue;
  if(modern){
   if(w.parent)parents.set(name,w.parent);
   continue;
  }
  for(const [base,from,to,suffix] of candidates(name)){
   const b=main.get(base);
   if(!b||w.group!==b.group||!w.group.endsWith(' 族'))continue;
   const derived=definitions(w,to);
   if(derived.length&&sharesMeaning(definitions(b,from),derived[0],suffix)){parents.set(name,base);break;}
  }
 }
 const children=new Map();
 for(const [name,initial] of parents){
  const seen=new Set([name]);let parent=initial;
  while(parents.has(parent)){
   if(seen.has(parent))throw Error('合并关系循环：'+name);
   seen.add(parent);parent=parents.get(parent);
  }
  if(!children.has(parent))children.set(parent,[]);
  children.get(parent).push(name);
 }
 const card=name=>render(words.get(name),2)+(children.get(name)||[]).sort().map(n=>render(words.get(n),3)).join('');
 const first='# 测试词\n\n'+PINS.map(card).join('');
 const names=[...main.keys()].filter(n=>!parents.has(n)&&!PINS.includes(n));
 const seed=rules.seed||'chuiyi-20261121';
 if(!modern||rules.seed)names.sort((a,b)=>hash(seed+':'+a)-hash(seed+':'+b)||(a<b?-1:1));
 const parts=split(first,names.map(card),other);
 const roundtrip=parse(parts.join('\n'));
 if(roundtrip.words.size!==words.size||[...words].some(([n,w])=>roundtrip.words.get(n)?.lines.join('\n')!==w.lines.join('\n')))
  throw Error('导出回读发现词条正文变化');
 return {parts,words:words.size,cards:names.length+PINS.length,variants:parents.size,refs:words.size-main.size};
}
function split(first,cards,other){
 const bytes=s=>typeof Buffer!=='undefined'?Buffer.byteLength(s):encodeURIComponent(s).replace(/%[A-Fa-f0-9]{2}/g,'x').length;
 const title='# 单词\n\n',parts=[first+title,title,title];
 let idx=0,count=0,size=bytes(first);
 const target=(size+bytes(other)+cards.reduce((n,s)=>n+bytes(s),0))/3;
 for(const [i,card] of cards.entries()){
  const length=bytes(card);
  if(idx<2&&count&&(size+length/2>target||cards.length-i===2-idx)){idx++;size=0;count=0}
  parts[idx]+=card;size+=length;count++;
 }
 parts[2]+=other;
 return parts.map(s=>s.trimEnd()+'\n');
}
module.exports={organize,parse,PINS};
if(typeof require!=='undefined'&&require.main===module){
 const fs=require('node:fs'),path=require('node:path');
 const args=process.argv.slice(2),dir=args.shift();
 const ruleArg=args.find(a=>a.startsWith('--rules='));
 const files=args.filter(a=>!a.startsWith('--rules='));
 if(!dir||!files.length)throw Error('用法：node organize-wordbook.cjs <输出目录> <旧词表1.md> [词表2.md 词表3.md] [--rules=rules.json]');
 const rules=ruleArg?JSON.parse(fs.readFileSync(ruleArg.slice(8),'utf8').replace(/^\uFEFF/,'')):{};
 const result=organize(files.map(f=>fs.readFileSync(f,'utf8')),rules);
 fs.mkdirSync(dir,{recursive:true});
 result.parts.forEach((part,i)=>{
  const output=path.join(dir,'chuiyi-wordbook-0'+(i+1)+'.md');
  if(files.some(file=>path.resolve(file)===path.resolve(output)))throw Error('请将输出写到不同目录');
  fs.writeFileSync(output,part);
 });
 console.log(result.words+' 个单词 · '+result.cards+' 张学习卡 · '+result.variants+' 个折叠词形 · '+result.refs+' 个参考词');
}
