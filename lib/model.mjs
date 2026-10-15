export const DAY = 86400000;
export const ID = /^[a-f0-9]{32}$/;
export const PLANS = Object.freeze({
  '0': {name:'Un gând', proposedPriceRon:19, proposedDays:7},
  '1': {name:'Din suflet', proposedPriceRon:49, proposedDays:30},
  '2': {name:'De neuitat', proposedPriceRon:99, proposedDays:365},
});
export function validateGift(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Mesaj invalid.');
  const text = (key,max,min=0) => {
    if (typeof input[key] !== 'string' || input[key].trim().length < min || input[key].length > max) throw Error('Verifică lungimea câmpurilor completate.');
    return input[key].trim();
  };
  const gift = {};
  for (const [key,max,min] of [['to',60,1],['from',60,1],['title',130,1],['body',1500,10],['memory',220,0],['ps',220,0],['note1',400,0],['note2',400,0],['note3',400,0]]) gift[key]=text(key,max,min);
  if (!['paper','sage','midnight'].includes(input.style) || !['love','sorry','birthday','thanks','when'].includes(input.occasion) || !Object.hasOwn(PLANS,input.tier)) throw Error('Alege o atmosferă și un pachet valid.');
  if (typeof input.includeNotes !== 'boolean' || ![1,3,7].includes(input.days)) throw Error('Alege 1, 3 sau 7 zile.');
  Object.assign(gift,{style:input.style,occasion:input.occasion,tier:input.tier,includeNotes:input.includeNotes,days:input.days,photo:null});
  if (input.photo != null) {
    if (typeof input.photo !== 'string' || input.photo.length > 400000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(input.photo)) throw Error('Fotografia este prea mare sau invalidă.');
    let bytes; try { bytes=atob(input.photo.split(',')[1]); } catch { throw Error('Fotografie invalidă.'); }
    if (bytes.charCodeAt(0)!==255 || bytes.charCodeAt(1)!==216 || bytes.charCodeAt(2)!==255) throw Error('Fotografie invalidă.');
    gift.photo=input.photo;
  }
  return gift;
}
export function randomId() { return crypto.randomUUID().replaceAll('-',''); }
export async function digest(value) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join(''); }
