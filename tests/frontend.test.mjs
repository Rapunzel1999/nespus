import fs from 'node:fs';import {fileURLToPath} from 'node:url';import vm from 'node:vm';import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('..',import.meta.url)).replace(/\/$/,'');const {DECLARATIONS}=await import(root+'/lib/model.mjs');
class N{constructor(tag,text=''){this.tag=tag;this._text=text;this.children=[];this.attrs={};this.listeners={};this.classList={add(){},remove(){}};}append(...cs){for(const c of cs){this.children.push(c);c.parent=this;}}replaceChildren(...cs){this.children=[];this.append(...cs);}setAttribute(k,v){this.attrs[k]=String(v);if(k==='class')this.className=String(v);else this[k]=v;}getAttribute(k){return this.attrs[k]??null}addEventListener(k,v){this.listeners[k]=v;}get value(){if(this._value!==undefined)return this._value;if(this.tag==='select')return(this.children.find(o=>o.selected)||this.children[0])?.value||'';return this.tag==='textarea'?this.textContent:'';}set value(v){this._value=String(v);if(this.tag==='select')for(const option of this.children)option.selected=option.value===String(v);}get firstChild(){return this.children[0]||new N('svg')}set innerHTML(v){this._html=v;}get textContent(){return this._text+this.children.map(c=>c.textContent).join('')}set textContent(v){this._text=String(v);this.children=[];}showModal(){this.open=true}close(){this.open=false}scrollIntoView(){}focus(){this.focused=true}select(){}setCustomValidity(value){this.validationMessage=value}reportValidity(){return !this.validationMessage}querySelector(selector){return all(this).find(n=>match(n,selector))||null}get elements(){return new Proxy({},{get:(_,name)=>all(this).find(n=>n.name===name)});}}
function all(n){return[n,...n.children.flatMap(all)]}function match(n,s){if(s.startsWith('#'))return n.id===s.slice(1);if(s.startsWith('.'))return(n.className||'').split(' ').includes(s.slice(1));if(s==='[data-favorite]')return n.getAttribute('data-favorite')!==null;return n.tag===s;}
const roots=new Map(['#app','#modal','#modal-content','.modal-close','#toast'].map(k=>[k,new N(k)]));
const sample={id:'a'.repeat(32),title:'Apartament luminos în Centru',transaction:'rent',type:'apartment',district:'Centru',price:600,currency:'EUR',area:60,rooms:2,description:'Descriere completă a proprietății.',photos:['data:image/jpeg;base64,photo1','data:image/jpeg;base64,photo2'],ownerName:'Proprietar',ownershipStatus:'declared',rentDeposit:600,rentCosts:'Utilități separat',phoneVerified:true};
let delayedDetail=null,delayedFavorites=null,delayedSave=null;const requests=[];const fixtures={'/api/bootstrap':{user:{id:'u1',name:'Paul',phoneVerified:false,role:'moderator'},capabilities:{phoneVerification:false},declarations:DECLARATIONS},'/api/editor-draft':{revision:1,savedAt:Date.now()},'/api/favorites':{listings:[]},'/api/listings':{listings:[sample]},'/api/mine':{listings:[]},'/api/my-cases':{reports:[{id:'r1',listingTitle:'Proprietate',reason:'agency',details:'Descrierea unei sesizări.',status:'resolved',decisionReason:'Decizie explicată.',createdAt:Date.now()}],appeals:[{id:'ap1',reason:'Contestație explicată.',status:'open',createdAt:Date.now()}],account:{status:'active',restrictionReason:null}},'/api/conversations':{conversations:[]},'/api/moderation':{listings:[],reports:[],appeals:[{id:'ap1',userId:'u2',reason:'Contestație explicată.',reportId:'r1'},{id:'ap2',userId:'u3',reason:'Contestație cont.'}]},['/api/listings/'+sample.id]:{listing:sample},'/api/moderation/reports/r1/evidence':{reason:'agency',details:'Detalii sesizare.',messages:[],involvedAccounts:[{id:'u2',role:'reporter'},{id:'u3',role:'owner'},{id:'u3',role:'requester'}]}};
const doc={createElement:t=>new N(t),createTextNode:t=>new N('#text',t),querySelector:s=>roots.get(s)||roots.get('#app').querySelector(s),querySelectorAll:s=>[...roots.values()].flatMap(all).filter(n=>match(n,s))};
const browserLocation={pathname:'/atelier',search:'',origin:'https://example.test'};const historyWrites=[],windowListeners={};const history={pushState(_state,_title,path){historyWrites.push(path);const u=new URL(path,browserLocation.origin);browserLocation.pathname=u.pathname;browserLocation.search=u.search;},replaceState(...args){this.pushState(...args);}};
const ctx={Node:N,document:doc,window:{scrollTo(){},location:browserLocation,history,addEventListener(name,fn){windowListeners[name]=fn;}},fetch:async(url,options={})=>{requests.push([url,options]);if(delayedSave&&['POST','PATCH'].includes(options.method)&&url.startsWith('/api/listings'))return delayedSave;if(url==='/api/listings/'+sample.id&&delayedDetail)return delayedDetail;if(url==='/api/favorites'&&delayedFavorites)return delayedFavorites;return{ok:true,json:async()=>fixtures[url.split('?')[0]]||{saved:true}};},FormData:class{constructor(form){this.entries=all(form).filter(n=>n.name).map(n=>[n.name,n.tag==='select'?(n.children.find(o=>o.selected)||n.children[0])?.value||'':n.value??n.textContent]);}[Symbol.iterator](){return this.entries[Symbol.iterator]();}},setTimeout:()=>1,clearTimeout(){},URLSearchParams,URL,Intl,console};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(root+'/public/draft-storage.js','utf8'),ctx);vm.runInContext(fs.readFileSync(root+'/public/app.js','utf8'),ctx);const run=s=>vm.runInContext(s,ctx),tick=()=>new Promise(r=>setImmediate(r));await tick();
for(const code of ["await home()","await browse()","createFor('rent')","S.step=7;renderCreate()","await account()","phoneSetup()","await favorites()","await messages()","await moderation()"]){await run('(async()=>{'+code+'})()');}
let g=run('photoGallery('+JSON.stringify(sample)+')');const images=all(g).filter(n=>n.tag==='img');assert.equal(images[0].src,sample.photos[0]);const thumbs=all(g).filter(n=>n.className==='gallery-thumbnail');thumbs[1].listeners.click();assert.equal(images[0].src,sample.photos[1]);assert.equal(thumbs[1].getAttribute('aria-pressed'),'true');g.listeners.keydown({target:g,key:'ArrowLeft',preventDefault(){}});assert.equal(images[0].src,sample.photos[0]);
run('renderDetail('+JSON.stringify(sample)+')');assert.match(roots.get('#app').textContent,/Chirie \/ lună/);assert.match(roots.get('#app').textContent,/Utilități separat/);let fb=doc.querySelectorAll('[data-favorite]').find(n=>n.getAttribute('data-favorite')===sample.id);fb.listeners.click();await tick();assert.equal(fb.getAttribute('aria-pressed'),'true');assert.match(fb.textContent,/Salvată/);
run("S.filters={district:'Centru',maxPrice:'700',currency:'EUR'}");let chips=run('activeFilters()');const chip=all(chips).find(n=>n.className==='filter-chip');chip.listeners.click();await tick();assert.equal(run('S.filters.district'),undefined);assert.equal(run('S.filters.maxPrice'),'700');
let resolveDetail;delayedDetail=new Promise(r=>resolveDetail=r);const old=run("detail('"+sample.id+"')");run("createFor('rent')");resolveDetail({ok:true,json:async()=>({listing:sample})});await old;assert.equal(run('S.page'),'create');assert.match(roots.get('#app').textContent,/Hai să îi găsim omul potrivit/);delayedDetail=null;
let resolveFav;delayedFavorites=new Promise(r=>resolveFav=r);const fav=run('favorites()');await run('home()');resolveFav({ok:true,json:async()=>({listings:[sample]})});await fav;assert.equal(run('S.page'),'home');assert.match(roots.get('#app').textContent,/Direct de la proprietar/);delayedFavorites=null;
await run("reportEvidence('r1')");await tick();assert.match(roots.get('#modal-content').textContent,/Conturi implicate/);assert.equal(roots.get('#modal-content').textContent.match(/u3/g).length,1);
assert.equal(run("select('type',[['apartment','Apartament']],'apartment')").getAttribute('aria-label'),null);
run("S.draft={transaction:'rent',type:'apartment',currency:'EUR',relationship:'owner',district:'Centru',price:600,area:60,rooms:2,rentDeposit:600};S.photos=[];S.step=0;renderCreate()");let form=roots.get('#app').querySelector('form');form.elements.rentDeposit.value='';form.listeners.submit({preventDefault(){}});assert.equal(run('S.draft.rentDeposit'),null);assert.equal(run('S.step'),1);
run("S.draft={transaction:'sale',type:'apartment',currency:'EUR',relationship:'owner',district:'Centru',price:600,area:60,rooms:2,rentDeposit:600,rentCosts:'Old costs'};S.photos=['p1'];S.step=7;renderCreate()");form=roots.get('#app').querySelector('form');form.elements.title.value='Titlu completat și încă nesalvat';form.elements.description._text='Descriere completată și încă nesalvată.';const remove=all(form).find(n=>n.tag==='button'&&n.textContent==='Elimină');remove.listeners.click();assert.equal(run('S.draft.title'),'Titlu completat și încă nesalvat');assert.equal(run('S.draft.rentDeposit'),null);assert.equal(run('S.draft.rentCosts'),'');run('resumeDraft()');assert.equal(run('S.step'),7);
run('S.boot.user.phoneVerified=true');assert.equal(run('phoneAvailabilityNotice()'),null);run('S.boot.user.phoneVerified=false');assert.match(run('phoneAvailabilityNotice()').textContent,/SMS nu este încă activă/);
run('S.boot.user.phoneVerified=false');let submitControl=run('listingSubmitControl('+JSON.stringify(sample)+')');assert.equal(all(submitControl).find(n=>n.tag==='button').disabled,true);run('S.boot.user.phoneVerified=true');submitControl=run('listingSubmitControl('+JSON.stringify(sample)+')');assert.equal(all(submitControl).find(n=>n.tag==='button').disabled,false);
assert.match(run('listingAvailabilityNote('+JSON.stringify({...sample,status:'published',availableUntil:Date.now()+2*86400000})+')').textContent,/Reconfirmă disponibilitatea până la/);assert.match(run('listingAvailabilityNote('+JSON.stringify({...sample,status:'published',availableUntil:Date.now()-86400000})+')').textContent,/a expirat/);
run('contact('+JSON.stringify(sample)+')');assert.match(roots.get('#modal-content').textContent,/Nu trimitem încă alerte prin email\/SMS/);run('appeal()');assert.match(roots.get('#modal-content').textContent,/nu avem termen garantat/);
fixtures['/api/favorites']={listings:[sample]};await run('init()');assert.equal(run('S.favorites.has('+JSON.stringify(sample.id)+')'),true);
console.log('PASS: 9 render scenarios; gallery thumbnail+keyboard/photo status; rental breakdown; live favorite saved state; removable filter; stale detail and favorites navigation; evidence accounts deduplicated; select label semantics. Additional regression checks pass: cleared rent deposit sends null, sale clears rental costs, photo removal preserves title, preview resumes step, SMS warning eligibility. Also verified disabled unverified submit vs enabled verified submit, real near-expiry and expired dates, contact alert limitation, appeal timing limitation, and initial favorites hydration. Fixture DOM tests only, no browser/visual QA.');

