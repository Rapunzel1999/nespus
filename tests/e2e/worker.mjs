// TEST ENTRY POINT ONLY. Never imported by app/, lib/ or the production Worker.
import document from '../../lib/document.html';
import schema from '../../drizzle/0000_nervous_leader.sql';
import schema1 from '../../drizzle/0001_pale_sauron.sql';
import schema2 from '../../drizzle/0002_gray_nomad.sql';
import schema4 from '../../drizzle/0004_elite_ezekiel_stane.sql';
import schema3 from '../../drizzle/0003_cheerful_the_professor.sql';
import {handleApi} from '../../lib/api.mjs';
import {localTestAllowed} from './guard.mjs';
import {seed} from './seed.mjs';
const roles=['owner','buyer','moderator','unverified'];
const sms={accountSid:'AC'+'a'.repeat(32),serviceSid:'VA'+'b'.repeat(32),authToken:'DEMO-fixture-only-not-a-credential',enabled:'true',totalLimit:'100'};
const verifications=new Map();
async function fakeSms(url, options) {
  const form=new URLSearchParams(options.body),phone=form.get('To');
  if(!String(url).startsWith('https://verify.twilio.com/v2/Services/'+sms.serviceSid+'/'))throw Error('Unexpected test provider endpoint');
  let record=verifications.get(phone);
  if(String(url).endsWith('/Verifications')){record={sid:'VE'+crypto.randomUUID().replaceAll('-',''),to:phone,account_sid:sms.accountSid,service_sid:sms.serviceSid,channel:'sms',status:'pending',date_created:new Date().toISOString()};verifications.set(phone,record);}
  else {record=[...verifications.values()].find(v=>v.sid===form.get('VerificationSid'));if(!record)return Response.json({code:20404},{status:404});record={...record,status:form.get('Code')==='123456'?'approved':'pending'};}
  return Response.json(record);
}
export default {async fetch(request,env) {
  if(!localTestAllowed(request,env))return new Response('Test mode unavailable',{status:404});
  const url=new URL(request.url);
  if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)return new Response('Origin rejected',{status:403});
  if(url.pathname==='/__test/health')return Response.json({mode:'DEMO local D1 only'});
  if(url.pathname==='/__test/reset'&&request.method==='POST'){
    for(const statement of [schema,schema1,schema2,schema3,schema4].join(';').replace(/--> statement-breakpoint/g,'').split(';').map(v=>v.trim()).filter(Boolean)){
      try{await env.DB.prepare(statement).run();}catch(e){if(!/already exists|duplicate column name/.test(String(e)))throw e;}
    }
    await seed(env.DB);verifications.clear();return Response.json({seeded:8,mode:'DEMO'});
  }
  if(url.pathname==='/__test/login'&&request.method==='POST'){
    const {role}=await request.json();if(!roles.includes(role))return new Response('Unknown DEMO role',{status:400});
    return Response.json({role},{headers:{'Set-Cookie':'DEMO-test-role='+role+'; HttpOnly; SameSite=Strict; Path=/'}});
  }
  if(url.pathname.startsWith('/api/')){
    const role=/\bDEMO-test-role=([a-z]+)(?:;|$)/.exec(request.headers.get('cookie')||'')?.[1];
    const principal=roles.includes(role)?{userId:'DEMO-'+role,email:role+'@example.invalid',displayName:'DEMO '+role}:null;
    return handleApi(request,env.DB,{principal,moderatorEmails:['moderator@example.invalid'],sms,fetcher:fakeSms});
  }
  if(url.pathname==='/'||url.pathname==='/atelier')return new Response(document.replace('<body>','<body><aside aria-label="Mediu de test" style="background:#fff3c2;color:#252019;padding:8px;text-align:center">DEMO · Numai test local · Nicio ofertă reală · SMS simulat</aside>'),{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}});
  return env.ASSETS.fetch(request);
}};
