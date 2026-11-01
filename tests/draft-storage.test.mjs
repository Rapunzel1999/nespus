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
