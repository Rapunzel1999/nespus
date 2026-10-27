import test from 'node:test';
import assert from 'node:assert/strict';
import {frontend,walk,deferred,tick} from './helpers/frontend.mjs';
const id=n=>n.toString(16).padStart(32,'0');
const c=(n=1,extra={})=>({id:id(n),listingId:id(n+100),listingTitle:'Apartament în Mărăști',otherName:'Proprietar',status:'accepted',purpose:'Caut o locuință pentru familia mea.',createdAt:Date.now()-10000,updatedAt:Date.now(),available:true,blocked:false,amOwner:false,phoneShared:false,...extra});
const data=(conversation,extra={})=>({conversation,messages:[],viewings:[],phone:null,...extra});

test('inbox searches diacritics, filters states and preserves private deep-link selection',async()=>{
  const a=c(),b=c(2,{status:'requested',amOwner:true,otherName:'Ana'}),closed=c(3,{blocked:true});
  const f=frontend({fetcher:path=>path==='/api/conversations'?{conversations:[a,b,closed]}:path.startsWith('/api/conversations/')?data([a,b,closed].find(x=>path.endsWith(x.id))):undefined});
  await f.run('messages()');assert.equal(f.run('S.conversationId'),a.id);assert.match(f.location.search,/conversation=/);
  const input=f.doc.querySelector('.inbox-sidebar').querySelector('input');input.value='marasti';await input.fire('input');assert.equal(f.doc.querySelector('.inbox-rows').children.length,3);
  input.value='ana';await input.fire('input');assert.equal(f.doc.querySelector('.inbox-rows').children.length,1);assert.match(f.doc.querySelector('.inbox-rows').textContent,/Ana/);
  input.value='';await input.fire('input');const filter=f.doc.querySelector('.inbox-sidebar').querySelector('select');filter.value='closed';await filter.fire('change');assert.match(f.doc.querySelector('.inbox-rows').textContent,/Blocată/);
  f.location.search='?view=messages&conversation='+b.id;await f.run('restoreLocation()');assert.equal(f.run('S.conversationId'),b.id);assert.match(f.doc.querySelector('.conversation-thread').textContent,/Acceptă conversația/);
  assert.equal(f.requests.filter(r=>r.options.method==='POST').length,0);
});

test('older inbox pages are deduplicated and load errors keep existing conversations',async()=>{
  const a=c(),b=c(2);let fail=true;
  const f=frontend({fetcher:path=>path==='/api/conversations'?{conversations:[a],nextCursor:'10:'+a.id}:path.startsWith('/api/conversations?')?(fail?Response.json({error:'Nu se poate încărca acum.'},{status:503}):{conversations:[a,b],nextCursor:null}):path.startsWith('/api/conversations/')?data(a):undefined});
  await f.run('messages()');const more=f.button(f.roots.get('#app'),'Încarcă alte conversații');await more.fire('click');assert.equal(f.doc.querySelector('.inbox-rows').children.length,1);assert.equal(more.disabled,false);
  fail=false;await more.fire('click');assert.equal(f.doc.querySelector('.inbox-rows').children.length,2);assert.equal(f.doc.querySelector('.inbox-more').children.length,0);
});

test('slow conversation responses cannot replace a more recently selected conversation or route',async()=>{
  const a=c(),b=c(2,{listingTitle:'Casă în Zorilor'}),late=deferred();let delay=false;
  const f=frontend({fetcher:path=>path==='/api/conversations'?{conversations:[a,b]}:path.endsWith(a.id)?(delay?late.promise:data(a)):path.endsWith(b.id)?data(b):undefined});
  await f.run('messages()');delay=true;const row=f.doc.querySelector('.inbox-rows').children[0];const pending=row.fire('click');await f.doc.querySelector('.inbox-rows').children[1].fire('click');late.resolve(data(a));await pending;assert.match(f.doc.querySelector('.conversation-thread').textContent,/Casă în Zorilor/);
  const slow=deferred();f.context.fetch=()=>slow.promise;const another=f.run('messages()');f.run("beginScreen('home');shell(el('main',{},'Ecran nou'))");slow.resolve(Response.json({conversations:[a]}));await another;assert.equal(f.run('S.page'),'home');assert.match(f.roots.get('#app').textContent,/Ecran nou/);
});

