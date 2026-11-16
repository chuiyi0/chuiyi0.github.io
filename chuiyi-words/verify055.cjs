const assert=require('assert'),{boot,catalog}=require('./test-harness.cjs');
for(const editor of [false,true]){
 console.log("boot",editor);const c=boot(editor,{learning:{order:'random2',mode:'words',difficulty:'2'}}),t=c.TEST;
 c.CYTheme={get:()=>'paper',compactPreview:()=>''};
 const id=word=>catalog.entries.find(w=>w.word===word).id;
 for(const w of ['bi','act','ago','all','ear','any','age','add','up','ox'])assert(!t.studyWords().includes(id(w)),w);
 for(const w of ['aim','bar','important','zero','resort'])assert(t.studyWords().includes(id(w)),w);
 const wm=new Map(catalog.entries.map(w=>[w.id,w])),fm=new Map(catalog.families.map(f=>[f.id,f]));assert(t.independent055().every(i=>fm.get(wm.get(i).family_id).entry_ids.length===1));
 assert(t.realFamilies055().every(f=>f.entry_ids.length>1));
 console.log("classification done");const sequences=[];
 for(const order of ['difficulty','random1','random2','random3']){
 console.log(order);t.saved.learning.order=order;const ids=t.studyWords();assert.equal(ids[0],id('resort'));assert.equal(new Set(ids).size,ids.length);assert.deepEqual(ids,t.studyWords());assert.equal(ids.length,catalog.entries.filter(w=>!c.CYBook.familyOnly(w.id)).length);sequences.push(ids.slice(1,30).join());
 t.setRoute({name:'word',id:id('resort')});assert.equal(t.sequence055()[1].id,ids[1]);assert(t.nav().includes('data-study-step="1"'));
 }
 assert.equal(new Set(sequences).size,4);
 console.log('home');t.setRoute({name:'home'});const home=t.homePage();assert(!home.includes('data-page='));assert(!home.includes('data-learning="difficulty"'));assert(!home.includes('data-learning="mode"'));assert.equal((home.match(/data-study-mode=/g)||[]).length,3);assert(home.includes('按多单词笔记'));assert(home.includes('暂无多单词笔记'));
 t.saved.learning.mode='families';assert(t.homePage().includes('resort'));
 t.setRoute({name:'stats'});assert(!t.statsPage().includes('stat-grid'));assert(t.statsPage().includes('最近七天'));
 t.setRoute({name:'word',id:id('resort')});const html=t.wordPage();assert.equal(html.includes('id="direct-story"'),editor);assert(!html.includes('编辑词族故事与提示'));assert(!html.includes('data-story-command='));assert(!html.includes('something'));
 t.saved.bookMeta={name:'test',families:{F3748:{story:'family **story**',hint:'family cue'}},stories:[{id:'story-custom',title:'custom',text:'custom text',hint:'cue',entry_ids:[id('resort')]}]};if(!editor)c.CY_SHARED.bookMeta=t.saved.bookMeta;
 assert(t.storyList().some(s=>s.id==='story-family-F3748'));assert(t.storyList().some(s=>s.id==='story-custom'));
 assert.equal(t.multiWordStories056().length,0);t.saved.bookMeta.stories.push({id:'story-multi',title:'multi',text:'test',entry_ids:[id('resort'),id('aim')]});assert.equal(t.multiWordStories056().length,1);assert.equal(t.orderedStories055()[0].id,'story-multi');for(const s of t.storyList().slice(0,5)){t.setRoute({name:'story',id:s.id});const page=t.storyPage();assert(!page.includes('联想提示'));if(editor)assert(page.includes('contenteditable="true"'))}
 if(editor){t.metaInput048({dataset:{meta:'family-hint',id:'F3748'},value:'new hint'});assert.equal(t.saved.bookMeta.families.F3748.hint,'new hint')}
 console.log('PASS',editor?'editor':'public','categories, ordering, navigation, stories, cues, statistics');
}
