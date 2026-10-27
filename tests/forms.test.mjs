import test from 'node:test';
import assert from 'node:assert/strict';
import {frontend,walk,deferred,tick} from './helpers/frontend.mjs';
const property={id:'a'.repeat(32),title:'Apartament în Cluj',acceptsContacts:true};

test('SMS-off form and anonymous visitors never start verification',async()=>{
  const f=frontend({user:{id:'buyer',phoneVerified:false,status:'active'}});f.run('phoneSetup()');const form=f.roots.get('#modal-content').querySelector('form');form.elements.phone.value='+40700111222';await form.fire('submit');assert.equal(f.requests.length,0);assert.equal(form.querySelector('button').disabled,true);assert.match(form.textContent,/SMS nu este activată/);
  const anon=frontend({user:null});anon.run('phoneSetup()');assert.match(anon.roots.get('#modal-content').textContent,/Continuă cu ChatGPT/);assert.equal(anon.requests.length,0);
});

test('SMS normalization, duplicate prevention, expiry from server and explicit cooldown',async()=>{
  const pending=deferred(),expiresAt=Date.now()+300000;let sends=0;
  const f=frontend({phoneVerification:true,user:{id:'buyer',phoneVerified:false,status:'active'},fetcher:path=>{if(path==='/api/phone/start'){sends++;return pending.promise;}}});
  f.run('phoneSetup()');let form=f.roots.get('#modal-content').querySelector('form');form.elements.phone.value='0700 111 222';const send=form.fire('submit');await form.fire('submit');assert.equal(sends,1);assert.equal(form.querySelector('fieldset').disabled,true);assert.equal(JSON.parse(f.requests.at(-1).options.body).phone,'+40700111222');
  pending.resolve({sent:true,expiresAt,retryAfterSeconds:60});await send;assert.equal(f.run('S.phoneChallenge.expiresAt'),expiresAt);assert.match(f.roots.get('#modal-content').textContent,/terminat în 1222/);assert.doesNotMatch(f.roots.get('#modal-content').textContent,/0700 111 222|\+40700111222/);
  assert.equal(f.roots.get('#modal-content').querySelector('fieldset').disabled,false);
  f.run('phoneSetup({change:true})');form=f.roots.get('#modal-content').querySelector('form');await form.fire('submit');assert.equal(sends,1);assert.match(form.textContent,/Așteaptă \d+ secunde/);
});

test('closing or replacing the SMS modal during a send never reopens it on completion',async()=>{
  const pending=deferred();const f=frontend({phoneVerification:true,user:{id:'buyer',phoneVerified:false,status:'active'},fetcher:()=>pending.promise});f.run('phoneSetup()');const form=f.roots.get('#modal-content').querySelector('form');form.elements.phone.value='+40700111222';const send=form.fire('submit');f.run('rules()');const text=f.roots.get('#modal-content').textContent;
  pending.resolve({sent:true,expiresAt:Date.now()+600000,retryAfterSeconds:60});await send;assert.equal(f.roots.get('#modal-content').textContent,text);assert.ok(f.run('S.phoneChallenge'));assert.equal(f.run('S.formPending.size'),0);
  f.run('phoneSetup()');assert.match(f.roots.get('#modal-content').textContent,/Introdu codul primit/);assert.equal(f.requests.length,1);
});

test('code validation, expired responses and attempt limits do not cause automatic resends',async()=>{
  for(const code of ['SMS_EXPIRED','SMS_RATE_LIMIT']){
    let checks=0;const f=frontend({phoneVerification:true,user:{id:'buyer',phoneVerified:false,status:'active'},fetcher:path=>{if(path==='/api/phone/check'){checks++;return Response.json({error:code==='SMS_EXPIRED'?'Cod expirat.':'Limita de încercări.',code},{status:400});}}});
    f.run("S.phoneChallenge={phone:'+40700111222',expiresAt:Date.now()+600000};phoneCode()");const form=f.roots.get('#modal-content').querySelector('form');form.elements.code.value='123';await form.fire('submit');assert.equal(checks,0);
    form.elements.code.value='123456';await form.elements.code.fire('input');await form.fire('submit');assert.equal(checks,1);await form.fire('submit');assert.equal(checks,1);assert.equal(f.requests.filter(r=>r.path==='/api/phone/start').length,0);assert.equal(f.run('S.boot.user.phoneVerified'),false);
  }
});

test('successful verification trusts refreshed account data and does not repeat after refresh fails',async()=>{
  let checks=0;const f=frontend({phoneVerification:true,user:{id:'buyer',phoneVerified:false,status:'active'},fetcher:path=>path==='/api/phone/check'?(checks++,{verified:true}):path==='/api/bootstrap'?Response.json({error:'Reîncărcarea a eșuat.'},{status:503}):undefined});
  f.run("S.phoneChallenge={phone:'+40700111222',expiresAt:Date.now()+600000};phoneCode()");const form=f.roots.get('#modal-content').querySelector('form');form.elements.code.value='123456';await form.fire('submit');assert.match(form.textContent,/Acțiunea a fost salvată/);assert.equal(f.run('S.phoneChallenge'),null);await form.fire('submit');assert.equal(checks,1);assert.match(form.textContent,/Telefonul a fost confirmat/);
});

