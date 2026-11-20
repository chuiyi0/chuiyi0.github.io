/* Markdown wordbook parsing, validation and projection. */
(function(root){
'use strict';
const phraseTitle='短语和搭配', extraTitle='独立短语和搭配';
const sections=['联想','词根','提示','注释'];
const pins=['resort','density','massive','nuclear','bet'];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const phraseKey=en=>en.trim().replace(/\s+/g,' ').toLowerCase();
const groupKey=(a,b,c)=>JSON.stringify([a,b,c]);
function readPhrase(text){
 if(text.includes('\t'))return text.split('\t');
 return /^(.+?)\s+(?=[\p{Script=Han}（「《“【〔、，：！…]|\*\*|\d+\p{Script=Han})(.+)$/u.exec(text)?.slice(1);
}
const formatPhrases=rows=>rows.map(row=>'- '+row.join(same(readPhrase(row.join(' ')),row)?' ':'\t'));
function meanings(raw){
 let pos;
 const rows=[];
 for(const fragment of raw.split('；')){
  const text=fragment.trim(), match=/^(n|v|vi|vt|adj|adv|prep|conj|pron|num|det|interj|int|aux|art|modal|phr)\.\s*(.+)$/i.exec(text);
  if(match)pos=match[1]+'.';
  const value=match?match[2]:text, primary=value.startsWith('**')&&value.endsWith('**');
  if(!pos||!value)return null;
  rows.push({pos,zh:primary?value.slice(2,-2):value,primary});
 }
 return rows;
}
function formatMeanings(rows){
 const groups=new Map();
 for(const {pos,zh,primary} of rows){
  if(!groups.has(pos))groups.set(pos,[]);
  groups.get(pos).push(primary?'**'+zh+'**':zh);
 }
 return [...groups].map(([pos,values])=>pos+' '+values.join('；')).join('；');
}
function mergedMeanings(next,old){
 const remaining=old.slice();
 const matched=next.map(row=>{
  const i=remaining.findIndex(m=>m.pos===row.pos&&m.zh===row.zh);
  return i<0?null:remaining.splice(i,1)[0];
 });
 const counts=new Map();
 next.forEach((row,i)=>{if(!matched[i])counts.set(row.pos,(counts.get(row.pos)||0)+1)});
 return next.map((row,i)=>{
  const available=remaining.filter(m=>m.pos===row.pos);
  const previous=matched[i]??(counts.get(row.pos)===1&&available.length===1?available[0]:null);
  return {sense_group:'',...previous,...row};
 });
}
function readPhraseList(text){
 const rows=text.split(/\r?\n/).filter(line=>line.trim()).map((line,i)=>{
  const row=readPhrase(line.replace(/^ {0,3}- +/,''));
  if(!row||row.length!==2||row.some(x=>!x.trim()||x.length>2000))throw Error('第 '+(i+1)+' 行需要英文短语和中文翻译');
  return row;
 });
 if(rows.length>150)throw Error('单个词条最多可写 150 条短语');
 return rows;
}
function splitBook(input,layout){
 if(typeof input!=='string'||input.length>12*1024*1024)throw Error('请提供 12 MB 以内的 Markdown 文件');
 const lines=input.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split('\n'), entries=[],groups=[],problems=[];
 const modern=lines.find(s=>s.trim())==='# 测试词',headings=[];
 let parent=null,top=null,sub=null,group=null,word=null,fence=null,extraStart=null;
 function phrases(start,end){
  const rows=[];
  for(let i=start;i<end;i++){
   if(!lines[i].trim())continue;
   const item=/^ {0,3}- +(.+)$/.exec(lines[i]),row=item&&readPhrase(item[1]);
   if(!row||row.length!==2||row.some(x=>!x.trim()||x.length>2000))problems.push('第 '+(i+1)+' 行短语格式无效');
   else rows.push(row);
  }
  return rows;
 }
 function finish(end){
  if(!word)return;
  const w=word;
  word=null;
  w.end=end;
  if(w.definitionLine==null){problems.push(w.word+' 缺少音标·释义行');return}
  const data=lines[w.definitionLine],sep=data.indexOf(' · ');
  w.ipa=data.slice(0,sep).trim();
  w.meaningRaw=data.slice(sep+3).trim();
  w.meanings=meanings(w.meaningRaw);
  w.noteStart=w.definitionLine+1;
  const note=lines.slice(w.noteStart,w.phraseStart??end).join('\n').trim();
  w.clearNote=note==='<!-- clear-note -->';
  const body=(w.story?'> '+w.story+'\n\n':'')+note;
  w.markdown=!w.clearNote&&body.split('\n').some(line=>{const s=line.trim();return s&&s!=='>'&&s!=='-'&&!sections.includes(s)})?body:'';
  if(w.phraseStart!=null)w.collocations=phrases(w.phraseStart+1,end);
  if(!w.meanings||w.meanings.length>60||w.meanings.some(m=>!m.zh.trim()||m.zh.length>1500)||w.ipa.length>400||w.markdown.length>50000||w.collocations?.length>150)problems.push(w.word+' 的释义、音标、笔记或短语格式无效');
  entries.push(w);
 }
 for(let i=0;i<lines.length;i++){
  const line=lines[i], marker=/^ {0,3}(\x60{3,}|~{3,})/.exec(line)?.[1];
  if(fence){if(marker?.[0]===fence[0]&&marker.length>=fence.length&&!line.trim().slice(marker.length).trim())fence=null;continue}
  if(marker){fence=marker;continue}
  const h=/^(#{1,4})[ \t]+(.+?)\s*$/.exec(line);
  if(h){
   const level=h[1].length,label=h[2],next=lines[i+1]?.trim();
   const isStructure=level<=2||!word||word.phraseStart!=null||/^<!-- id: [WG]/.test(next)||level===2&&label===extraTitle||level===4&&/^\s*.*\/.+ · /.test(next);
   if(modern){
    const def=/^.*\/.+ · /.test(lines.slice(i+1,i+4).find(s=>s.trim())||'');
    const main=top==='单词'||top==='测试词',other=top==='其他';
    if(level===1&&['测试词','单词','其他'].includes(label)||
       main&&(level===2||level===3)&&def||
       other&&(level<=3&&(!word||word.phraseStart!=null)||level===4&&def)){
     finish(i);
     if(level===1){
      top=label;sub=group=parent=null;
      headings.push({label,index:i});
     }else if(other){
      if(level===2&&label===extraTitle){extraStart=i;break}
      if(level===2){sub=label;group=null}
      if(level===3){group={name:label,key:groupKey(top,sub,label)};groups.push(group)}
      if(level===4){
       if(!group)problems.push('第 '+(i+1)+' 行缺少主题或简单词分组');
       word={word:label,start:i,level,bucket:top,section:sub};
      }
     }else{
      if(level===2)parent=label;
      if(level===3&&!parent)problems.push('第 '+(i+1)+' 行的派生词缺少主词');
      word={word:label,start:i,level,bucket:top,parent:level===3?parent:null};
     }
     continue;
    }
   }
   if(!modern&&isStructure){
    finish(i);
    if(level===2&&label===extraTitle){extraStart=i;break}
    if(level===1){top=label;sub=null;group=null}
    if(level===2){sub=label;group=null}
    if(level===3){
     const key=groupKey(top,sub,label);
     group={name:label,key,id:layout?.groups[key]??/^<!-- id: (G[\w-]+) -->$/.exec(next)?.[1]};
     groups.push(group);
    }
    if(level===4){
     if(!group)problems.push('第 '+(i+1)+' 行词条缺少所属分组');
     word={word:label,start:i,groupId:group?.id,legacyId:/^<!-- id: (W[\w-]+) -->$/.exec(next)?.[1]};
    }
    continue;
   }
  }
  if(!word){if(modern&&line.trim())problems.push('第 '+(i+1)+' 行未归入词条');continue}
  if(word.definitionLine==null){
   if(/^\s*.*\/.+ · /.test(line))word.definitionLine=i;
   else if(/^故事[：:]/.test(line))word.story=line.replace(/^故事[：:]\s*/,'');
  }else if(line.trim()===phraseTitle){
   if(word.phraseStart!=null)problems.push(word.word+' 有重复短语区');
   else word.phraseStart=i;
  }
 }
 finish(lines.length);
 if(fence)problems.push('有未闭合的代码块');
 const extraPhrases=extraStart===null?null:phrases(extraStart+1,lines.length);
 const names=headings.map(h=>h.label);
 if(modern&&(names[0]!=='测试词'||names.at(-1)!=='其他'||!names.includes('单词')||
    names.filter(n=>n==='测试词').length!==1||names.filter(n=>n==='其他').length!==1))
  problems.push('词表标题顺序应为「测试词」「单词」「其他」');
 return {lines,entries,groups,problems,extraStart,extraPhrases,modern,headings};
}
function verifyBook(parsed,catalog,layout,current,renames=new Map()){
 const errors=[...parsed.problems],unknown=[],seen=new Set(),seenGroups=new Set();
 const names=new Map(catalog.entries.map(w=>[current?.(w.id)?.word||w.word,w.id]));
 const base=new Map(catalog.entries.map(w=>[w.id,w]));
 for(const group of parsed.groups){
  if(seenGroups.has(group.key)||!parsed.modern&&layout&&!Object.hasOwn(layout.groups,group.key))errors.push('重复或未知分组：'+group.name);
  seenGroups.add(group.key);
 }
 if(!parsed.modern&&layout&&seenGroups.size!==Object.keys(layout.groups).length)errors.push('分组数量不一致');
 for(const w of parsed.entries){
  const id=names.get(w.word)||renames.get(w.word);
  if(w.legacyId&&w.legacyId!==id)errors.push('旧词条 ID 与拼写不一致：'+w.word);
  if(!id||!base.has(id)){unknown.push(w);continue}
  w.id=id;
  if(seen.has(id))errors.push('重复词条：'+w.word);
  if(!parsed.modern&&layout&&w.groupId!==layout.words[id])errors.push('词条所属分组变更：'+w.word);
  if(parsed.modern&&base.get(id).topicSupplement&&w.bucket!=='其他')errors.push('主题词应保留在「其他」：'+w.word);
  seen.add(id);
 }
 const missing=catalog.entries.filter(w=>!seen.has(w.id)&&(parsed.modern||!w.topicSupplement));
 if(parsed.modern){
  const fixed=parsed.entries.filter(w=>w.bucket==='测试词'&&w.level===2);
  if(!same(fixed.map(w=>w.word),pins)||!same(fixed.map(w=>base.get(w.id)?.word),pins))
   errors.push('测试词须依次为 '+pins.join('、'));
 }
 for(const w of unknown)errors.push('未识别拼写：'+w.word);
 for(const w of missing)errors.push('缺失词条：'+(current?.(w.id)?.word||w.word));
 return {ok:!errors.length,errors,unknown,missing,sourceCount:parsed.entries.length,siteCount:base.size,groups:parsed.groups.length};
}
function removedPhrases(before,after){
 const remaining=new Map();
 for(const row of after){const key=JSON.stringify(row);remaining.set(key,(remaining.get(key)||0)+1)}
 return before.filter(row=>{
  const key=JSON.stringify(row),count=remaining.get(key)||0;
  if(!count)return true;
  remaining.set(key,count-1);
  return false;
 });
}
function compareBook(parsed,catalog,getCurrent){
 const changes=[];
 for(const w of parsed.entries){
  const current=getCurrent(w.id),patch={};
  if(w.word!==current.word)patch.word=w.word;
  const oldMarkdown=String(current.markdown||'').trim();
  if((w.clearNote||w.markdown)&&w.markdown!==oldMarkdown)patch.markdown=w.markdown;
  if(w.ipa!==current.ipa_us)patch.ipa_us=w.ipa;
  const oldMeaningRaw=formatMeanings(current.meanings);
  if(w.meanings&&!same(w.meanings,meanings(oldMeaningRaw)))patch.meanings=mergedMeanings(w.meanings,current.meanings);
  const oldPhrases=current.collocations||[];
  if(w.collocations&&!same(w.collocations,oldPhrases))patch.collocations=w.collocations;
  if(Object.keys(patch).length)changes.push({id:w.id,word:w.word,patch,oldMarkdown,oldIpa:current.ipa_us,oldMeaningRaw,newMeaningRaw:w.meaningRaw,oldPhrases,removed:patch.collocations?removedPhrases(oldPhrases,w.collocations):[]});
 }
 return changes;
}
function composeBook(parsed,getCurrent,extra){
 const wordsByStart=new Map(parsed.entries.map(w=>[w.start,w])),out=[];
 for(let i=0;i<(parsed.extraStart??parsed.lines.length);i++){
  const w=wordsByStart.get(i);
  if(!w){
   if(!/^<!-- id: G[\w-]+ -->$/.test(parsed.lines[i].trim()))out.push(parsed.lines[i]);
   continue;
  }
  const current=getCurrent(w.id);
  out.push('#'.repeat(w.level||4)+' '+current.word,current.ipa_us+' · '+formatMeanings(current.meanings),'');
  const note=String(current.markdown||'').trim();
  if(note)out.push(note,'');
  else if(w.clearNote||w.markdown)out.push('<!-- clear-note -->','');
  else if(!parsed.modern)out.push('>','','联想','-','','词根','-','','提示','-','','注释','-','');
  out.push(phraseTitle,...formatPhrases(current.collocations||[]),'');
  i=w.end-1;
 }
 out.push('## '+extraTitle,'',...formatPhrases(extra),'');
 return out.join('\n');
}
function phraseIndex(entries,extra){
 const index=new Map();
 function add(row,id){
  const key=phraseKey(row[0]);
  if(!index.has(key))index.set(key,[]);
  index.get(key).push({id,row});
 }
 for(const entry of entries)for(const row of entry.collocations||[])add(row,entry.id);
 for(const row of extra||[])add(row,null);
 return index;
}
function studyLayout(parsed){
 if(!parsed.modern)return null;
 const ids=new Map(parsed.entries.map(w=>[w.word,w.id]));
 return {
  order:parsed.entries.filter(w=>w.level===2).map(w=>w.id),
  pinned:parsed.entries.filter(w=>w.bucket==='测试词'&&w.level===2).map(w=>w.id),
  variants:Object.fromEntries(parsed.entries.filter(w=>w.parent).map(w=>[w.id,ids.get(w.parent)])),
  other:parsed.entries.filter(w=>w.bucket==='其他').map(w=>w.id)
 };
}
function joinParts(parts){
 return parts.map(s=>s.replace(/^\uFEFF/,'').trim()).join('\n\n')+'\n';
}
function splitParts(text){
 const parsed=splitBook(text);
 if(!parsed.modern)return [text];
 const {lines,entries,headings}=parsed;
 const starts=entries.filter(w=>w.level===2&&w.bucket==='单词').map(w=>w.start);
 const other=headings.find(h=>h.label==='其他')?.index;
 if(starts.length<3||other==null)return [text];
 const separators=new Set(headings.filter(h=>h.label==='单词').map(h=>h.index));
 const range=(start,end)=>lines.slice(start,end).filter((_,i)=>!separators.has(start+i)).join('\n').trim();
 const first=range(0,starts[0]),tail=range(other,lines.length);
 const chunks=starts.map((start,i)=>range(start,starts[i+1]??other)+'\n\n');
 const bytes=s=>new TextEncoder().encode(s).length;
 const target=(bytes(first)+chunks.reduce((n,s)=>n+bytes(s),0)+bytes(tail))/3;
 let index=0,size=bytes(first),count=0;
 const parts=[first+'\n\n# 单词\n\n','# 单词\n\n','# 单词\n\n'];
 for(const [i,chunk] of chunks.entries()){
  const length=bytes(chunk);
  if(index<2&&count&&(size+length/2>target||chunks.length-i===2-index)){index++;size=0;count=0}
  parts[index]+=chunk;size+=length;count++;
 }
 parts[2]+=tail;
 return parts.map(s=>s.trimEnd()+'\n');
}
function studySequence(study,order){
 const fixed=new Set(study.pinned),remaining=study.order.filter(id=>!fixed.has(id));
 if(order==='random2'||order==='random3'){
  let state=order==='random2'?0x163a7399:0xc5518d7b;
  for(let i=remaining.length-1;i>0;i--){
   state^=state<<13;state^=state>>>17;state^=state<<5;
   const j=(state>>>0)%(i+1);
   [remaining[i],remaining[j]]=[remaining[j],remaining[i]];
  }
 }
 return [...fixed,...remaining];
}
const api={studyLayout,studySequence,joinParts,splitParts,readPhraseList,splitBook,verifyBook,compareBook,composeBook,removedPhrases,phraseIndex,phraseKey,formatPhrases,formatMeanings};
root.CY_MD_BOOK=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
