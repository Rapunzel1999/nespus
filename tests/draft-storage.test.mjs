import test from 'node:test';
import assert from 'node:assert/strict';
import {frontend,deferred,tick} from './helpers/frontend.mjs';

test('autosave serializes revisions and retains edits typed during the pending request',async()=>{
  const pending=deferred();let calls=0;
  const h=frontend({fetcher:async(path,options)=>{if(path==='/api/editor-draft'&&options.method==='PUT'){calls++;if(calls===1)return pending.promise;return {revision:2,savedAt:Date.now()};}}});
  h.run("S.editorDirty=true;S.draft={title:'Prima copie',photos:[]};S.step=2");
  const first=h.run('flushDraftSave()');await tick();h.run("S.draft.title='Text adăugat în timpul salvării';S.step=3");const second=h.run('flushDraftSave()');
  assert.equal(calls,1);pending.resolve({revision:1,savedAt:Date.now()});await first;await second;
  const requests=h.requests.filter(r=>r.options.method==='PUT');assert.equal(requests.length,2);assert.equal(JSON.parse(requests[1].options.body).revision,1);assert.equal(JSON.parse(requests[1].options.body).draft.title,'Text adăugat în timpul salvării');assert.equal(h.run('S.step'),3);
});

test('failed autosave leaves the current text and the tab recovery copy intact',async()=>{
  const storage=new Map(),h=frontend({fetcher:path=>path==='/api/editor-draft'?Response.json({error:'Ciorna s-a schimbat.',code:'DRAFT_CONFLICT'},{status:409}):undefined});
  h.context.window.sessionStorage={setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)};
  h.run("S.editorDirty=true;S.draft={title:'Text de recuperat',photos:[]};S.step=5");
  await assert.rejects(h.run('flushDraftSave()'),/s-a schimbat/);assert.equal(h.run('S.draft.title'),'Text de recuperat');assert.match(h.run('draftSaveLabel()'),/păstrate în această filă/);assert.equal(JSON.parse([...storage.values()][0]).step,5);
});

test('an autosave response cannot restore the local copy removed on signout',async()=>{
  for(const failure of [false,true]){
    const pending=deferred(),storage=new Map(),h=frontend({fetcher:()=>pending.promise});
    h.context.window.sessionStorage={setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)};
    h.run("S.editorDirty=true;S.draft={title:'Text privat',photos:[]};preserveDraftLocally()");
    const saving=h.run('flushDraftSave()');await tick();h.run('forgetLocalDraftOnSignout()');assert.equal(storage.size,0);
    if(failure){pending.reject(Error('offline'));await assert.rejects(saving);}else{pending.resolve({revision:1,savedAt:Date.now()});await saving;}
    assert.equal(storage.size,0,'a late '+(failure?'failure':'success')+' must not recreate private tab storage');
    // A cancelled navigation followed by deliberate editing can save a new copy.
    h.run("S.draft.title='Editare continuată';scheduleDraftSave()");assert.equal(JSON.parse([...storage.values()][0]).draft.title,'Editare continuată');
  }
});

test('save status distinguishes confirmed content from newer edits and wizard steps',async()=>{
  const h=frontend({fetcher:()=>({revision:1,savedAt:Date.now()})});
  h.run("S.editorDirty=true;S.draft={title:'Text confirmat',photos:[]};S.step=2");await h.run('flushDraftSave()');
  assert.match(h.run('draftSaveLabel()'),/^Salvat acum/);
  h.run("S.draft.title='Text încă nesalvat'");assert.doesNotMatch(h.run('draftSaveLabel()'),/^Salvat acum/);
  h.run("S.draft.title='Text confirmat';S.step=3");assert.doesNotMatch(h.run('draftSaveLabel()'),/^Salvat acum/);
  h.run("S.step=2;S.photos=['data:image/jpeg;base64,new']");assert.doesNotMatch(h.run('draftSaveLabel()'),/^Salvat acum/);
});

test('a draft recovered from the account is confirmed until its contents change',async()=>{
  const h=frontend({fetcher:()=>({draft:{title:'Ciornă din cont',photos:[],declarationVersion:'old',ownerDeclaration:true},step:5,revision:4,updatedAt:Date.now()})});
  await h.run('recoverEditorDraft()');assert.equal(h.run('S.draft.ownerDeclaration'),false);
  // Invalidating an old declaration changes the recovered content and needs a new save.
  assert.doesNotMatch(h.run('draftSaveLabel()'),/^Salvat acum/);
  const current=frontend({fetcher:()=>({draft:{title:'Ciornă actuală',photos:[]},step:5,revision:4,updatedAt:Date.now()})});
  await current.run('recoverEditorDraft()');assert.match(current.run('draftSaveLabel()'),/^Salvat acum/);
});