// Search state survives deep links, reload, browser history, and return from a detail.
browserLocation.search='?view=browse&transaction=rent&district=Centru&currency=RON&maxPrice=3500&sort=price_asc&page=2';
const beforeRestore=historyWrites.length;await run('restoreLocation()');assert.equal(historyWrites.length,beforeRestore);assert.equal(run('S.transaction'),'rent');assert.equal(run('S.browsePage'),2);assert.equal(run('S.sort'),'price_asc');assert.equal(run('S.filters.maxPrice'),'3500');assert.ok(requests.at(-1)[0].includes('page=2'));assert.match(roots.get('#app').textContent,/De închiriat în Cluj-Napoca/);
let sorter=all(roots.get('#app')).find(n=>n.name==='sort');sorter.value='area_desc';sorter.listeners.change();await tick();assert.equal(run('S.browsePage'),1);assert.match(browserLocation.search,/sort=area_desc/);assert.equal(run('S.filters.district'),'Centru');
await run('go("browse",{pageNumber:2})');await run('detail('+JSON.stringify(sample.id)+')');assert.match(browserLocation.search,/listing=/);assert.match(browserLocation.search,/page=2/);
let back=all(roots.get('#app')).find(n=>n.tag==='button'&&n.textContent==='← Înapoi la anunțuri');back.listeners.click();await tick();assert.equal(run('S.browsePage'),2);assert.match(browserLocation.search,/view=browse/);assert.match(browserLocation.search,/page=2/);
browserLocation.search='?view=browse&transaction=sale&currency=EUR&district=Zorilor';windowListeners.popstate();await tick();assert.equal(run('S.filters.district'),'Zorilor');assert.equal(run('S.browsePage'),1);assert.equal(run('S.sort'),'newest');
run("S.filters={district:'Zorilor',minPrice:'50000',maxPrice:'150000'};changeTransaction('rent')");assert.equal(run('S.filters.maxPrice'),undefined);assert.equal(run('S.filters.minPrice'),undefined);assert.equal(run('S.filters.district'),'Zorilor');
run("S.filters={minPrice:'900',maxPrice:'600'}");let search=run('searchBox(true)');search.listeners.submit({preventDefault(){}});assert.match(search.elements.maxPrice.validationMessage,/Bugetul maxim/);search.listeners.input();assert.equal(search.elements.maxPrice.validationMessage,'');
fixtures['/api/listings']={listings:[],total:0,totalPages:0,page:1,limit:24};run('S.filters={}');await run('go("browse")');assert.match(roots.get('#app').textContent,/Primele anunțuri urmează/);assert.doesNotMatch(roots.get('#app').textContent,/Elimină filtrele/);
run("S.filters={district:'Centru'}");await run('go("browse")');assert.match(roots.get('#app').textContent,/Nicio potrivire/);assert.match(roots.get('#app').textContent,/Elimină filtrele/);
fixtures['/api/listings']={listings:[sample],total:25,totalPages:2,page:1,limit:24};await run('go("browse")');const next=all(roots.get('#app')).find(n=>n.tag==='a'&&n.textContent==='Înainte →');assert.match(next.href,/page=2/);let prevented=false;next.listeners.click({ctrlKey:true,preventDefault(){prevented=true}});assert.equal(prevented,false);next.listeners.click({preventDefault(){prevented=true}});await tick();assert.equal(run('S.browsePage'),2);assert.equal(prevented,true);
run('S.boot.user.phoneVerified=false;S.boot.capabilities.phoneVerification=true');assert.match(run('accountReadiness(S.boot.user)').textContent,/Confirmă numărul înainte/);assert.doesNotMatch(run('homeQuestions()').textContent,/SMS este încă oprit/);run('S.boot.capabilities.phoneVerification=false');
console.log('PASS: shareable search, restored filters/page/sort, browser back state, detail return, sort resets page, transaction budget reset, budget validation, honest empty states, pagination links/modifier keys, and capability-aware readiness.');


