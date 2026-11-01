import jpeg from 'jpeg-js';
import {Buffer} from 'node:buffer';
export const DAY=86400000;
export const VERSION='2026-10-15.1';
export const DISTRICTS=['Centru','Mărăști','Mănăștur','Gheorgheni','Zorilor','Bună Ziua','Andrei Mureșanu','Grigorescu','Iris','Dâmbul Rotund','Între Lacuri','Borhanci','Europa','Sopor','Bulgaria','Someșeni','Becaș','Făget','Gruia'];
export const DECLARATIONS={
  version:VERSION,
  owner:'Declar că sunt proprietar sau coproprietar al imobilului și public pentru mine, nu ca intermediar sau pentru o agenție. Informațiile sunt corecte după cunoștința mea. Nu folosesc platforma pentru colectarea sau transmiterea de contacte către intermediari. Accept regulile de moderare și contestare.',
  contact:'Declar că urmăresc cumpărarea sau închirierea pentru un interes personal real, nu în numele sau beneficiul unei agenții ori al unui intermediar. Nu colectez contacte pentru intermediari și nu voi transmite datele proprietarului către aceștia, direct sau prin alte persoane, fără acordul său prealabil și explicit. Nu republic anunțul ori fotografiile fără permisiune. Accept regulile de contact, moderare și contestare.',
};
export class ApiError extends Error { constructor(status,message,code='INVALID'){super(message);this.status=status;this.code=code;} }
export const fail=(status,message,code)=>{throw new ApiError(status,message,code);};
export const id=()=>crypto.randomUUID().replaceAll('-','');
export async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export const contactText=value=>/(?:\+?\d[\s().-]*){9,15}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:https?:\/\/|www\.)\S+/i.test(value);
export function text(value,min,max,label='Câmp'){
  if(typeof value!=='string'||value.trim().length<min||value.length>max)fail(400,label+': verifică lungimea textului.');return value.trim();
}
export function validateListing(input){
  if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'Anunț invalid.');
  const title=text(input.title,8,120,'Titlu'),description=text(input.description,30,5000,'Descriere');
  if(contactText(title+' '+description))fail(400,'Elimină telefonul, e-mailul și linkurile din textul public. Contactul se face prin platformă.','PUBLIC_CONTACT');
  if(input.city&&input.city!=='Cluj-Napoca')fail(400,'Pilotul este numai pentru Cluj-Napoca.');
  if(!['sale','rent'].includes(input.transaction)||!['apartment','house','land','commercial'].includes(input.type)||!DISTRICTS.includes(input.district)||!['EUR','RON'].includes(input.currency))fail(400,'Alege tipul, tranzacția, cartierul și moneda.');
  for(const [key,min,max]of[['price',1,100000000],['area',1,10000000],['rooms',0,30]])if(typeof input[key]!=='number'||!Number.isFinite(input[key])||input[key]<min||input[key]>max)fail(400,'Preț, suprafață sau număr de camere invalid.');
  if(!Number.isInteger(input.rooms)||(['apartment','house'].includes(input.type)&&input.rooms<1))fail(400,'Număr de camere invalid.');
  if(!['owner','coowner'].includes(input.relationship))fail(400,'Publicarea este rezervată proprietarului sau coproprietarului.');
  if(!Array.isArray(input.photos)||input.photos.length>5)fail(400,'Poți adăuga maximum 5 fotografii.');
  // D1 limits the entire row to 2 MB. Reserve space for text and future fields.
  const photoBudget=1800000;
  if(JSON.stringify(input.photos).length>photoBudget)fail(400,'Fotografiile ocupă prea mult spațiu împreună. Micșorează-le sau elimină una.');
  for(const photo of input.photos){
    if(typeof photo!=='string'||photo.length>400000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(photo))fail(400,'Fotografie JPEG invalidă sau prea mare.');
    let raw;try{raw=atob(photo.split(',')[1]);}catch{fail(400,'Fotografie invalidă.');}
    if(raw.charCodeAt(0)!==255||raw.charCodeAt(1)!==216||raw.charCodeAt(2)!==255)fail(400,'Fotografie invalidă.');
  }
  const photos=input.photos.map(photo=>{
    try{
      const decoded=jpeg.decode(Buffer.from(photo.split(',')[1],'base64'),{useTArray:true,maxResolutionInMP:2,maxMemoryUsageInMB:32,tolerantDecoding:false});
      if(!decoded.width||!decoded.height||decoded.width>1200||decoded.height>1200)fail(400,'Fotografia trebuie micșorată la maximum 1200 px.');
      // Re-encode only pixels. Never pass source EXIF/comments to the encoder.
      const clean=jpeg.encode({data:decoded.data,width:decoded.width,height:decoded.height},75).data;
      const result='data:image/jpeg;base64,'+Buffer.from(clean).toString('base64');
      if(result.length>400000)fail(400,'Fotografia este prea mare după procesare.');return result;
    }catch(error){if(error instanceof ApiError)throw error;fail(400,'Fotografia nu este un JPEG valid sau depășește limitele de procesare.');}
  });
  if(JSON.stringify(photos).length>photoBudget)fail(400,'Fotografiile procesate ocupă prea mult spațiu împreună. Micșorează-le sau elimină una.');
  const exactAddress=text(input.exactAddress||'',0,250,'Adresă');
  const rentCosts=text(input.rentCosts||'',0,300,'Costuri'),contactHours=text(input.contactHours||'',0,100,'Interval');
  if(contactText(rentCosts+' '+contactHours))fail(400,'Nu include date de contact în costuri sau interval.');
  if(input.rentDeposit!=null&&(typeof input.rentDeposit!=='number'||!Number.isFinite(input.rentDeposit)||input.rentDeposit<0||input.rentDeposit>10000000))fail(400,'Garanție invalidă.');
  if(input.monthlyCosts!=null&&(typeof input.monthlyCosts!=='number'||!Number.isFinite(input.monthlyCosts)||input.monthlyCosts<0||input.monthlyCosts>10000000))fail(400,'Costuri lunare invalide.');
  return {monthlyCosts:input.transaction==='rent'?(input.monthlyCosts??null):null,title,description,transaction:input.transaction,type:input.type,city:'Cluj-Napoca',district:input.district,price:input.price,currency:input.currency,area:input.area,rooms:input.rooms,relationship:input.relationship,photos,exactAddress,rentDeposit:input.rentDeposit??null,rentCosts,contactHours,acceptsContacts:input.acceptsContacts!==false};
}
export const listingPhotoUrls=(row,scope='listings')=>JSON.parse(row.photos).map((_,index)=>'/api/'+scope+'/'+row.id+'/photos/'+index);
export function publicListing(row){
  return {id:row.id,title:row.title,transaction:row.transaction,type:row.type,city:'Cluj-Napoca',district:row.district,price:row.price,currency:row.currency,area:row.area,rooms:row.rooms,description:row.description,photos:listingPhotoUrls(row),ownerName:row.owner_name&&!contactText(row.owner_name)&&!row.owner_name.includes('@')?row.owner_name:'Proprietar',phoneVerified:!!row.phone_verified_at,ownershipStatus:row.ownership_status,availableUntil:row.available_until,availabilityConfirmedAt:row.availability_confirmed_at??null,status:row.status,rentDeposit:row.rent_deposit,rentCosts:row.rent_costs,monthlyCosts:row.monthly_costs??null,acceptsContacts:!!row.accepts_contacts,contactHours:row.contact_hours};
}
export function ownListing(row){return {...publicListing(row),photos:JSON.parse(row.photos),ownerId:row.owner_id,exactAddress:row.exact_address,relationship:row.relationship,moderationReason:row.moderation_reason,createdAt:row.created_at,updatedAt:row.updated_at};}
