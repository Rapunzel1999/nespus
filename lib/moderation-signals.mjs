// Review hints only: never authorization, automatic restriction or proof of agency.
export const PHONE_LISTING_REVIEW_THRESHOLD=3;
export function perceptualHash({width,height,data}){
  const values=[];for(let y=0;y<8;y++)for(let x=0;x<9;x++){
    const offset=(Math.min(height-1,Math.floor((y+.5)*height/8))*width+Math.min(width-1,Math.floor((x+.5)*width/9)))*4;
    values.push(.299*data[offset]+.587*data[offset+1]+.114*data[offset+2]);
  }
  if(Math.max(...values)-Math.min(...values)<16)return null; // Flat placeholders have no useful signature.
  let bits=0n;for(let y=0;y<8;y++)for(let x=0;x<8;x++)bits=(bits<<1n)|BigInt(values[y*9+x]>values[y*9+x+1]);return bits.toString(16).padStart(16,'0');
}
export function similarPhotos(a,b){
  if(!/^[a-f0-9]{16}$/.test(a||'')||!/^[a-f0-9]{16}$/.test(b||''))return false;
  let bits=BigInt('0x'+a)^BigInt('0x'+b),distance=0;while(bits){distance++;bits&=bits-1n;}return distance<=4;
}
export function reviewSignals({title='',description='',phoneListingCount=0,photoHashes=[]},others=[]){
  const signals=[],normalized=(title+' '+description).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(phoneListingCount>PHONE_LISTING_REVIEW_THRESHOLD)signals.push('phone_many_listings');
  for(const word of ['comision','agentie','exclusivitate'])if(new RegExp('\\b'+word+'\\b').test(normalized))signals.push('keyword_'+word);
  if(photoHashes.some(a=>others.some(row=>(row.photoHashes||[]).some(b=>similarPhotos(a,b)))))signals.push('similar_photo_other_account');
  return signals;
}