// Guided editor: no invented values and no implicit declaration acceptance.
run('clearEditor();createFor("rent")');form=roots.get('#app').querySelector('form');
assert.equal(form.elements.district.value,'');assert.equal(form.elements.district.required,true);assert.equal(form.elements.rooms.required,true);assert.equal(Number(form.elements.rooms.min),1);
form.elements.price.value='750';form.elements.area.value='62';form.elements.rooms.value='2';form.elements.district.value='Zorilor';form.listeners.input();
assert.equal(run('S.draft.price'),750);assert.equal(run('S.editorDirty'),true);
await run('go("browse")');assert.match(roots.get('#app').textContent,/Anunțul început este încă aici/);
all(roots.get('#app')).find(n=>n.tag==='button'&&n.textContent==='Continuă editarea').listeners.click();
assert.equal(run('S.page'),'create');assert.equal(roots.get('#app').querySelector('form').elements.price.value,'750');
let unloadPrevented=false;const unload={preventDefault(){unloadPrevented=true}};windowListeners.beforeunload(unload);assert.equal(unloadPrevented,true);assert.equal(unload.returnValue,'');
run('createFor("sale")');assert.equal(run('S.draft.transaction'),'rent');assert.match(roots.get('#modal-content').textContent,/modificările nesalvate se pierd/);
all(roots.get('#modal-content')).find(n=>n.tag==='button'&&n.textContent==='Continuă editarea').listeners.click();assert.equal(run('S.draft.transaction'),'rent');
form=roots.get('#app').querySelector('form');form.elements.type.value='land';form.elements.type.listeners.change();form=roots.get('#app').querySelector('form');assert.equal(form.elements.rooms.required,false);assert.equal(Number(form.elements.rooms.min),0);assert.equal(form.elements.price.value,'750');
run('clearEditor()');unloadPrevented=false;windowListeners.beforeunload({preventDefault(){unloadPrevented=true}});assert.equal(unloadPrevented,false);

// Photo ordering changes only the editor copy and preserves unsaved fields.
run('create('+JSON.stringify({...sample,ownerDeclaration:true})+');S.step=7;renderCreate()');assert.equal(run('S.draft.ownerDeclaration'),false);
form=roots.get('#app').querySelector('form');form.elements.title.value='Titlul meu actualizat în Zorilor';form.elements.description.value='O descriere reală, completată înainte de alegerea fotografiei principale.';
all(form).find(n=>n.tag==='button'&&n.textContent==='Fă principală').listeners.click();
assert.equal(run('S.photos[0]'),sample.photos[1]);assert.equal(run('S.draft.title'),'Titlul meu actualizat în Zorilor');assert.equal(sample.photos[0],'data:image/jpeg;base64,photo1');
all(form).find(n=>n.tag==='button'&&n.getAttribute('aria-label')==='Mută după fotografia 1').listeners.click();assert.equal(run('S.photos[0]'),sample.photos[0]);
all(form).find(n=>n.tag==='button'&&n.getAttribute('aria-label')==='Elimină fotografia 2').listeners.click();assert.equal(run('S.photos.length'),1);assert.equal(run('S.draft.description'),'O descriere reală, completată înainte de alegerea fotografiei principale.');
form.elements.ownerDeclaration.checked=true;form.listeners.change();all(form).find(n=>n.tag==='button'&&n.textContent==='Previzualizează').listeners.click();assert.equal(run('S.page'),'preview');run('resumeDraft()');assert.equal(run('S.step'),7);assert.equal(run('S.draft.title'),'Titlul meu actualizat în Zorilor');
run("S.draft.exactAddress='SECRET: adresa exactă 99'");assert.ok(!run('editorAside(S.draft)').textContent.includes('SECRET'));assert.equal(run('draftReadiness(S.draft).filter(x=>x.done).length'),4);

// A failed upload batch does not leave a partial selection or corrupt earlier photos.
run('const originalCompressPhoto=compressPhoto;');const compressed=[];
ctx.photoTransformer=async file=>{compressed.push(file.name);if(file.name==='broken.png')throw Error('Imagine invalidă.');return 'data:image/jpeg;base64,new-photo';};run('compressPhoto=photoTransformer');
form=roots.get('#app').querySelector('form');let file=all(form).find(n=>n.type==='file');file.files=[{name:'ok.png'},{name:'broken.png'}];await file.listeners.change();
assert.equal(run('S.photos.length'),1);assert.equal(run('S.photos[0]'),sample.photos[0]);assert.match(roots.get('#app').textContent,/Nicio fotografie din această selecție/);assert.equal(run('S.editorProcessing'),false);assert.equal(form.querySelector('fieldset').disabled,false);
let releasePhoto;ctx.photoTransformer=()=>new Promise(resolve=>{releasePhoto=resolve});run('compressPhoto=photoTransformer');file.files=[{name:'next.png'}];const upload=file.listeners.change();assert.equal(run('S.editorProcessing'),true);assert.equal(form.querySelector('fieldset').disabled,true);
run('createFor("sale")');assert.equal(run('S.draft.transaction'),'rent');await run('go("browse")');releasePhoto('data:image/jpeg;base64,next-photo');await upload;assert.equal(run('S.page'),'browse');assert.equal(run('S.photos.length'),2);assert.equal(run('S.editorDirty'),true);
run('resumeEditor()');form=roots.get('#app').querySelector('form');file=all(form).find(n=>n.type==='file');run('S.photos=["a","b","c","d","e"]');file.files=[{name:'extra.png'}];await file.listeners.change();assert.match(roots.get('#app').textContent,/maximum 5 fotografii/);assert.equal(run('S.photos.length'),5);run('compressPhoto=originalCompressPhoto');

