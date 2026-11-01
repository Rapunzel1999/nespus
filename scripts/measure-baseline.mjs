// Offline, deterministic measurement. Never connects to the hosted database.
import {readFileSync, readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import jpeg from 'jpeg-js';
import {handleApi} from '../lib/api.mjs';
const files=readdirSync('public').filter(p=>/\.(js|css)$/.test(p)).sort().map(p=>'public/'+p);
const source={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTreeChanged:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()};
const assets=files.map(path=>{const data=readFileSync(path);return {path,bytes:data.length,KB:data.length/1000,lines:data.toString().split('\n').length-1};});
const sql=new DatabaseSync(':memory:');
for(const entry of JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8')).entries)sql.exec(readFileSync('drizzle/'+entry.tag+'.sql','utf8'));
const now=Date.UTC(2026,10,1),photo='data:image/jpeg;base64,'+jpeg.encode({data:Buffer.alloc(400*300*4,180),width:400,height:300},75).data.toString('base64');
sql.prepare('INSERT INTO users(id,name,email,phone_verified_at,created_at) VALUES (?,?,?,?,?)').run('DEMO-owner','DEMO proprietar','demo@example.invalid',now,now);
for(let i=1;i<=20;i++)sql.prepare('INSERT INTO listings(id,owner_id,title,"transaction",type,district,price,currency,area,rooms,description,photos,relationship,status,created_at,updated_at,available_until) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(i.toString(16).padStart(32,'0'),'DEMO-owner','DEMO Apartament '+i,'sale','apartment','Centru',100000+i*1000,'EUR',50,2,'DEMO: date sintetice pentru măsurarea răspunsului API.',JSON.stringify([photo]),'owner','published',now,now,now+86400000);
const prepare=(query,args=[])=>({bind(...v){return prepare(query,v);},async first(){return sql.prepare(query).get(...args)??null;},async all(){return {results:sql.prepare(query).all(...args)};}});
const response=await handleApi(new Request('https://measurement.invalid/api/listings'),{prepare},{now});
const body=await response.text();
console.log(JSON.stringify({source,assets,cssBytes:assets.filter(f=>f.path.endsWith('.css')).reduce((n,f)=>n+f.bytes,0),syntheticSearch:{status:response.status,results:JSON.parse(body).listings.length,utf8Bytes:Buffer.byteLength(body),containsImageData:body.includes('base64'),fixturePhotoBinaryBytes:Buffer.from(photo.split(',')[1],'base64').length,fixturePhotoDataUrlCharacters:photo.length},hostedPhotoStatistics:'not read',browserMetrics:'not measured'},null,2));
sql.close();