function tabStorage(h,storage){h.context.window.sessionStorage={setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)};}
test('reload retains a confirmed local copy only at the same account revision',async()=>{
  const storage=new Map(),savedAt=Date.now(),draft={title:'Ciornă confirmată',photos:[]};
  const first=frontend({fetcher:()=>({revision:3,savedAt})});tabStorage(first,storage);
  first.run("S.editorDirty=true;S.draft={title:'Ciornă confirmată',photos:[]};S.step=2");await first.run('flushDraftSave()');
  const resumed=frontend({fetcher:()=>({draft,revision:3,step:2,updatedAt:savedAt})});tabStorage(resumed,storage);await resumed.run('recoverEditorDraft()');assert.match(resumed.run('draftSaveLabel()'),/^Salvat acum/);
  const newer=frontend({fetcher:()=>({draft:{...draft,title:'Versiune nouă din altă filă'},revision:4,step:2,updatedAt:savedAt})});tabStorage(newer,storage);await newer.run('recoverEditorDraft()');assert.equal(newer.run('S.draft.title'),'Versiune nouă din altă filă');assert.equal(newer.run('S.conflictingDraft.draft.title'),draft.title);
});

test('recovering pending tab edits resumes autosave without losing the edits',async()=>{
  const savedAt=Date.now(),storage=new Map([['intre-noi-editor:buyer',JSON.stringify({draft:{title:'Text local mai nou',photos:[]},step:2,revision:3})]]);
  const h=frontend({fetcher:(_path,options)=>options.method==='PUT'?{revision:4,savedAt}:{draft:{title:'Text vechi în cont',photos:[]},revision:3,step:2,updatedAt:savedAt}});tabStorage(h,storage);
  await h.run('recoverEditorDraft()');assert.equal(h.run('S.draft.title'),'Text local mai nou');assert.doesNotMatch(h.run('draftSaveLabel()'),/^Salvat acum/);assert.equal(h.timers.length,1,'pending recovery must actually schedule its promised save');
  await h.timers[0]();await tick();assert.equal(JSON.parse(h.requests.at(-1).options.body).draft.title,'Text local mai nou');assert.match(h.run('draftSaveLabel()'),/^Salvat acum/);
});

test('failed account recovery keeps the tab copy and reports uncertainty without writing',async()=>{
  const storage=new Map([['intre-noi-editor:buyer',JSON.stringify({draft:{title:'Text local privat',photos:[]},step:2,revision:3,confirmedAt:Date.now()})]]);
  const h=frontend({fetcher:()=>{throw Error('offline');}});tabStorage(h,storage);await h.run('recoverEditorDraft()');
  assert.equal(h.run('S.draft.title'),'Text local privat');assert.match(h.run('draftSaveLabel()'),/Nu am putut verifica ciorna din cont/);assert.equal(h.timers.length,0);assert.equal(h.requests.length,1);assert.equal(storage.size,1);
});

test('the save clock updates visually without repeating screen-reader announcements',async()=>{
  const h=frontend({fetcher:()=>({revision:1,savedAt:Date.now()})});h.run("create();S.draft.title='Ciornă confirmată';S.editorDirty=true");await h.run('flushDraftSave()');
  const status=h.doc.querySelector('.editor-save-announcement'),clock=h.doc.querySelector('.editor-save-state');assert.ok(status,'separate stable announcement region');assert.equal(status.getAttribute('role'),'status');assert.equal(clock.getAttribute('aria-live'),'off');assert.equal(status.textContent,'Ciorna este salvată în cont.');
  let writes=0;const descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(status),'textContent');Object.defineProperty(status,'textContent',{get(){return descriptor.get.call(this);},set(value){writes++;descriptor.set.call(this,value);}});
  const before=clock.textContent;h.run('S.draftSavedAt-=3000;paintDraftSaveState()');assert.notEqual(clock.textContent,before);assert.equal(writes,0);
  h.run("S.draft.title='Modificare nouă';paintDraftSaveState()");assert.equal(writes,1);assert.match(status.textContent,/nesalvate/);h.run('paintDraftSaveState()');assert.equal(writes,1);
  h.run("S.autosaveError='Conexiune întreruptă.';paintDraftSaveState()");assert.equal(writes,2);assert.match(status.textContent,/Conexiune întreruptă/);
});