// One save request at a time; completion cannot navigate away from a newer screen.
run('clearEditor();create('+JSON.stringify(sample)+');S.step=7;renderCreate()');form=roots.get('#app').querySelector('form');form.elements.ownerDeclaration.checked=true;
let releaseSave;delayedSave=new Promise(resolve=>{releaseSave=resolve});const mutationsBefore=requests.filter(([,o])=>['POST','PATCH'].includes(o.method)).length;
const save=form.listeners.submit({preventDefault(){}});await form.listeners.submit({preventDefault(){}});await tick();assert.equal(requests.filter(([,o])=>['POST','PATCH'].includes(o.method)).length,mutationsBefore+1);assert.equal(run('S.editorSaving'),true);assert.equal(form.querySelector('fieldset').disabled,true);
const sent=JSON.parse(requests.at(-1)[1].body);assert.equal(sent.ownerDeclaration,true);assert.equal(sent.id,sample.id);
await run('go("browse")');assert.match(roots.get('#app').textContent,/Se procesează/);releaseSave({ok:true,json:async()=>({listing:sample})});await save;delayedSave=null;
assert.equal(run('S.page'),'browse');assert.equal(run('S.editorDirty'),false);assert.equal(run('S.editorSaving'),false);assert.doesNotMatch(roots.get('#app').textContent,/Anunțul început este încă aici/);
assert.ok(!requests.slice(-3).some(([path])=>path.includes('/submit')||path.includes('/phone/')));

// Failed saves retain text and photos, surface the error, and permit a later retry.
run('create('+JSON.stringify(sample)+');S.step=7;renderCreate()');form=roots.get('#app').querySelector('form');form.elements.ownerDeclaration.checked=true;form.elements.title.value='Un titlu nou care trebuie păstrat';
delayedSave=Promise.resolve({ok:false,json:async()=>({error:'Conexiune indisponibilă.'})});await form.listeners.submit({preventDefault(){}});delayedSave=null;
assert.equal(run('S.editorDirty'),true);assert.equal(run('S.editorSaving'),false);assert.equal(run('S.draft.title'),'Un titlu nou care trebuie păstrat');assert.equal(run('S.photos.length'),2);assert.match(roots.get('#app').textContent,/Conexiune indisponibilă/);assert.equal(form.querySelector('fieldset').disabled,false);
await run('go("account")');run('resumeEditor()');assert.match(roots.get('#app').textContent,/Conexiune indisponibilă/);assert.equal(roots.get('#app').querySelector('form').elements.title.value,'Un titlu nou care trebuie păstrat');
run('clearEditor()');
console.log('PASS: explicit district/rooms, in-tab draft recovery, beforeunload warning, replacement confirmation, private summary, photo copy/reorder/cover/removal, atomic upload failure/capacity, preview preservation, duplicate-save prevention, late responses, and failed-save recovery. No real uploads, hosted account writes or SMS.');

// Brand entry points connect to the real search and protected owner flow.
fixtures['/api/listings']={listings:[],total:0,totalPages:0,page:1,limit:24};
await run('go("home")');
assert.equal(doc.querySelector('.brand-feed').getAttribute('aria-busy'),'false');
assert.match(doc.querySelector('.brand-feed').textContent,/Nu avem încă anunțuri publicate/);
assert.equal(doc.querySelectorAll('.card').length,0);
assert.match(doc.querySelector('.brand-hero-image').alt,/generată cu AI, nu o proprietate disponibilă/);
const journey=doc.querySelector('#how');
const audienceButtons=all(journey).filter(n=>n.getAttribute('data-audience'));
assert.equal(audienceButtons[0].getAttribute('aria-pressed'),'true');
audienceButtons[1].listeners.click();
assert.equal(audienceButtons[1].getAttribute('aria-pressed'),'true');
assert.equal(audienceButtons[0].getAttribute('aria-pressed'),'false');
assert.match(doc.querySelector('#experience-steps').textContent,/Ciorna nu se publică automat/);
audienceButtons[0].listeners.click();
assert.match(doc.querySelector('#experience-steps').textContent,/confirmi telefonul când serviciul este disponibil/);
const searchTarget=doc.querySelector('#home-search');let scrollOptions;
searchTarget.scrollIntoView=options=>{scrollOptions=options};ctx.window.matchMedia=()=>({matches:true});
await doc.querySelector('.hero-primary').listeners.click();assert.equal(scrollOptions.behavior,'auto');assert.equal(searchTarget.focused,true);delete ctx.window.matchMedia;
run("S.filters={district:'Centru',maxPrice:'800',rooms:'4',q:'balcon'};S.transaction='rent';S.browsePage=4");
all(doc.querySelector('.neighborhood-list')).find(n=>n.getAttribute('aria-label')==='Caută proprietăți în Zorilor').listeners.click();await tick();
assert.equal(run('S.page'),'browse');assert.equal(run('S.transaction'),'rent');assert.equal(run('S.browsePage'),1);assert.equal(run('S.filters.district'),'Zorilor');assert.equal(run('S.filters.maxPrice'),undefined);assert.equal(run('S.filters.q'),undefined);assert.equal(run('S.filters.rooms'),undefined);
assert.match(requests.at(-1)[0],/transaction=rent/);assert.match(requests.at(-1)[0],/district=Zorilor/);
await run('scrollHomeSection("how")');assert.equal(run('S.page'),'home');assert.equal(doc.querySelector('#how').focused,true);
const savedUser=run('S.boot.user');run('S.boot.user=null');
const requestsBeforeOwnerCTA=requests.length;
doc.querySelector('.hero-secondary').listeners.click();
assert.match(roots.get('#modal-content').textContent,/Continuă cu ChatGPT/);assert.equal(run('S.page'),'home');assert.equal(requests.length,requestsBeforeOwnerCTA);
ctx.restoreUser=savedUser;run('S.boot.user=restoreUser');roots.get('#modal').close();
doc.querySelector('.owner-cta').listeners.click();
assert.match(roots.get('#modal-content').textContent,/Vreau să vând/);assert.equal(requests.length,requestsBeforeOwnerCTA);
assert.equal(run('S.boot.capabilities.phoneVerification'),false);
console.log('PASS: honest empty feed and AI labels; buyer/owner audience states; reduced-motion search focus; district links reset stale filters and preserve transaction; cross-page how navigation; owner CTAs enforce sign-in and never send SMS or publish.');

