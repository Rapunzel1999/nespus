import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleApi } from '../lib/api.mjs';
import { DAY, validateGift } from '../lib/model.mjs';
let sqlite, db;
beforeEach(()=>{
  sqlite?.close();sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../drizzle/0000_glamorous_giant_man.sql',import.meta.url),'utf8'));
  db={prepare(sql){return {bind(...args){const s=sqlite.prepare(sql);return {async run(){const r=s.run(...args);return {meta:{changes:Number(r.changes)}};},async first(){return s.get(...args)||null;},async all(){return {results:s.all(...args)};}};}};}};
});
const gift={to:'Ana',from:'Paul',title:'Un gând pentru tine',body:'Mulțumesc pentru toate momentele frumoase.',memory:'O seară',ps:'Revin mâine.',note1:'Un gând',note2:'Alt gând',note3:'Curaj',includeNotes:true,style:'midnight',occasion:'thanks',tier:'1',days:1,photo:null};
const origin='https://nespus.example';
const req=(path,method='GET',body,cookie,extra={})=>new Request(origin+path,{method,headers:{origin,'Content-Type':'application/json',...(cookie?{cookie}:{}),...extra},...(body!==undefined?{body:JSON.stringify(body)}:{})});
async function create(payload=gift,cookie,now=1000000){const r=await handleApi(req('/api/gifts','POST',payload,cookie),db,now);return {r,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
test('create, fresh recipient read, QR and owner-only deletion persist through SQLite',async()=>{
  const {r,data,cookie}=await create();assert.equal(r.status,201);assert.match(data.id,/^[a-f0-9]{32}$/);assert.equal(data.expiresAt,1000000+DAY);assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
  const read=await handleApi(req('/api/gifts/'+data.id),db,1000001);assert.deepEqual((await read.json()).gift,gift);assert.equal(read.headers.get('cache-control'),'no-store');
  const qr=await handleApi(req('/api/gifts/'+data.id+'/qr'),db,1000001);assert.equal(qr.status,200);assert.match(await qr.text(),/<svg/);
  const stranger=await create();assert.equal((await handleApi(req('/api/gifts/'+data.id,'DELETE',undefined,stranger.cookie),db)).status,404);
  const list=await handleApi(req('/api/gifts','GET',undefined,cookie),db);assert.equal((await list.json()).gifts.length,1);
  assert.equal((await handleApi(req('/api/gifts/'+data.id,'DELETE',undefined,cookie),db)).status,200);
  assert.equal((await handleApi(req('/api/gifts/'+data.id),db)).status,404);
});
test('expiry blocks content and QR at the exact boundary and ignores client expiry fields',async()=>{
  const {data}=await create({...gift,expiresAt:99999999999999});
  for(const suffix of ['','/qr'])assert.equal((await handleApi(req('/api/gifts/'+data.id+suffix),db,data.expiresAt)).status,404);
  assert.equal((await handleApi(req('/api/gifts/'+data.id),db,data.expiresAt-1)).status,200);
});
test('reject forged fields, overlong input, wrong photo and commercial duration',async()=>{
  for(const change of [{to:''},{body:'short'},{days:365},{tier:'__proto__'},{style:'x'},{includeNotes:'true'},{photo:'data:image/svg+xml;base64,PHN2Zz4='},{photo:'data:image/jpeg;base64,QUJDRA=='},{body:'x'.repeat(1501)}])assert.equal((await create({...gift,...change})).r.status,400);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM gifts').get().n,0);
});
test('cross-origin writes and missing origin are forbidden',async()=>{
  for(const headers of [{origin:'https://other.example'},{origin:''}])assert.equal((await handleApi(req('/api/gifts','POST',gift,undefined,headers),db)).status,403);
});
test('limits body size before parsing and detects malformed JSON',async()=>{
  const large=new Request(origin+'/api/gifts',{method:'POST',headers:{origin,'content-type':'application/json'},body:'x'.repeat(420001)});assert.equal((await handleApi(large,db)).status,413);
  const broken=new Request(origin+'/api/gifts',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{'});assert.equal((await handleApi(broken,db)).status,400);
});
test('anonymous ownership is not exposed in recipient JSON or lists',async()=>{
  const {data,cookie}=await create();const response=await handleApi(req('/api/gifts/'+data.id),db,1000001);assert.doesNotMatch(await response.text(),/owner_hash|nespus_owner|account_id/);
  assert.deepEqual(await (await handleApi(req('/api/gifts'),db)).json(),{gifts:[]});assert.ok(cookie);
});
test('atomic daily quota of 10 links per anonymous owner',async()=>{
  const {cookie}=await create();for(let i=0;i<9;i++)assert.equal((await create(gift,cookie)).r.status,201);assert.equal((await create(gift,cookie)).r.status,429);
  assert.equal((await create(gift,cookie,1000000+DAY+1)).r.status,201);
});
test('missing database fails closed; health does not claim payments are active',async()=>{
  assert.equal((await handleApi(req('/api/gifts'),null)).status,503);
  assert.equal((await (await handleApi(req('/api/health'),null)).json()).payments,'disabled');
});
test('untrusted text is preserved as data, never HTML; XSS payload stays JSON',async()=>{
  const attack='<img src=x onerror=alert(1)>';const {data}=await create({...gift,title:attack});const result=await handleApi(req('/api/gifts/'+data.id),db,1000001);assert.match(result.headers.get('content-type'),/application\/json/);assert.equal((await result.json()).gift.title,attack);
  assert.equal(validateGift({...gift,paid:true}).paid,undefined);
});
