const assert=require('assert'),{boot,catalog}=require('./test-harness.cjs'),review=require('./simple-words-review.json');
for(const editor of [false,true]){
 const c=boot(editor),t=c.TEST; c.CYTheme={get:()=>'paper',compactPreview:()=>''};const by=new Map(catalog.entries.map(w=>[w.word.toLowerCase(),w]));
 const selected=Object.keys(review.selected);assert.equal(selected.length,670);const study=new Set(t.studyWords());assert.equal(study.size,6705);
 for(const name of selected){const w=by.get(name);assert(w,name);assert(c.CYBook.familyOnly(w.id),name);assert(!study.has(w.id),name);assert(c.CY_CATALOG.families.find(f=>f.id===w.family_id).entry_ids.includes(w.id),name)}
 for(const name of ['aim','bar','important','resort','density','nuclear','zero','January','Monday'])assert(study.has(by.get(name.toLowerCase()).id),name);
 const act=by.get('act');t.setRoute({name:'word',id:act.id});const page=t.wordPage();assert(page.includes('act'));assert(page.includes('F0050'));assert(!page.includes('data-done="words"'));
 c.CYBook.savePending=()=>{};t.capture();t.exportBook048();const b=JSON.parse(c.output.text);assert.equal(b.catalog.entries.length,7375);assert.equal(b.catalog.entries.filter(w=>w.family_only).length,670);assert(t.validateBook048(b));
 const m={name:'override',families:{},stories:[],familyOnlyWords:{[act.id]:false}};if(editor)t.saved.bookMeta=m;else c.CY_SHARED.bookMeta=m;assert(t.studyWords().includes(act.id));
 console.log('PASS',editor?'editor':'public','670 basic references, 6705 study words, protected vocabulary, original family links, exported policy and manual override');
}
