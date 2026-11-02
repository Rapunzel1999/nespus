import {DISTRICTS,fail,text} from './model.mjs';
export const LIVE="l.status='published' AND l.available_until>? AND u.status='active' AND u.phone_verified_at IS NOT NULL";
export const SEARCH_ORDERS={newest:'l.updated_at DESC,l.id DESC',price_asc:'l.price ASC,l.id DESC',price_desc:'l.price DESC,l.id DESC',area_desc:'l.area DESC,l.id DESC',price_m2_asc:'(l.price / NULLIF(l.area,0)) ASC,l.id DESC',price_m2_desc:'(l.price / NULLIF(l.area,0)) DESC,l.id DESC'};
export function searchQuery(params,now){
  const clauses=[LIVE],args=[now],filters={};
  for(const [field,col,allowed]of[['transaction','transaction',['sale','rent']],['type','type',['apartment','house','land','commercial']],['district','district',DISTRICTS],['currency','currency',['EUR','RON']]]){const value=params.get(field);if(value){if(!allowed.includes(value))fail(400,'Filtru invalid.');filters[field]=value;clauses.push('l."'+col+'"=?');args.push(value);}}
  for(const [field,col,operator]of[['minPrice','price','>='],['maxPrice','price','<='],['minArea','area','>='],['rooms','rooms','>=']]){const raw=params.get(field);if(raw){const n=Number(raw);if(!Number.isFinite(n)||n<0)fail(400,'Filtru numeric invalid.');filters[field]=String(n);clauses.push('l.'+col+operator+'?');args.push(n);}}
  const query=params.get('q');if(query){
    filters.q=text(query,1,100,'Căutare');
    // User text is a literal substring, not a SQL LIKE pattern. Keep the
    // original filter for saved searches and escape only the bound pattern.
    const pattern='%'+filters.q.replace(/[\\%_]/g,'\\$&')+'%';
    clauses.push("(l.title LIKE ? ESCAPE '\\' OR l.description LIKE ? ESCAPE '\\')");args.push(pattern,pattern);
  }
  if(filters.minPrice&&filters.maxPrice&&Number(filters.minPrice)>Number(filters.maxPrice))fail(400,'Prețul minim trebuie să fie mai mic sau egal cu bugetul maxim.');
  const sort=params.get('sort')||'newest';if(!Object.hasOwn(SEARCH_ORDERS,sort))fail(400,'Ordine de sortare invalidă.');
  if(sort.startsWith('price_')&&!filters.currency)fail(400,'Selectează moneda înainte de sortarea după preț.');
  if(sort.startsWith('price_m2'))clauses.push('l.price>0 AND l.area>0');
  const rawPage=params.get('page')||'1',page=Number(rawPage),limit=24;
  if(!/^\d+$/.test(rawPage)||!Number.isSafeInteger(page)||page<1||page>1000)fail(400,'Pagină invalidă.');
  return {where:' WHERE '+clauses.join(' AND '),args,sort,page,limit,filters};
}