test('leaving a confirmed draft is quiet but pending, uncertain and unsaved work stays protected',async()=>{
  const h=frontend({fetcher:()=>({revision:1,savedAt:Date.now()})});h.run("S.draft={title:'Salvat',photos:[]};S.editorDirty=true");await h.run('flushDraftSave()');
  const warns=()=>{let blocked=false;h.windowEvents.beforeunload({preventDefault(){blocked=true;}});return blocked;};assert.equal(warns(),false,'confirmed content should not trigger a loss warning');
  h.run("S.draft.title='Nesalvat'");assert.equal(warns(),true);h.run("S.draft.title='Salvat';S.autosaveBusy=true");assert.equal(warns(),true);
  h.run("S.autosaveBusy=false;S.autosaveError='Confirmare necunoscută'");assert.equal(warns(),true);h.run("S.autosaveError='';S.editorProcessing=true");assert.equal(warns(),true);
});

test('a separate conflicting tab copy remains protected even without an active editor draft',()=>{
  const h=frontend();h.run("S.editorDirty=false;S.conflictingDraft={draft:{title:'Copie doar în filă'}}");let blocked=false;h.windowEvents.beforeunload({preventDefault(){blocked=true;}});assert.equal(blocked,true);
});

test('discard confirmation explains removal of the account working copy as well as local edits',async()=>{
  const h=frontend({fetcher:(_path,options)=>({revision:options.method==='DELETE'?2:1,savedAt:Date.now()})});h.run("S.draft={title:'Ciornă de lucru',photos:[]};S.editorDirty=true");await h.run('flushDraftSave()');h.run("S.page='home';shell(el('main',{},'Acasă'))");
  await h.button(h.roots.get('#app'),'Renunță').fire('click');assert.match(h.roots.get('#modal-content').textContent,/ciorna de lucru din cont/);assert.doesNotMatch(h.roots.get('#modal-content').textContent,/doar modificările din această filă/);
  await h.button(h.roots.get('#modal-content'),'Renunță la modificări').fire('click');await h.run('S.draftQueue');assert.equal(h.requests.filter(r=>r.options.method==='DELETE').length,1);assert.equal(h.requests.at(-1).path,'/api/editor-draft');assert.equal(h.run('S.editorDirty'),false);
});

test('failed or conflicting discard keeps local text, blocks duplicate requests and permits explicit retry',async()=>{
  for(const status of [409,503]){
    const pending=deferred(),storage=new Map();let deletes=0;
    const h=frontend({fetcher:(_path,options)=>options.method==='DELETE'?(deletes++,pending.promise):{revision:1,savedAt:Date.now()}});tabStorage(h,storage);
    h.run("S.draft={title:'Text de păstrat',photos:[]};S.editorDirty=true");await h.run('flushDraftSave()');h.run("S.page='home';shell(el('main',{},'Acasă'))");await h.button(h.roots.get('#app'),'Renunță').fire('click');
    const button=h.button(h.roots.get('#modal-content'),'Renunță la modificări'),first=button.fire('click');await button.fire('click');await tick();assert.equal(deletes,1);assert.equal(h.run('S.editorDirty'),true);assert.equal(storage.size,1);assert.equal(h.run('editorBusy()'),true);
    pending.resolve(Response.json({error:'Eliminarea nu a fost confirmată.'},{status}));await first;
    assert.equal(h.run('S.draft.title'),'Text de păstrat');assert.equal(storage.size,1);assert.match(h.roots.get('#modal-content').textContent,/Eliminarea nu a fost confirmată/);assert.equal(h.run('editorBusy()'),false);assert.equal(deletes,1);
  }
});

test('successful replacement starts after the pending guard clears and never hijacks a newer dialog',async()=>{
  for(const replaced of [false,true]){
    const pending=deferred(),h=frontend({fetcher:(_path,options)=>options.method==='DELETE'?pending.promise:{revision:1,savedAt:Date.now()}});
    h.run("createFor('sale');S.draft.title='Ciornă veche';S.editorDirty=true;renderCreate()");await h.run('flushDraftSave()');h.run("createFor('rent')");
    const saving=h.button(h.roots.get('#modal-content'),'Renunță și continuă').fire('click');await tick();assert.equal(h.doc.querySelector('.editor-fields').disabled,true);let text;if(replaced){h.run('rules()');text=h.roots.get('#modal-content').textContent;}
    pending.resolve({revision:2,deleted:true});await saving;
    if(replaced){assert.equal(h.roots.get('#modal-content').textContent,text);assert.equal(h.run('S.page'),'create');assert.equal(h.roots.get('#app').querySelector('form').elements.title.value,'');assert.equal(h.run('S.editorDirty'),false);assert.equal(h.doc.querySelector('.editor-fields').disabled,false);}
    else{assert.equal(h.run('S.page'),'create');assert.equal(h.run('S.draft.transaction'),'rent');assert.equal(h.run('editorBusy()'),false);}
  }
});