test('contact submission retains text on failure and cannot duplicate or hijack a newer screen',async()=>{
  let response=Response.json({error:'Conexiune indisponibilă.'},{status:503}),calls=0;
  const f=frontend({fetcher:(_path,options)=>{if(options.method==='POST'){calls++;return response;}}});f.run('contact('+JSON.stringify(property)+')');const form=f.roots.get('#modal-content').querySelector('form');form.elements.purpose.value='Caut o locuință pentru familia mea.';form.elements.agree.checked=true;await form.fire('submit');assert.equal(form.elements.purpose.value,'Caut o locuință pentru familia mea.');assert.match(form.textContent,/Conexiune indisponibilă/);
  const pending=deferred();response=pending.promise;const send=form.fire('submit');await form.fire('submit');assert.equal(calls,2);f.run("beginScreen('home');shell(el('main',{},'Alt ecran'));rules()");pending.resolve({id:'b'.repeat(32)});await send;assert.equal(f.run('S.page'),'home');assert.match(f.roots.get('#modal-content').textContent,/O piață pentru contact direct/);
});

test('report, appeal and moderation decisions preserve input on error and suppress simultaneous requests',async()=>{
  for(const setup of ["report({listingId:'"+property.id+"'})","appeal()","moderationDecision('/api/moderation/listings/"+property.id+"','rejected')","userStatusDecision('other','restricted')"]){
    const pending=deferred();let calls=0;const f=frontend({fetcher:()=>{calls++;return pending.promise;}});f.run(setup);const form=f.roots.get('#modal-content').querySelector('form');const input=form.querySelector('textarea');input.value='Un context explicat pentru această decizie.';
    const send=form.fire('submit');await form.fire('submit');assert.equal(calls,1);pending.resolve(Response.json({error:'Cererea nu s-a salvat.'},{status:503}));await send;assert.equal(input.value,'Un context explicat pentru această decizie.');assert.match(form.textContent,/Cererea nu s-a salvat/);assert.equal(form.querySelector('fieldset').disabled,false);
  }
});

test('viewing proposal previews Cluj time, rejects past input and sends once',async()=>{
  const pending=deferred();let calls=0;const f=frontend({fetcher:()=>{calls++;return pending.promise;}});f.run("S.page='messages';S.conversationId='"+property.id+"';viewingProposal('"+property.id+"')");const form=f.roots.get('#modal-content').querySelector('form');form.elements.startsAt.value='2020-01-01T12:00';await form.fire('submit');assert.equal(calls,0);
  const date=new Date(Date.now()+7200000),value=new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);form.elements.startsAt.value=value;await form.elements.startsAt.fire('input');assert.match(form.textContent,/În Cluj-Napoca:/);assert.match(form.textContent,/Europe\/Bucharest/);
  const send=form.fire('submit');await form.fire('submit');assert.equal(calls,1);f.run('rules()');pending.resolve({id:'v1'});await send;assert.match(f.roots.get('#modal-content').textContent,/O piață pentru contact direct/);
});

test('dialogs focus their heading, restore the opener and warn before losing message drafts',async()=>{
  const f=frontend();f.run("beginScreen('home');shell(el('main',{},el('h1',{},'Acasă'),b('Deschide',rules)))");const opener=f.button(f.roots.get('#app'),'Deschide');opener.focus();await opener.fire('click');assert.equal(f.doc.activeElement.tag,'h2');f.roots.get('#modal').close();assert.equal(f.doc.activeElement,opener);
  f.run("S.messageDrafts={example:{body:'Text netrimis',requestId:null}}");let prevented=false;f.windowEvents.beforeunload({preventDefault(){prevented=true}});assert.equal(prevented,true);
  f.run('S.messageDrafts={}');prevented=false;f.windowEvents.beforeunload({preventDefault(){prevented=true}});assert.equal(prevented,false);
});

test('sign-in keeps a safe internal route and route focus follows the new page',async()=>{
  const f=frontend();f.location.search='?view=messages&conversation='+property.id;f.run('signin()');const link=f.roots.get('#modal-content').querySelector('a');assert.equal(new URL(link.href,'https://test.invalid').searchParams.get('return_to'),'/atelier?view=messages&conversation='+property.id);
  f.roots.get('#modal').close();f.run("beginScreen('browse');shell(el('main',{},el('h1',{},'Locuințe')))");assert.equal(f.doc.activeElement.textContent,'Locuințe');
  f.location.pathname='//evil.invalid';f.run('signin()');assert.equal(new URL(f.roots.get('#modal-content').querySelector('a').href,'https://test.invalid').searchParams.get('return_to'),'/atelier');
});