// Large-photo viewer starts at the selected image and keeps inline gallery in sync.
run('renderDetail('+JSON.stringify(sample)+')');
const inlineGallery=doc.querySelector('.property-gallery');
const inlineThumbs=all(inlineGallery).filter(n=>n.className==='gallery-thumbnail');
inlineThumbs[1].listeners.click();doc.querySelector('.gallery-expand').listeners.click();
assert.equal(roots.get('#modal').className,'photo-dialog');
assert.equal(roots.get('#modal-content').querySelector('.viewer-image').src,sample.photos[1]);
const viewer=roots.get('#modal-content').querySelector('.photo-viewer');
let viewerKeyPrevented=false;
roots.get('#modal').listeners.keydown({key:'ArrowRight',preventDefault(){viewerKeyPrevented=true}});
assert.equal(viewerKeyPrevented,true);assert.equal(roots.get('#modal-content').querySelector('.viewer-image').src,sample.photos[0]);
assert.equal(doc.querySelector('.detail-photo').src,sample.photos[0]);assert.equal(inlineThumbs[0].getAttribute('aria-pressed'),'true');
roots.get('#modal').listeners.keydown({key:'End',preventDefault(){}});assert.equal(doc.querySelector('.detail-photo').src,sample.photos[1]);
roots.get('#modal').listeners.keydown({key:'Home',preventDefault(){}});assert.equal(doc.querySelector('.detail-photo').src,sample.photos[0]);
assert.match(roots.get('#modal-content').querySelector('.viewer-image').alt,/Fotografia 1 din 2/);
const viewerThumbs=all(viewer).filter(n=>n.className==='gallery-thumbnail');viewerThumbs[1].listeners.click();assert.equal(doc.querySelector('.detail-photo').src,sample.photos[1]);assert.equal(viewerThumbs[1].getAttribute('aria-pressed'),'true');
const onePhoto={...sample,photos:[sample.photos[0]]};run('openPhotoViewer('+JSON.stringify(onePhoto)+',20)');
assert.equal(roots.get('#modal-content').querySelector('.viewer-image').src,sample.photos[0]);assert.equal(all(roots.get('#modal-content')).filter(n=>(n.className||'').includes('gallery-arrow')).length,0);
run('signin()');assert.equal(run('S.modalKeyHandler'),null);assert.equal(roots.get('#modal').className,'');assert.equal(roots.get('#modal').getAttribute('aria-label'),'Bine ai venit.');
const emptyGallery=run('photoGallery('+JSON.stringify({...sample,photos:[]})+')');assert.match(emptyGallery.textContent,/Fotografii indisponibile/);assert.equal(all(emptyGallery).filter(n=>n.tag==='button').length,0);

// Public property information never exposes a private address or invents costs.
const sale={...sample,transaction:'sale',price:180000,area:60,rooms:1,currency:'RON',exactAddress:'SECRET STREET 99'};
run('renderDetail('+JSON.stringify(sale)+')');assert.match(doc.querySelector('.detail-unit-price').textContent,/3[.\s\u00a0]?000 RON \/ m²/);assert.match(doc.querySelector('.property-facts').textContent,/1 cameră/);assert.doesNotMatch(roots.get('#app').textContent,/SECRET STREET|Chirie \/ lună/);
for(const invalid of [{area:0},{area:null},{price:0},{price:'abc'}])assert.equal(run('pricePerSquareMeter('+JSON.stringify({...sale,...invalid})+')'),null);
run('renderDetail('+JSON.stringify({...sample,rentDeposit:null,rentCosts:''})+')');assert.match(roots.get('#app').textContent,/Nespecificată/);assert.match(roots.get('#app').textContent,/Nespecificate/);assert.match(doc.querySelector('.detail-unit-price').textContent,/calculat/);
let saleCards=run('cards('+JSON.stringify([sale])+')');assert.match(saleCards.textContent,/1 cameră/);assert.match(saleCards.textContent,/3[.\s\u00a0]?000 RON \/ m²/);
const cardLink=all(saleCards).find(n=>n.className==='card-photo-link');let cardPrevented=false;const cardHistoryBefore=historyWrites.length;cardLink.listeners.click({ctrlKey:true,preventDefault(){cardPrevented=true}});assert.equal(cardPrevented,false);assert.equal(historyWrites.length,cardHistoryBefore);

// Contact UI reflects server prerequisites, and passive viewing sends no mutations.
const beforeContactChecks=requests.filter(([,o])=>['POST','PUT','PATCH','DELETE'].includes(o.method)).length;
run('S.boot.user.phoneVerified=false;S.boot.capabilities.phoneVerification=false;renderDetail('+JSON.stringify(sample)+')');
assert.equal(doc.querySelector('.property-contact-button').disabled,true);assert.match(doc.querySelector('#property-contact-help').textContent,/SMS nu este încă activ/);
run('S.boot.capabilities.phoneVerification=true;renderDetail('+JSON.stringify(sample)+')');assert.equal(doc.querySelector('.property-contact-button').disabled,false);assert.match(doc.querySelector('.property-contact-button').textContent,/Confirmă telefonul/);
doc.querySelector('.property-contact-button').listeners.click();assert.match(roots.get('#modal-content').textContent,/Trimite codul SMS/);
run('S.boot.user.phoneVerified=true;renderDetail('+JSON.stringify(sample)+')');assert.equal(doc.querySelector('.property-contact-button').disabled,false);doc.querySelector('.property-contact-button').listeners.click();assert.match(roots.get('#modal-content').textContent,/Spune-i proprietarului ce cauți/);
run('renderDetail('+JSON.stringify({...sample,acceptsContacts:false})+')');assert.equal(doc.querySelector('.property-contact-button').disabled,true);assert.match(doc.querySelector('#property-contact-help').textContent,/oprit temporar/);
const contactUser=run('S.boot.user');run('S.boot.user=null;renderDetail('+JSON.stringify(sample)+')');doc.querySelector('.property-contact-button').listeners.click();assert.match(roots.get('#modal-content').textContent,/Continuă cu ChatGPT/);
ctx.restoreContactUser=contactUser;run('S.boot.user=restoreContactUser;S.boot.user.phoneVerified=false;S.boot.capabilities.phoneVerification=false');
run('renderDetail('+JSON.stringify(sample)+',true)');assert.equal(doc.querySelector('.property-contact-button'),null);assert.match(roots.get('#app').textContent,/Anunțul nu a fost publicat/);
assert.equal(requests.filter(([,o])=>['POST','PUT','PATCH','DELETE'].includes(o.method)).length,beforeContactChecks);
roots.get('#modal').close();run('clearEditor()');
console.log('PASS: expanded photo selection, wrap/Home/End keys and inline sync; single/missing photo states; modal styling reset; sale price/area and invalid denominators; private-address omission; unknown rental costs; modified card links; anonymous, verified, SMS-off, paused and preview contact states. No SMS, contact or publication requests.');

