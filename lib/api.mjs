import {smsEnabled as isSmsEnabled,twilioRequest,matchesVerification,VERIFY_TTL,SMS_COOLDOWN} from './twilio-verify.mjs';
import {ApiError,fail,text,id,hash,DAY,VERSION,DISTRICTS,DECLARATIONS,validateListing,publicListing,ownListing,listingPhotoUrls,contactText} from './model.mjs';

export const securityHeaders={
  'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'Permissions-Policy':'camera=(),microphone=(),geolocation=()',
};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{...securityHeaders,'Content-Type':'application/json; charset=utf-8'}});
const LIVE="l.status='published' AND l.available_until>? AND u.status='active' AND u.phone_verified_at IS NOT NULL";
const AVAILABILITY="(SELECT MAX(a.created_at) FROM audit_events a WHERE a.target_id=l.id AND a.action IN ('listing_published','listing_reconfirmed')) AS availability_confirmed_at";
const JOIN='SELECT '+AVAILABILITY+',l.*,u.name AS owner_name,u.phone_verified_at FROM listings l JOIN users u ON u.id=l.owner_id';
// List views select only the existence of a cover; image bytes are read on demand.
const listingProjection=photos=>"SELECT "+AVAILABILITY+",l.id,l.owner_id,l.title,l.\"transaction\",l.type,l.city,l.district,l.price,l.currency,l.area,l.rooms,l.description,"+photos+" AS photos,l.exact_address,l.relationship,l.rent_deposit,l.rent_costs,l.status,l.ownership_status,l.accepts_contacts,l.contact_hours,l.moderation_reason,l.created_at,l.updated_at,l.available_until,u.name AS owner_name,u.phone_verified_at FROM listings l JOIN users u ON u.id=l.owner_id";
const SUMMARY=listingProjection("CASE WHEN json_array_length(l.photos)>0 THEN json_array('') ELSE '[]' END");
const PUBLIC_DETAIL=listingProjection("(SELECT json_group_array('') FROM json_each(l.photos))");
// Both inbox and detail use the same access projection, without per-row lookups.
const CONVERSATION_JOIN="SELECT c.*,l.title AS listing_title,l.status AS listing_status,l.available_until,ou.name AS owner_name,ru.name AS requester_name,ou.status AS owner_status,ru.status AS requester_status,ou.phone_verified_at AS owner_verified,ru.phone_verified_at AS requester_verified,EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=c.owner_id AND b.blocked_id=c.requester_id) OR (b.blocker_id=c.requester_id AND b.blocked_id=c.owner_id)) AS blocked FROM contact_requests c JOIN listings l ON l.id=c.listing_id JOIN users ou ON ou.id=c.owner_id JOIN users ru ON ru.id=c.requester_id";
const pageCursor=value=>{if(value===null)return null;const match=/^(\d{1,16}):([a-f0-9]{32})$/.exec(value);if(!match||!Number.isSafeInteger(Number(match[1])))fail(400,'Poziție de paginare invalidă.');return {time:Number(match[1]),id:match[2]};};
const READY="EXISTS (SELECT 1 FROM contact_requests c JOIN listings l ON l.id=c.listing_id JOIN users ou ON ou.id=c.owner_id JOIN users ru ON ru.id=c.requester_id WHERE c.id=? AND c.status='accepted' AND l.status='published' AND l.available_until>? AND ou.status='active' AND ru.status='active' AND ou.phone_verified_at IS NOT NULL AND ru.phone_verified_at IS NOT NULL AND (c.owner_id=? OR c.requester_id=?) AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=c.owner_id AND b.blocked_id=c.requester_id) OR (b.blocker_id=c.requester_id AND b.blocked_id=c.owner_id)))";