test('message drafts survive selection changes and errors; retries reuse the same request ID',async()=>{
  const a=c(),b=c(2),responses=[];let failure=true;
  const f=frontend({fetcher:(path,options)=>{
    if(options.method==='POST'){responses.push(JSON.parse(options.body));return failure?Response.json({error:'Trimiterea nu este confirmată.'},{status:503}):{sent:true};}
    return path==='/api/conversations'?{conversations:[a,b]}:path.endsWith(a.id)?data(a):data(b);
  }});
  await f.run('messages()');let form=f.doc.querySelector('.conversation-composer');form.elements.body.value='Bună ziua, este disponibilă?';await form.elements.body.fire('input');
  await f.doc.querySelector('.inbox-rows').children[1].fire('click');await f.doc.querySelector('.inbox-rows').children[0].fire('click');form=f.doc.querySelector('.conversation-composer');assert.equal(form.elements.body.value,'Bună ziua, este disponibilă?');
  await form.fire('submit');assert.match(form.textContent,/Trimiterea nu este confirmată/);assert.equal(form.querySelector('fieldset').disabled,false);assert.equal(form.elements.body.value,'Bună ziua, este disponibilă?');
  failure=false;await form.fire('submit');assert.equal(responses.length,2);assert.equal(responses[0].requestId,responses[1].requestId);assert.match(responses[0].requestId,/^[a-f0-9]{32}$/);assert.equal(f.run('S.messageDrafts['+JSON.stringify(a.id)+']'),undefined);assert.equal(f.doc.querySelector('.conversation-composer').elements.body.value,'');
});

test('a double send is one request and a late success does not take over the selected conversation',async()=>{
  const a=c(),b=c(2,{listingTitle:'Altă proprietate'}),send=deferred();let calls=0;
  const f=frontend({fetcher:(path,options)=>{if(options.method==='POST'){calls++;return send.promise;}return path==='/api/conversations'?{conversations:[a,b]}:path.endsWith(a.id)?data(a):data(b);}});
  await f.run('messages()');const form=f.doc.querySelector('.conversation-composer');form.elements.body.value='Un singur mesaj';await form.elements.body.fire('input');const pending=form.fire('submit');await form.fire('submit');assert.equal(calls,1);assert.equal(form.querySelector('fieldset').disabled,true);
  await f.doc.querySelector('.inbox-rows').children[1].fire('click');send.resolve({sent:true});await pending;assert.equal(f.run('S.conversationId'),b.id);assert.match(f.doc.querySelector('.conversation-title').textContent,/Altă/);assert.equal(f.run('S.conversationPending.size'),0);
});

test('history merges chronologically without duplicates and rejects stale older-page responses',async()=>{
  const a=c(),b=c(2),old={id:id(400),body:'Vechi',senderId:'buyer',createdAt:Date.now()-5000},recent={id:id(401),body:'Recent',senderId:'owner',createdAt:Date.now()},late=deferred();let hold=false;
  const f=frontend({fetcher:path=>path==='/api/conversations'?{conversations:[a,b]}:path.includes('?before=')?(hold?late.promise:data(a,{messages:[old,recent]})):path.endsWith(a.id)?data(a,{messages:[recent],nextMessageCursor:'1:'+recent.id}):data(b)});
  await f.run('messages()');await f.doc.querySelector('.load-older-messages').fire('click');assert.equal(f.doc.querySelectorAll('.message-bubble').length,2);assert.match(f.doc.querySelectorAll('.message-bubble')[0].textContent,/Vechi/);
  await f.run('messages()');hold=true;const request=f.doc.querySelector('.load-older-messages').fire('click');await f.doc.querySelector('.inbox-rows').children[1].fire('click');await f.doc.querySelector('.inbox-rows').children[0].fire('click');late.resolve(data(a,{messages:[old]}));await request;assert.equal(f.doc.querySelectorAll('.message-bubble').length,1);assert.match(f.doc.querySelector('.message-transcript').textContent,/Recent/);
});