// Owner inventory is based only on loaded records and separates expired availability.
const ownerStatuses=['draft','rejected','withdrawn','pending','published','published','sold','rented','published'];
const ownerListings=ownerStatuses.map((status,index)=>({...sample,id:(index+1).toString(16).padStart(32,'0'),status,title:index===1?'Casă în Mărăști':'Proprietatea '+(index+1),district:index===1?'Mărăști':'Centru',photos:[sample.photos[0]],photosIncomplete:true,exactAddress:'PRIVATE ADDRESS 99',updatedAt:Date.now(),availableUntil:index===5?Date.now()-1000:index===8?null:Date.now()+30*86400000,moderationReason:index===1?'Clarifică descrierea.':''}));
fixtures['/api/mine']={listings:ownerListings,limit:50};
run("S.boot.user.status='active';S.boot.user.phoneVerified=false;S.boot.capabilities.phoneVerification=false;S.ownerFilter='all';S.ownerQuery=''");
await run('account()');assert.equal(doc.querySelectorAll('.owner-listing').length,9,doc.querySelector('.owner-load-error')?.textContent);assert.doesNotMatch(roots.get('#app').textContent,/PRIVATE ADDRESS/);
assert.match(doc.querySelector('.owner-attention').textContent,/2 anunțuri au disponibilitatea de reconfirmat/);
assert.equal(run('ownerListingState('+JSON.stringify(ownerListings[5])+').group'),'attention');assert.equal(run('ownerListingState('+JSON.stringify(ownerListings[8])+').group'),'attention');assert.equal(run('ownerListingState('+JSON.stringify(ownerListings[4])+').group'),'published');
let ownerFilters=doc.querySelectorAll('.owner-filter');ownerFilters.find(n=>n.getAttribute('data-owner-filter')==='draft').listeners.click();assert.equal(doc.querySelectorAll('.owner-listing').length,3);assert.equal(ownerFilters.find(n=>n.getAttribute('data-owner-filter')==='draft').getAttribute('aria-pressed'),'true');
let ownerSearch=doc.querySelectorAll('input').find(n=>n.name==='ownerSearch');ownerSearch.value='MARASTI';ownerSearch.listeners.input();assert.equal(doc.querySelectorAll('.owner-listing').length,1);assert.match(doc.querySelector('.owner-results').textContent,/Clarifică descrierea/);
ownerSearch.value='nu există';ownerSearch.listeners.input();assert.equal(doc.querySelectorAll('.owner-listing').length,0);all(doc.querySelector('.owner-results')).find(n=>n.tag==='button'&&n.textContent==='Arată toate anunțurile').listeners.click();assert.equal(doc.querySelectorAll('.owner-listing').length,9);assert.equal(ownerSearch.value,'');
const limitedInventory=run('ownerInventory('+JSON.stringify(Array.from({length:50},()=>ownerListings[0]))+',50)');assert.match(limitedInventory.textContent,/cel mult ultimele 50 de anunțuri/);

// Editing always fetches the complete owner record, not the summary's cover only.
fixtures['/api/mine/'+ownerListings[0].id]={listing:{...ownerListings[0],photos:[...sample.photos],photosIncomplete:false}};
const draftCard=doc.querySelectorAll('.owner-listing').find(n=>n.getAttribute('data-owner-listing')===ownerListings[0].id);
await all(draftCard).find(n=>n.tag==='button'&&n.textContent==='Continuă editarea').listeners.click();assert.equal(run('S.page'),'create');assert.equal(run('S.photos.length'),2);assert.equal(requests.at(-1)[0],'/api/mine/'+ownerListings[0].id);run('clearEditor()');

// Read failures preserve account navigation/case history; late responses cannot replace another page.
const originalOwnerFetch=ctx.fetch;let mineResponse=null;
ctx.fetch=async(url,options={})=>url==='/api/mine'&&mineResponse?mineResponse:originalOwnerFetch(url,options);
mineResponse=Promise.resolve({ok:false,json:async()=>({error:'Lista nu este disponibilă.'})});await run('account()');assert.match(doc.querySelector('.owner-load-error').textContent,/Lista nu este disponibilă/);assert.match(roots.get('#app').textContent,/Sesizările și contestațiile tale/);assert.equal(doc.querySelector('.owner-summary'),null);
let releaseMine;mineResponse=new Promise(resolve=>{releaseMine=resolve});const staleOwner=run('account()');await run('go("home")');releaseMine({ok:true,json:async()=>({listings:ownerListings,limit:50})});await staleOwner;assert.equal(run('S.page'),'home');assert.equal(doc.querySelector('.owner-inventory'),null);mineResponse=null;ctx.fetch=originalOwnerFetch;

// Restricted accounts keep their history without offering listing mutations.
run("S.boot.user.status='restricted'");await run('account()');assert.equal(doc.querySelector('.owner-new-listing'),null);assert.equal(doc.querySelector('.owner-case-details').getAttribute('open'),'');assert.ok(doc.querySelectorAll('fieldset').filter(n=>n.getAttribute('data-owner-actions')).every(n=>n.disabled));
const restrictedRequests=requests.length;assert.equal(await run('ownerMutation('+JSON.stringify(ownerListings[0])+',"submit",{},"Test")'),false);assert.equal(requests.length,restrictedRequests);
run("S.boot.user.status='active';S.boot.capabilities.phoneVerification=true;S.boot.user.phoneVerified=false");let verifySubmit=run('listingSubmitControl('+JSON.stringify(ownerListings[0])+')');const beforeVerify=requests.length;await all(verifySubmit).find(n=>n.tag==='button').listeners.click();assert.match(roots.get('#modal-content').textContent,/Trimite codul SMS/);assert.equal(requests.length,beforeVerify);
run('S.boot.user.phoneVerified=true');const noPhotosSubmit=run('listingSubmitControl('+JSON.stringify({...ownerListings[0],photos:[]})+')');assert.equal(all(noPhotosSubmit).find(n=>n.tag==='button').disabled,true);assert.match(noPhotosSubmit.textContent,/cel puțin o fotografie/);