async function body(req){
  if(!req.headers.get('content-type')?.startsWith('application/json'))fail(415,'Trimite date în format JSON.');
  const reader=req.body?.getReader();if(!reader)fail(400,'Lipsesc datele.');
  let total=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>2100000){await reader.cancel();fail(413,'Datele trimise sunt prea mari.');}chunks.push(value);}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{const value=JSON.parse(new TextDecoder().decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{fail(400,'Date JSON invalide.');}
}

// principal must come from the dispatch-owned SIWC adapter, never the request body.
export async function handleApi(req,db,options={}){
  const now=options.now??Date.now(),url=new URL(req.url),path=url.pathname,method=req.method;
  const q=(sql,...args)=>db.prepare(sql).bind(...args);
  const quota=async(scope,subject,limit,window=DAY)=>{
    await q('DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE expires_at<? LIMIT 100)',now-DAY).run();
    const bucket=Math.floor(now/window),key=scope+':'+subject+':'+bucket;
    const result=await q('INSERT INTO rate_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 WHERE hits<?',key,(bucket+1)*window,limit).run();
    if(!result.meta.changes)fail(429,'Ai atins limita temporară pentru această acțiune. Încearcă mai târziu.','RATE_LIMIT');
  };
  const audit=(actor,action,target,reason='')=>q('INSERT INTO audit_events (id,actor_id,action,target_id,reason,created_at) VALUES (?,?,?,?,?,?)',id(),actor,action,target,reason,now);
  const auditChanged=(actor,action,target,reason='')=>q('INSERT INTO audit_events (id,actor_id,action,target_id,reason,created_at) SELECT ?,?,?,?,?,? WHERE changes()>0',id(),actor,action,target,reason,now);
  const declaration=(user,kind,listing)=>q('INSERT INTO declarations (id,user_id,kind,version,listing_id,accepted_at,text_snapshot) VALUES (?,?,?,?,?,?,?)',id(),user,kind,VERSION,listing,now,DECLARATIONS[kind]);
  let me=null,isModerator=false;const mods=(options.moderatorEmails||[]).map(x=>x.toLowerCase().trim()).filter(Boolean);
  const signed=()=>{if(!me)fail(401,'Autentifică-te pentru a continua.','SIGN_IN');return me;};
  const active=()=>{signed();if(me.status!=='active')fail(403,'Contul tău are restricții. Poți trimite o contestație.','ACCOUNT_RESTRICTED');};
  const verified=()=>{active();if(!me.phone_verified_at)fail(403,'Confirmă numărul de telefon înainte de această acțiune.','PHONE_REQUIRED');};
  const moderator=()=>{active();if(!isModerator)fail(403,'Această acțiune este rezervată moderatorilor.');};
  const isBlocked=async(a,b)=>!!(await q('SELECT 1 FROM blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?) LIMIT 1',a,b,b,a).first());
  const getListing=async(listingId)=>q(JOIN+' WHERE l.id=?',listingId).first();
  const live=row=>row&&row.status==='published'&&row.available_until>now&&!!row.phone_verified_at;
  const ownerListing=async(listingId)=>{active();const row=await getListing(listingId);if(!row||row.owner_id!==me.id)fail(404,'Anunț negăsit.');return row;};
  const conversationAccess=()=>{signed();if(me.status==='suspended')fail(403,'Contul este suspendat. Poți trimite o contestație.','ACCOUNT_RESTRICTED');};
  const conversationAvailable=row=>row.listing_status==='published'&&row.available_until>now&&row.owner_status==='active'&&row.requester_status==='active'&&!!row.owner_verified&&!!row.requester_verified;
  const getConversation=async(conversationId,needAccepted=false)=>{
    conversationAccess();const row=await q(CONVERSATION_JOIN+' WHERE c.id=? AND (c.owner_id=? OR c.requester_id=?)',conversationId,me.id,me.id).first();
    if(!row)fail(404,'Conversație negăsită.');
    row.available=conversationAvailable(row);
    if(needAccepted&&(row.status!=='accepted'||row.blocked||!row.available))fail(403,'Conversația nu permite această acțiune.');
    return row;
  };
  const conversationDto=row=>{const available=conversationAvailable(row);return {id:row.id,listingId:row.listing_id,listingTitle:row.listing_title,otherName:me.id===row.owner_id?row.requester_name:row.owner_name,status:row.status,purpose:row.purpose,amOwner:me.id===row.owner_id,phoneShared:!!row.phone_shared&&available&&!row.blocked,blocked:!!row.blocked,available,createdAt:row.created_at,updatedAt:row.updated_at};};
  const sms=options.sms||{},smsEnabled=isSmsEnabled(sms);
  const clock=options.clock||(()=>options.now??Date.now());
  const requireSms=()=>{if(!smsEnabled)fail(503,'Confirmarea SMS nu este activată.','SMS_UNAVAILABLE');};
  // Rolling windows persist across Workers; no refund after ambiguous provider failures.
  const smsQuota=async(key,limit,window)=>{
    const t=clock();
    const result=await q('INSERT INTO rate_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN expires_at<=? THEN 1 ELSE hits+1 END,expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END WHERE expires_at<=? OR hits<?',key,t+window,t,t,t,limit).run();
    if(!result.meta.changes)fail(429,'Ai atins limita temporară SMS. Încearcă mai târziu.','SMS_RATE_LIMIT');
  };
  const withPhoneLock=async(action)=>{
    const key='sms-operation:'+me.id,token=parseInt(id().slice(0,12),16),t=clock();
    const result=await q('INSERT INTO rate_limits (key,hits,expires_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET hits=excluded.hits,expires_at=excluded.expires_at WHERE expires_at<=?',key,token,t+30000,t).run();
    if(!result.meta.changes)fail(429,'O verificare este deja în curs. Așteaptă răspunsul.','SMS_BUSY');
    try{return await action({key,token});}
    finally{await q('DELETE FROM rate_limits WHERE key=? AND hits=?',key,token).run();}
  };
  const lockSql='EXISTS (SELECT 1 FROM rate_limits WHERE key=? AND hits=? AND expires_at>?)';
  try{
    if(method!=='GET'&&method!=='HEAD'&&req.headers.get('origin')!==url.origin)fail(403,'Origine nepermisă.');
    if(path==='/api/health'&&method==='GET')return json({status:'ok',city:'Cluj-Napoca',payments:'disabled'});
    if(!db)fail(503,'Baza de date este temporar indisponibilă.');
    const principal=options.principal;
    if(principal?.userId){
      const rawName=String(principal.fullName||principal.displayName||'Membru Cluj').slice(0,70).trim(),safeName=!rawName||rawName.includes('@')||contactText(rawName)?'Membru Cluj':rawName;
      await q('INSERT INTO users (id,name,email,created_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,email=excluded.email',principal.userId,safeName,principal.email||'',now).run();
      me=await q('SELECT * FROM users WHERE id=?',principal.userId).first();
      isModerator=mods.includes(String(principal.email||'').toLowerCase());
    }
    if(path==='/api/bootstrap'&&method==='GET')return json({user:me?{id:me.id,name:me.name,phoneVerified:!!me.phone_verified_at,phoneLast4:me.phone?.slice(-4)||null,role:isModerator?'moderator':'member',status:me.status}:null,capabilities:{phoneVerification:smsEnabled,payments:false},declarations:DECLARATIONS,city:'Cluj-Napoca',districts:DISTRICTS});

    if(path==='/api/phone/start'&&method==='POST'){
      active();requireSms();const data=await body(req);
      if(typeof data.phone!=='string'||!/^\+40[67]\d{8}$/.test(data.phone))fail(400,'Folosește un număr mobil românesc, în format +407… .');
      return await withPhoneLock(async lock=>{
        const phoneHash=await hash(data.phone);
        const current=await q('SELECT phone_hash,phone_verified_at FROM users WHERE id=?',me.id).first();
        if(current?.phone_verified_at&&current.phone_hash===phoneHash)fail(409,'Acest număr este deja confirmat pentru contul tău. Reîmprospătează pagina.','PHONE_ALREADY_VERIFIED');
        await smsQuota('sms-cooldown-account:'+me.id,1,SMS_COOLDOWN);
        await smsQuota('sms-cooldown-number:'+phoneHash,1,SMS_COOLDOWN);
        await smsQuota('sms-hour-account:'+me.id,3,3600000);
        await smsQuota('sms-hour-number:'+phoneHash,3,3600000);
        await smsQuota('sms-day-global',10,DAY);
        // Permanent cumulative pilot ceiling, increased only with a new authorized budget.
        const budget=await q('INSERT INTO rate_limits (key,hits,expires_at) VALUES (\'sms-pilot-total\',1,8640000000000000) ON CONFLICT(key) DO UPDATE SET hits=hits+1 WHERE hits<?',Number(sms.totalLimit)).run();
        if(!budget.meta.changes)fail(429,'Bugetul de trimiteri al pilotului a fost atins. Contactează administratorul.','SMS_BUDGET');
        const result=await twilioRequest(sms,'Verifications',{To:data.phone,Channel:'sms',Locale:'ro',RiskCheck:'enable'},options.fetcher);
        if(result.status!=='pending'||!matchesVerification(result,sms,data.phone))fail(503,'Furnizorul nu a confirmat pornirea verificării.','SMS_UNAVAILABLE');
        const completedAt=clock(),createdAt=Date.parse(result.date_created);
        if(!Number.isFinite(createdAt)||createdAt>completedAt+30000||createdAt+VERIFY_TTL<=completedAt)fail(503,'Furnizorul nu a confirmat valabilitatea codului.','SMS_UNAVAILABLE');
        const expiresAt=Math.min(now,createdAt)+VERIFY_TTL;
        const saved=await q('INSERT INTO phone_challenges (user_id,phone,provider_sid,expires_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM users WHERE id=? AND status=\'active\') AND '+lockSql+' ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,provider_sid=excluded.provider_sid,expires_at=CASE WHEN phone_challenges.provider_sid=excluded.provider_sid THEN MIN(phone_challenges.expires_at,excluded.expires_at) ELSE excluded.expires_at END',me.id,data.phone,result.sid,expiresAt,me.id,lock.key,lock.token,completedAt).run();
        if(!saved.meta.changes)fail(409,'Solicitarea de verificare s-a schimbat. Reîncearcă.');
        const challenge=await q('SELECT expires_at FROM phone_challenges WHERE user_id=?',me.id).first();
        return json({sent:true,retryAfterSeconds:60,expiresAt:challenge.expires_at});
      });
    }
    if(path==='/api/phone/check'&&method==='POST'){
      active();requireSms();const data=await body(req);
      if(typeof data.code!=='string'||!/^\d{6}$/.test(data.code))fail(400,'Introdu codul de 6 cifre.');
      return await withPhoneLock(async lock=>{
        const challenge=await q('SELECT * FROM phone_challenges WHERE user_id=?',me.id).first();
        if(!challenge||challenge.expires_at<=clock()){
          await q('DELETE FROM phone_challenges WHERE user_id=? AND expires_at<=?',me.id,clock()).run();
          fail(400,'Codul a expirat sau lipsește. Solicită un cod nou.','SMS_EXPIRED');
        }
        // Bound to provider challenge, not a wall-clock bucket or resend count.
        const attempt=await q('INSERT INTO rate_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 WHERE hits<5', 'sms-attempt:'+challenge.provider_sid,challenge.expires_at+DAY).run();
        if(!attempt.meta.changes)fail(429,'Ai atins limita de încercări pentru acest cod. Așteaptă expirarea și solicită unul nou.','SMS_RATE_LIMIT');
        let result;
        try{result=await twilioRequest(sms,'VerificationCheck',{VerificationSid:challenge.provider_sid,Code:data.code},options.fetcher);}
        catch(error){if(error.code==='SMS_EXPIRED')await q('DELETE FROM phone_challenges WHERE user_id=? AND provider_sid=?',me.id,challenge.provider_sid).run();throw error;}
        if(!matchesVerification(result,sms,challenge.phone,challenge.provider_sid))fail(503,'Răspunsul furnizorului nu corespunde verificării.','SMS_UNAVAILABLE');
        if(result.status!=='approved')fail(400,'Codul nu a fost confirmat.','SMS_NOT_APPROVED');
        const phoneHash=await hash(challenge.phone),completedAt=clock();
        if(await q('SELECT id FROM users WHERE phone_hash=? AND id<>?',phoneHash,me.id).first())fail(409,'Numărul nu poate fi asociat acestui cont. Contactează suportul.');
        const changes=await db.batch([
          q('UPDATE users SET phone=?,phone_hash=?,phone_verified_at=? WHERE id=? AND status=\'active\' AND EXISTS (SELECT 1 FROM phone_challenges WHERE user_id=? AND provider_sid=? AND phone=? AND expires_at>?) AND '+lockSql,challenge.phone,phoneHash,completedAt,me.id,me.id,challenge.provider_sid,challenge.phone,completedAt,lock.key,lock.token,completedAt),
          q('INSERT INTO audit_events (id,actor_id,action,target_id,reason,created_at) SELECT ?,?,\'phone_verified\',?,\'\',? WHERE changes()>0',id(),me.id,me.id,completedAt),
          q('UPDATE contact_requests SET phone_shared=0 WHERE owner_id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND phone_hash=? AND phone_verified_at=?)',me.id,me.id,phoneHash,completedAt),
          q('DELETE FROM phone_challenges WHERE user_id=? AND provider_sid=?',me.id,challenge.provider_sid),
        ]);
        if(!changes[0].meta.changes)fail(409,'Solicitarea a expirat sau s-a schimbat. Cere un cod nou.');
        return json({verified:true});
      });
    }
    const photoPath=path.match(/^\/api\/(listings|mine)\/([a-f0-9]{32})\/photos\/([0-4])$/);
    if(photoPath&&method==='GET'){
      const [,scope,listingId,index]=photoPath;
      const photoSelect="SELECT json_extract(l.photos,?) AS photo FROM listings l JOIN users u ON u.id=l.owner_id";
      let row;
      if(scope==='mine'){signed();row=await q(photoSelect+' WHERE l.id=? AND l.owner_id=?','$['+index+']',listingId,me.id).first();}
      else row=await q(photoSelect+' WHERE l.id=? AND '+LIVE,'$['+index+']',listingId,now).first();
      if(!row?.photo||typeof row.photo!=='string'||row.photo.length>400000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(row.photo))fail(404,'Fotografie indisponibilă.');
      let bytes;try{bytes=Uint8Array.from(atob(row.photo.slice('data:image/jpeg;base64,'.length)),char=>char.charCodeAt(0));}catch{fail(404,'Fotografie indisponibilă.');}
      if(bytes.length<3||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)fail(404,'Fotografie indisponibilă.');
      // Always re-authorize, including after expiry, withdrawal or owner suspension.
      const etag='"'+await hash(row.photo)+'"';
      const headers={...securityHeaders,'Content-Type':'image/jpeg','Cache-Control':'private, no-cache','Cross-Origin-Resource-Policy':'same-origin','ETag':etag};
      const matches=req.headers.get('If-None-Match')?.split(',').some(value=>value.trim().replace(/^W\//,'')===etag||value.trim()==='*');
      return new Response(matches?null:bytes,{status:matches?304:200,headers});
    }
    if(path==='/api/listings'&&method==='GET'){
      const clauses=[LIVE],args=[now];
      for(const [field,col,allowed]of[['transaction','transaction',['sale','rent']],['type','type',['apartment','house','land','commercial']],['district','district',DISTRICTS],['currency','currency',['EUR','RON']]]){const value=url.searchParams.get(field);if(value){if(!allowed.includes(value))fail(400,'Filtru invalid.');clauses.push('l."'+col+'"=?');args.push(value);}}
      for(const [field,col,operator]of[['minPrice','price','>='],['maxPrice','price','<='],['minArea','area','>='],['rooms','rooms','>=']]){const raw=url.searchParams.get(field);if(raw){const n=Number(raw);if(!Number.isFinite(n)||n<0)fail(400,'Filtru numeric invalid.');clauses.push('l.'+col+operator+'?');args.push(n);}}
      const query=url.searchParams.get('q');if(query){text(query,1,100,'Căutare');clauses.push('(l.title LIKE ? OR l.description LIKE ?)');args.push('%'+query+'%','%'+query+'%');}
      const minPrice=url.searchParams.get('minPrice'),maxPrice=url.searchParams.get('maxPrice');
      if(minPrice&&maxPrice&&Number(minPrice)>Number(maxPrice))fail(400,'Prețul minim trebuie să fie mai mic sau egal cu bugetul maxim.');
      const sort=url.searchParams.get('sort')||'newest';
      const orders={newest:'l.updated_at DESC,l.id DESC',price_asc:'l.price ASC,l.id DESC',price_desc:'l.price DESC,l.id DESC',area_desc:'l.area DESC,l.id DESC'};
      if(!Object.hasOwn(orders,sort))fail(400,'Ordine de sortare invalidă.');
      if(sort.startsWith('price_')&&!url.searchParams.get('currency'))fail(400,'Selectează moneda înainte de sortarea după preț.');
      const rawPage=url.searchParams.get('page')||'1',page=Number(rawPage),limit=24;
      if(!/^\d+$/.test(rawPage)||!Number.isSafeInteger(page)||page<1||page>1000)fail(400,'Pagină invalidă.');
      const where=' WHERE '+clauses.join(' AND ');
      const count=await q('SELECT COUNT(*) AS total FROM listings l JOIN users u ON u.id=l.owner_id'+where,...args).first();
      const rows=await q(SUMMARY+where+' ORDER BY '+orders[sort]+' LIMIT ? OFFSET ?',...args,limit,(page-1)*limit).all();
      return json({listings:rows.results.map(publicListing),limit,page,total:count.total,totalPages:Math.ceil(count.total/limit),sort});
    }
    if(path==='/api/mine'&&method==='GET'){signed();const rows=await q(SUMMARY+' WHERE l.owner_id=? ORDER BY l.updated_at DESC LIMIT 50',me.id).all();return json({listings:rows.results.map(row=>({...ownListing(row),photos:listingPhotoUrls(row,'mine'),photosIncomplete:true})),limit:50});}
    const ownDetail=path.match(/^\/api\/mine\/([a-f0-9]{32})$/);if(ownDetail&&method==='GET'){const row=await ownerListing(ownDetail[1]);return json({listing:ownListing(row)});}
    if(path==='/api/listings'&&method==='POST'){
      active();await quota('listing-validate',me.id,20,3600000);const data=await body(req),value=validateListing(data);
      if(data.ownerDeclaration!==true||data.declarationVersion!==VERSION)fail(400,'Acceptă declarația proprietarului în versiunea curentă.','DECLARATION_REQUIRED');
      await quota('listing-create',me.id,5);const listingId=id();const duplicate=await q('SELECT id FROM listings WHERE title=? AND district=? AND status IN (\'published\',\'pending\') LIMIT 1',value.title,value.district).first();
      await db.batch([q('INSERT INTO listings (id,owner_id,title,"transaction",type,district,price,currency,area,rooms,description,photos,exact_address,relationship,rent_deposit,rent_costs,contact_hours,accepts_contacts,risk_signals,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',listingId,me.id,value.title,value.transaction,value.type,value.district,value.price,value.currency,value.area,value.rooms,value.description,JSON.stringify(value.photos),value.exactAddress,value.relationship,value.rentDeposit,value.rentCosts,value.contactHours,value.acceptsContacts?1:0,JSON.stringify(duplicate?['possible_duplicate_title_district']:[]),now,now),declaration(me.id,'owner',listingId)]);
      return json({listing:ownListing(await getListing(listingId))},201);
    }
    let match=path.match(/^\/api\/listings\/([a-f0-9]{32})(?:\/(submit|reconfirm|close|preferences))?$/);
    if(match){
      const [,listingId,action]=match;
      if(method==='GET'&&!action){const row=await q(PUBLIC_DETAIL+' WHERE l.id=? AND '+LIVE,listingId,now).first();if(!row)fail(404,'Anunț indisponibil.');return json({listing:publicListing(row)});}
      const row=await ownerListing(listingId);
      if(method==='PATCH'&&!action){
        if(!['draft','rejected','withdrawn'].includes(row.status))fail(409,'Retrage anunțul înainte de modificări.');await quota('listing-validate',me.id,20,3600000);const data=await body(req),value=validateListing(data);
        if(data.ownerDeclaration!==true||data.declarationVersion!==VERSION)fail(400,'Acceptă declarația curentă.');
        const result=await q('UPDATE listings SET title=?,"transaction"=?,type=?,district=?,price=?,currency=?,area=?,rooms=?,description=?,photos=?,exact_address=?,relationship=?,rent_deposit=?,rent_costs=?,contact_hours=?,accepts_contacts=?,status=\'draft\',updated_at=?,ownership_status=\'declared\',moderation_reason=\'\' WHERE id=? AND owner_id=? AND status IN (\'draft\',\'rejected\',\'withdrawn\')',value.title,value.transaction,value.type,value.district,value.price,value.currency,value.area,value.rooms,value.description,JSON.stringify(value.photos),value.exactAddress,value.relationship,value.rentDeposit,value.rentCosts,value.contactHours,value.acceptsContacts?1:0,now,listingId,me.id).run();if(!result.meta.changes)fail(409,'Anunțul s-a schimbat. Reîncarcă pagina.');await declaration(me.id,'owner',listingId).run();return json({listing:ownListing(await getListing(listingId))});
      }
      if(method==='POST'&&action==='submit'){
        verified();if(!['draft','rejected','withdrawn'].includes(row.status))fail(409,'Anunțul nu poate fi trimis în această stare.');if(!JSON.parse(row.photos).length)fail(400,'Adaugă cel puțin o fotografie pentru publicare.');
        const accepted=await q('SELECT id FROM declarations WHERE user_id=? AND listing_id=? AND kind=\'owner\' AND version=? LIMIT 1',me.id,listingId,VERSION).first();if(!accepted)fail(400,'Acceptă declarația curentă.');
        await quota('listing-submit',me.id,5);const result=await db.batch([q('UPDATE listings SET status=\'pending\',updated_at=? WHERE id=? AND owner_id=? AND status IN (\'draft\',\'rejected\',\'withdrawn\')',now,listingId,me.id),auditChanged(me.id,'listing_submitted',listingId)]);if(!result[0].meta.changes)fail(409,'Starea anunțului s-a schimbat.');return json({submitted:true,status:'pending'});
      }
      if(method==='POST'&&action==='reconfirm'){
        verified();if(row.status!=='published')fail(409,'Doar un anunț publicat poate fi reconfirmat.');const result=await db.batch([q('UPDATE listings SET available_until=?,updated_at=? WHERE id=? AND owner_id=? AND status=\'published\'',now+30*DAY,now,listingId,me.id),auditChanged(me.id,'listing_reconfirmed',listingId)]);if(!result[0].meta.changes)fail(409,'Starea anunțului s-a schimbat.');return json({availableUntil:now+30*DAY});
      }
      if(method==='POST'&&action==='close'){
        const data=await body(req);if(!['sold','rented','withdrawn'].includes(data.status))fail(400,'Stare invalidă.');if((data.status==='sold'&&row.transaction!=='sale')||(data.status==='rented'&&row.transaction!=='rent'))fail(400,'Starea nu corespunde tranzacției.');if(row.status===data.status)return json({closed:true});
        const result=await db.batch([q('UPDATE listings SET status=?,updated_at=? WHERE id=? AND owner_id=? AND status NOT IN (\'sold\',\'rented\')',data.status,now,listingId,me.id),auditChanged(me.id,'listing_closed',listingId,data.status),q('UPDATE contact_requests SET phone_shared=0 WHERE listing_id=?',listingId)]);if(!result[0].meta.changes)fail(409,'Starea anunțului s-a schimbat.');return json({closed:true});
      }
      if(method==='POST'&&action==='preferences'){
        const data=await body(req);if(typeof data.acceptsContacts!=='boolean')fail(400,'Preferință invalidă.');const hours=text(data.contactHours||'',0,100);if(contactText(hours))fail(400,'Nu include date de contact în interval.');const result=await q('UPDATE listings SET accepts_contacts=?,contact_hours=? WHERE id=? AND owner_id=?',data.acceptsContacts?1:0,hours,listingId,me.id).run();if(!result.meta.changes)fail(409,'Anunțul s-a schimbat.');return json({updated:true});
      }
      fail(405,'Metodă nepermisă.');
    }
    if(path==='/api/favorites'&&method==='GET'){signed();const rows=await q(SUMMARY+' JOIN favorites f ON f.listing_id=l.id WHERE f.user_id=? AND '+LIVE+' ORDER BY l.updated_at DESC LIMIT 50',me.id,now).all();return json({listings:rows.results.map(publicListing),limit:50});}
    match=path.match(/^\/api\/favorites\/([a-f0-9]{32})$/);
    if(match&&['PUT','DELETE'].includes(method)){
      active();if(method==='PUT'){const row=await q(SUMMARY+' WHERE l.id=? AND '+LIVE,match[1],now).first();if(!row)fail(404,'Anunț indisponibil.');await q('INSERT INTO favorites (user_id,listing_id) VALUES (?,?) ON CONFLICT DO NOTHING',me.id,match[1]).run();}else await q('DELETE FROM favorites WHERE user_id=? AND listing_id=?',me.id,match[1]).run();return json({saved:method==='PUT'});
    }
    if(path==='/api/contact-requests'&&method==='POST'){
      verified();const data=await body(req);if(data.contactDeclaration!==true||data.declarationVersion!==VERSION)fail(400,'Acceptă declarația de contact în versiunea curentă.','DECLARATION_REQUIRED');
      const purpose=text(data.purpose,20,600,'Scopul contactului');if(contactText(purpose))fail(400,'Nu include telefon, e-mail sau linkuri în solicitare.');
      const listing=await q(SUMMARY+' WHERE l.id=? AND '+LIVE,data.listingId,now).first();if(!listing||!listing.accepts_contacts)fail(404,'Anunțul nu primește solicitări acum.');if(listing.owner_id===me.id)fail(400,'Acesta este anunțul tău.');if(await isBlocked(me.id,listing.owner_id))fail(403,'Nu poți contacta acest utilizator.');
      if(await q('SELECT id FROM contact_requests WHERE listing_id=? AND requester_id=?',listing.id,me.id).first())fail(409,'Ai deja o solicitare pentru acest anunț.');
      await quota('contact-new',me.id,now-me.created_at<7*DAY?3:10);await quota('contact-hour',me.id,3,3600000);
      const conversationId=id();await db.batch([
        q('INSERT INTO contact_requests (id,listing_id,requester_id,owner_id,purpose,created_at,updated_at) SELECT ?,l.id,?,l.owner_id,?,?,? FROM listings l JOIN users u ON u.id=l.owner_id JOIN users ru ON ru.id=? WHERE l.id=? AND '+LIVE+' AND l.accepts_contacts=1 AND ru.status=\'active\' AND ru.phone_verified_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM blocks WHERE (blocker_id=? AND blocked_id=l.owner_id) OR (blocker_id=l.owner_id AND blocked_id=?))',conversationId,me.id,purpose,now,now,me.id,listing.id,now,me.id,me.id),
        q('INSERT INTO declarations (id,user_id,kind,version,listing_id,accepted_at,text_snapshot) SELECT ?,?,\'contact\',?,?,?,? WHERE EXISTS (SELECT 1 FROM contact_requests WHERE id=?)',id(),me.id,VERSION,listing.id,now,DECLARATIONS.contact,conversationId),
        q('INSERT INTO audit_events (id,actor_id,action,target_id,reason,created_at) SELECT ?,?,\'contact_requested\',?,\'\',? WHERE EXISTS (SELECT 1 FROM contact_requests WHERE id=?)',id(),me.id,conversationId,now,conversationId),
      ]);
      if(!await q('SELECT id FROM contact_requests WHERE id=?',conversationId).first())fail(403,'Contactul a fost blocat.');return json({id:conversationId,status:'requested'},201);
    }
    if(path==='/api/conversations'&&method==='GET'){
      conversationAccess();const cursor=pageCursor(url.searchParams.get('before')),limit=25;
      const args=[me.id,me.id],where=['(c.owner_id=? OR c.requester_id=?)'];
      if(cursor){where.push('(c.updated_at<? OR (c.updated_at=? AND c.id<?))');args.push(cursor.time,cursor.time,cursor.id);}
      const rows=(await q(CONVERSATION_JOIN+' WHERE '+where.join(' AND ')+' ORDER BY c.updated_at DESC,c.id DESC LIMIT ?',...args,limit+1).all()).results;
      const hasMore=rows.length>limit,page=rows.slice(0,limit),last=page.at(-1);
      return json({conversations:page.map(conversationDto),limit,nextCursor:hasMore?last.updated_at+':'+last.id:null});
    }
    match=path.match(/^\/api\/conversations\/([a-f0-9]{32})(?:\/(decision|messages|share-phone|block|viewings))?$/);
    if(match){
      const [,conversationId,action]=match;
      if(method==='GET'&&!action){
        const row=await getConversation(conversationId);let phone=null;
        if(row.status==='accepted'&&row.phone_shared&&!row.blocked&&row.available&&me.status==='active'&&me.id===row.requester_id){phone=(await q('SELECT u.phone FROM users u JOIN contact_requests shared ON shared.owner_id=u.id WHERE shared.id=? AND shared.requester_id=? AND shared.phone_shared=1 AND '+READY,conversationId,me.id,conversationId,now,me.id,me.id).first())?.phone||null;}
        const cursor=pageCursor(url.searchParams.get('before')),limit=50,args=[conversationId],where=['conversation_id=?'];
        if(cursor){where.push('(created_at<? OR (created_at=? AND id<?))');args.push(cursor.time,cursor.time,cursor.id);}
        const rows=(await q('SELECT id,sender_id AS senderId,body,created_at AS createdAt FROM messages WHERE '+where.join(' AND ')+' ORDER BY created_at DESC,id DESC LIMIT ?',...args,limit+1).all()).results;
        const hasMore=rows.length>limit,page=rows.slice(0,limit),last=page.at(-1);
        const visits=await q('SELECT id,starts_at AS startsAt,status,proposed_by AS proposedBy FROM viewings WHERE conversation_id=? ORDER BY starts_at DESC,id DESC LIMIT 101',conversationId).all();
        return json({conversation:conversationDto(row),messages:page.reverse(),nextMessageCursor:hasMore?last.createdAt+':'+last.id:null,messageLimit:limit,viewings:visits.results.slice(0,100).reverse(),viewingsHasMore:visits.results.length>100,phone});
      }
      if(method!=='POST')fail(405,'Metodă nepermisă.');active();
      if(action==='block'){
        const row=await getConversation(conversationId),other=me.id===row.owner_id?row.requester_id:row.owner_id;
        await db.batch([q('INSERT INTO blocks (blocker_id,blocked_id,created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING',me.id,other,now),q('UPDATE contact_requests SET phone_shared=0 WHERE (owner_id=? AND requester_id=?) OR (owner_id=? AND requester_id=?)',me.id,other,other,me.id),audit(me.id,'user_blocked',other)]);return json({blocked:true});
      }
      if(action==='decision'){
        verified();const row=await getConversation(conversationId),data=await body(req);if(row.owner_id!==me.id)fail(403,'Doar proprietarul poate decide.');if(row.blocked||!row.available||row.status!=='requested')fail(409,'Solicitarea nu mai poate fi decisă.');if(!['accepted','declined'].includes(data.decision))fail(400,'Decizie invalidă.');
        const result=await db.batch([q('UPDATE contact_requests SET status=?,phone_shared=0,updated_at=? WHERE id=? AND owner_id=? AND status=\'requested\' AND '+READY.replace("c.status='accepted'","c.status='requested'"),data.decision,now,conversationId,me.id,conversationId,now,me.id,me.id),auditChanged(me.id,'contact_'+data.decision,conversationId)]);if(!result[0].meta.changes)fail(409,'Solicitarea s-a schimbat. Reîncarcă pagina.');return json({status:data.decision});
      }
      const row=await getConversation(conversationId,true);verified();
      if(action==='share-phone'){
        if(row.owner_id!==me.id)fail(403,'Doar proprietarul poate dezvălui telefonul.');if(row.phone_shared)return json({shared:true});
        const result=await q('UPDATE contact_requests SET phone_shared=1,updated_at=? WHERE id=? AND owner_id=? AND phone_shared=0 AND '+READY,now,conversationId,me.id,conversationId,now,me.id,me.id).run();if(!result.meta.changes)fail(409,'Contactul nu mai permite dezvăluirea.');await audit(me.id,'phone_shared',conversationId).run();return json({shared:true});
      }
      if(action==='messages'){
        const data=await body(req),message=text(data.body,1,2000,'Mesaj');
        if(contactText(message))fail(400,'Folosește funcția de dezvăluire controlată pentru telefon. Nu trimite numere, e-mailuri sau linkuri în mesaje.');
        if(data.requestId!==undefined&&(typeof data.requestId!=='string'||!/^[a-f0-9]{32}$/.test(data.requestId)))fail(400,'Identificator de mesaj invalid.');
        const messageId=data.requestId||id();
        const replay=async()=>{
          const existing=await q('SELECT conversation_id,sender_id,body FROM messages WHERE id=?',messageId).first();
          if(!existing)return false;
          if(existing.conversation_id!==conversationId||existing.sender_id!==me.id||existing.body!==message)fail(409,'Această trimitere nu corespunde mesajului inițial.');
          return true;
        };
        if(await replay())return json({id:messageId,sent:true,replayed:true});
        await quota('messages',me.id,30,3600000);
        const result=await q('INSERT INTO messages (id,conversation_id,sender_id,body,created_at) SELECT ?,?,?,?,? WHERE '+READY+' ON CONFLICT(id) DO NOTHING',messageId,conversationId,me.id,message,now,conversationId,now,me.id,me.id).run();
        if(!result.meta.changes){if(await replay())return json({id:messageId,sent:true,replayed:true});fail(403,'Mesajul nu a putut fi trimis.');}
        await q('UPDATE contact_requests SET updated_at=? WHERE id=?',now,conversationId).run();return json({id:messageId,sent:true},201);
      }
      if(action==='viewings'){
        if(row.owner_id===me.id)fail(400,'Solicitarea de vizionare pornește de la persoana interesată.');const data=await body(req);if(!Number.isFinite(data.startsAt)||data.startsAt<now+3600000||data.startsAt>now+30*DAY)fail(400,'Alege un moment între o oră și 30 de zile de acum.');await quota('viewings',me.id,3);const viewingId=id();const inserted=await q('INSERT INTO viewings (id,conversation_id,proposed_by,starts_at,created_at) SELECT ?,?,?,?,? WHERE '+READY,viewingId,conversationId,me.id,data.startsAt,now,conversationId,now,me.id,me.id).run();if(!inserted.meta.changes)fail(403,'Conversația nu mai permite vizionări.');return json({id:viewingId,status:'requested'},201);
      }
      fail(404,'Resursă negăsită.');
    }
    match=path.match(/^\/api\/viewings\/([a-f0-9]{32})$/);
    if(match&&method==='POST'){
      verified();const visit=await q('SELECT * FROM viewings WHERE id=?',match[1]).first();if(!visit)fail(404,'Vizionare negăsită.');const row=await getConversation(visit.conversation_id,true);if(row.owner_id!==me.id)fail(403,'Doar proprietarul poate confirma vizionarea.');const data=await body(req);if(!['accepted','declined'].includes(data.decision))fail(400,'Decizie invalidă.');if(visit.starts_at<=now)fail(409,'Momentul propus a trecut. Cere o propunere nouă.');const result=await q('UPDATE viewings SET status=? WHERE id=? AND status=\'requested\' AND starts_at>? AND '+READY,data.decision,visit.id,now,visit.conversation_id,now,me.id,me.id).run();if(!result.meta.changes)fail(409,'Starea vizionării s-a schimbat.');return json({status:data.decision});
    }
    if(path==='/api/reports'&&method==='POST'){
      active();const data=await body(req);if(!['agency','suspected_agency','contact_sharing','duplicate','unavailable','misleading','harassment','other'].includes(data.reason))fail(400,'Alege motivul raportării.');const details=text(data.details,10,1500,'Context');
      let listingId=data.listingId||null,conversationId=data.conversationId||null;
      if(conversationId){const c=await getConversation(conversationId);if(listingId&&listingId!==c.listing_id)fail(400,'Context necorespunzător.');listingId=c.listing_id;}
      else {if(!listingId)fail(400,'Alege anunțul sau conversația.');const listing=await q(JOIN+' WHERE l.id=? AND '+LIVE,listingId,now).first();if(!listing)fail(404,'Anunț indisponibil.');}
      await quota('reports',me.id,5);const reportId=id();await db.batch([q('INSERT INTO reports (id,reporter_id,listing_id,conversation_id,reason,details,created_at) VALUES (?,?,?,?,?,?,?)',reportId,me.id,listingId,conversationId,data.reason,details,now),audit(me.id,'report_created',reportId)]);return json({id:reportId,status:'open'},201);
    }
    if(path==='/api/my-cases'&&method==='GET'){
      signed();
      const reportRows=await q('SELECT r.id,r.listing_id,l.title AS listing_title,r.conversation_id,r.reason,r.details,r.status,r.decision_reason,r.created_at FROM reports r LEFT JOIN listings l ON l.id=r.listing_id WHERE r.reporter_id=? ORDER BY r.created_at DESC,r.rowid DESC LIMIT 30',me.id).all();
      const appealRows=await q('SELECT id,report_id,reason,status,decision_reason,created_at FROM appeals WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 30',me.id).all();
      const sanction=me.status==='restricted'||me.status==='suspended'?await q('SELECT reason FROM audit_events WHERE target_id=? AND action=? ORDER BY created_at DESC,rowid DESC LIMIT 1',me.id,'user_'+me.status).first():null;
      return json({reports:reportRows.results.map(row=>({id:row.id,listingId:row.listing_id,listingTitle:row.listing_title,conversationId:row.conversation_id,reason:row.reason,details:row.details,status:row.status,decisionReason:row.decision_reason,createdAt:row.created_at})),appeals:appealRows.results.map(row=>({id:row.id,reportId:row.report_id,reason:row.reason,status:row.status,decisionReason:row.decision_reason,createdAt:row.created_at})),account:{status:me.status,restrictionReason:sanction?.reason||null}});
    }
    if(path==='/api/appeals'&&method==='POST'){
      signed();const data=await body(req),reason=text(data.reason,20,2000,'Contestație');let reportId=data.reportId||null;
      if(reportId){const report=await q('SELECT r.reporter_id,l.owner_id,c.requester_id FROM reports r LEFT JOIN listings l ON l.id=r.listing_id LEFT JOIN contact_requests c ON c.id=r.conversation_id WHERE r.id=?',reportId).first();if(!report||![report.reporter_id,report.owner_id,report.requester_id].includes(me.id))fail(404,'Caz negăsit.');}
      await quota('appeals',me.id,3);const appealId=id();await db.batch([q('INSERT INTO appeals (id,user_id,report_id,reason,created_at) VALUES (?,?,?,?,?)',appealId,me.id,reportId,reason,now),audit(me.id,'appeal_created',appealId)]);return json({id:appealId,status:'open'},201);
    }
    if(path==='/api/moderation'&&method==='GET'){
      moderator();await audit(me.id,'moderation_queue_viewed','queue').run();const pending=await q(JOIN+' WHERE l.status=\'pending\' ORDER BY l.created_at LIMIT 10').all();
      const reportRows=await q('SELECT r.*,l.title AS listing_title FROM reports r LEFT JOIN listings l ON l.id=r.listing_id WHERE r.status=\'open\' ORDER BY r.created_at LIMIT 50').all();
      const appealRows=await q('SELECT * FROM appeals WHERE status=\'open\' ORDER BY created_at LIMIT 50').all();
      return json({listings:pending.results.map(row=>({...ownListing(row),riskSignals:JSON.parse(row.risk_signals)})),reports:reportRows.results.map(row=>({id:row.id,reporterId:row.reporter_id,listingId:row.listing_id,listingTitle:row.listing_title,conversationId:row.conversation_id,reason:row.reason,details:row.details,createdAt:row.created_at})),appeals:appealRows.results.map(row=>({id:row.id,userId:row.user_id,reportId:row.report_id,reason:row.reason,createdAt:row.created_at}))});
    }
    const evidence=path.match(/^\/api\/moderation\/reports\/([a-f0-9]{32})\/evidence$/);
    if(evidence&&method==='GET'){
      moderator();const report=await q('SELECT r.*,l.title AS listing_title,l.owner_id,c.requester_id,c.purpose FROM reports r LEFT JOIN listings l ON l.id=r.listing_id LEFT JOIN contact_requests c ON c.id=r.conversation_id WHERE r.id=?',evidence[1]).first();if(!report)fail(404,'Caz negăsit.');if([report.reporter_id,report.owner_id,report.requester_id].includes(me.id))fail(403,'Un alt moderator trebuie să analizeze acest caz.');
      const messages=report.conversation_id?await q('SELECT sender_id AS senderId,body,created_at AS createdAt FROM messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT 30',report.conversation_id).all():{results:[]};
      const involvedAccounts=[{id:report.reporter_id,role:'reporter'},{id:report.owner_id,role:'owner'},{id:report.requester_id,role:'requester'}].filter(account=>!!account.id);
      await audit(me.id,'report_evidence_viewed',report.id).run();return json({listingTitle:report.listing_title,purpose:report.purpose,reason:report.reason,details:report.details,messages:messages.results.reverse(),involvedAccounts});
    }
    match=path.match(/^\/api\/moderation\/(listings|reports|users|appeals)\/([^/]+)$/);
    if(match&&method==='POST'){
      moderator();const [,kind,target]=match,data=await body(req),reason=text(data.reason,10,1000,'Motivul deciziei');
      if(kind==='listings'){
        const listing=await getListing(target);if(!listing||listing.status!=='pending')fail(404,'Anunțul nu este în coada de verificare.');if(listing.owner_id===me.id)fail(403,'Un moderator nu își aprobă propriul anunț.');if(data.ownershipReviewed===true)fail(400,'Verificarea dreptului de proprietate nu este implementată. Nu se poate acorda această insignă.');if(!['published','rejected'].includes(data.decision))fail(400,'Decizie invalidă.');
        const owner=await q('SELECT status,phone_verified_at FROM users WHERE id=?',listing.owner_id).first();if(data.decision==='published'&&(!owner.phone_verified_at||owner.status!=='active'))fail(409,'Proprietarul nu îndeplinește condițiile de publicare.');
        const result=await db.batch([q('UPDATE listings SET status=?,moderation_reason=?,available_until=?,updated_at=?,ownership_status=\'declared\' WHERE id=? AND status=\'pending\'',data.decision,reason,data.decision==='published'?now+30*DAY:null,now,target),auditChanged(me.id,'listing_'+data.decision,target,reason)]);if(!result[0].meta.changes)fail(409,'Starea anunțului s-a schimbat.');return json({status:data.decision});
      }
      if(kind==='reports'){
        const report=await q('SELECT * FROM reports WHERE id=? AND status=\'open\'',target).first();if(!report)fail(404,'Raport negăsit.');const listing=report.listing_id?await getListing(report.listing_id):null;
        const conversation=report.conversation_id?await q('SELECT requester_id,owner_id FROM contact_requests WHERE id=?',report.conversation_id).first():null;
        if(report.reporter_id===me.id||listing?.owner_id===me.id||conversation?.requester_id===me.id||conversation?.owner_id===me.id)fail(403,'Nu poți soluționa un caz în care ești implicat.');if(!['resolved','dismissed'].includes(data.decision))fail(400,'Decizie invalidă.');
        const result=await db.batch([q('UPDATE reports SET status=?,decision_reason=? WHERE id=? AND status=\'open\'',data.decision,reason,target),auditChanged(me.id,'report_'+data.decision,target,reason)]);if(!result[0].meta.changes)fail(409,'Cazul a fost deja decis.');return json({status:data.decision});
      }
      if(kind==='appeals'){
        const appeal=await q('SELECT * FROM appeals WHERE id=? AND status=\'open\'',target).first();if(!appeal)fail(404,'Contestație negăsită.');if(appeal.user_id===me.id)fail(403,'Nu poți decide propria contestație.');
        if(appeal.report_id){const related=await q('SELECT r.reporter_id,l.owner_id,c.requester_id FROM reports r LEFT JOIN listings l ON l.id=r.listing_id LEFT JOIN contact_requests c ON c.id=r.conversation_id WHERE r.id=?',appeal.report_id).first();if(related&&[related.reporter_id,related.owner_id,related.requester_id].includes(me.id))fail(403,'Nu poți decide contestația unui caz în care ești implicat.');}
        if(appeal.report_id&&await q('SELECT id FROM audit_events WHERE actor_id=? AND target_id=? AND action IN (\'report_resolved\',\'report_dismissed\') LIMIT 1',me.id,appeal.report_id).first())fail(403,'Contestația trebuie analizată de un alt moderator.');
        if(!appeal.report_id){
          if(await q('SELECT id FROM audit_events WHERE actor_id=? AND target_id=? AND action IN (\'user_restricted\',\'user_suspended\') LIMIT 1',me.id,appeal.user_id).first())fail(403,'Contestația trebuie analizată de un alt moderator.');
          if(await q('SELECT id FROM contact_requests WHERE (owner_id=? AND requester_id=?) OR (owner_id=? AND requester_id=?) LIMIT 1',me.id,appeal.user_id,appeal.user_id,me.id).first())fail(403,'Un alt moderator trebuie să analizeze cazul.');
        }
        if(!['upheld','dismissed'].includes(data.decision))fail(400,'Decizie invalidă.');const steps=[q('UPDATE appeals SET status=?,decision_reason=? WHERE id=? AND status=\'open\'',data.decision,reason,target),auditChanged(me.id,'appeal_'+data.decision,target,reason)];
        if(data.decision==='upheld')steps.push(appeal.report_id?q('UPDATE reports SET status=\'open\' WHERE id=? AND EXISTS (SELECT 1 FROM audit_events WHERE actor_id=? AND target_id=? AND action=\'appeal_upheld\' AND created_at=?)',appeal.report_id,me.id,target,now):q('UPDATE users SET status=\'active\' WHERE id=? AND EXISTS (SELECT 1 FROM audit_events WHERE actor_id=? AND target_id=? AND action=\'appeal_upheld\' AND created_at=?)',appeal.user_id,me.id,target,now));
        const result=await db.batch(steps);if(!result[0].meta.changes)fail(409,'Contestația a fost deja decisă.');return json({status:data.decision});
      }
      if(kind==='users'){
        if(target===me.id)fail(403,'Nu îți poți modifica propriul acces.');if(!['active','restricted','suspended'].includes(data.status))fail(400,'Stare invalidă.');const subject=await q('SELECT id,email FROM users WHERE id=?',target).first();if(!subject)fail(404,'Cont negăsit.');if(mods.includes(subject.email.toLowerCase()))fail(403,'Accesul moderatorilor se gestionează din configurarea autorizată.');
        if(await q('SELECT id FROM contact_requests WHERE (owner_id=? AND requester_id=?) OR (owner_id=? AND requester_id=?) LIMIT 1',me.id,target,target,me.id).first())fail(403,'Nu poți decide într-un caz în care ești implicat.');
        if(await q('SELECT r.id FROM reports r LEFT JOIN listings l ON l.id=r.listing_id LEFT JOIN contact_requests c ON c.id=r.conversation_id WHERE (r.reporter_id=? OR l.owner_id=? OR c.requester_id=?) AND (r.reporter_id=? OR l.owner_id=? OR c.requester_id=?) LIMIT 1',me.id,me.id,me.id,target,target,target).first())fail(403,'Nu poți decide într-un caz în care ești implicat.');
        await db.batch([q('UPDATE users SET status=? WHERE id=?',data.status,target),q('UPDATE contact_requests SET phone_shared=0 WHERE owner_id=? OR requester_id=?',target,target),audit(me.id,'user_'+data.status,target,reason)]);return json({status:data.status});
      }
    }
    fail(404,'Resursă negăsită.');
  }catch(error){
    if(error instanceof ApiError)return json({error:error.message,code:error.code},error.status);
    // Never log private content, phone numbers, addresses, identities or tokens.
    return json({error:'Cererea nu a putut fi procesată. Reîncearcă mai târziu.',code:'UNAVAILABLE'},503);
  }
}
