const assert=require('assert'),{boot,catalog}=require('./verify048.cjs');
for(const editor of [false,true]){
 const c=boot(editor);c.CYTheme={get:()=>'paper',compactPreview:()=>''};const t=c.TEST,age=catalog.entries.find(w=>w.word==='age'),add=catalog.entries.find(w=>w.word==='add'),density=catalog.entries.find(w=>w.word==='density');
 for(const word of [age,add,...catalog.entries.filter(w=>['up','ox'].includes(w.word))]){
  assert(c.CYBook.familyOnly(word.id));assert(!t.studyWords().includes(word.id));
  assert(c.CY_CATALOG.families.some(f=>f.entry_ids.includes(word.id)));
  t.setRoute({name:'word',id:word.id});assert(!t.wordPage().includes('class="speak"'));assert(!t.wordPage().includes('data-done="words"'));
  assert(!t.header().includes('known-button'));
 }
 const m={name:'test',families:{},stories:[],familyOnlyWords:{[density.id]:true}};
 if(editor)t.saved.bookMeta=m;else c.CY_SHARED.bookMeta=m;
 assert(!t.studyWords().includes(density.id));t.setRoute({name:'word',id:density.id});
 assert(!t.wordPage().includes('class="speak"'));
 c.CYBook.savePending=()=>{};t.capture();t.exportBook048();const book=JSON.parse(c.output.text);assert(book.shared.bookMeta.familyOnlyWords[density.id]);
 m.familyOnlyWords[density.id]=false;assert(t.studyWords().includes(density.id));
 console.log('PASS',editor?'editor':'public','family-reference preservation, no independent study/audio and metadata export');
}

