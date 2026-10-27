import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import jpeg from 'jpeg-js';
import {handleApi} from '../lib/api.mjs';
import {VERSION, DAY,validateListing} from '../lib/model.mjs';

const smsFixture={accountSid:'AC'+'a'.repeat(32),authToken:'fixture-only-not-a-credential',serviceSid:'VA'+'b'.repeat(32),enabled:'true',totalLimit:'100'};

const NOW = Date.UTC(2026,9,15,18);
const lid = n => n.toString(16).padStart(32,'0');
const identity = id => ({userId:id,email:id+'@test.invalid',displayName:id});
function fixture() {
  const sql = new DatabaseSync(':memory:');
  const hooks={beforeRun:null};
  sql.exec('PRAGMA foreign_keys=ON;');
  sql.exec(readFileSync(new URL('../drizzle/0000_nervous_leader.sql',import.meta.url),'utf8'));
  function prepared(query,args=[]) { return {
    bind(...values){return prepared(query,values);},
    async first(){return sql.prepare(query).get(...args)??null;},
    async all(){return {results:sql.prepare(query).all(...args)};},
    async run(){if(hooks.beforeRun)await hooks.beforeRun(query,args);const result=sql.prepare(query).run(...args);return {success:true,meta:{changes:Number(result.changes)}};},
  }; }
  const db={prepare:prepared,async batch(statements){sql.exec('BEGIN');try{const out=[];for(const statement of statements)out.push(await statement.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
  const user=(id,verified=true,status='active')=>sql.prepare('INSERT INTO users(id,name,email,phone,phone_hash,phone_verified_at,status,created_at) VALUES (?,?,?,?,?,?,?,?)').run(id,id,id+'@test.invalid',verified?'+40700111'+String(100+sql.prepare('SELECT count(*) AS n FROM users').get().n):null,verified?id:null,verified?NOW-1000:null,status,NOW-1000);
  for(const id of ['owner','buyer','other','mod','mod2'])user(id);
  user('unverified',false);
  const listing=(id=lid(1),status='published',owner='owner',until=NOW+DAY)=>{
    sql.prepare('INSERT INTO listings(id,owner_id,title,`transaction`,type,district,price,currency,area,rooms,description,photos,exact_address,relationship,status,created_at,updated_at,available_until) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,owner,'Apartament luminos','sale','apartment','Centru',120000,'EUR',50,2,'O locuință spațioasă cu lumină naturală și balcon.','[]','Strada SECRETĂ 99, apartament 7','owner',status,NOW,NOW,until);
    return id;
  };
  const request=async(path,{as=null,method='GET',data,headers={},now=NOW,...extra}={})=>{
    const response=await handleApi(new Request('https://test.invalid/api'+path,{method,headers:{...(method==='GET'?{}:{origin:'https://test.invalid','content-type':'application/json'}),...headers},...(data===undefined?{}:{body:JSON.stringify(data)})}),db,{principal:as?identity(as):null,moderatorEmails:['mod@test.invalid','mod2@test.invalid'],now,...extra});
    return {status:response.status,data:await response.json(),headers:response.headers};
  };
  const contact=(listingId=lid(1),as='buyer',extra={})=>request('/contact-requests',{as,method:'POST',data:{listingId,purpose:'Doresc să cumpăr această locuință pentru familia mea.',contactDeclaration:true,declarationVersion:VERSION,...extra}});
  const accepted=async()=>{listing();const c=await contact();assert.equal(c.status,201,JSON.stringify(c));assert.equal((await request('/conversations/'+c.data.id+'/decision',{as:'owner',method:'POST',data:{decision:'accepted'}})).status,200);return c.data.id;};
  return {sql,db,user,listing,request,contact,accepted,hooks};
}

test('public feed/detail/favorites never disclose phone or exact address; drafts and expiry are inaccessible',async()=>{
  const f=fixture();f.listing();f.listing(lid(2),'draft');f.listing(lid(3),'published','owner',NOW);
  for(const path of ['/listings','/listings/'+lid(1)]){const r=await f.request(path);assert.equal(r.status,200);const serialized=JSON.stringify(r.data);assert.ok(!serialized.includes('SECRETĂ'));assert.ok(!serialized.includes('+407'));assert.ok(!serialized.includes('exactAddress'));assert.equal(r.headers.get('cache-control'),'no-store');}
  assert.equal((await f.request('/listings')).data.listings.length,1);
  for(const id of [lid(2),lid(3)]){assert.equal((await f.request('/listings/'+id)).status,404);assert.equal((await f.contact(id)).status,404);}
  await f.request('/favorites/'+lid(1),{as:'buyer',method:'PUT'});
  const favorite=await f.request('/favorites',{as:'buyer'});assert.ok(!JSON.stringify(favorite.data).includes('SECRETĂ'));
  assert.equal((await f.request('/mine',{as:'owner'})).data.listings[0].exactAddress,'Strada SECRETĂ 99, apartament 7');
  assert.equal((await f.request('/mine',{as:'buyer'})).data.listings.length,0);
});

test('server principal, ownership, moderator role and origin cannot be spoofed',async()=>{
  const f=fixture();f.listing(lid(1),'draft');
  assert.equal((await f.request('/mine',{headers:{'x-user-id':'owner','oai-authenticated-user-id':'owner'}})).status,401);
  assert.equal((await f.request('/listings/'+lid(1)+'/close',{as:'buyer',method:'POST',data:{status:'sold',ownerId:'owner',role:'moderator'}})).status,404);
  assert.equal((await f.request('/moderation',{as:'buyer'})).status,403);
  assert.equal((await f.request('/listings/'+lid(1)+'/close',{as:'owner',method:'POST',data:{status:'sold'},headers:{origin:'https://evil.invalid'}})).status,403);
  assert.equal(f.sql.prepare('SELECT status FROM listings').get().status,'draft');
});

test('contact requires verified phone and explicit current declaration',async()=>{
  const f=fixture();f.listing();
  assert.equal((await f.contact(lid(1),'unverified')).status,403);
  assert.equal((await f.contact(lid(1),'buyer',{contactDeclaration:false})).status,400);
  assert.equal((await f.contact(lid(1),'buyer',{declarationVersion:'old'})).status,400);
  const c=await f.contact();assert.equal(c.status,201);
  const d=f.sql.prepare("SELECT * FROM declarations WHERE kind='contact'").get();assert.equal(d.user_id,'buyer');assert.equal(d.version,VERSION);assert.equal(d.accepted_at,NOW);assert.ok(d.text_snapshot.includes('agenții'));
  assert.equal((await f.request('/conversations/'+c.data.id+'/messages',{as:'buyer',method:'POST',data:{body:'Bună ziua!'}})).status,403);
});

test('acceptance and phone disclosure are independent owner-only gates, invisible to outsiders',async()=>{
  const f=fixture(),c=await f.accepted();
  assert.equal((await f.request('/conversations/'+c,{as:'buyer'})).data.phone,null);
  assert.equal((await f.request('/conversations/'+c,{as:'other'})).status,404);
  assert.equal((await f.request('/conversations/'+c+'/share-phone',{as:'buyer',method:'POST'})).status,403);
  assert.equal((await f.request('/conversations/'+c+'/share-phone',{as:'owner',method:'POST'})).status,200);
  assert.match((await f.request('/conversations/'+c,{as:'buyer'})).data.phone,/^\+407/);
  assert.equal((await f.request('/conversations/'+c+'/messages',{as:'other',method:'POST',data:{body:'Intrus'}})).status,404);
});

test('block revokes phone, prevents messages and persists across distinct listings',async()=>{
  const f=fixture(),c=await f.accepted();
  await f.request('/conversations/'+c+'/share-phone',{as:'owner',method:'POST'});
  assert.equal((await f.request('/conversations/'+c+'/block',{as:'buyer',method:'POST'})).status,200);
  assert.equal((await f.request('/conversations/'+c,{as:'buyer'})).data.phone,null);
  assert.equal((await f.request('/conversations/'+c+'/messages',{as:'owner',method:'POST',data:{body:'Un mesaj nou'}})).status,403);
  f.listing(lid(2));assert.equal((await f.contact(lid(2))).status,403);
  assert.equal((await f.request('/conversations/'+c+'/share-phone',{as:'owner',method:'POST'})).status,403);
});

test('expiry and account restriction revoke previously shared phone and further activity',async()=>{
  const f=fixture(),c=await f.accepted();await f.request('/conversations/'+c+'/share-phone',{as:'owner',method:'POST'});
  assert.equal((await f.request('/conversations/'+c,{as:'buyer',now:NOW+2*DAY})).data.phone,null);
  assert.equal((await f.request('/conversations/'+c+'/messages',{as:'buyer',method:'POST',data:{body:'Bună ziua'},now:NOW+2*DAY})).status,403);
  f.sql.prepare("UPDATE users SET status='restricted' WHERE id='owner'").run();
  assert.equal((await f.request('/listings/'+lid(1))).status,404);
  assert.equal((await f.request('/conversations/'+c,{as:'buyer'})).data.phone,null);
});

test('daily contact quota persists after declined/deleted requests',async()=>{
  const f=fixture();for(let n=1;n<=4;n++)f.listing(lid(n));
  for(let n=1;n<=3;n++)assert.equal((await f.contact(lid(n))).status,201);
  f.sql.prepare('DELETE FROM declarations').run();f.sql.prepare('DELETE FROM contact_requests').run();
  assert.equal((await f.contact(lid(4))).status,429);
  assert.equal(f.sql.prepare("SELECT count(*) AS n FROM rate_limits WHERE key LIKE 'contact-new:%'").get().n,1);
});

test('report count alone cannot restrict user; unrelated accounts cannot report conversations or appeal cases',async()=>{
  const f=fixture(),c=await f.accepted();
  assert.equal((await f.request('/reports',{as:'other',method:'POST',data:{conversationId:c,reason:'agency',details:'Acest caz nu îmi aparține.'}})).status,404);
  const r=await f.request('/reports',{as:'buyer',method:'POST',data:{conversationId:c,reason:'agency',details:'Solicitare de intermediere în conversație.'}});assert.equal(r.status,201);
  assert.equal(f.sql.prepare("SELECT status FROM users WHERE id='owner'").get().status,'active');
  assert.equal((await f.request('/appeals',{as:'other',method:'POST',data:{reportId:r.data.id,reason:'Doresc să contest acest caz fără să fiu implicat.'}})).status,404);
  assert.equal((await f.request('/appeals',{as:'owner',method:'POST',data:{reportId:r.data.id,reason:'Nu sunt intermediar și solicit reanalizarea cazului.'}})).status,201);
});

test('moderation rejects self approval and false property-verification badge',async()=>{
  const f=fixture();f.listing(lid(1),'pending','mod');f.listing(lid(2),'pending');
  const review=(id,extra={})=>f.request('/moderation/listings/'+id,{as:'mod',method:'POST',data:{decision:'published',reason:'Analiză editorială efectuată.',...extra}});
  assert.equal((await review(lid(1))).status,403);
  assert.equal((await review(lid(2),{ownershipReviewed:true})).status,400);
  assert.equal((await review(lid(2))).status,200);
  assert.equal(f.sql.prepare('SELECT ownership_status FROM listings WHERE id=?').get(lid(2)).ownership_status,'declared');
});

test('appeal is reviewed by a different moderator from initial report decision',async()=>{
  const f=fixture();f.listing();const r=await f.request('/reports',{as:'buyer',method:'POST',data:{listingId:lid(1),reason:'misleading',details:'Informațiile merită analizate de moderator.'}});
  assert.equal((await f.request('/moderation/reports/'+r.data.id,{as:'mod',method:'POST',data:{decision:'dismissed',reason:'Dovezile nu susțin sesizarea.'}})).status,200);
  const a=await f.request('/appeals',{as:'buyer',method:'POST',data:{reportId:r.data.id,reason:'Solicit o analiză independentă a acestei decizii.'}});
  const decide=as=>f.request('/moderation/appeals/'+a.data.id,{as,method:'POST',data:{decision:'dismissed',reason:'Am verificat independent contextul.'}});
  assert.equal((await decide('mod')).status,403);assert.equal((await decide('mod2')).status,200);
});

test('public preferences cannot bypass contact filtering',async()=>{
  const f=fixture();f.listing();
  const r=await f.request('/listings/'+lid(1)+'/preferences',{as:'owner',method:'POST',data:{acceptsContacts:true,contactHours:'Sunați la +40722123456'}});
  assert.equal(r.status,400);assert.ok(!JSON.stringify((await f.request('/listings/'+lid(1))).data).includes('+40722123456'));
});

test('disabled SMS cannot falsely confirm a phone through body flags',async()=>{
  const f=fixture();
  assert.equal((await f.request('/phone/check',{as:'unverified',method:'POST',data:{code:'123456',verified:true,phoneVerified:true}})).status,503);
  assert.equal(f.sql.prepare("SELECT phone_verified_at FROM users WHERE id='unverified'").get().phone_verified_at,null);
  assert.equal((await f.request('/bootstrap',{as:'unverified'})).data.capabilities.phoneVerification,false);
});

const draftInput={title:'Apartament liniștit în Cluj',transaction:'rent',type:'apartment',district:'Zorilor',price:650,currency:'EUR',area:55,rooms:2,description:'Apartament luminos cu balcon și spații de depozitare generoase.',photos:['data:image/jpeg;base64,'+Buffer.from(jpeg.encode({data:Buffer.from([200,100,60,255]),width:1,height:1},80).data).toString('base64')],exactAddress:'Strada privată 3',relationship:'owner',ownerDeclaration:true,declarationVersion:VERSION};
test('actual listing creation, editing and submit execute production SQL and require owner declaration',async()=>{
  const f=fixture();
  assert.equal((await f.request('/listings',{as:'owner',method:'POST',data:{...draftInput,ownerDeclaration:false}})).status,400);
  const c=await f.request('/listings',{as:'owner',method:'POST',data:draftInput});assert.equal(c.status,201,JSON.stringify(c));
  const id=c.data.listing.id;assert.equal(c.data.listing.ownerId,'owner');assert.equal(c.data.listing.status,'draft');
  assert.equal((await f.request('/listings/'+id,{as:'buyer',method:'PATCH',data:draftInput})).status,404);
  const edit=await f.request('/listings/'+id,{as:'owner',method:'PATCH',data:{...draftInput,price:700}});assert.equal(edit.status,200,JSON.stringify(edit));
  assert.equal((await f.request('/listings/'+id+'/submit',{as:'owner',method:'POST'})).status,200);
  assert.equal((await f.request('/listings/'+id,{as:'owner',method:'PATCH',data:draftInput})).status,409);
  assert.equal((await f.request('/listings/'+id)).status,404);
  assert.equal(f.sql.prepare('SELECT status FROM listings WHERE id=?').get(id).status,'pending');
});

test('listing validation rejects out-of-pilot locations, inline contact and disguised upload types',async()=>{
  const f=fixture();
  for(const invalid of [{city:'Florești'},{description:'Contactați proprietarul la +40722123456 pentru detalii.'},{photos:['data:image/svg+xml;base64,PHN2Zz4=']},{photos:['data:image/jpeg;base64,PHNjcmlwdD4=']},{relationship:'agent'}]){
    const r=await f.request('/listings',{as:'owner',method:'POST',data:{...draftInput,...invalid}});assert.equal(r.status,400,JSON.stringify(invalid));
  }
});

test('a moderator cannot decide a report about a conversation in which they are the requester',async()=>{
  const f=fixture();f.listing();const c=await f.contact(lid(1),'mod');assert.equal(c.status,201);
  const r=await f.request('/reports',{as:'owner',method:'POST',data:{conversationId:c.data.id,reason:'harassment',details:'Participantul a trimis solicitări nepotrivite.'}});assert.equal(r.status,201);
  assert.equal((await f.request('/moderation/reports/'+r.data.id,{as:'mod',method:'POST',data:{decision:'dismissed',reason:'Această decizie ar fi în conflict de interese.'}})).status,403);
});

test('a viewing is only a request until owner accepts, and unrelated accounts cannot decide',async()=>{
  const f=fixture(),c=await f.accepted();
  const v=await f.request('/conversations/'+c+'/viewings',{as:'buyer',method:'POST',data:{startsAt:NOW+2*3600000}});assert.equal(v.status,201);assert.equal(v.data.status,'requested');
  const decide=as=>f.request('/viewings/'+v.data.id,{as,method:'POST',data:{decision:'accepted'}});
  assert.equal((await decide('other')).status,404);assert.equal((await decide('buyer')).status,403);assert.equal((await decide('owner')).status,200);
  assert.equal(f.sql.prepare('SELECT status FROM viewings WHERE id=?').get(v.data.id).status,'accepted');
});

test('message availability is checked atomically when listing closes after preliminary authorization',async()=>{
  const f=fixture(),c=await f.accepted();
  f.hooks.beforeRun=async query=>{if(query.startsWith('INSERT INTO messages '))f.sql.prepare("UPDATE listings SET status='sold'").run();};
  const r=await f.request('/conversations/'+c+'/messages',{as:'buyer',method:'POST',data:{body:'Este locuința disponibilă?'}});
  assert.equal(r.status,403);assert.equal(f.sql.prepare('SELECT count(*) AS n FROM messages').get().n,0);
});

test('a moderator involved in original report cannot decide another participant appeal',async()=>{
  const f=fixture();f.listing(lid(1),'published','mod');
  const r=await f.request('/reports',{as:'buyer',method:'POST',data:{listingId:lid(1),reason:'misleading',details:'Anunțul conține informații care trebuie revizuite.'}});
  await f.request('/moderation/reports/'+r.data.id,{as:'mod2',method:'POST',data:{decision:'dismissed',reason:'Dovezile nu susțin raportarea.'}});
  const a=await f.request('/appeals',{as:'buyer',method:'POST',data:{reportId:r.data.id,reason:'Solicit reanalizarea independentă a raportării mele.'}});
  assert.equal((await f.request('/moderation/appeals/'+a.data.id,{as:'mod',method:'POST',data:{decision:'dismissed',reason:'Sunt proprietarul anunțului și nu pot decide.'}})).status,403);
});

test('photos are decoded and reencoded to remove metadata; fake and oversized JPEGs fail',()=>{
  const encoded=Buffer.from(jpeg.encode({data:Buffer.from([200,100,60,255]),width:1,height:1},80).data);
  const marker=Buffer.from('PRIVATE_METADATA_NOT_FOR_PUBLIC');
  const size=Buffer.alloc(2);size.writeUInt16BE(marker.length+2);
  const annotated=Buffer.concat([encoded.subarray(0,2),Buffer.from([255,254]),size,marker,encoded.subarray(2)]);
  const data=buffer=>'data:image/jpeg;base64,'+buffer.toString('base64');
  const cleaned=validateListing({...draftInput,photos:[data(annotated)]});
  assert.ok(!Buffer.from(cleaned.photos[0].split(',')[1],'base64').includes(marker));
  assert.throws(()=>validateListing({...draftInput,photos:['data:image/jpeg;base64,/9j/2Q==']}));
  const oversized=Buffer.from(encoded);let sof=-1;for(let i=0;i<oversized.length-9;i++)if(oversized[i]===255&&[192,194].includes(oversized[i+1])){sof=i;break;}
  assert.ok(sof>0);oversized.writeUInt16BE(5000,sof+5);oversized.writeUInt16BE(5000,sof+7);
  assert.throws(()=>validateListing({...draftInput,photos:[data(oversized)]}));
});

test('contact creation rechecks listing availability in its atomic insert',async()=>{
  const f=fixture();f.listing();
  f.hooks.beforeRun=async query=>{if(query.startsWith('INSERT INTO contact_requests '))f.sql.prepare("UPDATE listings SET status='sold'").run();};
  const c=await f.contact();assert.ok(c.status>=400,JSON.stringify(c));
  assert.equal(f.sql.prepare('SELECT count(*) AS n FROM contact_requests').get().n,0);
  assert.equal(f.sql.prepare("SELECT count(*) AS n FROM declarations WHERE kind='contact'").get().n,0);
  assert.equal(f.sql.prepare("SELECT count(*) AS n FROM audit_events WHERE action='contact_requested'").get().n,0);
});

test('viewing creation rechecks a concurrent block at insertion',async()=>{
  const f=fixture(),c=await f.accepted();
  f.hooks.beforeRun=async query=>{if(query.startsWith('INSERT INTO viewings '))f.sql.prepare('INSERT INTO blocks(blocker_id,blocked_id,created_at) VALUES (?,?,?)').run('owner','buyer',NOW);};
  const v=await f.request('/conversations/'+c+'/viewings',{as:'buyer',method:'POST',data:{startsAt:NOW+2*3600000}});
  assert.ok(v.status>=400,JSON.stringify(v));assert.equal(f.sql.prepare('SELECT count(*) AS n FROM viewings').get().n,0);
});

test('report evidence is bounded, chronological, case scoped, private and access audited',async()=>{
  const f=fixture(),c=await f.accepted();
  for(let i=0;i<40;i++)f.sql.prepare('INSERT INTO messages(id,conversation_id,sender_id,body,created_at) VALUES (?,?,?,?,?)').run(lid(100+i),c,'buyer','Mesaj '+i,NOW+i);
  const r=await f.request('/reports',{as:'buyer',method:'POST',data:{conversationId:c,reason:'agency',details:'Solicit verificarea mesajelor din acest caz.'}});assert.equal(r.status,201);
  const path='/moderation/reports/'+r.data.id+'/evidence';
  assert.equal((await f.request(path)).status,401);
  assert.equal((await f.request(path,{as:'other'})).status,403);
  for(const as of ['owner','buyer'])assert.equal((await f.request(path,{as,moderatorEmails:[as+'@test.invalid']})).status,403);
  assert.equal(f.sql.prepare("SELECT count(*) AS n FROM audit_events WHERE action='report_evidence_viewed'").get().n,0);
  const e=await f.request(path,{as:'mod'});assert.equal(e.status,200);assert.equal(e.data.messages.length,30);assert.equal(e.data.messages[0].body,'Mesaj 10');assert.equal(e.data.messages[29].body,'Mesaj 39');
  assert.deepEqual(e.data.involvedAccounts,[{id:'buyer',role:'reporter'},{id:'owner',role:'owner'},{id:'buyer',role:'requester'}]);for(const account of e.data.involvedAccounts)assert.deepEqual(Object.keys(account).sort(),['id','role']);
  assert.equal(e.data.reason,'agency');assert.ok(e.data.purpose.includes('familia'));assert.equal(e.data.listingTitle,'Apartament luminos');
  const serialized=JSON.stringify(e.data);assert.ok(!serialized.includes('+407'));assert.ok(!serialized.includes('SECRETĂ'));assert.ok(!serialized.includes('exactAddress'));
  const audit=f.sql.prepare("SELECT * FROM audit_events WHERE action='report_evidence_viewed'").all();assert.equal(audit.length,1);assert.equal(audit[0].actor_id,'mod');assert.equal(audit[0].target_id,r.data.id);
});

test('moderator who reported a listing cannot retrieve its case evidence',async()=>{
  const f=fixture();f.listing();
  const r=await f.request('/reports',{as:'mod',method:'POST',data:{listingId:lid(1),reason:'misleading',details:'Acest anunț necesită verificări suplimentare.'}});
  assert.equal((await f.request('/moderation/reports/'+r.data.id+'/evidence',{as:'mod'})).status,403);
  const other=await f.request('/moderation/reports/'+r.data.id+'/evidence',{as:'mod2'});assert.equal(other.status,200);assert.deepEqual(other.data.messages,[]);
});

test('gallery summaries return one photo while full detail remains owner authorized and lossless',async()=>{
  const f=fixture();f.listing();f.listing(lid(2),'draft');
  const photos=['data:image/jpeg;base64,one','data:image/jpeg;base64,two','data:image/jpeg;base64,three'];
  f.sql.prepare('UPDATE listings SET photos=?').run(JSON.stringify(photos));
  const mine=await f.request('/mine',{as:'owner'});assert.equal(mine.data.listings.length,2);for(const item of mine.data.listings){assert.deepEqual(item.photos,[photos[0]]);assert.equal(item.photosIncomplete,true);}
  assert.deepEqual((await f.request('/listings')).data.listings[0].photos,[photos[0]]);
  await f.request('/favorites/'+lid(1),{as:'buyer',method:'PUT'});assert.deepEqual((await f.request('/favorites',{as:'buyer'})).data.listings[0].photos,[photos[0]]);
  const own=await f.request('/mine/'+lid(2),{as:'owner'});assert.equal(own.status,200);assert.deepEqual(own.data.listing.photos,photos);assert.equal(own.data.listing.exactAddress,'Strada SECRETĂ 99, apartament 7');
  assert.equal((await f.request('/mine/'+lid(2),{as:'buyer'})).status,404);assert.equal((await f.request('/mine/'+lid(2))).status,401);
  assert.deepEqual((await f.request('/listings/'+lid(1))).data.listing.photos,photos);
  assert.deepEqual(JSON.parse(f.sql.prepare('SELECT photos FROM listings WHERE id=?').get(lid(2)).photos),photos);
});

test('phone adapter trusts only provider approval and resets prior disclosure on number change',async()=>{
  const f=fixture();const conversationId=await f.accepted();await f.request('/conversations/'+conversationId+'/share-phone',{as:'owner',method:'POST',data:{}});
  const phone='+40712345678',sid='VE'+'d'.repeat(32);const calls=[];
  const fetcher=async(url,init)=>{calls.push(url);return Response.json(smsResponse(url.endsWith('/Verifications')?'pending':'approved',{to:phone,sid}));};
  const start=await f.request('/phone/start',{as:'owner',method:'POST',data:{phone},sms:smsFixture,fetcher});assert.equal(start.status,200,JSON.stringify(start));
  const checked=await f.request('/phone/check',{as:'owner',method:'POST',data:{code:'123456'},sms:smsFixture,fetcher});assert.equal(checked.status,200,JSON.stringify(checked));
  assert.equal(f.sql.prepare('SELECT phone FROM users WHERE id=?').get('owner').phone,phone);
  assert.equal((await f.request('/conversations/'+conversationId,{as:'buyer'})).data.phone,null);
  assert.equal(f.sql.prepare("SELECT count(*) n FROM audit_events WHERE action='phone_verified'").get().n,1);
  assert.equal(calls.length,2);
});

test('pending provider result cannot confirm a phone, and replaced challenges cannot be approved stale',async()=>{
  const f=fixture(),phone='+40712345678',oldSid='VE'+'d'.repeat(32),newSid='VE'+'e'.repeat(32);
  f.sql.prepare('INSERT INTO phone_challenges (user_id,phone,provider_sid,expires_at) VALUES (?,?,?,?)').run('unverified',phone,oldSid,NOW+600000);
  const pending=await f.request('/phone/check',{as:'unverified',method:'POST',data:{code:'123456'},sms:smsFixture,fetcher:async()=>Response.json(smsResponse('pending',{to:phone,sid:oldSid}))});assert.equal(pending.status,400);assert.equal(f.sql.prepare('SELECT phone_verified_at FROM users WHERE id=?').get('unverified').phone_verified_at,null);
  const stale=await f.request('/phone/check',{as:'unverified',method:'POST',data:{code:'123456'},sms:smsFixture,fetcher:async()=>{f.sql.prepare('UPDATE phone_challenges SET provider_sid=? WHERE user_id=?').run(newSid,'unverified');return Response.json(smsResponse('approved',{to:phone,sid:oldSid}));}});
  assert.equal(stale.status,409);assert.equal(f.sql.prepare('SELECT phone_verified_at FROM users WHERE id=?').get('unverified').phone_verified_at,null);assert.equal(f.sql.prepare("SELECT count(*) n FROM audit_events WHERE action='phone_verified'").get().n,0);
});

test('report categories offered by UI are accepted without automatic enforcement',async()=>{
  const f=fixture();f.listing();for(const reason of ['suspected_agency','contact_sharing'])assert.equal((await f.request('/reports',{as:'buyer',method:'POST',data:{listingId:lid(1),reason,details:'Context pentru analiza umană a acestui anunț.'}})).status,201);
  assert.equal(f.sql.prepare('SELECT status FROM users WHERE id=?').get('owner').status,'active');
});

test('profile contact data is sanitized in trusted identity sync and legacy public projection',async()=>{
  const f=fixture();f.listing();
  const synced=await f.request('/bootstrap',{as:'owner',principal:{...identity('owner'),fullName:'Sună +40722123456',email:'changed@test.invalid'}});
  assert.equal(synced.data.user.name,'Membru Cluj');assert.equal(f.sql.prepare("SELECT email FROM users WHERE id='owner'").get().email,'changed@test.invalid');
  f.sql.prepare("UPDATE users SET name='www.agentie.invalid' WHERE id='owner'").run();
  const listing=await f.request('/listings/'+lid(1));assert.equal(listing.data.listing.ownerName,'Proprietar');assert.ok(!JSON.stringify(listing.data).includes('agentie.invalid'));
});

test('moderator cannot restrict another configured moderator or an existing counterparty',async()=>{
  const f=fixture();f.listing();await f.contact(lid(1),'mod');
  const restrict=target=>f.request('/moderation/users/'+target,{as:'mod',method:'POST',data:{status:'suspended',reason:'Restricție care trebuie refuzată pentru conflict.'}});
  assert.equal((await restrict('mod2')).status,403);assert.equal((await restrict('owner')).status,403);
  assert.equal(f.sql.prepare("SELECT status FROM users WHERE id='owner'").get().status,'active');
  assert.equal(f.sql.prepare("SELECT count(*) AS n FROM audit_events WHERE action='user_suspended'").get().n,0);
});

test('moderator involved in a listing report cannot restrict its other party',async()=>{
  const f=fixture();f.listing();await f.request('/reports',{as:'mod',method:'POST',data:{listingId:lid(1),reason:'misleading',details:'Cazul necesită un moderator independent de raportor.'}});
  assert.equal((await f.request('/moderation/users/owner',{as:'mod',method:'POST',data:{status:'restricted',reason:'Nu pot decide sancțiunea în propriul caz.'}})).status,403);
});

test('account appeal requires independent moderator and upheld decision restores access',async()=>{
  const f=fixture();
  assert.equal((await f.request('/moderation/users/buyer',{as:'mod',method:'POST',data:{status:'suspended',reason:'Restricție temporară pentru analiza activității.'}})).status,200);
  const a=await f.request('/appeals',{as:'buyer',method:'POST',data:{reason:'Solicit reanalizarea independentă a suspendării contului.'}});assert.equal(a.status,201);
  const decide=as=>f.request('/moderation/appeals/'+a.data.id,{as,method:'POST',data:{decision:'upheld',reason:'Contestația este întemeiată după verificare.'}});
  assert.equal((await decide('mod')).status,403);assert.equal(f.sql.prepare("SELECT status FROM users WHERE id='buyer'").get().status,'suspended');
  assert.equal((await decide('mod2')).status,200);assert.equal(f.sql.prepare("SELECT status FROM users WHERE id='buyer'").get().status,'active');
});

test('invalid repeated listing PATCH requests consume validation quota before image decoding',async()=>{
  const f=fixture();f.listing(lid(1),'draft');
  for(let i=0;i<20;i++)assert.equal((await f.request('/listings/'+lid(1),{as:'owner',method:'PATCH',data:{...draftInput,photos:['data:image/jpeg;base64,/9j/2Q==']}})).status,400);
  const exhausted=await f.request('/listings/'+lid(1),{as:'owner',method:'PATCH',data:draftInput});assert.equal(exhausted.status,429);
  assert.equal(f.sql.prepare("SELECT hits FROM rate_limits WHERE key LIKE 'listing-validate:%'").get().hits,20);
  assert.equal(f.sql.prepare('SELECT count(*) AS n FROM declarations').get().n,0);
});

test('stale contact decision reports conflict and does not write a false acceptance audit',async()=>{
  const f=fixture();f.listing();const c=await f.contact();
  f.hooks.beforeRun=async query=>{if(query.startsWith('UPDATE contact_requests SET status='))f.sql.prepare("UPDATE contact_requests SET status='declined' WHERE id=?").run(c.data.id);};
  assert.equal((await f.request('/conversations/'+c.data.id+'/decision',{as:'owner',method:'POST',data:{decision:'accepted'}})).status,409);
  assert.equal(f.sql.prepare("SELECT count(*) AS n FROM audit_events WHERE action='contact_accepted'").get().n,0);
  assert.equal(f.sql.prepare('SELECT status FROM contact_requests WHERE id=?').get(c.data.id).status,'declined');
});

test('withdrawn listing can be edited and must return to moderation while terminal sales stay closed',async()=>{
  const f=fixture();const c=await f.request('/listings',{as:'owner',method:'POST',data:draftInput});const id=c.data.listing.id;
  await f.request('/listings/'+id+'/submit',{as:'owner',method:'POST'});
  await f.request('/moderation/listings/'+id,{as:'mod',method:'POST',data:{decision:'published',reason:'Anunț analizat și acceptat pentru publicare.'}});
  assert.equal((await f.request('/listings/'+id+'/close',{as:'owner',method:'POST',data:{status:'withdrawn'}})).status,200);
  const edited=await f.request('/listings/'+id,{as:'owner',method:'PATCH',data:{...draftInput,price:800}});assert.equal(edited.status,200);assert.equal(edited.data.listing.status,'draft');
  assert.equal((await f.request('/listings/'+id+'/submit',{as:'owner',method:'POST'})).status,200);assert.equal((await f.request('/listings/'+id)).status,404);
  f.listing(lid(99));await f.request('/listings/'+lid(99)+'/close',{as:'owner',method:'POST',data:{status:'sold'}});
  assert.equal((await f.request('/listings/'+lid(99),{as:'owner',method:'PATCH',data:draftInput})).status,409);
  assert.equal((await f.request('/listings/'+lid(99)+'/submit',{as:'owner',method:'POST'})).status,409);
});

test('suspended account cannot read conversations but retains own summary and appeal access',async()=>{
  const f=fixture(),c=await f.accepted();f.sql.prepare("UPDATE users SET status='suspended' WHERE id='owner'").run();
  assert.equal((await f.request('/conversations',{as:'owner'})).status,403);
  assert.equal((await f.request('/conversations/'+c,{as:'owner'})).status,403);
  assert.equal((await f.request('/mine',{as:'owner'})).status,200);
  assert.equal((await f.request('/appeals',{as:'owner',method:'POST',data:{reason:'Solicit revizuirea suspendării și restabilirea accesului.'}})).status,201);
});

test('own case history discloses only authored cases and real decision outcomes, never another account history',async()=>{
  const f=fixture();f.listing();
  assert.equal((await f.request('/my-cases')).status,401);
  const r=await f.request('/reports',{as:'buyer',method:'POST',data:{listingId:lid(1),reason:'misleading',details:'Datele anunțului necesită o verificare independentă.'}});
  await f.request('/moderation/reports/'+r.data.id,{as:'mod',method:'POST',data:{decision:'dismissed',reason:'Contextul nu confirmă informațiile raportate.'}});
  const a=await f.request('/appeals',{as:'buyer',method:'POST',data:{reportId:r.data.id,reason:'Solicit reanalizarea deciziei pentru acest anunț.'}});
  await f.request('/moderation/appeals/'+a.data.id,{as:'mod2',method:'POST',data:{decision:'dismissed',reason:'Reanalizarea independentă confirmă decizia inițială.'}});
  const own=await f.request('/my-cases',{as:'buyer'});assert.equal(own.status,200);assert.equal(own.data.reports.length,1);assert.equal(own.data.appeals.length,1);assert.equal(own.data.reports[0].status,'dismissed');assert.equal(own.data.appeals[0].status,'dismissed');assert.ok(own.data.reports[0].decisionReason.includes('Contextul'));assert.ok(own.data.appeals[0].decisionReason.includes('independentă'));
  assert.deepEqual(own.data.account,{status:'active',restrictionReason:null});
  for(const as of ['other','owner','mod']){const foreign=await f.request('/my-cases?userId=buyer',{as});assert.deepEqual(foreign.data.reports,[]);assert.deepEqual(foreign.data.appeals,[]);}
  const serialized=JSON.stringify(own.data);assert.ok(!serialized.includes('+407'));assert.ok(!serialized.includes('SECRETĂ'));assert.ok(!serialized.includes('@test.invalid'));
});

test('restricted and suspended users can read own existing sanction reason without inventing a reason',async()=>{
  const f=fixture();
  const sanction=await f.request('/moderation/users/buyer',{as:'mod',method:'POST',data:{status:'suspended',reason:'Cont suspendat temporar după analiza contactării repetate.'}});assert.equal(sanction.status,200);
  const own=await f.request('/my-cases',{as:'buyer'});assert.equal(own.status,200);assert.equal(own.data.account.status,'suspended');assert.ok(own.data.account.restrictionReason.includes('contactării'));
  const foreign=await f.request('/my-cases',{as:'other'});assert.deepEqual(foreign.data.account,{status:'active',restrictionReason:null});
  f.sql.prepare("UPDATE users SET status='restricted' WHERE id='other'").run();assert.deepEqual((await f.request('/my-cases',{as:'other'})).data.account,{status:'restricted',restrictionReason:null});
  await f.request('/moderation/users/buyer',{as:'mod2',method:'POST',data:{status:'active',reason:'Acces restabilit după verificare independentă.'}});
  assert.deepEqual((await f.request('/my-cases',{as:'buyer'})).data.account,{status:'active',restrictionReason:null});
});

test('own case history limits each collection to thirty newest records',async()=>{
  const f=fixture();f.listing();
  for(let i=0;i<35;i++){
    f.sql.prepare('INSERT INTO reports(id,reporter_id,listing_id,reason,details,created_at) VALUES (?,?,?,?,?,?)').run(lid(300+i),'buyer',lid(1),'other','Context personal '+i,NOW+i);
    f.sql.prepare('INSERT INTO appeals(id,user_id,reason,created_at) VALUES (?,?,?,?)').run(lid(400+i),'buyer','Contestație personală '+i,NOW+i);
  }
  const own=await f.request('/my-cases',{as:'buyer'});assert.equal(own.data.reports.length,30);assert.equal(own.data.appeals.length,30);assert.equal(own.data.reports[0].id,lid(334));assert.equal(own.data.reports[29].id,lid(305));assert.equal(own.data.appeals[0].id,lid(434));assert.equal(own.data.appeals[29].id,lid(405));
});

test('filtered listing search executes transaction, district, currency and numeric SQL correctly',async()=>{
  const f=fixture();f.listing();f.listing(lid(2));f.sql.prepare('UPDATE listings SET district=? WHERE id=?').run('Gheorgheni',lid(2));
  for(const query of ['transaction=sale','district=Gheorgheni&transaction=sale&currency=EUR','transaction=sale&type=apartment&district=Gheorgheni&currency=EUR&minPrice=100000&maxPrice=130000&minArea=40&rooms=2&q=luminos']){
    const r=await f.request('/listings?'+query);assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.listings.length,query==='transaction=sale'?2:1);
  }
  const empty=await f.request('/listings?transaction=rent&district=Gheorgheni&currency=EUR');assert.equal(empty.status,200);assert.deepEqual(empty.data.listings,[]);
});


// All Verify calls below are simulated. No test sends an SMS or contacts Twilio.
function smsResponse(status='pending',overrides={}){
  return {status,sid:'VE'+'d'.repeat(32),account_sid:smsFixture.accountSid,service_sid:smsFixture.serviceSid,
    to:'+40712345678',channel:'sms',date_created:new Date(NOW).toISOString(),...overrides};
}
const startPhone=(f,extra={})=>f.request('/phone/start',{as:'unverified',method:'POST',data:{phone:'+40712345678'},sms:smsFixture,fetcher:async()=>Response.json(smsResponse()),...extra});
const checkPhone=(f,extra={})=>f.request('/phone/check',{as:'unverified',method:'POST',data:{code:'123456'},sms:smsFixture,fetcher:async()=>Response.json(smsResponse('approved')),...extra});
const isVerified=f=>!!f.sql.prepare("SELECT phone_verified_at FROM users WHERE id='unverified'").get().phone_verified_at;

test('SMS requires explicit activation, valid credentials and a bounded approved budget',async()=>{
  for(const sms of [{...smsFixture,enabled:undefined},{...smsFixture,enabled:'false'},{...smsFixture,totalLimit:'0'},{...smsFixture,totalLimit:'101'},{...smsFixture,totalLimit:'NaN'},{...smsFixture,accountSid:'ACbad'},{...smsFixture,serviceSid:'VA../'},{...smsFixture,authToken:''}]){
    const f=fixture();let calls=0;const r=await startPhone(f,{sms,fetcher:async()=>{calls++;throw Error();}});
    assert.equal(r.status,503);assert.equal(calls,0);assert.equal(isVerified(f),false);
    assert.equal((await f.request('/bootstrap',{as:'unverified',sms})).data.capabilities.phoneVerification,false);
  }
});

test('SMS endpoint rejects anonymous, suspended, foreign-origin and non-RO requests before provider',async()=>{
  for(const extra of [{as:null},{as:'suspended'},{headers:{origin:'https://evil.invalid'}},{data:{phone:'+15017122661'}},{data:{phone:40712345678}}]){
    const f=fixture();f.user('suspended',false,'suspended');let calls=0;
    const r=await startPhone(f,{...extra,fetcher:async()=>{calls++;throw Error();}});
    assert.ok([400,401,403].includes(r.status));assert.equal(calls,0);
  }
});

test('Verify wire request uses fixed origin, strict POST form, risk protection and no redirect/retry',async()=>{
  const f=fixture(),calls=[];
  const fetcher=async(url,init)=>{calls.push({url,init});return Response.json(smsResponse(url.endsWith('VerificationCheck')?'approved':'pending'));};
  assert.equal((await startPhone(f,{fetcher})).status,200);
  assert.equal((await checkPhone(f,{fetcher})).status,200);
  assert.equal(calls.length,2);
  assert.equal(calls[0].url,'https://verify.twilio.com/v2/Services/'+smsFixture.serviceSid+'/Verifications');
  assert.equal(calls[0].init.redirect,'error');assert.equal(calls[0].init.method,'POST');
  assert.deepEqual(Object.fromEntries(calls[0].init.body),{To:'+40712345678',Channel:'sms',Locale:'ro',RiskCheck:'enable'});
  assert.deepEqual(Object.fromEntries(calls[1].init.body),{VerificationSid:'VE'+'d'.repeat(32),Code:'123456'});
  assert.ok(calls[0].init.signal instanceof AbortSignal);
  assert.equal((await checkPhone(f,{fetcher})).status,400);assert.equal(calls.length,2);
});

test('SMS provider start cannot inject another phone, service, account, channel, SID or validity',async()=>{
  for(const changes of [{to:'+40711111111'},{service_sid:'VA'+'f'.repeat(32)},{account_sid:'AC'+'f'.repeat(32)},{channel:'call'},{sid:'bad'},{date_created:'bad'},{date_created:new Date(NOW-600001).toISOString()},{status:'approved'}]){
    const f=fixture();const r=await startPhone(f,{fetcher:async()=>Response.json(smsResponse('pending',changes))});
    assert.equal(r.status,503);assert.equal(f.sql.prepare('SELECT count(*) n FROM phone_challenges').get().n,0);assert.equal(isVerified(f),false);
  }
});

test('approval must match the exact stored SID, phone, service, account and SMS channel',async()=>{
  for(const changes of [{to:'+40711111111'},{sid:'VE'+'e'.repeat(32)},{service_sid:'VA'+'f'.repeat(32)},{account_sid:'AC'+'f'.repeat(32)},{channel:'call'}]){
    const f=fixture();await startPhone(f);assert.equal((await checkPhone(f,{fetcher:async()=>Response.json(smsResponse('approved',changes))})).status,503);assert.equal(isVerified(f),false);
  }
});

test('local expiry rejects without provider and cleans the challenge',async()=>{
  const f=fixture();await startPhone(f);let calls=0;
  const r=await checkPhone(f,{now:NOW+600000,fetcher:async()=>{calls++;throw Error();}});
  assert.equal(r.status,400);assert.equal(r.data.code,'SMS_EXPIRED');assert.equal(calls,0);assert.equal(isVerified(f),false);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM phone_challenges').get().n,0);
});

test('expiry or suspension during provider round-trip cannot approve',async()=>{
  for(const mode of ['expired','suspended','lock-lost']){
    const f=fixture();await startPhone(f);let current=NOW;
    const r=await checkPhone(f,{clock:()=>current,fetcher:async()=>{
      if(mode==='expired')current=NOW+600000;
      if(mode==='suspended')f.sql.prepare("UPDATE users SET status='suspended' WHERE id='unverified'").run();
      if(mode==='lock-lost')f.sql.prepare("DELETE FROM rate_limits WHERE key='sms-operation:unverified'").run();
      return Response.json(smsResponse('approved'));
    }});
    assert.equal(r.status,409);assert.equal(isVerified(f),false);
    assert.equal(f.sql.prepare("SELECT count(*) n FROM audit_events WHERE action='phone_verified'").get().n,0);
  }
});

test('provider errors are sanitized, fail closed and never retried',async()=>{
  for(const [status,code,expected] of [[404,20404,400],[400,60202,400],[429,60203,429],[401,20003,503],[403,20003,503],[500,0,503],[400,60200,400]]){
    const f=fixture();await startPhone(f);let calls=0;
    const r=await checkPhone(f,{fetcher:async()=>{calls++;return Response.json({code,message:'PRIVATE_PHONE_SECRET_TOKEN'},{status});}});
    assert.equal(r.status,expected);assert.equal(calls,1);assert.equal(isVerified(f),false);assert.ok(!JSON.stringify(r.data).includes('PRIVATE'));
    if(status===404||code===60202)assert.equal(f.sql.prepare('SELECT count(*) n FROM phone_challenges').get().n,0);
  }
  for(const fetcher of [async()=>{throw new Error('PRIVATE_TOKEN');},async()=>new Response('not JSON'),async()=>Response.json(null)]){
    const f=fixture();await startPhone(f);assert.equal((await checkPhone(f,{fetcher})).status,503);assert.equal(isVerified(f),false);
  }
});

test('five code attempts persist across clock boundary and a resend of the same challenge',async()=>{
  const f=fixture();await startPhone(f);let calls=0;
  const fetcher=async()=>{calls++;return Response.json(smsResponse('pending'));};
  for(let n=0;n<5;n++)assert.equal((await checkPhone(f,{now:NOW+n*1000,fetcher})).status,400);
  assert.equal((await startPhone(f,{now:NOW+60000})).status,200);
  assert.equal((await checkPhone(f,{now:NOW+61000,fetcher})).status,429);assert.equal(calls,5);assert.equal(isVerified(f),false);
  assert.equal(f.sql.prepare('SELECT expires_at FROM phone_challenges').get().expires_at,NOW+600000);
});

test('concurrent starts and checks share an account lock before calling Twilio',async()=>{
  const f=fixture();let release,entered;const began=new Promise(r=>entered=r);const gate=new Promise(r=>release=r);let calls=0;
  const first=startPhone(f,{fetcher:async()=>{calls++;entered();await gate;return Response.json(smsResponse());}});
  await began;
  assert.equal((await startPhone(f)).data.code,'SMS_BUSY');assert.equal((await checkPhone(f)).data.code,'SMS_BUSY');
  release();assert.equal((await first).status,200);assert.equal(calls,1);
});

test('cooldown applies across hour boundary and across accounts targeting same number',async()=>{
  const f=fixture();await startPhone(f,{now:NOW+3599000,fetcher:async()=>Response.json(smsResponse('pending',{date_created:new Date(NOW+3599000).toISOString()}))});
  assert.equal((await startPhone(f,{now:NOW+3600000})).status,429);
  assert.equal((await startPhone(f,{as:'buyer',now:NOW+3600000})).status,429);
});

test('hourly account and destination limits persist over the wall-clock boundary',async()=>{
  const f=fixture();let calls=0;
  for(let n=0;n<4;n++){
    const now=NOW+3540000+n*60000;
    const r=await startPhone(f,{now,fetcher:async()=>{calls++;return Response.json(smsResponse('pending',{date_created:new Date(now).toISOString()}));}});
    assert.equal(r.status,n<3?200:429);
  }
  assert.equal(calls,3);
});

test('cumulative budget is atomic across accounts and never resets next day or after provider timeout',async()=>{
  const f=fixture(),sms={...smsFixture,totalLimit:'1'};let calls=0;
  const fetcher=async()=>{calls++;throw Error('timeout');};
  const results=await Promise.all([startPhone(f,{sms,fetcher}),startPhone(f,{as:'buyer',data:{phone:'+40722222222'},sms,fetcher})]);
  assert.deepEqual(results.map(x=>x.status).sort(),[429,503]);assert.equal(calls,1);
  assert.equal((await startPhone(f,{sms,now:NOW+DAY,fetcher})).data.code,'SMS_BUDGET');assert.equal(calls,1);
});

test('global daily ceiling bounds distinct accounts and numbers',async()=>{
  const f=fixture();let calls=0;
  for(let n=0;n<11;n++){
    const user='sms-user-'+n,phone='+40700'+String(100000+n);f.user(user,false);
    const r=await startPhone(f,{as:user,data:{phone},fetcher:async()=>{calls++;return Response.json(smsResponse('pending',{to:phone}));}});
    assert.equal(r.status,n<10?200:429,JSON.stringify(r));
  }
  assert.equal(calls,10);
});

test('unverified users remain unable to submit, publish or contact after a failed code',async()=>{
  const f=fixture();await startPhone(f);await checkPhone(f,{fetcher:async()=>Response.json(smsResponse('pending'))});
  const own=f.listing(lid(9),'draft','unverified');f.listing();
  assert.equal((await f.request('/listings/'+own+'/submit',{as:'unverified',method:'POST',data:{}})).status,403);
  assert.equal((await f.contact(lid(1),'unverified')).status,403);
  f.sql.prepare("UPDATE listings SET status='pending' WHERE id=?").run(own);
  assert.equal((await f.request('/moderation/listings/'+own,{as:'mod',method:'POST',data:{decision:'published',reason:'Revizuire umană documentată.'}})).status,409);
});

test('verified phone remains unique across accounts and private in bootstrap',async()=>{
  const f=fixture();await startPhone(f);assert.equal((await checkPhone(f)).status,200);
  await startPhone(f,{as:'buyer',now:NOW+60000});
  assert.equal((await checkPhone(f,{as:'buyer',now:NOW+60000})).status,409);
  const bootstrap=await f.request('/bootstrap',{as:'unverified',sms:smsFixture});
  assert.equal(bootstrap.data.user.phoneLast4,'5678');assert.ok(!JSON.stringify(bootstrap.data).includes('+40712345678'));
});


test('search pagination covers all matching listings once with deterministic tie ordering',async()=>{
  const f=fixture();for(let n=1;n<=30;n++)f.listing(lid(n));
  const first=await f.request('/listings?currency=EUR&page=1');const second=await f.request('/listings?currency=EUR&page=2');
  assert.equal(first.status,200);assert.equal(first.data.total,30);assert.equal(first.data.totalPages,2);assert.equal(first.data.limit,24);assert.equal(first.data.page,1);
  assert.equal(first.data.listings.length,24);assert.equal(second.data.listings.length,6);
  assert.equal(new Set([...first.data.listings,...second.data.listings].map(l=>l.id)).size,30);
  assert.equal(first.data.listings[0].id,lid(30));assert.equal(second.data.listings.at(-1).id,lid(1));
  assert.deepEqual((await f.request('/listings?currency=EUR&page=1')).data.listings.map(l=>l.id),first.data.listings.map(l=>l.id));
  const past=await f.request('/listings?currency=EUR&page=3');assert.equal(past.data.total,30);assert.deepEqual(past.data.listings,[]);
});

test('search counts and sorting use the same visibility and currency constraints as results',async()=>{
  const f=fixture();for(let n=1;n<=6;n++)f.listing(lid(n));
  f.sql.prepare('UPDATE listings SET price=200000,area=90 WHERE id=?').run(lid(1));
  f.sql.prepare('UPDATE listings SET price=80000,area=30 WHERE id=?').run(lid(2));
  f.sql.prepare("UPDATE listings SET status='draft' WHERE id=?").run(lid(3));
  f.sql.prepare('UPDATE listings SET available_until=? WHERE id=?').run(NOW,lid(4));
  f.sql.prepare("UPDATE listings SET owner_id='unverified' WHERE id=?").run(lid(5));
  f.sql.prepare("UPDATE listings SET currency='RON',price=1 WHERE id=?").run(lid(6));
  for(const [sort,expected]of [['price_asc',[lid(2),lid(1)]],['price_desc',[lid(1),lid(2)]],['area_desc',[lid(1),lid(2)]]]){
    const r=await f.request('/listings?currency=EUR&sort='+sort);assert.equal(r.status,200);assert.equal(r.data.total,2);assert.deepEqual(r.data.listings.map(l=>l.id),expected);assert.ok(!JSON.stringify(r.data).includes('SECRETĂ'));
  }
  const budget=await f.request('/listings?currency=EUR&maxPrice=100000');assert.equal(budget.data.total,1);assert.equal(budget.data.listings[0].id,lid(2));
  const empty=await f.request('/listings?district=Zorilor');assert.equal(empty.data.total,0);assert.equal(empty.data.totalPages,0);
});

test('search rejects unsafe pagination and sort input, mixed-currency price sort, and reversed budgets',async()=>{
  const f=fixture();f.listing();
  for(const page of ['0','-1','1.5','NaN','Infinity','1e2','1001','999999999999999999'])assert.equal((await f.request('/listings?page='+page)).status,400,page);
  for(const sort of ['price','__proto__','toString','price;DROP TABLE listings'])assert.equal((await f.request('/listings?sort='+encodeURIComponent(sort))).status,400,sort);
  assert.equal((await f.request('/listings?sort=price_asc')).status,400);
  assert.equal((await f.request('/listings?minPrice=200&maxPrice=100')).status,400);
  assert.equal((await f.request('/listings?minPrice=120000&maxPrice=120000')).data.total,1);
  assert.equal((await f.request('/listings')).data.total,1);
});
