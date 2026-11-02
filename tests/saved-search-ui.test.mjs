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