// One mutation per listing; a late success cannot hijack navigation or close a newer modal.
await run('account()');let releaseOwnerMutation;delayedSave=new Promise(resolve=>{releaseOwnerMutation=resolve});
const mutationCount=requests.filter(([,o])=>o.method==='POST').length;
const pendingOwner=run('ownerMutation('+JSON.stringify(ownerListings[0])+',"submit",{},"Trimis")');assert.equal(run('S.ownerPending.size'),1);
assert.equal(await run('ownerMutation('+JSON.stringify(ownerListings[0])+',"submit",{},"Trimis")'),false);assert.equal(requests.filter(([,o])=>o.method==='POST').length,mutationCount+1);
await run('go("home")');releaseOwnerMutation({ok:true,json:async()=>({submitted:true})});await pendingOwner;delayedSave=null;assert.equal(run('S.page'),'home');assert.equal(run('S.ownerPending.size'),0);
await run('account()');run('closeListing('+JSON.stringify(ownerListings[4])+')');delayedSave=new Promise(resolve=>{releaseOwnerMutation=resolve});
const pendingClose=all(roots.get('#modal-content')).find(n=>n.tag==='button'&&n.textContent==='Retrag anunțul').listeners.click();run('signin()');releaseOwnerMutation({ok:true,json:async()=>({closed:true})});await pendingClose;delayedSave=null;assert.equal(roots.get('#modal').open,true);assert.match(roots.get('#modal-content').textContent,/Continuă cu ChatGPT/);

// Failed preferences preserve the entered values and release controls for a retry.
run('contactPreferences('+JSON.stringify(ownerListings[4])+')');let preferenceForm=roots.get('#modal-content').querySelector('form');preferenceForm.elements.contactHours.value='Sâmbătă, 10:00–12:00';preferenceForm.elements.acceptsContacts.checked=false;
delayedSave=Promise.resolve({ok:false,json:async()=>({error:'Nu am putut salva preferințele.'})});await preferenceForm.listeners.submit({preventDefault(){}});delayedSave=null;
assert.equal(roots.get('#modal').open,true);assert.equal(preferenceForm.elements.contactHours.value,'Sâmbătă, 10:00–12:00');assert.equal(preferenceForm.elements.acceptsContacts.checked,false);assert.equal(preferenceForm.querySelector('fieldset').disabled,false);assert.equal(run('S.ownerPending.size'),0);
assert.match(roots.get('#toast').textContent,/Nu am putut salva preferințele/);const failedPreference=JSON.parse(requests.at(-1)[1].body);assert.equal(failedPreference.acceptsContacts,false);assert.equal(failedPreference.contactHours,'Sâmbătă, 10:00–12:00');
roots.get('#modal').close();run("S.boot.user.phoneVerified=false;S.boot.capabilities.phoneVerification=false;S.ownerFilter='all';S.ownerQuery='';clearEditor()");
console.log('PASS: real loaded owner counts, expiration, diacritic-insensitive filtering/reset and 50-record limit; full-photo editor fetch; partial/late read failures; restricted account controls; phone-first submit and required photos; duplicate/late mutations; newer modal preservation and failed-preference retry. Fixture requests only.');

// Favorites compare only real loaded records, with separate sale/rental selection.
const favoriteListings=[
 {...sample,title:'Apartament în Mărăști',district:'Mărăști',rentDeposit:null,rentCosts:'',rooms:1,exactAddress:'PRIVATE STREET 99',phone:'+40700111222'},
 {...sample,id:'b'.repeat(32),title:'Locuință în Zorilor',district:'Zorilor',currency:'RON',price:3000,rentDeposit:0,rentCosts:'Utilități separat'},
 {...sample,id:'c'.repeat(32),title:'Locuință în Gheorgheni',price:750},
 {...sample,id:'d'.repeat(32),title:'Locuință în Grigorescu',price:700},
 {...sample,id:'e'.repeat(32),title:'Proprietate de vânzare',transaction:'sale',price:180000}
];
fixtures['/api/favorites']={listings:favoriteListings,limit:50};fixtures['/api/listings/'+sample.id]={listing:favoriteListings[0]};
run("S.favoriteFilter='all';S.favoriteQuery='';S.comparisonIds=[]");await run('favorites()');
assert.equal(doc.querySelectorAll('.property-card').length,5);assert.equal(doc.querySelector('.card-photo-count'),null);
const favoriteFilters=doc.querySelectorAll('.favorite-filter');favoriteFilters.find(n=>n.getAttribute('data-favorite-filter')==='sale').listeners.click();assert.equal(doc.querySelectorAll('.property-card').length,1);favoriteFilters.find(n=>n.getAttribute('data-favorite-filter')==='rent').listeners.click();assert.equal(doc.querySelectorAll('.property-card').length,4);favoriteFilters.find(n=>n.getAttribute('data-favorite-filter')==='all').listeners.click();assert.equal(doc.querySelectorAll('.property-card').length,5);
const noMatchSearch=doc.querySelectorAll('input').find(n=>n.name==='favoriteSearch');noMatchSearch.value='Inexistent';noMatchSearch.listeners.input();assert.equal(doc.querySelectorAll('.property-card').length,0);all(doc.querySelector('.favorites-no-match')).find(n=>n.tag==='button').listeners.click();assert.equal(doc.querySelectorAll('.property-card').length,5);assert.equal(noMatchSearch.value,'');

const comparisonButton=id=>doc.querySelectorAll('button').find(n=>n.getAttribute('data-compare')===id);
const beforeComparisonMutations=requests.filter(([,o])=>['POST','PATCH','PUT','DELETE'].includes(o.method)).length;
comparisonButton(sample.id).listeners.click();assert.equal(doc.querySelector('.comparison-open').disabled,true);assert.equal(comparisonButton(sample.id).getAttribute('aria-pressed'),'true');
comparisonButton(favoriteListings[1].id).listeners.click();assert.equal(doc.querySelector('.comparison-open').disabled,false);
let favoriteSearch=doc.querySelectorAll('input').find(n=>n.name==='favoriteSearch');favoriteSearch.value='MARASTI';favoriteSearch.listeners.input();assert.equal(doc.querySelectorAll('.property-card').length,1);assert.equal(run('S.comparisonIds.length'),2);
doc.querySelector('.comparison-open').listeners.click();assert.equal(roots.get('#modal').className,'comparison-dialog');
let comparison=roots.get('#modal-content').querySelector('.comparison-table');assert.match(comparison.textContent,/Chirie lunară/);assert.match(comparison.textContent,/EUR/);assert.match(comparison.textContent,/RON/);assert.match(comparison.textContent,/Nespecificată/);assert.match(comparison.textContent,/Nespecificate/);assert.match(comparison.textContent,/0 RON/);assert.match(comparison.textContent,/1 cameră/);assert.doesNotMatch(comparison.textContent,/PRIVATE STREET|40700111222|Preț aproximativ/);
assert.match(roots.get('#modal-content').textContent,/Monede diferite/);assert.ok(all(comparison).some(n=>n.tag==='th'&&n.getAttribute('scope')==='row'));
roots.get('#modal').close();favoriteSearch.value='';favoriteSearch.listeners.input();comparisonButton(favoriteListings[4].id).listeners.click();assert.equal(run('S.comparisonIds.length'),2);assert.match(doc.querySelector('.comparison-feedback').textContent,/Compară separat/);
comparisonButton(favoriteListings[2].id).listeners.click();comparisonButton(favoriteListings[3].id).listeners.click();assert.equal(run('S.comparisonIds.length'),3);assert.match(doc.querySelector('.comparison-feedback').textContent,/maximum trei/);
const removeComparison=all(doc.querySelector('.comparison-selection')).find(n=>n.tag==='button');removeComparison.listeners.click();assert.equal(run('S.comparisonIds.includes('+JSON.stringify(sample.id)+')'),false);assert.equal(comparisonButton(sample.id).getAttribute('aria-pressed'),'false');assert.equal(comparisonButton(sample.id).focused,true);assert.equal(run('S.favorites.has('+JSON.stringify(sample.id)+')'),true);
doc.querySelector('.comparison-clear').listeners.click();assert.equal(run('S.comparisonIds.length'),0);assert.equal(doc.querySelector('.comparison-open').disabled,true);