test('blocked, unavailable and declined conversations never offer sending or phone sharing',async()=>{
  for(const extra of [{blocked:true},{available:false},{status:'declined'}]){
    const a=c(1,{amOwner:true,...extra}),f=frontend({fetcher:path=>path==='/api/conversations'?{conversations:[a]}:data(a,{phone:'+40700111222'})});await f.run('messages()');
    assert.equal(f.doc.querySelector('.conversation-composer'),null);assert.equal(f.button(f.roots.get('#app'),'Oferă acces la numărul meu'),undefined);assert.ok(!f.doc.querySelector('.conversation-thread').textContent.includes('+40700111222'));
    assert.equal(f.requests.filter(r=>r.options.method==='POST').length,0);
  }
});

test('past viewings cannot be decided and all appointment displays use the Cluj time zone',async()=>{
  const a=c(1,{amOwner:true}),viewings=[{id:id(400),startsAt:Date.now()-1000,status:'requested'},{id:id(401),startsAt:Date.now()+7200000,status:'requested'}];
  const f=frontend({fetcher:path=>path==='/api/conversations'?{conversations:[a]}:data(a,{viewings})});await f.run('messages()');
  assert.match(f.doc.querySelector('.conversation-viewings').textContent,/Europe\/Bucharest/);assert.match(f.doc.querySelector('.conversation-viewings').textContent,/Propunere expirată/);
  assert.equal(walk(f.roots.get('#app')).filter(n=>n.tag==='button'&&n.textContent==='Confirmă vizionarea').length,1);
  assert.match(f.run('clujDate(Date.UTC(2026,0,1,10))'),/12:00/);assert.match(f.run('clujDate(Date.UTC(2026,6,1,10))'),/13:00/);
});

test('sharing requires confirmation and late completion preserves a newer modal',async()=>{
  const a=c(1,{amOwner:true}),pending=deferred();let writes=0;
  const f=frontend({fetcher:(path,options)=>{if(options.method==='POST'){writes++;return pending.promise;}return path==='/api/conversations'?{conversations:[a]}:data(a);}});await f.run('messages()');
  await f.button(f.roots.get('#app'),'Oferă acces la numărul meu').fire('click');assert.equal(writes,0);const form=f.roots.get('#modal-content').querySelector('form');const sent=form.fire('submit');await form.fire('submit');assert.equal(writes,1);
  f.run('rules()');const title=f.roots.get('#modal-content').textContent;pending.resolve({shared:true});await sent;assert.equal(f.roots.get('#modal').open,true);assert.equal(f.roots.get('#modal-content').textContent,title);
});

test('anonymous inbox does not fetch private content and failed inbox has retry rather than empty claims',async()=>{
  const anon=frontend({user:null});await anon.run('messages()');assert.equal(anon.requests.length,0);assert.match(anon.roots.get('#modal-content').textContent,/Continuă cu ChatGPT/);
  const fail=frontend({fetcher:()=>Response.json({error:'Rețeaua este indisponibilă.'},{status:503})});await fail.run('messages()');assert.match(fail.doc.querySelector('.inbox-load-error').textContent,/Rețeaua/);assert.doesNotMatch(fail.roots.get('#app').textContent,/primele discuții/);
});

test('a blocked conversation retains a readable unsent draft that can be discarded locally',async()=>{
  const a=c(1,{blocked:true}),f=frontend({fetcher:path=>path==='/api/conversations'?{conversations:[a]}:data(a)});
  f.run('S.messageDrafts['+JSON.stringify(a.id)+']={body:"Text de păstrat",requestId:null}');await f.run('messages()');
  assert.equal(f.doc.querySelector('.conversation-saved-draft').querySelector('textarea').value,'Text de păstrat');assert.equal(f.doc.querySelector('.conversation-composer'),null);
  await f.button(f.roots.get('#app'),'Renunță la textul netrimis').fire('click');assert.equal(f.run('S.messageDrafts['+JSON.stringify(a.id)+']'),undefined);assert.equal(f.doc.querySelector('.conversation-saved-draft'),null);assert.equal(f.requests.filter(r=>r.options.method==='POST').length,0);
});
