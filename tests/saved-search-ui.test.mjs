import test from 'node:test';
import assert from 'node:assert/strict';
import {frontend,deferred} from './helpers/frontend.mjs';
const listing={id:'a'.repeat(32),title:'Apartament în Centru',transaction:'sale',type:'apartment',district:'Centru',price:120000,currency:'EUR',area:50,rooms:2,photos:[]};
test('saved search seen failure preserves loaded results and reports only the failed update',async()=>{
 const f=frontend({user:{id:'buyer'},fetcher:path=>path.startsWith('/api/listings?')?{listings:[listing],total:1}:path.endsWith('/seen')?Response.json({error:'temporar'},{status:503}):undefined});
 f.run("S.savedSearchOpening={id:'saved',viewedThrough:5}");await f.run('browse()');
 const root=f.roots.get('#app');assert.ok(root.querySelector('.property-card'));assert.equal(root.querySelector('.search-error'),null);assert.match(root.textContent,/Nu am putut actualiza numărul/);assert.equal(root.querySelector('.search-results').getAttribute('aria-busy'),'false');
});
test('late saved search seen failure does not alter a newer screen',async()=>{
 const pending=deferred();const f=frontend({user:{id:'buyer'},fetcher:path=>path.startsWith('/api/listings?')?{listings:[listing],total:1}:path.endsWith('/seen')?pending.promise:undefined});
 f.run("S.savedSearchOpening={id:'saved',viewedThrough:5}");const browsing=f.run('browse()');await new Promise(r=>setImmediate(r));await f.run('home()');const before=f.roots.get('#app').textContent;
 pending.resolve(Response.json({error:'temporar'},{status:503}));await browsing;assert.equal(f.roots.get('#app').textContent,before);
});

test('interrupted saved search does not mark its results seen through another search',async()=>{
 const pending=deferred();let loads=0;const f=frontend({user:{id:'buyer'},fetcher:path=>path.startsWith('/api/listings?')?(++loads===1?pending.promise:{listings:[listing],total:1}):undefined});
 f.run("S.savedSearchOpening={id:'saved',viewedThrough:5}");const first=f.run('browse()');
 f.run("S.filters={district:'Zorilor'}");await f.run('browse()');pending.resolve({listings:[listing],total:1});await first;
 assert.equal(f.requests.filter(r=>r.path.endsWith('/seen')).length,0);
});
test('failed saved search is acknowledged only on its explicit retry',async()=>{
 const f=frontend({user:{id:'buyer'},fetcher:path=>path.startsWith('/api/listings?')?Response.json({error:'temporar'},{status:503}):undefined});
 f.run("S.savedSearchOpening={id:'saved',viewedThrough:5}");await f.run('browse()');
 assert.equal(f.requests.filter(r=>r.path.endsWith('/seen')).length,0);
 f.context.fetch=async(path,options)=>{f.requests.push({path,options});return Response.json(path.startsWith('/api/listings?')?{listings:[listing],total:1}:{});};
 await f.button(f.roots.get('#app'),'Reîncearcă').fire('click');await new Promise(r=>setImmediate(r));
 const seen=f.requests.filter(r=>r.path.endsWith('/seen'));assert.equal(seen.length,1);assert.equal(seen[0].path,'/api/saved-searches/saved/seen');assert.equal(JSON.parse(seen[0].options.body).through,5);
});
test('failed saved search does not leak acknowledgement into a fresh browse',async()=>{
 let loads=0;const f=frontend({user:{id:'buyer'},fetcher:path=>path.startsWith('/api/listings?')?(++loads===1?Response.json({error:'temporar'},{status:503}):{listings:[listing],total:1}):undefined});
 f.run("S.savedSearchOpening={id:'saved',viewedThrough:5}");await f.run('browse()');f.run("S.filters={district:'Zorilor'}");await f.run('browse()');assert.equal(f.requests.filter(r=>r.path.endsWith('/seen')).length,0);
});

test('saved search headings distinguish type, minimum price, area and rooms',async()=>{
 const filters={transaction:'sale',currency:'RON',district:'Centru',type:'apartment',minPrice:'100000',maxPrice:'200000',minArea:'50',rooms:'2',q:'balcon'};
 const f=frontend({user:{id:'buyer'},fetcher:path=>path==='/api/saved-searches'?{searches:[{id:'one',filters,newCount:0},{id:'two',filters:{...filters,type:'house',minPrice:'120000',minArea:'80',rooms:'3'},newCount:1}]}:undefined});
 await f.run("loadSavedSearches(document.querySelector('#app'),S.screenRevision)");
 const root=f.roots.get('#app'),headings=root.children.filter(n=>n.tag==='article').map(n=>n.querySelector('h3').textContent);
 assert.equal(headings.length,2);assert.notEqual(headings[0],headings[1]);
 for(const text of ['Apartament','de la 100000 RON','până la 200000 RON','minimum 50 m²','2+ camere','balcon'])assert.ok(headings[0].includes(text),text);
 assert.ok(headings[1].includes('minimum 80 m²'));assert.ok(headings[1].includes('3+ camere'));
});
test('saved search headings retain an explicit zero budget without inventing filters',async()=>{
 const f=frontend({user:{id:'buyer'},fetcher:()=>({searches:[{id:'zero',filters:{transaction:'rent',currency:'EUR',minPrice:'0',maxPrice:'0'},newCount:0}]})});
 await f.run("loadSavedSearches(document.querySelector('#app'),S.screenRevision)");const text=f.roots.get('#app').querySelector('h3').textContent;
 assert.match(text,/de la 0 EUR/);assert.match(text,/până la 0 EUR/);assert.doesNotMatch(text,/m²|camere|undefined/);
});