// The selected properties survive filters and return from a full listing.
comparisonButton(sample.id).listeners.click();comparisonButton(favoriteListings[1].id).listeners.click();doc.querySelector('.comparison-open').listeners.click();
comparison=roots.get('#modal-content').querySelector('.comparison-table');const comparisonLink=all(comparison).find(n=>n.tag==='a');let comparisonPrevented=false;
comparisonLink.listeners.click({ctrlKey:true,preventDefault(){comparisonPrevented=true}});assert.equal(comparisonPrevented,false);assert.equal(roots.get('#modal').open,true);
comparisonLink.listeners.click({preventDefault(){comparisonPrevented=true}});await tick();assert.equal(run('S.page'),'detail');assert.equal(roots.get('#modal').open,false);
all(roots.get('#app')).find(n=>n.tag==='button'&&n.textContent==='← Înapoi la favorite').listeners.click();await tick();assert.equal(run('S.page'),'favorites');assert.equal(run('S.comparisonIds.length'),2);
assert.equal(requests.filter(([,o])=>['POST','PATCH','PUT','DELETE'].includes(o.method)).length,beforeComparisonMutations);

// Reload removes unavailable IDs, enforces the limit, and does not invent an empty total.
fixtures['/api/favorites']={listings:[favoriteListings[1]],limit:50};await run('favorites()');assert.equal(run('S.comparisonIds.length'),1);assert.equal(run('S.comparisonIds[0]'),favoriteListings[1].id);assert.equal(doc.querySelector('.comparison-open').disabled,true);
const limitedFavorites=run('favoriteCollection('+JSON.stringify(Array.from({length:50},(_,i)=>({...sample,id:(i+1).toString(16).padStart(32,'0')})))+',50)');assert.match(limitedFavorites.textContent,/cel mult 50 de favorite disponibile/);
run('S.comparisonIds=[]');run('comparisonDialog('+JSON.stringify([favoriteListings[0]])+')');assert.equal(roots.get('#modal').open,false);
const saleComparison=[favoriteListings[4],{...favoriteListings[4],id:'f'.repeat(32),price:200000}];run('comparisonDialog('+JSON.stringify(saleComparison)+')');assert.match(roots.get('#modal-content').textContent,/Preț aproximativ \/ m²/);assert.doesNotMatch(roots.get('#modal-content').textContent,/Chirie lunară|Garanție|Monede diferite/);roots.get('#modal').close();

// Failed removal preserves selection; repeated clicks send only one DELETE.
fixtures['/api/favorites']={listings:[favoriteListings[1]],limit:50};run('S.comparisonIds=['+JSON.stringify(favoriteListings[1].id)+']');await run('favorites()');
const originalFavoriteFetch=ctx.fetch;let removalResponse=null,removalCalls=0;
ctx.fetch=async(url,options={})=>{if(url==='/api/favorites/'+favoriteListings[1].id&&options.method==='DELETE'){removalCalls++;requests.push([url,options]);return removalResponse;}return originalFavoriteFetch(url,options);};
removalResponse=Promise.resolve({ok:false,json:async()=>({error:'Eliminarea nu a fost salvată.'})});
let removeFavorite=doc.querySelectorAll('[data-favorite]').find(n=>n.getAttribute('data-favorite')===favoriteListings[1].id);removeFavorite.listeners.click();await tick();assert.equal(run('S.favorites.has('+JSON.stringify(favoriteListings[1].id)+')'),true);assert.equal(run('S.comparisonIds.length'),1);assert.equal(removeFavorite.disabled,false);assert.match(roots.get('#toast').textContent,/Eliminarea nu a fost salvată/);
let finishRemoval;removalResponse=new Promise(resolve=>{finishRemoval=resolve});const removalCallsBefore=removalCalls;removeFavorite.listeners.click();removeFavorite.listeners.click();assert.equal(removalCalls,removalCallsBefore+1);assert.equal(removeFavorite.disabled,true);
doc.querySelector('.comparison-open').listeners.click();assert.equal(roots.get('#modal').open,false);assert.match(doc.querySelector('.comparison-feedback').textContent,/Așteaptă salvarea/);
fixtures['/api/favorites']={listings:[],limit:50};finishRemoval({ok:true,json:async()=>({saved:false})});await tick();await tick();assert.equal(run('S.comparisonIds.length'),0);assert.equal(run('S.favorites.has('+JSON.stringify(favoriteListings[1].id)+')'),false);assert.match(doc.querySelector('.favorites-empty').textContent,/Nicio favorită disponibilă acum/);assert.match(doc.querySelector('.favorites-empty').textContent,/retrase, expirate/);ctx.fetch=originalFavoriteFetch;

// Failures keep the page useful, and anonymous visitors never request private favorites.
delayedFavorites=Promise.resolve({ok:false,json:async()=>({error:'Favorite indisponibile.'})});await run('favorites()');assert.match(doc.querySelector('.favorites-load-error').textContent,/Favorite indisponibile/);assert.equal(doc.querySelector('.favorites-empty'),null);delayedFavorites=null;
const favoritesUser=run('S.boot.user');run('S.boot.user=null');const anonymousFavoriteRequests=requests.length;await run('favorites()');assert.equal(requests.length,anonymousFavoriteRequests);assert.match(roots.get('#modal-content').textContent,/Continuă cu ChatGPT/);ctx.restoreFavoritesUser=favoritesUser;run("S.boot.user=restoreFavoritesUser;S.favoriteFilter='all';S.favoriteQuery='';S.comparisonIds=[]");roots.get('#modal').close();
console.log('PASS: favorites filters/diacritics; 2–3 same-transaction comparisons; EUR/RON without conversion; unknown vs zero costs; private-data omission; selection persistence and unavailable pruning; real-photo count omission; full listing return; modifier links; failed/duplicate removal and anonymous/error states. No SMS/contact/publication requests.');
