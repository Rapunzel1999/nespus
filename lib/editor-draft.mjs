import {fail,text} from './model.mjs';
// Private, incomplete editor buffer. This never creates a listing or declaration.
export function validateEditorDraft(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||!Number.isInteger(input.step)||input.step<0||input.step>7||!Number.isSafeInteger(input.revision)||input.revision<0)fail(400,'Ciornă invalidă.');
  const source=input.draft;if(!source||typeof source!=='object'||Array.isArray(source))fail(400,'Ciornă invalidă.');
  const draft={};
  for(const [key,max]of [['id',32],['transaction',10],['type',15],['currency',3],['district',60],['relationship',15],['title',120],['description',5000],['rentCosts',300],['exactAddress',250],['contactHours',100],['declarationVersion',40]])if(source[key]!=null)draft[key]=text(source[key],0,max,key);
  for(const key of ['price','area','rooms','rentDeposit','monthlyCosts'])if(source[key]!=null&&source[key]!==''){if(typeof source[key]!=='number'||!Number.isFinite(source[key])||Math.abs(source[key])>100000000)fail(400,'Valoare numerică invalidă.');draft[key]=source[key];}
  if(draft.id&&!/^[a-f0-9]{32}$/.test(draft.id))fail(400,'Ciornă invalidă.');
  draft.ownerDeclaration=source.ownerDeclaration===true;draft.acceptsContacts=source.acceptsContacts!==false;
  if(!Array.isArray(source.photos)||source.photos.length>5)fail(400,'Maximum 5 fotografii.');
  for(const photo of source.photos)if(typeof photo!=='string'||photo.length>400000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(photo))fail(400,'Fotografie invalidă în ciornă.');
  draft.photos=source.photos;const payload=JSON.stringify({draft,step:input.step});
  if(new TextEncoder().encode(payload).length>1850000)fail(400,'Ciorna este prea mare. Micșorează fotografiile.');
  return {draft,payload,revision:input.revision};
}
