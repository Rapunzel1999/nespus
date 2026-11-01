// Procedural DEMO pixels; no stock images, genuine homes, identities or contacts.
import jpeg from 'jpeg-js';
import {Buffer} from 'node:buffer';
import {VERSION, DECLARATIONS, DAY} from '../../lib/model.mjs';
export const listingId=n=>n.toString(16).padStart(32,'0');
export const demoPhoto='data:image/jpeg;base64,'+Buffer.from(jpeg.encode({data:Buffer.alloc(800*600*4,170),width:800,height:600},75).data).toString('base64');
export const draftInput={title:'DEMO Ciornă de test în Cluj',transaction:'sale',type:'apartment',district:'Centru',price:120000,currency:'EUR',area:60,rooms:2,description:'DEMO: locuință fictivă pentru verificarea locală a fluxului. Nu este o ofertă disponibilă.',photos:[demoPhoto],relationship:'owner',ownerDeclaration:true,declarationVersion:VERSION};
export async function seed(db,now=Date.now()) {
  const q=(sql,...args)=>db.prepare(sql).bind(...args);
  for(const table of ['saved_searches','appeals','reports','viewings','messages','declarations','favorites','contact_requests','blocks','phone_challenges','rate_limits','audit_events','listings','users'])await q('DELETE FROM '+table).run();
  for(const [i,role] of ['owner','buyer','moderator','unverified'].entries())await q('INSERT INTO users(id,name,email,phone,phone_hash,phone_verified_at,created_at) VALUES (?,?,?,?,?,?,?)','DEMO-'+role,'DEMO '+role,role+'@example.invalid',role==='unverified'?null:'+4070000000'+i,role==='unverified'?null:'DEMO-hash-'+role,role==='unverified'?null:now,now).run();
  for(let n=1;n<=8;n++){
    const id=listingId(n),district=['Centru','Gheorgheni','Zorilor','Mărăști'][(n-1)%4];
    await q('INSERT INTO listings(id,owner_id,title,"transaction",type,district,price,currency,area,rooms,description,photos,exact_address,relationship,status,created_at,updated_at,available_until) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',id,'DEMO-owner','DEMO Locuință '+n,n>6?'rent':'sale','apartment',district,n>6?700:120000+n*5000,'EUR',50+n*5,2,'DEMO: proprietate fictivă, generată exclusiv pentru testarea locală. Nu reprezintă o ofertă reală.',JSON.stringify([demoPhoto,demoPhoto]),'DEMO ADRESĂ PRIVATĂ','owner','published',now-n*1000,now-n*1000,now+30*DAY).run();
    await q('INSERT INTO audit_events(id,actor_id,action,target_id,created_at) VALUES (?,?,?,?,?)',listingId(200+n),'DEMO-moderator','listing_published',id,now-n*DAY).run();
    await q('INSERT INTO declarations(id,user_id,kind,version,listing_id,accepted_at,text_snapshot) VALUES (?,?,?,?,?,?,?)',listingId(100+n),'DEMO-owner','owner',VERSION,id,now,DECLARATIONS.owner).run();
  }
}
