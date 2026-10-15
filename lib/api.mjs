import QRCode from 'qrcode';
import { validateGift, ID, DAY, randomId, digest } from './model.mjs';

export const securityHeaders = {
  'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer', 'X-Robots-Tag':'noindex, nofollow',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; media-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
};
const json = (data,status=200,extra={}) => new Response(JSON.stringify(data),{status,headers:{...securityHeaders,'Content-Type':'application/json; charset=utf-8',...extra}});
const ownerCookie = req => req.headers.get('cookie')?.match(/(?:^|;\s*)nespus_owner=([a-f0-9]{64})(?:;|$)/)?.[1];

// The same handler is exercised against SQLite in tests and D1 in production.
export async function handleApi(req, db, now=Date.now()) {
  const url = new URL(req.url), path=url.pathname;
  if (path==='/api/health' && req.method==='GET') return json({status:'ok',version:'0.1.0',payments:'disabled'});
  if (!db) return json({error:'Salvarea este temporar indisponibilă.'},503);
  if (!['GET','HEAD'].includes(req.method) && req.headers.get('origin')!==url.origin) return json({error:'Cerere nepermisă.'},403);
  try {
    const owner=ownerCookie(req), ownerHash=owner ? await digest(owner) : null;
    if (path==='/api/gifts' && req.method==='POST') {
      if (!req.headers.get('content-type')?.startsWith('application/json')) return json({error:'Format invalid.'},415);
      // Read a bounded stream: do not trust Content-Length alone.
      const reader=req.body?.getReader(); let size=0, chunks=[];
      if (!reader) return json({error:'Mesaj lipsă.'},400);
      while (true) { const {done,value}=await reader.read(); if(done) break; size+=value.byteLength; if(size>420000){await reader.cancel();return json({error:'Mesaj prea mare.'},413);} chunks.push(value); }
      const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
      let input;try{input=JSON.parse(new TextDecoder().decode(bytes));}catch{return json({error:'Date invalide.'},400);}
      let gift;try{gift=validateGift(input);}catch(e){return json({error:e.message},400);}
      const token=owner || randomId()+randomId(), hash=ownerHash || await digest(token);
      const id=randomId(), expiresAt=now+gift.days*DAY;
      // Atomic INSERT SELECT prevents races from bypassing this browser quota.
      const inserted=await db.prepare('INSERT INTO gifts (id,owner_hash,payload,created_at,expires_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM gifts WHERE owner_hash=? AND created_at>?)<10').bind(id,hash,JSON.stringify(gift),now,expiresAt,hash,now-DAY).run();
      if (!inserted.meta.changes) return json({error:'Ai creat deja 10 linkuri în ultimele 24 de ore. Revino mai târziu.'},429);
      return json({id,expiresAt,url:'/g/'+id},201,{'Set-Cookie':`nespus_owner=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${url.protocol==='https:'?'; Secure':''}`});
    }
    if (path==='/api/gifts' && req.method==='GET') {
      if (!ownerHash) return json({gifts:[]});
      const {results}=await db.prepare('SELECT id,payload,created_at,expires_at FROM gifts WHERE owner_hash=? ORDER BY created_at DESC LIMIT 50').bind(ownerHash).all();
      return json({gifts:results.map(row=>({id:row.id,title:JSON.parse(row.payload).title,createdAt:row.created_at,expiresAt:row.expires_at}))});
    }
    const match=path.match(/^\/api\/gifts\/([a-f0-9]{32})(\/qr)?$/);
    if(match) {
      const [,id,qr]=match;
      if(req.method==='DELETE' && !qr) {
        if(!ownerHash) return json({error:'Link negăsit.'},404);
        const result=await db.prepare('DELETE FROM gifts WHERE id=? AND owner_hash=?').bind(id,ownerHash).run();
        return result.meta.changes ? json({deleted:true}) : json({error:'Link negăsit.'},404);
      }
      if(req.method==='GET') {
        const row=await db.prepare('SELECT payload,expires_at FROM gifts WHERE id=?').bind(id).first();
        if(!row || row.expires_at<=now) return json({error:'Acest gând nu mai este disponibil.'},404);
        if(qr) {
          const svg=await QRCode.toString(url.origin+'/g/'+id,{type:'svg',errorCorrectionLevel:'M',margin:4,width:360,color:{dark:'#302a27',light:'#ffffff'}});
          return new Response(svg,{headers:{...securityHeaders,'Content-Type':'image/svg+xml','Content-Disposition':`attachment; filename="nespus-${id}.svg"`}});
        }
        return json({gift:JSON.parse(row.payload),expiresAt:row.expires_at});
      }
    }
    return json({error:'Resursă negăsită.'},404);
  } catch {
    // Never log gift contents, cookie tokens or recipient identifiers.
    return json({error:'Nu am putut procesa cererea. Încearcă din nou.'},503);
  }
}
