'use strict';
const app=document.querySelector('#app'),dialog=document.querySelector('#modal'),modalContent=document.querySelector('#modal-content');
const S={boot:null,page:'home',transaction:'sale',filters:{},sort:'newest',browsePage:1,photos:[],draft:{},step:0,favorites:new Set(),busy:false,screenRevision:0,favoritePending:new Set(),editorSession:0,editorDirty:false,editorSaving:false,editorProcessing:false,editorError:'',ownerFilter:'all',ownerQuery:'',ownerPending:new Set(),favoriteFilter:'all',favoriteQuery:'',comparisonIds:[],detailReturnPage:'browse',conversationId:null,inboxFilter:'all',inboxQuery:'',messageDrafts:{},conversationPending:new Set(),modalRevision:0,formPending:new Set(),phoneChallenge:null,phoneRetryAt:0};
const districts=['Becaș','Borhanci','Bulgaria','Făget','Andrei Mureșanu','Bună Ziua','Centru','Dâmbul Rotund','Europa','Gheorgheni','Grigorescu','Gruia','Iris','Între Lacuri','Mănăștur','Mărăști','Someșeni','Sopor','Zorilor'];
const typeNames={apartment:'Apartament',house:'Casă',land:'Teren',commercial:'Spațiu comercial'};
const statuses={draft:'Ciornă',pending:'În moderare',published:'Publicat',rejected:'Respins',sold:'Vândut',rented:'Închiriat',withdrawn:'Retras',requested:'Solicitare nouă',accepted:'Acceptată',declined:'Refuzată'};
function el(tag,attrs={},...children){const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='class')n.className=v;else if(k==='text')n.textContent=v;else if(k.startsWith('on'))n.addEventListener(k.slice(2),v);else if(k==='checked'||k==='disabled'||k==='required'||k==='selected')n[k]=!!v;else if(v!=null)n.setAttribute(k,String(v));}for(const child of children.flat(Infinity))if(child!=null)n.append(child instanceof Node?child:document.createTextNode(String(child)));return n;}
const b=(text,fn,cls='button')=>el('button',{type:'button',class:cls,onclick:fn},text);
const money=(v,c='EUR')=>new Intl.NumberFormat('ro-RO',{maximumFractionDigits:0}).format(Number(v)||0)+' '+(c==='EUR'?'EUR':'RON');
const eye=t=>el('div',{class:'eyebrow'},el('span',{class:'dot'}),t);
const note=(t,error=false)=>el('div',{class:'notice'+(error?' error':''),...(error?{role:'alert'}:{})},t);
function toast(t){const n=document.querySelector('#toast');n.textContent=t;n.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>n.classList.remove('show'),4500);}
async function api(path,method='GET',body){
  let response;
  try{response=await fetch(path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});}
  catch{throw Error(method==='GET'?'Conexiunea s-a întrerupt. Verifică rețeaua și reîncearcă.':'Nu am primit confirmarea. Verifică starea înainte de a repeta acțiunea.');}
  let data;try{data=await response.json();}catch{throw Error('Serviciul nu a răspuns corect. Reîmprospătează înainte de a continua.');}
  if(!response.ok){const error=Error(data.error||'Acțiunea nu a putut fi efectuată.');error.code=data.code;error.status=response.status;throw error;}
  return data;
}
async function attempt(fn){try{await fn();}catch(e){toast(e.message);}}
function openModal(content,options={}){
  if(!dialog.open)S.modalOpener=document.activeElement;
  S.modalRevision++;S.modalKeyHandler=options.onKeydown||null;dialog.className=options.className||'';
  const heading=content.querySelector('h2');dialog.setAttribute('aria-label',options.label||heading?.textContent||'Fereastră de dialog');modalContent.replaceChildren(content);
  if(!dialog.open)dialog.showModal();
  if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
}
dialog.addEventListener('keydown',event=>S.modalKeyHandler?.(event));
dialog.addEventListener('close',()=>{if(dialog.open)return;S.modalKeyHandler=null;const target=S.modalOpener?.isConnected?S.modalOpener:document.querySelector('#main-content');target?.focus?.({preventScroll:true});S.modalOpener=null;});
document.querySelector('.modal-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
function signin(){openModal(el('div',{},eye('Contul tău'),el('h2',{class:'modal-title'},'Bine ai venit.'),el('p',{class:'muted'},'Autentifică-te pentru a salva locuințe, a publica anunțuri și a discuta direct cu proprietarii.'),note('Telefonul confirmat este necesar înainte de publicare și contactare. Nu echivalează cu verificarea identității.'),el('a',{class:'button',href:'/signin-with-chatgpt?return_to='+encodeURIComponent(window.location.pathname==='/atelier'?'/atelier'+window.location.search:'/atelier'),target:'_top'},'Continuă cu ChatGPT ↗')));}
function requireUser(fn){if(!S.boot?.user){signin();return;}fn();}
function icon(){const n=el('span');n.innerHTML='<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M5 26V15L20 5l15 10v11M12 34V20l8-5 8 5v14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';return n.firstChild;}
function shell(content,active=''){
  const navBrowse=transaction=>{changeTransaction(transaction);go('browse');};
  const header=el('header',{class:'header'},el('a',{class:'brand',href:'/atelier',onclick:event=>{if(modifiedClick(event))return;event.preventDefault();go('home');}},icon(),el('span',{class:'brand-wordmark'},'între noi'),el('span',{class:'brand-city'},'Cluj-Napoca')),
    el('nav',{class:'nav','aria-label':'Navigare principală'},b('Cumpără',()=>navBrowse('sale'),'nav-desktop '+(active==='browse'&&S.transaction==='sale'?'active':'')),b('Închiriază',()=>navBrowse('rent'),'nav-desktop '+(active==='browse'&&S.transaction==='rent'?'active':'')),b('Cum funcționează',()=>scrollHomeSection('how'),'nav-desktop nav-how'),messageNavButton('Mesaje',()=>requireUser(()=>go('messages')),'nav-desktop'),b(S.boot?.user?'Contul meu':'Intră în cont',()=>S.boot?.user?go('account'):signin(),'account-nav'),b('Publică anunț +',()=>requireUser(publishingChoice),'button small')));
  const footer=el('footer',{class:'footer brand-footer'},el('div',{class:'footer-top'},el('div',{class:'footer-statement'},el('span',{class:'footer-brand'},'între noi'),el('p',{},'Mai aproape de',el('br'),el('em',{},'următorul acasă.'))),el('div',{class:'footer-link-group'},el('strong',{},'Găsește-ți locul'),b('Proprietăți de vânzare',()=>navBrowse('sale'),'text-button'),b('Proprietăți de închiriat',()=>navBrowse('rent'),'text-button'),b('Favoritele tale',()=>requireUser(()=>go('favorites')),'text-button'),messageNavButton('Conversații',()=>requireUser(()=>go('messages')),'text-button')),el('div',{class:'footer-link-group'},el('strong',{},'Înainte să începi'),b('Cum funcționează',()=>scrollHomeSection('how'),'text-button'),b('Regulile comunității',rules,'text-button'),b('Confidențialitate',privacy,'text-button'),b('Pregătește un anunț',()=>requireUser(publishingChoice),'text-button'))),el('div',{class:'footer-bottom'},el('span',{},'© 2026 Între noi · Nume de lucru'),el('span',{},'Cluj-Napoca · Pilot privat · Acces restrâns')));
  const mobileNav=el('nav',{class:'mobile-navigation','aria-label':'Navigare rapidă'},b('Cumpără',()=>navBrowse('sale'),S.page==='browse'&&S.transaction==='sale'?'active':''),b('Închiriază',()=>navBrowse('rent'),S.page==='browse'&&S.transaction==='rent'?'active':''),b('Favorite',()=>requireUser(()=>go('favorites')),S.page==='favorites'?'active':''),messageNavButton('Mesaje',()=>requireUser(()=>go('messages')),S.page==='messages'?'active':''));
  const previousFocus=document.activeElement,previousName=previousFocus?.name;
  content.id='main-content';content.tabIndex=-1;app.replaceChildren(el('a',{class:'skip-link',href:'#main-content'},'Sari la conținut'),el('div',{class:'container'},header,mobileNav,el('div',{id:'draft-resume'},draftResumeContent()),content,footer));
  for(const navigation of [header,mobileNav])for(const button of navigation.querySelectorAll?.('button')||[])if((button.className||'').split(' ').includes('active'))button.setAttribute('aria-current','page');
  paintUnreadIndicators();
  const title=content.querySelector('h1')||content.querySelector('h2');
  if(!dialog.open&&S.boot&&S.focusedScreenRevision!==S.screenRevision&&title){title.tabIndex=-1;title.focus({preventScroll:true});S.focusedScreenRevision=S.screenRevision;}
  else if(!dialog.open&&previousName){const replacement=[...(content.querySelectorAll?.('input')||[]),...(content.querySelectorAll?.('select')||[]),...(content.querySelectorAll?.('textarea')||[])].find(node=>node.name===previousName);replacement?.focus({preventScroll:true});}
}
async function go(page,options={}){
  const expectedRevision=S.screenRevision+1;
  if(page==='browse')S.browsePage=options.pageNumber||1;
  S.page=page;window.scrollTo({top:0,behavior:'instant'});
  try{
    if(page==='home')await home(options);
    if(page==='browse')await browse(options);
    if(page==='account')await account(options);
    if(page==='favorites')await favorites(options);
    if(page==='messages')await messages(options.conversationId,options);
    if(page==='moderation')await moderation(options);
  }catch(e){
    if(S.page!==page||S.screenRevision!==expectedRevision)return;
    shell(el('main',{class:'page'},el('h1',{class:'page-title'},'La un pas de locuința ta.'),note(e.message,true),b('Încearcă din nou',()=>go(page,{pageNumber:S.browsePage}))));
  }
}
function art(){const n=el('div',{class:'art-frame'});n.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 520" role="img" aria-label="Ilustrație arhitecturală a unei locuințe luminoase în Cluj"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#ccd8c5"/><stop offset="1" stop-color="#f2f0df"/></linearGradient><linearGradient id="wall" x2="1" y2="1"><stop stop-color="#e5dcca"/><stop offset="1" stop-color="#b9b19c"/></linearGradient><linearGradient id="glass" x2="1" y2="1"><stop stop-color="#5d776a"/><stop offset="1" stop-color="#243f35"/></linearGradient></defs><rect width="600" height="520" fill="url(#sky)"/><circle cx="470" cy="94" r="51" fill="#f8f3d8"/><path d="M0 326Q100 225 210 280T600 240V520H0" fill="#9bad88"/><path d="M35 335L260 182 532 271 302 409Z" fill="#f3eddf"/><path d="M35 335V460L302 550V409Z" fill="url(#wall)"/><path d="M302 409V550L532 410V271Z" fill="#d3cbb8"/><path d="M51 331L260 191 516 274 304 399Z" fill="#eee8da"/><path d="M116 312L263 214 449 275 304 370Z" fill="#d4d0bf"/><path d="M143 323V411L258 449V360Z" fill="url(#glass)"/><path d="M143 323L258 360M200 342V431" stroke="#c6cbb6" stroke-width="3"/><path d="M340 403L493 310V409L340 501Z" fill="url(#glass)"/><path d="M390 373V470M443 342V439" stroke="#aeb8a5" stroke-width="3"/><path d="M30 454L303 547 580 379" stroke="#a6a892" stroke-width="13"/><path d="M1 426V520H99V391Z" fill="#8c9e76"/><path d="M44 398V272" stroke="#718368" stroke-width="10"/><ellipse cx="44" cy="266" rx="62" ry="88" fill="#728b68"/><ellipse cx="59" cy="241" rx="44" ry="64" fill="#829970"/><path d="M555 377V238" stroke="#718368" stroke-width="9"/><ellipse cx="555" cy="218" rx="44" ry="76" fill="#829970"/><path d="M0 489Q95 448 192 510H0" fill="#586f51"/></svg>';return n;}
function searchBox(full=false){const f=el('form',{class:'search-box'});const trans=el('div',{class:'search-tabs'},...['sale','rent'].map(v=>b(v==='sale'?'Vreau să cumpăr':'Vreau să închiriez',()=>{S.filters=Object.fromEntries(new FormData(f));changeTransaction(v);go(full?'browse':'home');},v===S.transaction?'active':'')));for(const[index,tab]of [...trans.children].entries()){tab.setAttribute('aria-pressed',String(['sale','rent'][index]===S.transaction));}const field=(label,node,cls='')=>el('label',{class:cls},label,node);const district=select('district',[['','Toate cartierele'],...districts.map(v=>[v,v])],S.filters.district||'');const type=select('type',[['','Toate tipurile'],...Object.entries(typeNames)],S.filters.type||'');const max=el('input',{name:'maxPrice',type:'number',min:0,placeholder:'Orice buget',value:S.filters.maxPrice||'','aria-label':'Preț maxim în moneda selectată'});f.append(trans,el('div',{class:'search-grid'},field('Cartier · Cluj-Napoca',district,'location-field'),field('Tipul proprietății',type),field('Monedă',select('currency',[['EUR','EUR · €'],['RON','RON · lei']],S.filters.currency||'EUR')),field('Buget maxim',max),el('button',{class:'button search-submit',type:'submit'},'Caută anunțuri',el('span',{'aria-hidden':'true'},'↗'))));const advanced=el('details',{class:'advanced-search'},el('summary',{},'Mai multe filtre'),el('div',{class:'filter-extra'},field('Cuvinte-cheie',el('input',{name:'q',maxlength:100,placeholder:'De exemplu: balcon',value:S.filters.q||''})),field('Preț minim',el('input',{name:'minPrice',type:'number',min:0,placeholder:'Orice preț',value:S.filters.minPrice||''})),field('Suprafață minimă · m²',el('input',{name:'minArea',type:'number',min:0,placeholder:'Orice suprafață',value:S.filters.minArea||''})),field('Număr de camere',select('rooms',[['','Oricâte camere'],['1','1+ camere'],['2','2+ camere'],['3','3+ camere'],['4','4+ camere']],S.filters.rooms||''))));if(['q','minPrice','minArea','rooms'].some(k=>S.filters[k]))advanced.setAttribute('open','');f.append(advanced);f.addEventListener('submit',e=>{e.preventDefault();const values=Object.fromEntries(new FormData(f));if(values.minPrice&&values.maxPrice&&Number(values.minPrice)>Number(values.maxPrice)){max.setCustomValidity('Bugetul maxim trebuie să fie cel puțin egal cu prețul minim.');max.reportValidity();return;}S.filters=values;go('browse');});f.addEventListener('input',()=>max.setCustomValidity(''));return f;}
function select(name,options,value){return el('select',{name},...options.map(([v,t])=>el('option',{value:v,selected:String(value)===String(v)},t)));}
function empty(title,text,action='Publică prima locuință',fn=()=>requireUser(()=>create())){return el('div',{class:'empty'},el('div',{class:'empty-symbol','aria-hidden':'true'},'⌂'),el('div',{},el('h3',{},title),el('p',{},text),b(action,fn,'button small')));}
async function scrollHomeSection(id){
  if(S.page!=='home')await go('home');
  const target=document.querySelector('#'+id);if(!target)return;
  target.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth',block:'start'});
  target.focus?.({preventScroll:true});
}
function districtSearch(name){S.filters={district:name,currency:'EUR'};go('browse');}
function experienceSection(){
  const section=el('section',{id:'how',class:'brand-section experience-section',tabindex:'-1'},el('div',{class:'brand-section-heading'},el('div',{},eye('Cum funcționează'),el('h2',{},'De la „îmi place”',el('br'),el('em',{},'la „hai să vorbim”.'))),el('p',{class:'brand-section-intro'},'Pași clari. O conversație directă. Tu decizi ce urmează.')));
  const panels={
    seeker:[['Găsește un loc care ți se potrivește.','Alege vânzare sau închiriere, cartierul și bugetul. Păstrează în favorite proprietățile la care vrei să revii.'],['Prezintă-te, în câteva cuvinte.','Îți creezi contul, confirmi telefonul când serviciul este disponibil și îi spui proprietarului ce cauți.'],['Discutați și stabiliți o vizionare.','După acceptarea solicitării, conversația continuă în platformă. O vizionare este confirmată numai după acordul proprietarului.']],
    owner:[['Începe cu povestea proprietății.','Completează ciorna și fotografiile. Alegi imaginea principală și verifici cum va arăta anunțul înainte să îl trimiți.'],['Pregătește anunțul pentru publicare.','Sunt necesare telefonul confirmat, declarația ta și revizuirea de către un moderator. Ciorna nu se publică automat.'],['Alege cu cine începi conversația.','Accepți solicitările potrivite. Numărul tău rămâne ascuns până când decizi să îl oferi separat unei persoane.']]
  };
  const panel=el('div',{class:'experience-steps',id:'experience-steps'}),controls=el('div',{class:'audience-switch','aria-label':'Alege parcursul'});
  const choose=value=>{for(const button of controls.children)button.setAttribute('aria-pressed',String(button.getAttribute('data-audience')===value));panel.replaceChildren(...panels[value].map(([title,body],index)=>el('article',{},el('span',{class:'experience-number'},'0'+(index+1)),el('h3',{},title),el('p',{},body))));};
  for(const[value,label]of[['seeker','Caut o proprietate'],['owner','Sunt proprietar']]){const button=b(label,()=>choose(value));button.setAttribute('data-audience',value);button.setAttribute('aria-controls','experience-steps');controls.append(button);}
  choose('seeker');section.append(controls,panel);return section;
}
function brandPrinciples(){
  return el('section',{class:'brand-principles','aria-labelledby':'principles-title'},el('div',{class:'principles-intro'},eye('Ideea din spatele Între noi'),el('h2',{id:'principles-title'},'Mai puțină distanță.',el('br'),el('em',{},'Mai mult dialog.')),el('p',{},'O proprietate înseamnă mai mult decât metri pătrați. De aceea, lăsăm loc pentru întrebări, răspunsuri și oamenii care le cunosc.')),el('div',{class:'principles-list'},...[
    ['01','Direct de la proprietar.','Pilotul este destinat proprietarilor și coproprietarilor. Agențiile și intermediarii nu fac parte din acest spațiu.'],
    ['02','Datele de contact, în controlul tău.','Telefonul și adresa exactă nu apar în anunț. Proprietarul poate oferi numărul separat, într-o conversație acceptată.'],
    ['03','Încredere, cu limite explicate.','Confirmarea telefonului și moderarea sunt pași separați. Niciuna nu reprezintă o garanție a identității sau a dreptului de proprietate.']
  ].map(([number,title,body])=>el('article',{},el('span',{class:'principle-number'},number),el('div',{},el('h3',{},title),el('p',{},body))))));
}
function neighborhoodSection(){
  const selected=['Centru','Gheorgheni','Grigorescu','Zorilor','Andrei Mureșanu','Bună Ziua'];
  return el('section',{class:'brand-section neighborhood-section'},el('div',{class:'brand-section-heading'},el('div',{},eye('Același oraș. Atâtea începuturi.'),el('h2',{},'În ce parte din Cluj',el('br'),el('em',{},'te vezi acasă?'))),el('p',{class:'brand-section-intro'},'Începe de la un cartier. Vezi apoi ce proprietăți sunt disponibile pentru '+(S.transaction==='rent'?'închiriere.':'vânzare.'))),el('div',{class:'neighborhood-list'},...selected.map((name,index)=>el('button',{type:'button',onclick:()=>districtSearch(name),'aria-label':'Caută proprietăți în '+name},el('span',{class:'neighborhood-index','aria-hidden':'true'},'0'+(index+1)),el('span',{class:'neighborhood-name'},name),el('span',{class:'neighborhood-arrow','aria-hidden':'true'},'↗')))),b('Explorează toate cartierele →',()=>{S.filters={currency:'EUR'};go('browse');},'text-button neighborhood-all'));
}
function ownerInvitation(){
  return el('section',{class:'brand-owner','aria-labelledby':'owner-invitation-title'},el('figure',{class:'brand-owner-photo'},el('img',{src:'/media/owner-atmosphere.webp',alt:'Cheie pe o tavă ceramică, în lumină caldă. Imagine de atmosferă generată cu AI.',width:800,height:1000,loading:'lazy',decoding:'async'}),el('figcaption',{},'Imagine de atmosferă · AI')),el('div',{class:'brand-owner-copy'},eye('Pentru proprietari'),el('h2',{id:'owner-invitation-title'},'Tu ai un loc.',el('br'),el('em',{},'Cineva îl caută.')),el('p',{},'Spune-i povestea. Arată lumina din camere, detaliile care contează și condițiile reale. Restul începe cu o conversație.'),el('ul',{},el('li',{},'Publicarea de bază este gratuită în beta.'),el('li',{},'Pregătești și previzualizezi anunțul în ritmul tău.'),el('li',{},'Tu alegi cui îi oferi numărul de telefon.')),b('Pregătește proprietatea ta ↗',()=>requireUser(publishingChoice),'button owner-cta'),el('p',{class:'owner-pilot-note'},'Poți începe cu o ciornă. Publicarea așteaptă îndeplinirea condițiilor pilotului.')));
}
async function home(options={}){
  const revision=beginScreen('home',options),main=el('main',{class:'brand-home'});
  const hero=el('section',{class:'brand-hero','aria-labelledby':'home-title'},el('img',{class:'brand-hero-image',src:'/media/home-atmosphere.webp',srcset:'/media/home-atmosphere-small.webp 960w, /media/home-atmosphere.webp 1672w',sizes:'(max-width: 620px) 100vw, (max-width: 1344px) calc(100vw - 64px), 1280px',alt:'Interior luminos, deschis spre un balcon cu verdeață. Imagine de atmosferă generată cu AI, nu o proprietate disponibilă.',width:1672,height:941,fetchpriority:'high',decoding:'async'}),el('div',{class:'brand-hero-shade','aria-hidden':'true'}),el('div',{class:'brand-hero-copy'},el('p',{class:'hero-location'},el('span',{class:'hero-location-dot','aria-hidden':'true'}),'CLUJ-NAPOCA · PILOT PRIVAT'),el('p',{class:'hero-overline'},'Direct de la proprietar.'),el('h1',{id:'home-title'},'Un loc al tău.',el('br'),el('em',{},'Oameni, direct.')),el('p',{class:'hero-description'},'Cumperi, închiriezi sau îți găsești următorul loc. Direct cu omul de la celălalt capăt al poveștii.'),el('div',{class:'hero-actions'},b('Găsește-ți locul ↗',()=>scrollHomeSection('home-search'),'button hero-primary'),b('Sunt proprietar',()=>requireUser(publishingChoice),'button hero-secondary'))),el('p',{class:'hero-image-credit'},'Imagine de atmosferă · AI · Nu este un anunț'));
  const search=el('section',{id:'home-search',class:'brand-search',tabindex:'-1','aria-label':'Caută o proprietate'},searchBox());
  const promise=el('div',{class:'brand-promise'},...[
    ['01','Fără comision de agenție','O platformă pentru tranzacții directe.'],
    ['02','Contactul începe cu acord','Proprietarul acceptă conversația.'],
    ['03','Cluj-Napoca, de la început','Un pilot concentrat pe orașul nostru.']
  ].map(([number,title,copy])=>el('div',{},el('span',{class:'promise-number','aria-hidden':'true'},number),el('div',{},el('strong',{},title),el('span',{},copy)))));
  main.append(hero,search,promise);
  const serviceStatus=phoneAvailabilityNotice();if(serviceStatus){serviceStatus.classList.add('brand-pilot-notice');main.append(serviceStatus);}
  const feed=el('div',{class:'brand-feed',role:'region','aria-label':'Anunțuri publicate','aria-busy':'true'},loadingResults());
  main.append(el('section',{class:'brand-section brand-listings'},el('div',{class:'brand-section-heading'},el('div',{},eye('Din anunțurile publicate'),el('h2',{},'Locuri pentru',el('br'),el('em',{},'următorul capitol.'))),b('Vezi toate anunțurile ↗',()=>go('browse'),'button secondary small')),feed));
  main.append(brandPrinciples(),experienceSection(),neighborhoodSection(),ownerInvitation(),homeQuestions());
  shell(main);
  try{
    const {listings}=await api('/api/listings');if(revision!==S.screenRevision)return;
    feed.replaceChildren(listings.length?cards(listings.slice(0,3)):el('div',{class:'brand-empty'},el('div',{class:'brand-empty-symbol','aria-hidden':'true'},icon()),el('div',{},el('span',{class:'status'},'La început de drum'),el('h3',{},'Primele povești de acasă încep aici.'),el('p',{},'Nu avem încă anunțuri publicate. Construim un pilot pentru contact direct în Cluj, iar proprietarii își pot pregăti deja ciornele.')),b('Începe cu proprietatea ta ↗',()=>requireUser(publishingChoice),'button secondary')));
  }catch(error){if(revision!==S.screenRevision)return;feed.replaceChildren(note(error.message,true),b('Reîncarcă anunțurile',()=>go('home'),'button secondary'));}
  finally{if(revision===S.screenRevision)feed.setAttribute('aria-busy','false');}
}
async function browse(options={}){
  const revision=beginScreen('browse',options);
  const main=el('main',{class:'page browse-page'},el('div',{class:'browse-heading'},
    el('div',{},eye('Persoane fizice · contact direct'),el('h1',{class:'page-title'},S.transaction==='rent'?'De închiriat în Cluj-Napoca.':'De vânzare în Cluj-Napoca.'),el('p',{class:'muted'},'Alege ce contează pentru tine. Discută direct cu proprietarul.')),
    b('Copiază căutarea',()=>copySearchLink(),'button secondary small')),searchBox(true),b('Filtrează rezultatele',openMobileFilters,'button secondary mobile-filter-open'),b('Salvează căutarea',saveCurrentSearch,'button secondary save-search-button'));
  const results=el('section',{class:'search-results','aria-label':'Rezultatele căutării','aria-busy':'true'},loadingResults());
  main.append(results);shell(main,'browse');
  try{
    const qs=new URLSearchParams({transaction:S.transaction,currency:'EUR',...S.filters,sort:S.sort,page:String(S.browsePage)});
    const data=await api('/api/listings?'+qs);
    if(revision!==S.screenRevision)return;
    const {listings}=data,total=data.total??listings.length,page=data.page??S.browsePage,limit=data.limit??24;
    const sorter=select('sort',[['newest','Cele mai recente'],['price_asc','Preț crescător'],['price_desc','Preț descrescător'],['area_desc','Suprafață descrescătoare'],['price_m2_asc','Preț/m² crescător'],['price_m2_desc','Preț/m² descrescător']],S.sort);
    sorter.addEventListener('change',()=>{S.sort=sorter.value;go('browse');});
    const count=el('div',{},el('h2',{class:'results-count','aria-live':'polite'},total+' '+(total===1?'anunț':'anunțuri')),
      el('p',{class:'subtle'},(listings.length?((page-1)*limit+1)+'–'+((page-1)*limit+listings.length)+' din '+total+' · ':'')+(S.filters.currency||'EUR')+' · Fără conversie valutară'));
    results.replaceChildren(...[activeFilters(),el('div',{class:'results-toolbar'},count,el('label',{class:'sort-control'},'Sortează după',sorter)),
      listings.length?cards(listings):searchEmpty(total),pagination(page,data.totalPages??1)].filter(Boolean));
    if(S.savedSearchOpening){const opening=S.savedSearchOpening;S.savedSearchOpening=null;await api('/api/saved-searches/'+opening.id+'/seen','POST',{through:opening.viewedThrough});}
  }catch(e){
    if(revision!==S.screenRevision)return;
    results.replaceChildren(el('div',{class:'search-error',role:'alert'},el('h2',{},'Căutarea nu s-a putut încărca.'),el('p',{class:'muted'},e.message),b('Reîncearcă',()=>go('browse',{pageNumber:S.browsePage}),'button secondary')));
  }finally{if(revision===S.screenRevision)results.setAttribute('aria-busy','false');}
}
function loadingResults(){return el('div',{},el('p',{class:'loading',role:'status'},'Căutăm proprietăți…'),el('div',{class:'cards skeletons','aria-hidden':'true'},...[1,2,3].map(()=>el('div',{class:'skeleton-card'},el('div'),el('span'),el('span')))));}
function searchEmpty(total){
  const filtered=Object.entries(S.filters).some(([key,value])=>key!=='currency'&&value);
  const root=el('div',{class:'search-empty'},el('span',{class:'search-empty-symbol','aria-hidden':'true'},'⌕'),
    el('h2',{},total?'Ai ajuns dincolo de ultima pagină.':filtered?'Nicio potrivire, deocamdată.':'Primele anunțuri urmează să apară.'),
    el('p',{class:'muted'},total?'Anunțurile disponibile se pot schimba. Revino la începutul listei.':filtered?'Încă nu avem anunțuri care să corespundă. Salvează căutarea și îți arătăm anunțurile noi când revii.':'Suntem într-un pilot privat. Anunțurile apar aici după confirmarea telefonului și revizuirea de către un moderator.'));
  const actions=el('div',{class:'empty-actions'});
  if(filtered||total)actions.append(b(total?'Prima pagină':'Elimină filtrele',()=>{if(!total)S.filters={currency:S.filters.currency||'EUR'};go('browse');},'button secondary'));
  actions.append(b('Salvează căutarea',saveCurrentSearch,'button secondary'),b('Ai o locuință în Cluj? Publică direct.',()=>requireUser(publishingChoice),'text-button'));root.append(actions,el('p',{class:'subtle'},'Pilot privat în Cluj-Napoca. Anunțurile apar după confirmarea telefonului și moderare. Nu trimitem notificări prin email sau SMS.'));return root;
}
function pagination(page,totalPages){
  if(totalPages<2&&page===1)return null;
  const pageLink=(label,target,disabled)=>el('a',{class:'button secondary small'+(disabled?' is-disabled':''),href:disabled?null:browseUrl(target),'aria-disabled':String(disabled),...(disabled?{}:{onclick:e=>{if(modifiedClick(e))return;e.preventDefault();go('browse',{pageNumber:target});}})},label);
  return el('nav',{class:'pagination','aria-label':'Paginile rezultatelor'},pageLink('← Înapoi',page-1,page<=1),el('span',{'aria-current':'page'},'Pagina '+page+' din '+Math.max(1,totalPages)),pageLink('Înainte →',page+1,page>=totalPages));
}
function pricePerSquareMeter(l){
  const price=Number(l.price),area=Number(l.area);
  if(!Number.isFinite(price)||!Number.isFinite(area)||price<=0||area<=0)return null;
  return new Intl.NumberFormat('ro-RO',{maximumFractionDigits:2}).format(price/area)+' '+l.currency+' / m² · calculat';
}
function roomLabel(rooms){return Number(rooms)===1?'1 cameră':rooms+' camere';}
function availabilityLabel(l){
  if(!l.availabilityConfirmedAt)return 'Data reconfirmării nu este disponibilă';
  const days=Math.max(0,Math.floor((Date.now()-l.availabilityConfirmedAt)/86400000));
  return 'Disponibilitate reconfirmată '+(days===0?'astăzi':days===1?'acum o zi':'acum '+days+' zile');
}
function cards(listings){
  return el('div',{class:'cards'},...listings.map((l,index)=>{
    const linkAttrs={href:'/atelier?listing='+encodeURIComponent(l.id),onclick:e=>{if(modifiedClick(e))return;e.preventDefault();detail(l.id);}};
    const metric=pricePerSquareMeter(l);
    return el('article',{class:'card property-card'},el('div',{class:'card-image'},el('a',{...linkAttrs,class:'card-photo-link','aria-label':'Deschide '+l.title},l.photos?.[0]?el('img',{src:l.photos[0],alt:l.title,width:800,height:600,loading:index===0?'eager':'lazy',decoding:'async'}):el('div',{class:'photo-placeholder'},el('span',{'aria-hidden':'true'},'⌂'),el('span',{},'Fotografii indisponibile')))),
      el('div',{class:'card-body'},el('p',{class:'price'},money(l.price,l.currency),el('small',{},l.transaction==='rent'?' / lună · închiriere':' · vânzare')),
        el('p',{class:'card-facts'},l.district+' · '+(typeNames[l.type]||l.type)+' · '+l.area+' m²'+(l.rooms?' · '+roomLabel(l.rooms):'')),
        el('h3',{},el('a',{...linkAttrs,class:'card-title'},l.title)),metric?el('p',{class:'card-unit-price'},metric):null,
        el('p',{class:'availability-age'},availabilityLabel(l)),
        l.transaction==='rent'?el('p',{class:'rental-card-note'},monthlyTotalLabel(l)):null,
        l.transaction==='rent'?el('p',{class:'rental-card-note'},l.rentDeposit!=null?'Garanție: '+money(l.rentDeposit,l.currency):'Garanție nespecificată'):null,
        l.acceptsContacts===false?el('p',{class:'card-contact-paused'},'Solicitările noi sunt oprite temporar.'):null,
        el('div',{class:'card-footer'},el('span',{class:'card-direct'},'Direct de la proprietar'),favoriteButton(l.id))));
  }));
}

function toggleFavorite(id){requireUser(()=>attempt(async()=>{if(S.favoritePending.has(id))return;S.favoritePending.add(id);updateFavoriteButtons(id);try{const on=S.favorites.has(id);await api('/api/favorites/'+id,on?'DELETE':'PUT');on?S.favorites.delete(id):S.favorites.add(id);if(on)S.comparisonIds=S.comparisonIds.filter(value=>value!==id);toast(on?'Locuința a fost eliminată din favorite.':'Locuința a fost salvată.');if(S.page==='favorites')await favorites();}finally{S.favoritePending.delete(id);updateFavoriteButtons(id);}}));}
async function detail(id,options={}){if(S.page!=='detail'){S.detailReturnPage=['favorites','messages'].includes(S.page)?S.page:'browse';S.detailConversationId=S.conversationId;}const revision=beginScreen('detail',{...options,listingId:id});shell(el('main',{class:'page'},el('p',{class:'loading',role:'status'},'Încărcăm proprietatea…')));try{const{listing}=await api('/api/listings/'+id);if(revision!==S.screenRevision)return;renderDetail(listing);}catch(e){if(revision!==S.screenRevision)return;shell(el('main',{class:'page'},el('h1',{class:'page-title'},'Anunțul nu este disponibil.'),note(e.message,true),b('Înapoi la anunțuri',()=>go('browse'))));}}
function propertyFacts(l){
  const facts=[['Tip proprietate',typeNames[l.type]||l.type],[l.type==='land'?'Suprafață teren':'Suprafață utilă',l.area+' m²']];
  if(l.rooms)facts.push(['Compartimentare',roomLabel(l.rooms)]);
  facts.push(['Tranzacție',l.transaction==='rent'?'Închiriere':'Vânzare']);
  return el('dl',{class:'property-facts','aria-label':'Proprietatea pe scurt'},...facts.map(([name,value])=>el('div',{},el('dt',{},name),el('dd',{},value))));
}
function propertyContactControl(l,suffix=''){
  const user=S.boot?.user,canVerify=S.boot?.capabilities.phoneVerification;
  let label='Trimite o solicitare',help='Trimiți o solicitare. Conversația începe după acceptarea proprietarului.',disabled=false;
  let action=()=>requireUser(()=>contact(l));
  if(l.acceptsContacts===false){label='Solicitări oprite temporar';help='Proprietarul a oprit temporar solicitările noi. Poți păstra anunțul în favorite.';disabled=true;}
  else if(!user){label='Intră în cont pentru contact ↗';help='Autentificarea și telefonul confirmat sunt necesare pentru contactare.';}
  else if(!user.phoneVerified&&!canVerify){label='Contact indisponibil în pilot';help='Telefonul tău nu este confirmat, iar serviciul SMS nu este încă activ. Poți salva anunțul în favorite.';disabled=true;}
  else if(!user.phoneVerified){label='Confirmă telefonul pentru contact';help='Confirmarea telefonului este necesară înainte să trimiți o solicitare.';action=phoneSetup;}
  const button=b(label,action,'button property-contact-button');button.disabled=disabled;button.setAttribute('aria-describedby','property-contact-help'+suffix);
  return el('div',{class:'property-contact-control'},button,el('p',{id:'property-contact-help'+suffix,class:'contact-reassurance'},help));
}
function renderDetail(l,preview=false){
  if(preview)beginScreen('preview');else if(l.transaction!==S.transaction){changeTransaction(l.transaction);S.browsePage=1;}
  if(!preview)document.title=l.title+' · Între noi';
  const actions=el('div',{class:'property-top-actions'},b(preview?'← Înapoi la editare':S.detailReturnPage==='favorites'?'← Înapoi la favorite':S.detailReturnPage==='messages'?'← Înapoi la conversație':'← Înapoi la anunțuri',()=>preview?resumeDraft():S.detailReturnPage==='favorites'?go('favorites'):S.detailReturnPage==='messages'?go('messages',{conversationId:S.detailConversationId}):go('browse',{pageNumber:S.browsePage}),'text-button back'));
  if(!preview)actions.append(el('div',{class:'property-save-share'},favoriteButton(l.id),b('Copiază linkul',()=>copyListingLink(l.id),'button secondary share-listing')));
  const main=el('main',{class:'page listing-detail property-detail'+(preview?' preview-'+(S.previewMode||'desktop'):'')},actions,eye(preview?'Previzualizare · nepublicat':l.district+' · Cluj-Napoca'),el('div',{class:'detail-heading'},el('h1',{class:'detail-title',tabindex:'-1'},l.title),el('span',{class:'pill'},l.transaction==='rent'?'DE ÎNCHIRIAT':'DE VÂNZARE')));
  const visual=el('div',{class:'property-visual'},photoGallery(l),el('div',{class:'mobile-property-summary'},el('p',{class:'price'},money(l.price,l.currency),l.transaction==='rent'?el('small',{},' / lună'):null),el('p',{},l.district+' · '+(typeNames[l.type]||l.type)+' · '+l.area+' m²'+(l.rooms?' · '+roomLabel(l.rooms):'')),el('p',{class:'availability-age'},availabilityLabel(l))),propertyFacts(l));
  const body=el('div',{class:'detail-main property-story'},el('section',{class:'detail-section property-description'},eye('Un loc, în cuvintele proprietarului'),el('h2',{},'Despre proprietate'),el('p',{class:'detail-description'},l.description)),
    el('section',{class:'detail-section property-location'},el('div',{class:'location-monogram','aria-hidden':'true'},icon()),el('div',{},el('h2',{},l.district),el('p',{},'Cluj-Napoca'),el('p',{class:'subtle'},'Adresa exactă nu este publică. O poți discuta direct cu proprietarul.'))),
    el('section',{class:'detail-section property-next'},el('h2',{},'Înainte de prima conversație'),el('ul',{},el('li',{},'Clarifică disponibilitatea și condițiile declarate.'),el('li',{},'Întreabă despre costurile care nu apar în anunț.'),el('li',{},'Stabiliți împreună vizionarea; o propunere nu este o confirmare.'))));
  const metric=pricePerSquareMeter(l);
  const panel=el('aside',{class:'detail-panel','aria-label':'Preț și contact'},el('p',{class:'detail-price-label'},l.transaction==='rent'?'Chirie lunară':'Preț de vânzare'),el('p',{class:'price detail-price'},money(l.price,l.currency),l.transaction==='rent'?el('small',{},' / lună'):null),metric?el('p',{class:'detail-unit-price'},metric+' · calcul din prețul și suprafața declarate'):null,el('p',{class:'no-fee'},'Fără comision de agenție.'));
  if(l.transaction==='rent')panel.append(rentalCosts(l));
  const ownerName=l.ownerName||'Proprietar';
  panel.append(el('div',{class:'property-owner'},el('div',{class:'owner-avatar','aria-hidden':'true'},ownerName.trim().charAt(0).toLocaleUpperCase('ro-RO')||'P'),el('div',{},el('p',{class:'owner-caption'},'Discuți direct cu'),el('strong',{class:'owner-name'},ownerName))),el('div',{class:'owner-checks'},el('p',{},l.phoneVerified?'Telefon confirmat':'Telefon neconfirmat'),el('p',{},l.ownershipStatus==='reviewed'?'Relație cu proprietatea revizuită de moderator':'Proprietar declarat · relația cu proprietatea nu este verificată')),el('p',{class:'owner-check-limit'},'Confirmarea telefonului nu dovedește identitatea sau dreptul de proprietate.'));
  if(l.contactHours)panel.append(el('p',{class:'property-contact-hours'},'Interval preferat: '+l.contactHours));
  if(preview)panel.append(b('Continuă editarea',resumeDraft),note('Aceasta este o previzualizare. Anunțul nu a fost publicat.'));
  else panel.append(propertyContactControl(l),el('p',{class:'property-privacy-note'},'Numărul proprietarului rămâne ascuns. El decide separat dacă ți-l oferă.'),b('Raportează anunțul',()=>requireUser(()=>report({listingId:l.id})),'text-button report-listing'));
  main.append(el('div',{class:'detail-grid'},visual,panel,body));if(!preview)main.append(el('div',{class:'mobile-contact-bar'},propertyContactControl(l,'-mobile'),favoriteButton(l.id)));shell(main);window.scrollTo(0,0);main.querySelector?.('.detail-title')?.focus({preventScroll:true});
}

function field(label,node,hint){return el('label',{class:'field'},label,node,hint?el('small',{},hint):null);}
function editorActive(){return S.page==='create'||S.page==='preview';}
function editorBusy(){return S.editorSaving||S.editorProcessing;}
function clearEditor(){resetDraftBuffer().catch(()=>{});S.editorSession++;S.editorDirty=false;S.editorError='';S.draft={};S.photos=[];}
function confirmEditorReplacement(action){
  if(editorBusy()){toast('Așteaptă încheierea salvării sau a procesării fotografiilor.');return true;}
  if(!S.editorDirty)return false;
  openModal(el('div',{},eye('Modificări nesalvate'),el('h2',{class:'modal-title'},'Păstrezi anunțul început?'),el('p',{class:'muted'},'Ai modificări păstrate doar în această filă. Dacă începi alt anunț, modificările nesalvate se pierd.'),el('div',{class:'publishing-options'},b('Continuă editarea',()=>{dialog.close();resumeEditor();}),b('Renunță și continuă',()=>{clearEditor();dialog.close();action();},'button secondary'))));return true;
}
function create(existing){
  if(confirmEditorReplacement(()=>create(existing)))return;
  resetDraftBuffer().catch(()=>{});S.editorSession++;S.editorDirty=false;S.editorError='';S.editorSaving=false;S.editorProcessing=false;
  S.draft=existing?{...existing,ownerDeclaration:false}:{transaction:'sale',type:'apartment',currency:'EUR',relationship:'owner',district:''};
  S.photos=[...(existing?.photos||[])];S.step=0;beginScreen('create');renderCreate();
}
function resumeEditor(){if(editorBusy())return;beginScreen('create');renderCreate();window.scrollTo({top:0,behavior:'instant'});}
function draftResumeContent(){
  if(editorActive())return null;
  if(!S.editorDirty)return S.conflictingDraft?el('aside',{class:'draft-resume'},el('p',{},'Există o copie locală diferită de ciorna din cont.'),b('Recuperează copia locală',recoverConflictingDraft,'button secondary')):null;
  const busy=editorBusy(),resume=b(busy?'Se procesează…':'Continuă editarea',resumeEditor,'button small');resume.disabled=!!busy;
  const discard=b('Renunță',()=>openModal(el('div',{},el('h2',{class:'modal-title'},'Renunți la modificările nesalvate?'),el('p',{class:'muted'},'Se elimină doar modificările din această filă. O ciornă salvată anterior în cont rămâne acolo.'),el('div',{class:'publishing-options'},b('Păstrează modificările',()=>dialog.close()),b('Renunță la modificări',()=>{clearEditor();dialog.close();refreshDraftResume();},'button secondary')))),'text-button');discard.disabled=!!busy;
  return el('aside',{class:'draft-resume','aria-label':'Anunț nesalvat'},el('div',{},el('strong',{},'Anunțul început este încă aici.'),el('p',{},'Poți relua pasul la care ai rămas. '+draftSaveLabel())),el('div',{class:'item-actions'},resume,discard,S.conflictingDraft?b('Recuperează copia locală',recoverConflictingDraft,'button secondary'):null));
}
function refreshDraftResume(){const host=document.querySelector('#draft-resume');if(host){const content=draftResumeContent();host.replaceChildren(...(content?[content]:[]));}}
window.addEventListener('beforeunload',event=>{if(S.editorDirty||editorBusy()||Object.values(S.messageDrafts).some(draft=>draft.body?.trim())||S.conversationPending.size||S.formPending.size){event.preventDefault();event.returnValue='';}});
function draftReadiness(d,photos=S.photos){
  const number=(value,min,max)=>value!==''&&Number.isFinite(Number(value))&&Number(value)>=min&&Number(value)<=max;
  const roomsOk=number(d.rooms??0,['apartment','house'].includes(d.type)?1:0,30)&&Number.isInteger(Number(d.rooms??0));
  return [
    {label:'Datele proprietății',done:districts.includes(d.district)&&number(d.price,1,100000000)&&number(d.area,1,10000000)&&roomsOk,hint:'Cartier, preț, suprafață și camere.'},
    {label:'Titlu și descriere',done:String(d.title||'').trim().length>=8&&String(d.title||'').length<=120&&String(d.description||'').trim().length>=30&&String(d.description||'').length<=5000,hint:'Un titlu precis și detalii despre proprietate.'},
    {label:'Cel puțin o fotografie',done:photos.length>0,hint:'Necesară pentru publicare. Ciorna poate fi salvată fără fotografii.'},
    {label:'Declarația proprietarului',done:d.ownerDeclaration===true,hint:'Citește și acceptă declarația înainte de pregătirea publicării.'}
  ];
}
function draftSnapshot(d){return JSON.stringify(['transaction','type','district','relationship','price','currency','area','rooms','rentDeposit','rentCosts','monthlyCosts','exactAddress','title','description','ownerDeclaration','declarationVersion'].map(key=>d[key]));}
function editorAside(d,existingCover=null){
  const readiness=draftReadiness(d),count=readiness.filter(x=>x.done).length;
  return el('aside',{class:'editor-aside'},el('div',{class:'editor-summary'},el('span',{class:'status'},'Rezumat · nepublicat'),
    S.photos[0]?(existingCover?.getAttribute('src')===S.photos[0]?existingCover:el('img',{class:'editor-cover',src:S.photos[0],alt:'Fotografia principală a anunțului în pregătire'})):el('div',{class:'editor-cover-empty','aria-hidden':'true'},'⌂'),
    el('h3',{},d.title||'Proprietatea ta, pe scurt'),el('p',{class:'muted'},[d.district,'Cluj-Napoca'].filter(Boolean).join(' · ')),
    el('p',{class:'editor-price'},Number(d.price)>0?money(d.price,d.currency)+(d.transaction==='rent'?' / lună':''):'Completează prețul'),
    el('p',{class:'subtle'},[typeNames[d.type],Number(d.area)>0?d.area+' m²':null,Number(d.rooms)>0?d.rooms+(Number(d.rooms)===1?' cameră':' camere'):null].filter(Boolean).join(' · '))),
    el('div',{class:'editor-checklist'},el('h3',{},'Pregătirea anunțului'),el('p',{class:'subtle'},count+' din 4 repere completate'),el('ul',{},...readiness.map(item=>el('li',{class:item.done?'is-complete':''},el('span',{class:'check-mark','aria-hidden':'true'},item.done?'✓':'○'),el('div',{},el('strong',{},item.label),el('small',{},item.done?'Completat':item.hint))))),
      el('p',{class:'editor-boundary'},'Aceste repere ajută la completare. Publicarea cere separat telefon confirmat și revizuire umană.')));
}
function renderCreate(){
  const d=S.draft,session=S.editorSession,step=S.step;
  const stepNames=['Tip și tranzacție','Locație','Detalii','Costuri','Fotografii','Descriere','Disponibilitate și contact','Previzualizare și declarație'];
  const group=(number,...children)=>el('fieldset',{class:'wizard-group wide',disabled:step!==number,hidden:step!==number?'':null},...children);
  const form=el('form',{class:'form-shell editor-form'}),fieldset=el('fieldset',{class:'editor-fields',disabled:editorBusy()});
  const errorBox=el('div',{class:'editor-error',role:'alert',tabindex:'-1'}),saveState=el('p',{class:'editor-save-state',role:'status','aria-live':'polite'}),asideHost=el('div',{class:'editor-aside-host'});
  const numericLimits={price:[1,100000000],area:[1,10000000],rooms:[['apartment','house'].includes(d.type)?1:0,30],rentDeposit:[0,10000000],monthlyCosts:[0,10000000]};
  const input=(name,type='text',required=true)=>el('input',{name,type,value:d[name]??'',required,minlength:name==='title'?8:null,min:numericLimits[name]?.[0],max:numericLimits[name]?.[1],step:type==='number'?(name==='rooms'?1:'any'):null,inputmode:type==='number'?'decimal':null,maxlength:type==='text'?(name==='title'?120:name==='rentCosts'?300:250):null});
  const showError=message=>{S.editorError=message;errorBox.replaceChildren(...(message?[note(message,true)]:[]));if(message)errorBox.focus({preventScroll:false});};
  const refresh=()=>{asideHost.replaceChildren(editorAside(d,asideHost.querySelector('.editor-cover')));saveState.textContent=S.editorSaving?'Salvăm ciorna în cont…':S.editorProcessing?'Pregătim fotografiile…':draftSaveLabel();refreshDraftResume();};
  const readForm=()=>{
    if(d!==S.draft||session!==S.editorSession)return;
    const before=draftSnapshot(d);
    for(const[k,v]of new FormData(form))if(k!=='ownerDeclaration'&&typeof v==='string')d[k]=v;
    for(const key of ['price','area','rooms','rentDeposit','monthlyCosts'])if(d[key]!==''&&d[key]!=null)d[key]=Number(d[key]);
    if(d.rooms===''||d.rooms==null)d.rooms=0;
    if(d.rentDeposit==='')d.rentDeposit=null;if(d.monthlyCosts==='')d.monthlyCosts=null;
    if(d.transaction==='sale'){d.rentDeposit=null;d.rentCosts='';d.monthlyCosts=null;}
    if(step===7)d.ownerDeclaration=!!form.elements.ownerDeclaration.checked;
    if(step===6)d.acceptsContacts=!!form.elements.acceptsContacts.checked;
    d.photos=S.photos;d.declarationVersion=S.boot.declarations.version;
    if(draftSnapshot(d)!==before)S.editorDirty=true;
    refresh();scheduleDraftSave();
  };
  const grid=el('div',{class:'form-grid'});
  const description=step===0?'Începem cu informațiile pe care le caută orice cumpărător sau chiriaș.':'Ajută oamenii să înțeleagă proprietatea înainte de prima conversație.';
  fieldset.append(el('div',{class:'editor-step-heading'},el('span',{class:'step-label'},'PASUL '+(step+1)+' DIN 8'),el('h2',{},stepNames[step]),el('p',{class:'muted'},description)));
  let titleInput,descriptionInput,titleCount,descriptionCount;
  {
    const transaction=select('transaction',[['sale','Vând'],['rent','Închiriez']],d.transaction),type=select('type',Object.entries(typeNames),d.type),district=select('district',[['','Alege cartierul'],...districts.map(v=>[v,v])],d.district||'');district.required=true;
    for(const selector of [transaction,type])selector.addEventListener('change',()=>{readForm();renderCreate();});
    grid.append(group(0,field('Ce vrei să faci?',transaction),field('Tipul proprietății',type),field('Relația cu proprietatea',select('relationship',[['owner','Sunt proprietar'],['coowner','Sunt coproprietar']],d.relationship))),
      group(1,field('Cartier · Cluj-Napoca',district),field('Adresa exactă · opțional',input('exactAddress','text',false),'Este păstrată în cont, fără afișare în anunț. Public apare doar cartierul.')),
      group(2,field(d.type==='land'?'Suprafață teren · m²':'Suprafață utilă · m²',input('area','number')),field('Număr de camere',input('rooms','number',['apartment','house'].includes(d.type)))),
      group(3,field(d.transaction==='rent'?'Chirie lunară':'Prețul de vânzare',input('price','number')),field('Monedă',select('currency',[['EUR','EUR'],['RON','RON']],d.currency)),
        d.transaction==='rent'?[field('Costuri lunare suplimentare · opțional',input('monthlyCosts','number',false),'În moneda chiriei. Gol înseamnă necunoscut; 0 înseamnă fără costuri suplimentare.'),field('Garanție · opțional',input('rentDeposit','number',false)),field('Explicații costuri · opțional',input('rentCosts','text',false))]:null));
  }
  {
    titleInput=input('title');titleInput.placeholder='De exemplu: Apartament cu 2 camere și balcon în Zorilor';titleInput.setAttribute('aria-describedby','title-counter');
    descriptionInput=el('textarea',{name:'description',required:true,minlength:30,maxlength:5000,'aria-describedby':'description-counter',placeholder:'Descrie compartimentarea, starea proprietății, dotările și condițiile reale.'},d.description||'');
    titleCount=el('small',{id:'title-counter',class:'character-count'});descriptionCount=el('small',{id:'description-counter',class:'character-count'});
    grid.append(group(5,field('Titlu',titleInput),titleCount,field('Descriere',descriptionInput,'Nu include telefonul, e-mailul, linkuri sau adresa exactă.'),descriptionCount,
      el('details',{class:'writing-guide'},el('summary',{},'Ce merită inclus în descriere?'),el('ul',{},...['Compartimentarea și suprafața utilă.','Starea locuinței și dotările incluse.','Ce include prețul și ce se plătește separat.','Disponibilitatea și condițiile de vânzare sau închiriere.'].map(t=>el('li',{},t))),el('p',{},'Scrie doar informații pe care le poți confirma. Nu sunt adăugate automat detalii în anunț.'))));
    const file=el('input',{type:'file',accept:'image/jpeg,image/png,image/webp',multiple:true,'aria-label':'Adaugă fotografii'}),photoBox=el('div',{class:'editor-photos'}),photoStatus=el('p',{class:'photo-upload-status',role:'status','aria-live':'polite'});
    const paintPhotos=()=>{
      photoStatus.textContent=S.photos.length+' din 5 fotografii · prima este fotografia principală.';
      photoBox.replaceChildren(...S.photos.map((src,index)=>{
        const change=action=>{if(editorBusy())return;readForm();action();d.photos=S.photos;S.editorDirty=true;paintPhotos();refresh();scheduleDraftSave();file.focus();};
        const move=(label,target)=>{const button=b(label,()=>change(()=>{const [photo]=S.photos.splice(index,1);S.photos.splice(target,0,photo);}), 'photo-action');button.disabled=target<0||target>=S.photos.length;button.setAttribute('aria-label',label+' fotografia '+(index+1));return button;};
        const cover=index?b('Fă principală',()=>change(()=>{const [photo]=S.photos.splice(index,1);S.photos.unshift(photo);}), 'photo-action'):el('span',{class:'photo-cover-label'},'Principală');
        const remove=b('Elimină',()=>change(()=>S.photos.splice(index,1)),'photo-action photo-remove');remove.setAttribute('aria-label','Elimină fotografia '+(index+1));
        return el('div',{class:'editor-photo'},el('div',{class:'editor-photo-image'},el('img',{src,alt:'Fotografia '+(index+1)+(index===0?' · principală':'')}),el('span',{class:'photo-position'},String(index+1))),el('div',{class:'photo-card-actions'},cover,el('div',{class:'photo-order'},move('Mută înainte',index-1),move('Mută după',index+1)),remove));
      }));
    };
    file.addEventListener('change',async()=>{
      if(editorBusy())return;const files=Array.from(file.files||[]);if(!files.length)return;
      readForm();showError('');
      if(S.photos.length+files.length>5){showError('Poți adăuga maximum 5 fotografii. Elimină o imagine înainte de a adăuga alta.');file.value='';return;}
      S.editorProcessing=true;S.editorDirty=true;fieldset.disabled=true;refresh();
      try{
        const staged=[];for(const[selected,index]of files.map((f,i)=>[f,i])){photoStatus.textContent='Pregătim fotografia '+(index+1)+' din '+files.length+'…';staged.push(await compressPhoto(selected));}
        if(session!==S.editorSession||d!==S.draft)return;
        S.photos.push(...staged);d.photos=S.photos;paintPhotos();toast(files.length===1?'Fotografia a fost adăugată.':'Fotografiile au fost adăugate.');
      }catch(error){if(session===S.editorSession)showError(error.message+' Nicio fotografie din această selecție nu a fost adăugată.');}
      finally{if(session===S.editorSession){S.editorProcessing=false;fieldset.disabled=false;file.value='';paintPhotos();refresh();scheduleDraftSave();}}
    });
    paintPhotos();grid.append(group(4,el('section',{class:'wide photo-section','aria-label':'Fotografiile anunțului'},el('h3',{},'Arată proprietatea, așa cum este.'),el('p',{class:'muted'},'Folosește lumină naturală și fotografii orizontale. Arată fiecare încăpere, inclusiv bucătăria. Recomandăm 5 fotografii; pentru publicare este suficientă una. Fără colaje sau date personale.'),field('Adaugă fotografii · maximum 5',file,'JPEG, PNG sau WebP, până la 15 MB fiecare. Imaginile sunt micșorate înainte de salvare.'),photoStatus,photoBox)));
    const declaration=el('input',{type:'checkbox',name:'ownerDeclaration',required:true,checked:d.ownerDeclaration});
    grid.append(group(6,field('Interval preferat pentru contact · opțional',el('input',{name:'contactHours',maxlength:100,value:d.contactHours||''}),'Nu include telefonul sau adresa exactă.'),el('label',{class:'check'},el('input',{type:'checkbox',name:'acceptsContacts',checked:d.acceptsContacts!==false}),el('span',{},'Primesc solicitări pentru această locuință')),note('Disponibilitatea trebuie reconfirmată la 30 de zile. Telefonul rămâne ascuns până îl oferi separat într-o conversație acceptată.')),group(7,el('section',{class:'wide owner-declaration'},el('h3',{},'Publici în nume propriu.'),el('label',{class:'check'},declaration,el('span',{},S.boot.declarations.owner)),el('p',{class:'subtle'},'Text de pilot · DE REVIZUIT JURIDIC. Acceptarea se înregistrează cu data și versiunea textului.'))));
  }
  const updateCounters=()=>{if(titleCount)titleCount.textContent=(titleInput.value||'').length+' / 120 caractere · minimum 8';if(descriptionCount)descriptionCount.textContent=(descriptionInput.value||'').length+' / 5.000 caractere · minimum 30';};
  form.addEventListener('input',()=>{if(!editorBusy()){readForm();updateCounters();}});form.addEventListener('change',()=>{if(!editorBusy()){readForm();updateCounters();}});
  const preview=mode=>{if(editorBusy()||!form.reportValidity())return;readForm();S.previewMode=mode;renderDetail({...d,ownerName:S.boot.user.name,phoneVerified:S.boot.user.phoneVerified},true);};
  const actions=el('div',{class:'form-actions'},step?b('← Pasul anterior',()=>{readForm();S.step--;renderCreate();scheduleDraftSave();},'button secondary'):b('Înapoi în cont',()=>{readForm();go('account');},'button secondary'),step===7?b('Previzualizează',()=>preview('desktop'),'button secondary'):null,step===7?b('Previzualizare mobil',()=>preview('mobile'),'button secondary'):null,el('button',{type:'submit',class:'button'},step===7?'Salvează ciorna':'Continuă →'));
  fieldset.append(grid,actions);form.append(errorBox,fieldset,saveState,el('p',{class:'editor-save-help'},'Salvarea păstrează ciorna în cont. Nu publică anunțul și nu trimite solicitări sau SMS.'));
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(editorBusy()||!form.reportValidity())return;readForm();showError('');
    if(step<7){S.step++;S.editorDirty=true;renderCreate();scheduleDraftSave();window.scrollTo({top:0,behavior:'instant'});return;}
    S.editorSaving=true;fieldset.disabled=true;refresh();const revision=S.screenRevision;
    try{
      await flushDraftSave();
      const result=await api('/api/listings'+(d.id?'/'+d.id:''),d.id?'PATCH':'POST',d);
      if(!result.listing?.id)throw Error('Nu am putut confirma salvarea. Verifică anunțurile din cont înainte de o nouă încercare.');
      if(session!==S.editorSession)return;
      S.editorDirty=false;S.editorError='';S.draft={...result.listing};S.photos=[...(result.listing.photos||[])];
      await resetDraftBuffer().catch(()=>{});
      toast('Ciorna a fost salvată în cont. Anunțul nu este publicat.');
      if(revision===S.screenRevision)await go('account');
    }catch(error){if(session===S.editorSession)showError(error.message+' Modificările rămân în această filă.');}
    finally{if(session===S.editorSession){S.editorSaving=false;fieldset.disabled=false;refreshDraftResume();if(revision===S.screenRevision)refresh();}}
  });
  const steps=el('ol',{class:'editor-steps','aria-label':'Pașii pregătirii anunțului'},...stepNames.map((label,index)=>el('li',{class:index===step?'current':index<step?'complete':'','aria-current':index===step?'step':null},el('span',{'aria-hidden':'true'},index<step?'✓':String(index+1)),label)));
  shell(el('main',{class:'page editor-page'},eye('Publicare gratuită în beta · Cluj-Napoca'),el('h1',{class:'page-title'},'Hai să îi găsim omul potrivit.'),el('p',{class:'page-intro muted'},'Completează în ritmul tău. Ciorna se salvează automat în cont; publicarea cere separat confirmarea telefonului și moderare.'),phoneAvailabilityNotice(),steps,el('div',{class:'editor-layout'},form,asideHost)));
  if(S.editorError)errorBox.replaceChildren(note(S.editorError,true));updateCounters();refresh();
  const clock=()=>{if(session!==S.editorSession||S.page!=='create'||S.step!==step)return;paintDraftSaveState();S.editorClock=setTimeout(clock,1000);};clearTimeout(S.editorClock);S.editorClock=setTimeout(clock,1000);
}
async function compressPhoto(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Folosește imagini JPEG, PNG sau WebP.');if(file.size>15*1024*1024)throw Error('Imaginea depășește 15 MB.');const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas'),ratio=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();let quality=.86,data;do{data=canvas.toDataURL('image/jpeg',quality);quality-=.1;}while(data.length>390000&&quality>.15);if(data.length>390000)throw Error('Imaginea nu poate fi redusă suficient. Alege una mai mică.');return data;}
function ownerAccountActive(){return (S.boot?.user?.status||'active')==='active';}
function ownerListingState(listing,now=Date.now()){
  if(listing.status==='published'){
    if(!Number.isFinite(listing.availableUntil)||listing.availableUntil<=now)return {group:'attention',tone:'attention',label:Number.isFinite(listing.availableUntil)?'Disponibilitate expirată':'Disponibilitate de reconfirmat',hint:'Nu este în perioada de disponibilitate. Reconfirmă numai dacă proprietatea mai este disponibilă.'};
    return {group:'published',tone:'live',label:'Publicat · în termen',hint:listing.acceptsContacts===false?'Anunțul este în termen, dar solicitările noi sunt oprite.':'Disponibilitatea este în termen. Contactele cer în continuare îndeplinirea condițiilor contului.'};
  }
  return ({draft:{group:'draft',tone:'draft',label:'Ciornă privată',hint:'Continuă completarea. Salvarea ciornei nu publică anunțul.'},rejected:{group:'draft',tone:'attention',label:'Necesită modificări',hint:'Citește motivul moderatorului, actualizează anunțul și trimite-l din nou la revizuire.'},withdrawn:{group:'draft',tone:'draft',label:'Retras',hint:'Anunțul nu este public. Îl poți edita și retrimite la moderare.'},pending:{group:'review',tone:'review',label:'În moderare',hint:'Anunțul așteaptă revizuirea unui moderator. Nu este publicat automat.'},sold:{group:'closed',tone:'closed',label:'Vândut',hint:'Anunț închis. Nu mai apare în căutări.'},rented:{group:'closed',tone:'closed',label:'Închiriat',hint:'Anunț închis. Nu mai apare în căutări.'}})[listing.status]||{group:'closed',tone:'closed',label:statuses[listing.status]||'Stare necunoscută',hint:'Nu sunt disponibile acțiuni pentru această stare.'};
}
function ownerDate(timestamp){return Number.isFinite(timestamp)&&timestamp>0?new Date(timestamp).toLocaleDateString('ro-RO',{day:'numeric',month:'long',year:'numeric'}):null;}
function ownerSetBusy(id,busy){for(const controls of document.querySelectorAll('fieldset'))if(controls.getAttribute('data-owner-actions')===id)controls.disabled=busy||!ownerAccountActive();}
async function ownerMutation(listing,action,data,message,{modal=false}={}){
  if(!ownerAccountActive()){toast('Contul are restricții. Poți consulta istoricul și trimite o contestație.');return false;}
  if(S.ownerPending.has(listing.id))return false;
  S.ownerPending.add(listing.id);ownerSetBusy(listing.id,true);
  const revision=S.screenRevision,modalSnapshot=modal?modalContent.firstChild:null;let succeeded=false;
  try{
    await api('/api/listings/'+listing.id+'/'+action,'POST',data);
    if(modal&&dialog.open&&modalContent.firstChild===modalSnapshot)dialog.close();
    toast(message);succeeded=true;
  }catch(error){toast(error.message);}
  finally{S.ownerPending.delete(listing.id);ownerSetBusy(listing.id,false);}
  if(succeeded&&revision===S.screenRevision&&S.page==='account')await account({historyMode:'none'});
  return succeeded;
}
async function openOwnerEditor(listing,button){
  if(button.disabled||!ownerAccountActive()||S.ownerPending.has(listing.id))return;button.disabled=true;
  const revision=S.screenRevision;
  try{const full=await api('/api/mine/'+listing.id);if(revision!==S.screenRevision)return;if(!full.listing||full.listing.photosIncomplete)throw Error('Anunțul complet nu a putut fi încărcat. Reîncearcă.');create(full.listing);}
  catch(error){toast(error.message);}
  finally{button.disabled=false;}
}
function ownerListingCard(listing){
  const state=ownerListingState(listing),updated=ownerDate(listing.updatedAt),until=ownerDate(listing.availableUntil);
  const controls=el('fieldset',{class:'owner-actions','data-owner-actions':listing.id,disabled:!ownerAccountActive()||S.ownerPending.has(listing.id)});
  if(['draft','rejected','withdrawn'].includes(listing.status)){
    const edit=b('Continuă editarea',()=>openOwnerEditor(listing,edit),'button small');controls.append(edit,listingSubmitControl(listing));
  }
  if(listing.status==='published'){
    if(state.group==='published')controls.append(b('Vezi anunțul',()=>detail(listing.id),'button small secondary'));
    const reconfirm=S.boot.user.phoneVerified?b('Reconfirmă disponibilitatea',()=>ownerMutation(listing,'reconfirm',{},'Disponibilitatea a fost reconfirmată.'),'button small secondary'):b(S.boot.capabilities.phoneVerification?'Confirmă telefonul pentru reconfirmare':'Reconfirmare indisponibilă',phoneSetup,'button small secondary');
    reconfirm.disabled=!S.boot.user.phoneVerified&&!S.boot.capabilities.phoneVerification;controls.append(reconfirm);
    controls.append(b(listing.acceptsContacts===false?'Reia solicitările':'Preferințe de contact',()=>contactPreferences(listing),'button small secondary'));
  }
  if(['published','pending'].includes(listing.status))controls.append(b('Închide anunțul',()=>closeListing(listing),'text-button'));
  const content=el('div',{class:'owner-listing-content'},el('div',{class:'owner-listing-top'},el('span',{class:'owner-status '+state.tone},state.label),updated?el('span',{class:'owner-updated'},'Actualizat '+updated):null),el('h3',{},listing.title||'Anunț fără titlu'),el('p',{class:'owner-location'},[listing.district,'Cluj-Napoca',listing.transaction==='rent'?'Închiriere':'Vânzare'].filter(Boolean).join(' · ')),el('p',{class:'owner-price'},money(listing.price,listing.currency),listing.transaction==='rent'?el('small',{},' / lună'):null),el('p',{class:'owner-next-step'},state.hint));
  if(listing.moderationReason)content.append(el('div',{class:'owner-moderation-note'},el('strong',{},'Motivul moderatorului'),el('p',{},listing.moderationReason)));
  if(listing.status==='published'&&until){content.append(el('p',{class:'owner-availability'},'Termen declarat: '+until));const availabilityNote=listingAvailabilityNote(listing);if(availabilityNote)content.append(availabilityNote);}
  if(controls.children.length)content.append(controls);
  return el('article',{class:'owner-listing','data-owner-listing':listing.id},listing.photos?.[0]?el('img',{class:'owner-listing-cover',src:listing.photos[0],alt:'Fotografia principală · '+(listing.title||'Anunț'),loading:'lazy',decoding:'async'}):el('div',{class:'owner-listing-cover owner-cover-empty','aria-label':'Fără fotografie principală'},icon()),content);
}
function ownerInventory(listings,limit=50){
  const groups=[['all','Toate'],['draft','De pregătit'],['review','În moderare'],['published','În termen'],['attention','De reconfirmat'],['closed','Închise']];
  if(!groups.some(([key])=>key===S.ownerFilter))S.ownerFilter='all';
  const counts=Object.fromEntries(groups.map(([key])=>[key,key==='all'?listings.length:listings.filter(l=>ownerListingState(l).group===key).length]));
  const section=el('section',{class:'owner-inventory','aria-labelledby':'owner-inventory-title'},el('div',{class:'owner-section-heading'},el('div',{},eye('Portofoliul tău'),el('h2',{id:'owner-inventory-title'},'Fiecare anunț, la locul lui.')),el('p',{},'Starea și următorul pas, dintr-o privire.')));
  const filters=el('div',{class:'owner-filters','aria-label':'Filtrează anunțurile după stare'}),result=el('div',{class:'owner-results'}),counter=el('p',{class:'owner-result-count',role:'status','aria-live':'polite'});
  const query=el('input',{type:'search',name:'ownerSearch',value:S.ownerQuery||'',placeholder:'Caută după titlu sau cartier',maxlength:100,'aria-label':'Caută în anunțurile tale'});
  const normal=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('ro-RO');
  const paint=()=>{
    for(const button of filters.children)button.setAttribute('aria-pressed',String(button.getAttribute('data-owner-filter')===S.ownerFilter));
    const search=normal(S.ownerQuery).trim(),shown=listings.filter(l=>(S.ownerFilter==='all'||ownerListingState(l).group===S.ownerFilter)&&normal((l.title||'')+' '+(l.district||'')).includes(search));
    counter.textContent=shown.length+' '+(shown.length===1?'anunț afișat':'anunțuri afișate')+' din '+listings.length+' încărcate';
    const emptyState=!listings.length?el('div',{class:'owner-empty'},el('span',{class:'owner-empty-mark','aria-hidden':'true'},'⌂'),el('h3',{},'Prima poveste începe cu o ciornă.'),el('p',{},'Adaugă proprietatea, alege fotografiile și salvează când ești pregătit. Anunțul rămâne privat până la îndeplinirea condițiilor de publicare.'),ownerAccountActive()?b('Pregătește primul anunț ↗',publishingChoice):null):el('div',{class:'owner-empty'},el('h3',{},'Niciun anunț în această selecție.'),el('p',{},'Schimbă starea sau caută un alt titlu ori cartier.'),b('Arată toate anunțurile',()=>{S.ownerFilter='all';S.ownerQuery='';query.value='';paint();},'button secondary'));
    result.replaceChildren(...(shown.length?shown.map(ownerListingCard):[emptyState]));
  };
  for(const[key,label]of groups){const button=b(label+' · '+counts[key],()=>{S.ownerFilter=key;paint();},'owner-filter');button.setAttribute('data-owner-filter',key);filters.append(button);}
  query.addEventListener('input',()=>{S.ownerQuery=query.value;paint();});
  const summary=el('div',{class:'owner-summary'},...[[counts.draft,'De pregătit','Ciorne, modificări și anunțuri retrase.'],[counts.review,'În moderare','Trimiteri care așteaptă revizuirea.'],[counts.published,'În termen','Anunțuri aprobate cu termen valabil.']].map(([count,label,description])=>el('div',{},el('span',{class:'owner-summary-number'},String(count)),el('div',{},el('strong',{},label),el('p',{},description)))));
  section.append(summary);
  if(counts.attention)section.append(el('div',{class:'owner-attention'},el('div',{},el('strong',{},counts.attention+(counts.attention===1?' anunț are':' anunțuri au')+' disponibilitatea de reconfirmat.'),el('p',{},'Actualizează doar proprietățile care mai sunt disponibile.')),b('Vezi anunțurile',()=>{S.ownerFilter='attention';S.ownerQuery='';query.value='';paint();result.scrollIntoView({block:'start',behavior:'auto'});},'button small secondary')));
  section.append(el('div',{class:'owner-inventory-tools'},filters,query),counter,result);
  if(listings.length>=limit)section.append(el('p',{class:'owner-limit-note'},'Sunt afișate cel mult ultimele '+limit+' de anunțuri. Numărătoarea și filtrele se referă la lista încărcată.'));
  paint();return section;
}
async function account(options={}){
  if(!S.boot.user)return signin();const revision=beginScreen('account',options),u=S.boot.user;
  const quick=el('nav',{class:'owner-quick-nav','aria-label':'Spațiul personal'},b('Favoritele mele',()=>go('favorites'),'button secondary'),messageNavButton('Conversații',()=>go('messages'),'button secondary'),['moderator','admin'].includes(u.role)?b('Moderare',()=>go('moderation'),'button secondary'):null,el('a',{class:'text-button account-signout',onclick:forgetLocalDraftOnSignout,href:'/signout-with-chatgpt?return_to=%2Fatelier',target:'_top'},'Ieși din cont'));
  const phoneCard=el('aside',{class:'owner-phone-card'},el('span',{class:'owner-phone-state '+(u.phoneVerified?'is-verified':'')},u.phoneVerified?'Telefon confirmat':'Telefon neconfirmat'),el('h2',{},u.phoneVerified?'Un pas făcut.':'Pregătim următorul pas.'),el('p',{},u.phoneVerified?'Confirmarea telefonului este separată de verificarea identității și a proprietății.':S.boot.capabilities.phoneVerification?'Confirmă telefonul înainte de trimiterea anunțului la moderare și de contactare.':'Poți salva ciorne acum. Publicarea și contactarea așteaptă confirmarea telefonului, după activarea SMS.'),b('Gestionează telefonul →',phoneSetup,'text-button'));
  const main=el('main',{class:'page owner-hub'},el('div',{class:'owner-hub-header'},el('div',{},eye('Spațiul tău · acces privat'),el('p',{class:'owner-greeting'},'Bun venit, '+u.name+'.'),el('h1',{},'Proprietatea ta.',el('br'),el('em',{},'În ritmul tău.')),el('p',{class:'owner-hub-intro'},'Pregătește anunțurile, urmărește revizuirea și păstrează controlul asupra contactelor.'),ownerAccountActive()?b('Pregătește un anunț +',publishingChoice,'button owner-new-listing'):null),phoneCard),quick);
  if(!ownerAccountActive())main.append(el('div',{class:'notice error',role:'alert'},'Contul are restricții. Acțiunile asupra anunțurilor sunt indisponibile. Poți consulta istoricul și cere revizuirea deciziei.'));
  const inventory=el('div',{class:'owner-inventory-host','aria-busy':'true'},el('p',{class:'loading',role:'status'},'Încărcăm anunțurile tale…'));
  const cases=el('div',{class:'case-history','aria-busy':'true'},el('p',{class:'subtle',role:'status'},'Încărcăm istoricul solicitărilor…'));
  const support=el('details',{class:'owner-case-details',open:ownerAccountActive()?null:''},el('summary',{},'Sesizări, contestații și decizii'),el('p',{class:'owner-case-intro'},'Istoricul este vizibil în contul tău. Poți cere revizuirea unei restricții.'),cases,b('Contestă o restricție',()=>appeal(),'button secondary small'));
  const saved=el('section',{class:'saved-searches'},el('h2',{},'Căutările tale'),el('p',{role:'status'},'Încărcăm căutările…'));main.append(saved,inventory,accountReadiness(u),support);shell(main);loadSavedSearches(saved,revision);
  await Promise.all([
    (async()=>{try{const data=await api('/api/mine');if(revision===S.screenRevision)inventory.replaceChildren(ownerInventory(data.listings,data.limit||50));}catch(error){if(revision===S.screenRevision)inventory.replaceChildren(el('div',{class:'owner-load-error',role:'alert'},el('h2',{},'Anunțurile nu au putut fi încărcate.'),el('p',{},error.message),b('Reîncarcă anunțurile',()=>go('account'),'button secondary')));}finally{if(revision===S.screenRevision)inventory.setAttribute('aria-busy','false');}})(),
    (async()=>{try{const data=await api('/api/my-cases');if(revision===S.screenRevision)cases.replaceChildren(caseHistory(data));}catch(error){if(revision===S.screenRevision)cases.replaceChildren(note('Istoricul solicitărilor nu a putut fi încărcat. '+error.message,true));}finally{if(revision===S.screenRevision)cases.setAttribute('aria-busy','false');}})()
  ]);
}

function closeListing(listing){
  const controls=el('fieldset',{class:'owner-actions','data-owner-actions':listing.id,disabled:S.ownerPending.has(listing.id)||!ownerAccountActive()});
  for(const[status,label]of[[listing.transaction==='rent'?'rented':'sold',listing.transaction==='rent'?'S-a închiriat':'S-a vândut'],['withdrawn','Retrag anunțul']])controls.append(b(label,()=>ownerMutation(listing,'close',{status},'Anunțul a fost închis.',{modal:true}),'button secondary'));
  openModal(el('div',{},el('h2',{class:'modal-title'},'Închide anunțul'),el('p',{class:'muted'},'Anunțul va dispărea din căutări. Dacă îl retragi, îl poți edita și retrimite ulterior la moderare.'),controls));
}

function operationFields(key,...children){return el('fieldset',{class:'operation-fields','data-form-operation':key,disabled:S.formPending.has(key)},...children);}
function operationBusy(key,busy){for(const fields of document.querySelectorAll('[data-form-operation]'))if(fields.getAttribute('data-form-operation')===key)fields.disabled=busy;}
async function modalSubmission(form,key,request,{errorHost,onSaved,onVisible,success='Modificarea a fost salvată.'}={}){
  if(S.formPending.has(key)||!form.reportValidity())return;
  const modalRevision=S.modalRevision,screenRevision=S.screenRevision;S.formPending.add(key);operationBusy(key,true);form.setAttribute('aria-busy','true');errorHost?.replaceChildren();
  let saved=false;
  try{const result=await request();saved=true;await onSaved?.(result);if(success)toast(success);if(dialog.open&&S.modalRevision===modalRevision&&S.screenRevision===screenRevision)await onVisible?.(result);}
  catch(error){const message=saved?'Acțiunea a fost salvată, dar ecranul nu s-a actualizat. Reîmprospătează înainte să continui.':error.message;if(errorHost)errorHost.replaceChildren(note(message,true));toast(message);}
  finally{S.formPending.delete(key);operationBusy(key,false);form.setAttribute('aria-busy','false');}
}
function phoneSetup(options={}){
  if(!S.boot?.user){signin();return;}
  if(S.phoneChallenge&&S.phoneChallenge.expiresAt>Date.now()&&!options.change){phoneCode();return;}
  const capable=S.boot.capabilities.phoneVerification&&ownerAccountActive(),key='phone-verification';
  const input=el('input',{type:'tel',name:'phone',placeholder:'+40 7xx xxx xxx',required:true,autocomplete:'tel',inputmode:'tel',maxlength:24,value:S.phoneChallenge?.phone||''});
  const errorHost=el('div',{class:'form-feedback',role:'alert'});
  const fields=operationFields(key,field('Număr mobil românesc',input,'Poți scrie 07… sau +407… . Spațiile se elimină automat.'),el('button',{type:'submit',class:'button',disabled:!capable},'Trimite codul SMS'));
  const form=el('form',{},eye('Confidențial, până alegi altfel'),el('h2',{class:'modal-title'},'Telefonul tău.'),
    S.boot.user.phoneVerified?note('Număr confirmat, terminat în '+(S.boot.user.phoneLast4||'••••')+'. Schimbarea reușită retrage accesul la numărul oferit în conversații.'):null,
    note(!ownerAccountActive()?'Contul are restricții. Confirmarea telefonului nu este disponibilă.':capable?'Confirmăm că ai acces la număr. Telefonul nu apare în profilul public; confirmarea nu dovedește identitatea sau proprietatea.':'Confirmarea prin SMS nu este activată. Poți salva ciorne, dar publicarea și contactarea așteaptă activarea serviciului.'),fields,errorHost);
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!capable||S.formPending.has(key))return;
    let phone=input.value.replace(/[\s().-]/g,'');if(/^0[67]\d{8}$/.test(phone))phone='+40'+phone.slice(1);
    input.setCustomValidity(/^\+40[67]\d{8}$/.test(phone)?'':'Introdu un număr mobil românesc valid, în format +407… .');if(!form.reportValidity()||!input.reportValidity())return;
    if((S.phoneRetryAt||0)>Date.now()){errorHost.replaceChildren(note('Așteaptă '+Math.ceil((S.phoneRetryAt-Date.now())/1000)+' secunde înainte de o nouă trimitere.',true));return;}
    S.phoneRetryAt=Date.now()+60000;
    return modalSubmission(form,key,()=>api('/api/phone/start','POST',{phone}),{errorHost,success:'Codul a fost solicitat.',onSaved:result=>{S.phoneChallenge={phone,expiresAt:Number.isFinite(result.expiresAt)?result.expiresAt:Date.now(),locked:false};S.phoneRetryAt=Date.now()+Math.max(60,result.retryAfterSeconds||60)*1000;},onVisible:()=>phoneCode()});
  });input.addEventListener('input',()=>input.setCustomValidity(''));openModal(form);
}
function phoneCode(){
  if(!S.phoneChallenge){phoneSetup({change:true});return;}
  const challenge=S.phoneChallenge,key='phone-verification',errorHost=el('div',{class:'form-feedback',role:'alert'});
  const input=el('input',{name:'code',inputmode:'numeric',autocomplete:'one-time-code',pattern:'[0-9]{6}',maxlength:6,minlength:6,required:true,class:'verification-code','aria-describedby':'code-help'});
  const expired=challenge.expiresAt<=Date.now(),blocked=expired||challenge.locked||!S.boot.capabilities.phoneVerification||!ownerAccountActive();
  const fields=operationFields(key,field('Codul din SMS',input),el('button',{type:'submit',class:'button',disabled:blocked},'Confirmă telefonul'));
  const form=el('form',{},eye('Un pas înainte'),el('h2',{class:'modal-title'},'Introdu codul primit.'),el('p',{},'Număr terminat în '+challenge.phone.slice(-4)+'.'),
    el('p',{id:'code-help',class:'muted'},'Codul are 6 cifre. Este valabil până la '+new Date(challenge.expiresAt).toLocaleTimeString('ro-RO',{hour:'2-digit',minute:'2-digit'})+' (ora dispozitivului). Nu îl comunica altor persoane.'),
    blocked?note(expired?'Codul a expirat. Poți solicita un cod nou.':challenge.locked?'Limita de încercări a fost atinsă. Așteaptă expirarea codului înainte să ceri altul.':'Verificarea nu este disponibilă acum.',true):null,
    fields,errorHost,el('div',{class:'phone-next-step'},b('Nu ai primit codul sau vrei alt număr?',()=>phoneSetup({change:true}),'text-button'),el('p',{class:'subtle'},'Retrimiterea se cere explicit, după cel puțin 60 de secunde. Poate trimite același cod și nu prelungește valabilitatea lui.')));
  form.addEventListener('submit',event=>{
    event.preventDefault();if(blocked||S.formPending.has(key))return;if(challenge.completed){errorHost.replaceChildren(note('Telefonul a fost confirmat. Reîmprospătează pagina pentru a actualiza contul.'));return;}if(challenge.locked){errorHost.replaceChildren(note('Limita de încercări a fost atinsă. Așteaptă expirarea codului.',true));return;}
    if(challenge.expiresAt<=Date.now()){errorHost.replaceChildren(note('Codul a expirat. Solicită unul nou.',true));return;}
    const code=input.value.trim();input.setCustomValidity(/^\d{6}$/.test(code)?'':'Introdu exact cele 6 cifre din SMS.');if(!input.reportValidity())return;
    return modalSubmission(form,key,async()=>{try{return await api('/api/phone/check','POST',{code});}catch(error){if(error.code==='SMS_EXPIRED')challenge.expiresAt=0;if(error.code==='SMS_RATE_LIMIT')challenge.locked=true;throw error;}},
      {errorHost,success:'Telefonul a fost confirmat.',onSaved:async()=>{challenge.completed=true;S.phoneChallenge=null;S.boot=await api('/api/bootstrap');},onVisible:async()=>{dialog.close();if(S.page==='account')await account({historyMode:'none'});}});
  });input.addEventListener('input',()=>input.setCustomValidity(''));openModal(form);
}
function reconcileComparison(listings){
  const available=new Map(listings.map(l=>[l.id,l]));let transaction=null;
  S.comparisonIds=S.comparisonIds.filter((id,index,ids)=>{
    const listing=available.get(id);if(!listing||ids.indexOf(id)!==index)return false;
    if(!transaction)transaction=listing.transaction;
    return listing.transaction===transaction;
  }).slice(0,3);
}
function comparisonDialog(listings){
  if(listings.length<2||listings.length>3||listings.some(l=>l.transaction!==listings[0].transaction))return;
  const rental=listings[0].transaction==='rent',mixedCurrencies=new Set(listings.map(l=>l.currency)).size>1;
  const declaredPrice=l=>money(l.price,l.currency)+(rental?' / lună':'')+' · '+l.currency;
  const rows=[
    [rental?'Chirie lunară':'Preț de vânzare',declaredPrice],
    ['Cartier',l=>l.district||'Nespecificat'],
    ['Tip proprietate',l=>typeNames[l.type]||l.type],
    ['Suprafață',l=>l.area+' m²'+(l.type==='land'?' teren':' utili')],
    ['Camere',l=>l.rooms?roomLabel(l.rooms):'Nespecificat / nu se aplică'],
    ...(rental?[['Garanție',l=>l.rentDeposit!=null?money(l.rentDeposit,l.currency)+' · '+l.currency:'Nespecificată'],['Alte costuri',l=>l.rentCosts||'Nespecificate']]:[['Preț aproximativ / m²',l=>pricePerSquareMeter(l)||'Nu se poate calcula']]),
    ['Solicitări de contact',l=>l.acceptsContacts===false?'Oprite temporar':'Cu acceptarea proprietarului'],
    ['Telefonul proprietarului',l=>l.phoneVerified?'Confirmat':'Neconfirmat'],
    ['Relația cu proprietatea',l=>l.ownershipStatus==='reviewed'?'Revizuită de moderator':'Declarată, neverificată']
  ];
  const link=l=>el('a',{href:'/atelier?listing='+encodeURIComponent(l.id),class:'button secondary',onclick:event=>{if(modifiedClick(event))return;event.preventDefault();dialog.close();detail(l.id);}},'Deschide anunțul ↗');
  const table=el('table',{class:'comparison-table'},el('caption',{},'Comparație '+(rental?'pentru închiriere':'pentru vânzare')+' · informații declarate de proprietari'),
    el('thead',{},el('tr',{},el('th',{scope:'col',class:'comparison-row-label'},'Proprietate'),...listings.map(l=>el('th',{scope:'col'},l.photos?.[0]?el('img',{src:l.photos[0],alt:'Fotografia principală · '+l.title,loading:'lazy',decoding:'async'}):el('div',{class:'comparison-no-photo'},'Fotografie indisponibilă'),el('span',{class:'comparison-title'},l.title),el('span',{class:'comparison-location'},l.district+' · Cluj-Napoca'))))),
    el('tbody',{},...rows.map(([name,value])=>el('tr',{},el('th',{scope:'row'},name),...listings.map(l=>el('td',{},value(l))))),el('tr',{},el('th',{scope:'row'},'Mai multe detalii'),...listings.map(l=>el('td',{},link(l))))));
  openModal(el('section',{class:'comparison-content'},eye('Alege ce contează pentru tine'),el('h2',{class:'comparison-heading'},'Una lângă alta.'),el('p',{class:'comparison-intro'},'Compară informațiile declarate. Disponibilitatea și condițiile se pot schimba; verifică anunțul înainte de contactare.'),mixedCurrencies?el('div',{class:'comparison-currency-note',role:'note'},'Monede diferite: sumele rămân în EUR sau RON. Nu facem conversii și nu ordonăm proprietățile după preț.'):null,el('div',{class:'comparison-scroll',tabindex:'0',role:'region','aria-label':'Tabel comparativ. Derulează orizontal pentru toate proprietățile.'},table),el('p',{class:'comparison-footnote'},'Costurile nespecificate nu înseamnă costuri zero. Confirmarea telefonului nu dovedește identitatea sau dreptul de proprietate.')),{className:'comparison-dialog',label:'Compară proprietățile salvate'});
}
function favoriteCollection(listings,limit=50){
  reconcileComparison(listings);
  const section=el('section',{class:'favorite-collection','aria-label':'Colecția de favorite'}),available=new Map(listings.map(l=>[l.id,l]));
  if(!listings.length){
    section.append(el('div',{class:'favorites-empty'},el('div',{class:'favorites-empty-icon','aria-hidden':'true'},'♡'),el('div',{},eye('De păstrat aproape'),el('h2',{},'Locul potrivit merită',el('br'),el('em',{},'o a doua privire.')),el('p',{},'Nicio favorită disponibilă acum. Salvează proprietățile care te interesează, apoi revino să le compari în liniște.'),el('p',{class:'favorites-empty-note'},'Anunțurile retrase, expirate sau care nu mai îndeplinesc condițiile de publicare nu apar în această listă.'),b('Descoperă proprietăți ↗',()=>go('browse')))));
    return section;
  }
  if(!['all','sale','rent'].includes(S.favoriteFilter))S.favoriteFilter='all';
  let compareButtons=[];
  const filters=el('div',{class:'favorite-filters','aria-label':'Tipul favoritelor'}),query=el('input',{type:'search',name:'favoriteSearch',value:S.favoriteQuery||'',maxlength:100,placeholder:'Caută după titlu sau cartier','aria-label':'Caută în favorite'});
  const result=el('div',{class:'favorite-results'}),counter=el('p',{class:'favorite-result-count',role:'status','aria-live':'polite'}),feedback=el('p',{class:'comparison-feedback',role:'alert','aria-live':'polite'});
  const trayTitle=el('p',{class:'comparison-tray-title',role:'status','aria-live':'polite'}),trayHint=el('p',{class:'comparison-tray-hint'}),chips=el('div',{class:'comparison-selection','aria-label':'Proprietăți selectate pentru comparație'});
  const compare=b('Compară proprietățile ↗',()=>{
    const selected=S.comparisonIds.map(id=>available.get(id)).filter(Boolean);
    if(selected.some(l=>S.favoritePending.has(l.id))){feedback.textContent='Așteaptă salvarea modificărilor din favorite.';return;}
    comparisonDialog(selected);
  },'button comparison-open');
  const clear=b('Golește selecția',()=>{S.comparisonIds=[];feedback.textContent='';paintSelection();},'text-button comparison-clear');
  const remove=id=>{S.comparisonIds=S.comparisonIds.filter(value=>value!==id);feedback.textContent='';paintSelection();compareButtons.find(button=>button.getAttribute('data-compare')===id)?.focus();};
  const paintSelection=()=>{
    for(const button of compareButtons){const chosen=S.comparisonIds.includes(button.getAttribute('data-compare'));button.setAttribute('aria-pressed',String(chosen));button.textContent=chosen?'✓ Selectată pentru comparație':'Compară această proprietate';}
    const count=S.comparisonIds.length;trayTitle.textContent=count+' din 3 proprietăți selectate';trayHint.textContent=count<2?'Alege cel puțin două pentru comparație.':'Compară prețul, spațiul și condițiile declarate.';
    compare.disabled=count<2;clear.disabled=count===0;
    chips.replaceChildren(...S.comparisonIds.map(id=>{const listing=available.get(id);const chip=b('',()=>remove(id),'comparison-chip');chip.append(el('span',{class:'comparison-chip-name'},listing?.title||'Proprietate'),el('span',{'aria-hidden':'true'},'×'));chip.setAttribute('aria-label','Elimină din comparație '+(listing?.title||'proprietatea'));return chip;}));
  };
  const choose=listing=>{
    if(S.favoritePending.has(listing.id)){feedback.textContent='Așteaptă salvarea modificărilor pentru acest anunț.';return;}
    if(S.comparisonIds.includes(listing.id)){S.comparisonIds=S.comparisonIds.filter(id=>id!==listing.id);feedback.textContent='';paintSelection();return;}
    if(S.comparisonIds.length>=3){feedback.textContent='Poți compara maximum trei proprietăți. Elimină una din selecție pentru a adăuga alta.';return;}
    const first=available.get(S.comparisonIds[0]);if(first&&first.transaction!==listing.transaction){feedback.textContent='Compară separat proprietățile de vânzare și cele de închiriat. Golește selecția pentru a schimba tipul tranzacției.';return;}
    S.comparisonIds.push(listing.id);feedback.textContent='';paintSelection();
  };
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('ro-RO');
  const paint=()=>{
    for(const button of filters.children)button.setAttribute('aria-pressed',String(button.getAttribute('data-favorite-filter')===S.favoriteFilter));
    const text=normalize(S.favoriteQuery).trim(),shown=listings.filter(l=>(S.favoriteFilter==='all'||l.transaction===S.favoriteFilter)&&normalize(l.title+' '+l.district).includes(text));
    counter.textContent=shown.length+' '+(shown.length===1?'proprietate afișată':'proprietăți afișate')+' din '+listings.length+' disponibile în lista încărcată';
    compareButtons=[];
    if(shown.length){const grid=cards(shown);for(const[index,card]of[...grid.children].entries()){const listing=shown[index],button=b('Compară această proprietate',()=>choose(listing),'favorite-compare-button');button.setAttribute('data-compare',listing.id);button.setAttribute('aria-label','Compară '+listing.title);card.querySelector('.card-body').append(button);compareButtons.push(button);}result.replaceChildren(grid);}
    else result.replaceChildren(el('div',{class:'favorites-no-match'},el('h2',{},'Nicio potrivire în această selecție.'),el('p',{},'Favoritele tale disponibile sunt păstrate. Schimbă filtrul sau căutarea.'),b('Arată toate favoritele',()=>{S.favoriteFilter='all';S.favoriteQuery='';query.value='';paint();},'button secondary')));
    paintSelection();
  };
  for(const[value,label]of[['all','Toate'],['sale','De vânzare'],['rent','De închiriat']]){const count=listings.filter(l=>value==='all'||l.transaction===value).length;const button=b(label+' · '+count,()=>{S.favoriteFilter=value;paint();},'favorite-filter');button.setAttribute('data-favorite-filter',value);filters.append(button);}
  query.addEventListener('input',()=>{S.favoriteQuery=query.value;paint();});
  const tray=el('aside',{class:'comparison-tray','aria-label':'Selecția pentru comparație'},el('div',{class:'comparison-tray-main'},el('div',{},trayTitle,trayHint),el('div',{class:'comparison-tray-actions'},compare,clear)),feedback,chips);
  section.append(el('div',{class:'favorite-tools'},filters,query),counter,el('p',{class:'favorites-availability-note'},'Apar doar favoritele care îndeplinesc condițiile de publicare la încărcare. Selecția de comparație rămâne în această filă și poate include anunțuri ascunse de filtre.'),result,tray);
  if(listings.length>=limit)section.append(el('p',{class:'favorites-limit'},'Lista încarcă cel mult '+limit+' de favorite disponibile. Filtrele și numărătorile se aplică numai acestei liste.'));
  paint();return section;
}
async function favorites(options={}){
  if(!S.boot?.user)return signin();
  const revision=beginScreen('favorites',options),host=el('div',{class:'favorites-host','aria-busy':'true'},loadingResults());
  const main=el('main',{class:'page favorites-page'},el('div',{class:'favorites-heading'},el('div',{},eye('Spațiul tău de explorare'),el('h1',{},'Locuri pe care',el('br'),el('em',{},'vrei să le revezi.')),el('p',{},'Păstrează ce te atrage. Compară ce contează. Alege când ești pregătit.')),b('Continuă căutarea ↗',()=>go('browse'),'button secondary')),host);
  shell(main);
  try{
    const {listings,limit}=await api('/api/favorites');if(revision!==S.screenRevision)return;
    S.favorites=new Set(listings.map(l=>l.id));host.replaceChildren(favoriteCollection(listings,limit||50));
  }catch(error){if(revision!==S.screenRevision)return;host.replaceChildren(el('div',{class:'favorites-load-error',role:'alert'},el('h2',{},'Favoritele nu au putut fi încărcate.'),el('p',{},error.message),b('Încearcă din nou',()=>go('favorites'),'button secondary')));}
  finally{if(revision===S.screenRevision)host.setAttribute('aria-busy','false');}
}

function contact(l){
  if(!S.boot?.user){signin();return;}
  if(!ownerAccountActive()){openModal(el('div',{},el('h2',{class:'modal-title'},'Contul are restricții.'),note('Poți vedea motivul și cere revizuirea din cont.'),b('Deschide contul',()=>{dialog.close();go('account');})));return;}
  if(!S.boot.user.phoneVerified){phoneSetup();return;}
  if(l.acceptsContacts===false){toast('Proprietarul nu primește solicitări noi acum.');return;}
  const key='contact:'+l.id,errorHost=el('div',{class:'form-feedback',role:'alert'}),purpose=el('textarea',{name:'purpose',required:true,minlength:20,maxlength:600,rows:5,placeholder:'Mă interesează această locuință pentru…','aria-describedby':'contact-message-help'});
  const count=el('span',{class:'input-counter'},'0 / 600');purpose.addEventListener('input',()=>{count.textContent=purpose.value.length+' / 600';});
  const form=el('form',{},eye('Direct. Cu respect.'),el('h2',{class:'modal-title'},'Hai să înceapă conversația.'),el('p',{class:'contact-property-name'},l.title),
    operationFields(key,field('Spune-i proprietarului ce cauți',purpose),count,el('p',{id:'contact-message-help',class:'subtle'},'Minimum 20 de caractere. Fără număr de telefon, email sau linkuri.'),el('label',{class:'check'},el('input',{name:'agree',type:'checkbox',required:true}),el('span',{},S.boot.declarations.contact)),el('button',{type:'submit',class:'button'},'Trimite solicitarea')),
    errorHost,note('Angajamentul și versiunea lui sunt înregistrate. Acceptarea solicitării nu dezvăluie automat telefonul proprietarului.'),el('p',{class:'subtle'},'Nu trimitem încă alerte prin email/SMS. Verifică răspunsurile în Mesaje.'));
  form.addEventListener('submit',event=>{event.preventDefault();const payload={listingId:l.id,purpose:purpose.value,contactDeclaration:form.elements.agree.checked,declarationVersion:S.boot.declarations.version};return modalSubmission(form,key,()=>api('/api/contact-requests','POST',payload),{errorHost,success:'Solicitarea a fost trimisă.',onVisible:async result=>{dialog.close();await messages(result.id);}});});openModal(form);
}
function conversationState(c){
  if(c.blocked)return {key:'closed',label:'Blocată',help:'Contactul dintre voi este blocat. Istoricul rămâne disponibil, fără acțiuni noi.'};
  if(c.available===false)return {key:'closed',label:'Indisponibilă',help:'Anunțul sau unul dintre participanți nu mai îndeplinește condițiile pentru acțiuni noi. Istoricul este păstrat.'};
  if(c.status==='declined')return {key:'closed',label:'Refuzată',help:'Proprietarul a refuzat solicitarea. Mesajele și vizionările nu sunt disponibile.'};
  if(c.status==='requested')return {key:'requested',label:c.amOwner?'Așteaptă răspunsul tău':'Așteaptă proprietarul',help:c.amOwner?'Citește scopul declarat înainte să decizi. Acceptarea deschide conversația, fără să dezvăluie telefonul.':'Solicitarea ta a ajuns la proprietar. Veți putea discuta după acceptare.'};
  return {key:'accepted',label:'Conversație deschisă',help:'Discutați direct aici. Telefonul rămâne ascuns până la o dezvăluire explicită.'};
}
function clujDate(timestamp,short=false){
  if(!Number.isFinite(timestamp)||timestamp<=0)return 'Dată indisponibilă';
  return new Intl.DateTimeFormat('ro-RO',{timeZone:'Europe/Bucharest',...(short?{day:'numeric',month:'short'}:{dateStyle:'long',timeStyle:'short'})}).format(timestamp);
}
function conversationActionFields(c,...children){return el('fieldset',{class:'conversation-action-fields','data-conversation-actions':c.id,disabled:S.conversationPending.has(c.id)||!ownerAccountActive()},...children);}
function conversationSetBusy(id,busy){for(const node of document.querySelectorAll('[data-conversation-actions]'))if(node.getAttribute('data-conversation-actions')===id)node.disabled=busy||!ownerAccountActive();}
async function conversationMutation(c,path,payload,{success='Modificarea a fost salvată.',refresh,form,errorHost,onSaved,modal=false}={}){
  if(S.conversationPending.has(c.id)||!ownerAccountActive())return;
  const revision=S.screenRevision,modalRevision=S.modalRevision;
  if(form&&!form.reportValidity())return;
  S.conversationPending.add(c.id);conversationSetBusy(c.id,true);if(errorHost)errorHost.replaceChildren();
  let saved=false;
  try{
    const result=await api(path,'POST',payload);saved=true;onSaved?.(result);toast(success);
    if(modal&&dialog.open&&S.modalRevision===modalRevision)dialog.close();
    if(S.page==='messages'&&S.screenRevision===revision&&S.conversationId===c.id&&refresh)await refresh();
  }catch(error){
    const message=saved?'Acțiunea a fost salvată, dar conversația nu s-a reîncărcat. Apasă Reîmprospătează.':error.message;
    if(errorHost)errorHost.replaceChildren(note(message,true));toast(message);
  }finally{S.conversationPending.delete(c.id);conversationSetBusy(c.id,false);}
}
function conversationConfirm(c,kind,refresh){
  const sharing=kind==='share-phone';
  const errorHost=el('div',{role:'alert',class:'form-feedback'});
  const form=el('form',{},eye(sharing?'Doar cu acordul tău':'Controlul îți aparține'),el('h2',{class:'modal-title'},sharing?'Împărtășești numărul?':'Blochezi acest contact?'),
    el('p',{},sharing?'Numărul tău va fi vizibil pentru '+c.otherName+'.':'Blocarea se aplică între voi și la alte anunțuri, nu doar în această conversație.'),
    note(sharing?'Odată văzut sau salvat, numărul nu poate fi recuperat de pe dispozitivul celeilalte persoane.':'Nu veți mai putea trimite mesaje sau solicitări noi. Accesul la telefon este retras. Istoricul nu este șters.'),
    conversationActionFields(c,el('button',{class:'button'+(sharing?'':' danger'),type:'submit'},sharing?'Ofer acces acestei persoane':'Confirmă blocarea')),errorHost);
  form.addEventListener('submit',event=>{event.preventDefault();return conversationMutation(c,'/api/conversations/'+c.id+'/'+kind,{}, {refresh,form,errorHost,modal:true,success:sharing?'Accesul la telefon a fost acordat.':'Contactul a fost blocat.'});});openModal(form);
}
function conversationComposer(c,refresh){
  const stored=S.messageDrafts[c.id]||{body:'',requestId:null},errorHost=el('div',{class:'form-feedback',role:'alert'});
  const input=el('textarea',{name:'body',required:true,maxlength:2000,rows:3,placeholder:'Continuă conversația…','aria-label':'Mesaj pentru '+c.otherName,'aria-describedby':'message-help-'+c.id},stored.body);
  const count=el('span',{class:'composer-count'},stored.body.length+' / 2.000');
  const fields=conversationActionFields(c,field('Mesajul tău',input),el('div',{class:'composer-bottom'},count,el('button',{type:'submit',class:'button'},'Trimite mesajul ↗')));
  const form=el('form',{class:'conversation-composer'},fields,errorHost,el('p',{class:'conversation-fineprint',id:'message-help-'+c.id},'Fără telefon, email sau linkuri în mesaje. Textul netrimis se păstrează doar în această filă; reîncărcarea îl pierde.'));
  input.addEventListener('input',()=>{input.setCustomValidity('');S.messageDrafts[c.id]={body:input.value,requestId:null};count.textContent=input.value.length+' / 2.000';});
  form.addEventListener('submit',event=>{
    event.preventDefault();if(S.conversationPending.has(c.id)||!form.reportValidity())return;
    if(!input.value.trim()){input.setCustomValidity('Scrie un mesaj înainte să îl trimiți.');input.reportValidity();return;}
    const prior=S.messageDrafts[c.id],body=input.value;
    const requestId=prior?.body===body&&prior.requestId?prior.requestId:crypto.randomUUID().replaceAll('-','');
    S.messageDrafts[c.id]={body,requestId};
    return conversationMutation(c,'/api/conversations/'+c.id+'/messages',{body,requestId},{refresh,form,errorHost,success:'Mesajul a fost trimis.',onSaved:()=>{if(S.messageDrafts[c.id]?.requestId===requestId)delete S.messageDrafts[c.id];input.value='';count.textContent='0 / 2.000';}});
  });input.addEventListener('change',()=>input.setCustomValidity(''));return form;
}
function conversationViewings(c,viewings,hasMore,refresh){
  const section=el('section',{class:'conversation-viewings','aria-label':'Vizionări'},el('div',{class:'conversation-section-title'},el('h3',{},'Vizionări'),el('span',{},'Ora Clujului · Europe/Bucharest')));
  if(!viewings.length)section.append(el('p',{class:'muted'},'Nicio vizionare propusă încă. Stabiliți împreună un moment potrivit.'));
  const canAct=c.status==='accepted'&&!c.blocked&&c.available!==false&&ownerAccountActive();
  for(const visit of viewings){
    const past=visit.startsAt<=Date.now(),pending=['pending','proposed','requested'].includes(visit.status),status=pending?(past?'Propunere expirată':'Așteaptă confirmarea'):visit.status==='accepted'?(past?'Acceptată · dată trecută':'Confirmată'):'Refuzată';
    const row=el('article',{class:'viewing-card'+(past?' is-past':'')},el('div',{},el('p',{class:'viewing-date'},clujDate(visit.startsAt)),el('span',{class:'conversation-badge '+(visit.status==='accepted'&&!past?'accepted':'')},status)));
    if(c.amOwner&&pending&&!past&&canAct){const errorHost=el('div',{role:'alert'});row.append(conversationActionFields(c,el('div',{class:'item-actions'},...['accepted','declined'].map(decision=>b(decision==='accepted'?'Confirmă vizionarea':'Refuză',()=>conversationMutation(c,'/api/viewings/'+visit.id,{decision},{refresh,errorHost,success:decision==='accepted'?'Vizionarea a fost confirmată.':'Propunerea a fost refuzată.'}),decision==='accepted'?'button small':'button small secondary')))),errorHost);}
    if(visit.status==='accepted')row.append(el('a',{class:'button secondary small',href:'/api/viewings/'+visit.id+'/calendar',download:'vizionare.ics'},'Descarcă în calendar (.ics)'));
    section.append(row);
  }
  if(hasMore)section.append(el('p',{class:'conversation-fineprint'},'Sunt afișate cele mai recente 100 de vizionări, ordonate după data propusă.'));
  if(!c.amOwner&&canAct)section.append(conversationActionFields(c,b('Propune o vizionare →',()=>viewingProposal(c.id,refresh),'button secondary small')));
  section.append(el('p',{class:'conversation-fineprint'},'O propunere devine confirmată după acceptarea proprietarului. Poți descărca ora de început în calendar. Nu trimitem invitații sau notificări; durata se stabilește în conversație.'));return section;
}
function renderConversation(data,host,refresh,revision){
  const threadRevision=S.threadRevision;
  const c=data.conversation,state=conversationState(c),canAct=ownerAccountActive()&&c.available!==false&&!c.blocked;
  const headline=el('h2',{class:'conversation-title',tabindex:'-1'},c.listingTitle||'Conversație directă');
  const property=el('a',{href:'/atelier?listing='+c.listingId,class:'text-button',onclick:event=>{if(modifiedClick(event))return;event.preventDefault();detail(c.listingId);}},'Vezi proprietatea ↗');
  const top=el('header',{class:'conversation-heading'},el('div',{},el('p',{class:'conversation-person'},c.otherName||'Participant'),headline),el('div',{class:'conversation-heading-actions'},el('span',{class:'conversation-badge '+state.key},state.label),property));
  const notice=el('div',{class:'conversation-state '+state.key},state.help);
  const content=[top,notice,el('p',{class:'conversation-guidance'},'Nu trimite bani înainte de vizionare. Poți cere proprietarului un extras de carte funciară.')];
  if(c.purpose)content.push(el('section',{class:'conversation-purpose'},el('h3',{},c.amOwner?'De ce te contactează':'Solicitarea ta'),el('p',{},c.purpose),el('small',{},'Trimisă la '+clujDate(c.createdAt))));
  if((c.status!=='accepted'||!canAct)&&S.messageDrafts[c.id]?.body?.trim()){
    const savedText=S.messageDrafts[c.id].body;
    content.push(el('details',{class:'conversation-saved-draft'},el('summary',{},'Ai un text netrimis în această filă'),el('p',{class:'conversation-fineprint'},'Conversația nu permite trimiterea acum. Îl poți copia sau poți renunța la el.'),field('Textul tău',el('textarea',{readonly:true,rows:3},savedText)),b('Renunță la textul netrimis',()=>{delete S.messageDrafts[c.id];renderConversation(data,host,refresh,revision);},'text-button')));
  }
  const feedback=el('div',{class:'form-feedback',role:'alert'});
  if(c.amOwner&&c.status==='requested'&&canAct)content.push(conversationActionFields(c,el('div',{class:'conversation-decisions'},...['accepted','declined'].map(decision=>b(decision==='accepted'?'Acceptă conversația':'Refuză solicitarea',()=>conversationMutation(c,'/api/conversations/'+c.id+'/decision',{decision},{refresh,errorHost:feedback,success:decision==='accepted'?'Conversația este deschisă. Telefonul rămâne ascuns.':'Solicitarea a fost refuzată.'}),decision==='accepted'?'button':'button secondary')))),feedback);
  if(data.phone&&c.status==='accepted'&&canAct)content.push(el('div',{class:'shared-phone'},el('div',{},el('strong',{},'Telefon oferit de proprietar'),el('p',{},'Folosește-l doar pentru această discuție.')),el('a',{href:'tel:'+data.phone,class:'button secondary'},data.phone)));
  if(c.status==='accepted'){
    const history=el('section',{class:'conversation-history','aria-label':'Istoricul mesajelor'},el('div',{class:'conversation-section-title'},el('h3',{},'Discuția voastră'),el('span',{},'Ora Clujului')));
    if(data.nextMessageCursor){
      const older=b('Încarcă mesaje mai vechi',async()=>{
        if(older.disabled)return;older.disabled=true;older.textContent='Încărcăm istoricul…';
        try{const page=await api('/api/conversations/'+c.id+'?before='+encodeURIComponent(data.nextMessageCursor));
          if(S.page!=='messages'||S.screenRevision!==revision||S.conversationId!==c.id||S.threadRevision!==threadRevision)return;
          const merged=new Map([...(page.messages||[]),...(data.messages||[])].map(m=>[m.id,m]));
          renderConversation({...page,messages:[...merged.values()]},host,refresh,revision);
          host.querySelector('.load-older-messages')?.focus({preventScroll:true});
        }catch(error){older.textContent='Reîncearcă încărcarea istoricului';toast(error.message);}finally{older.disabled=false;}
      },'text-button load-older-messages');history.append(older);
    }
    if(!data.messages?.length)history.append(el('div',{class:'conversation-first-message'},el('strong',{},'Conversația poate începe.'),el('p',{},'Întreabă despre detaliile care contează pentru tine: disponibilitate, costuri sau o vizionare.')));
    const transcript=el('ol',{class:'message-transcript'});let previousDay='';
    for(const message of data.messages||[]){
      const day=new Intl.DateTimeFormat('ro-RO',{timeZone:'Europe/Bucharest',dateStyle:'long'}).format(message.createdAt);
      if(day!==previousDay){transcript.append(el('li',{class:'message-day'},day));previousDay=day;}
      const mine=message.senderId===S.boot.user.id;
      transcript.append(el('li',{class:'message-bubble'+(mine?' mine':'')},el('span',{class:'message-author'},mine?'Tu':c.otherName),el('p',{},message.body),el('time',{datetime:new Date(message.createdAt).toISOString(),title:clujDate(message.createdAt)},new Intl.DateTimeFormat('ro-RO',{timeZone:'Europe/Bucharest',hour:'2-digit',minute:'2-digit'}).format(message.createdAt))));
    }
    history.append(transcript);content.push(history);
    if(canAct)content.push(conversationComposer(c,refresh));
    content.push(conversationViewings(c,data.viewings||[],data.viewingsHasMore,refresh));
  }
  const safety=el('details',{class:'conversation-safety'},el('summary',{},'Confidențialitate și siguranță'),el('p',{},'Păstrează discuția aici. Nu trimite documente personale și nu redistribui datele celeilalte persoane.'));
  if(c.amOwner&&c.status==='accepted'&&canAct){if(c.phoneShared)safety.append(note('Ai oferit acces la telefon în această conversație.'));else safety.append(conversationActionFields(c,b('Oferă acces la numărul meu',()=>conversationConfirm(c,'share-phone',refresh),'button secondary small')));}
  safety.append(el('div',{class:'item-actions'},b('Raportează o problemă',()=>report({conversationId:c.id}),'text-button'),!c.blocked&&ownerAccountActive()?b('Blochează acest contact',()=>conversationConfirm(c,'block',refresh),'text-button'):null));
  content.push(safety);host.replaceChildren(...content);S.renderedConversation={id:c.id,data};markMessagesRead(c.id,data.unreadMessageIds);return headline;
}
async function messages(selected,options={}){
  if(!S.boot?.user){signin();return;}
  const revision=beginScreen('messages',{...options,conversationId:selected});
  S.conversationId=selected||null;
  const loading=el('div',{class:'inbox-loading',role:'status'},'Încărcăm conversațiile tale…');
  const main=el('main',{class:'page inbox-page'},el('div',{class:'inbox-heading'},el('div',{},eye('Spațiul tău de conversație'),el('h1',{class:'page-title'},'De la om la om.'),el('p',{class:'muted'},'Solicitări, răspunsuri și vizionări. Fiecare locuință are conversația ei.')),b('Reîmprospătează',()=>messages(S.conversationId,{historyMode:'none'}),'button secondary small')),el('p',{class:'inbox-service-note'},'Momentan nu trimitem notificări prin email sau SMS. Verifică aici conversațiile.'),loading);
  shell(main,'messages');
  try{
    const first=await api('/api/conversations');if(revision!==S.screenRevision)return;
    let conversations=first.conversations||[],nextCursor=first.nextCursor,selectionRevision=0;
    if(!conversations.length&&!selected){S.pollInbox=async()=>{const fresh=await api('/api/conversations');if(revision!==S.screenRevision)return false;if(fresh.conversations?.length){await messages(null,{historyMode:'none'});return true;}return false;};loading.replaceChildren(empty('Un loc pentru primele discuții.','Solicitările primite și cele trimise vor apărea aici. Între timp, poți explora locuințele sau pregăti anunțul tău.','Descoperă locuințe',()=>go('browse')));return;}
    const thread=el('section',{class:'conversation-thread','aria-label':'Conversația selectată'});
    const waiting=el('section',{class:'inbox-awaiting','aria-label':'Așteaptă răspunsul tău'}),list=el('div',{class:'inbox-rows'}),count=el('p',{class:'inbox-count',role:'status'}),moreHost=el('div',{class:'inbox-more'});
    const query=el('input',{type:'search',value:S.inboxQuery||'',maxlength:100,placeholder:'Proprietate sau persoană','aria-label':'Caută în conversațiile încărcate'});
    const filter=select('conversationFilter',[['all','Toate conversațiile'],['requested','În așteptare'],['accepted','Deschise'],['closed','Închise sau indisponibile']],S.inboxFilter||'all');filter.setAttribute('aria-label','Starea conversației');
    const aside=el('aside',{class:'inbox-sidebar','aria-label':'Conversațiile tale'},el('h2',{},'Conversațiile tale'),query,filter,count,waiting,list,moreHost);
    const refresh=async()=>{const id=S.conversationId;await selectConversation(id,{historyMode:'none'});};
    const renderList=()=>{
      const key=(S.inboxQuery||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
      const filtered=conversations.filter(c=>(!key||(c.listingTitle+' '+c.otherName).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(key))&&(!S.inboxFilter||S.inboxFilter==='all'||conversationState(c).key===S.inboxFilter));
      count.textContent=filtered.length+' afișate din '+conversations.length+' încărcate'+(nextCursor?' · mai sunt conversații':'');
      const rows=filtered.map(c=>{
        const state=conversationState(c),button=b('',()=>selectConversation(c.id,{focus:true}),'inbox-row'+(S.conversationId===c.id?' is-selected':''));
        button.setAttribute('aria-pressed',String(S.conversationId===c.id));button.append(el('span',{class:'inbox-row-top'},el('strong',{},c.otherName||'Participant'),el('span',{},clujDate(c.updatedAt||c.createdAt,true))),el('span',{class:'inbox-row-title'},c.listingTitle||'Proprietate'),el('span',{class:'conversation-badge '+state.key},state.label));if(c.unreadCount)button.append(el('span',{class:'unread-count'},c.unreadCount+' mesaje necitite'));return {c,button};
      });
      const pending=rows.filter(row=>row.c.awaitingReply);waiting.hidden=!pending.length;waiting.replaceChildren(el('h3',{},'Așteaptă răspunsul tău'),...pending.map(row=>row.button));list.replaceChildren(...rows.filter(row=>!row.c.awaitingReply).map(row=>row.button));
      if(!filtered.length)list.append(el('p',{class:'inbox-filter-empty'},'Nicio potrivire în conversațiile încărcate. Schimbă filtrul sau încarcă mai multe.'));
      moreHost.replaceChildren();
      if(nextCursor){const more=b('Încarcă alte conversații',async()=>{
        if(more.disabled)return;more.disabled=true;more.textContent='Încărcăm…';
        try{const page=await api('/api/conversations?before='+encodeURIComponent(nextCursor));if(revision!==S.screenRevision)return;
          conversations=[...new Map([...conversations,...page.conversations].map(c=>[c.id,c])).values()];nextCursor=page.nextCursor;renderList();
        }catch(error){toast(error.message);more.textContent='Reîncearcă';}finally{more.disabled=false;}
      },'button secondary small');moreHost.append(more);}
    };
    async function selectConversation(id,{historyMode='push',focus=false}={}){
      const selection=++selectionRevision;S.threadRevision=(S.threadRevision||0)+1;S.conversationId=id;updateLocation('messages',{conversationId:id,historyMode});renderList();
      thread.setAttribute('aria-busy','true');thread.replaceChildren(el('p',{class:'loading',role:'status'},'Încărcăm discuția…'));
      try{const data=await api('/api/conversations/'+id);if(revision!==S.screenRevision||selection!==selectionRevision)return;
        const existing=conversations.findIndex(c=>c.id===id);if(existing>=0)conversations[existing]=data.conversation;else conversations.push(data.conversation);
        renderList();const headline=renderConversation(data,thread,refresh,revision);if(focus)headline.focus({preventScroll:true});
      }catch(error){if(revision!==S.screenRevision||selection!==selectionRevision)return;thread.replaceChildren(el('h2',{},'Conversația nu s-a încărcat.'),note(error.message,true),b('Reîncearcă',()=>selectConversation(id,{historyMode:'none'}),'button secondary'));}
      finally{if(revision===S.screenRevision&&selection===selectionRevision)thread.setAttribute('aria-busy','false');}
    }
    S.pollInbox=async()=>{const fresh=await api('/api/conversations');if(revision!==S.screenRevision)return false;const before=JSON.stringify(conversations);conversations=[...new Map([...conversations,...(fresh.conversations||[])].map(c=>[c.id,c])).values()].sort((a,b)=>(b.updatedAt-a.updatedAt)||b.id.localeCompare(a.id));if(conversations.length<=25)nextCursor=fresh.nextCursor;const changed=before!==JSON.stringify(conversations);if(changed)renderList();return changed;};
    S.pollConversation=async()=>{
      const id=S.conversationId,selection=selectionRevision,old=S.renderedConversation?.id===id?S.renderedConversation.data:null;if(!id||S.conversationPending.has(id)||dialog.open)return false;
      const data=await api('/api/conversations/'+id);if(revision!==S.screenRevision||selection!==selectionRevision||document.visibilityState==='hidden')return false;
      const input=thread.querySelector('textarea[name="body"]'),focused=document.activeElement===input,selectionStart=input?.selectionStart,selectionEnd=input?.selectionEnd,safetyOpen=thread.querySelector('.conversation-safety')?.open;
      if(old){const merged=new Map([...(old.messages||[]),...(data.messages||[])].map(m=>[m.id,m]));data.messages=[...merged.values()].sort((a,b)=>(a.createdAt-b.createdAt)||a.id.localeCompare(b.id));if(old.messages.length>50)data.nextMessageCursor=old.nextMessageCursor;}
      if(old&&JSON.stringify(old)===JSON.stringify(data))return false;
      renderConversation(data,thread,refresh,revision);const updated=thread.querySelector('textarea[name="body"]');if(focused&&updated){updated.focus({preventScroll:true});updated.setSelectionRange?.(selectionStart,selectionEnd);}const safety=thread.querySelector('.conversation-safety');if(safety)safety.open=!!safetyOpen;return true;
    };
    query.addEventListener('input',()=>{S.inboxQuery=query.value;renderList();});filter.addEventListener('change',()=>{S.inboxFilter=filter.value;renderList();});
    loading.className='inbox-workspace';loading.removeAttribute?.('role');loading.replaceChildren(aside,thread);
    await selectConversation(selected||conversations[0].id,{historyMode:'replace'});
  }catch(error){if(revision!==S.screenRevision)return;loading.replaceChildren(el('div',{class:'inbox-load-error'},note(error.message,true),b('Reîncearcă',()=>messages(selected,{historyMode:'none'}),'button secondary')));}
}
function report(target){
  if(!S.boot?.user){signin();return;}
  const key='report:'+(target.conversationId||target.listingId||'general'),errorHost=el('div',{class:'form-feedback',role:'alert'});
  const form=el('form',{},eye('O comunitate atentă'),el('h2',{class:'modal-title'},'Spune-ne ce s-a întâmplat.'),operationFields(key,
    field('Motiv',select('reason',[['suspected_agency','Suspectez o agenție / intermediar'],['contact_sharing','Distribuirea datelor de contact'],['duplicate','Anunț duplicat'],['unavailable','Proprietate indisponibilă'],['misleading','Informații înșelătoare'],['harassment','Hărțuire sau mesaje nedorite'],['other','Alt motiv']],'')),
    field('Contextul sesizării',el('textarea',{name:'details',required:true,minlength:10,maxlength:1500,rows:5,placeholder:'Descrie concret problema și unde ai observat-o.'})),el('button',{type:'submit',class:'button'},'Trimite raportarea')),errorHost,
    note('Raportarea ajunge la moderare. O suspiciune nu suspendă automat contul. Poți urmări răspunsul în Contul meu.'));
  form.addEventListener('submit',event=>{event.preventDefault();const data={...target,reason:form.elements.reason.value,details:form.elements.details.value};return modalSubmission(form,key,()=>api('/api/reports','POST',data),{errorHost,success:'Raportarea a fost înregistrată pentru revizuire.',onVisible:()=>dialog.close()});});openModal(form);
}
function appeal(reportId=null){
  const key='appeal:'+(reportId||'account'),errorHost=el('div',{class:'form-feedback',role:'alert'});
  const form=el('form',{},eye('Ai dreptul la un răspuns'),el('h2',{class:'modal-title'},'Cere revizuirea unei decizii.'),operationFields(key,field('Motivul contestației',el('textarea',{name:'reason',required:true,minlength:20,maxlength:2000,rows:5})),el('button',{type:'submit',class:'button'},'Trimite contestația')),errorHost,note('Contestațiile sunt analizate independent. Soluționarea poate aștepta disponibilitatea unui alt moderator; nu avem termen garantat.'));
  form.addEventListener('submit',event=>{event.preventDefault();const data={reason:form.elements.reason.value,...(reportId?{reportId}:{})};return modalSubmission(form,key,()=>api('/api/appeals','POST',data),{errorHost,success:'Contestația a fost înregistrată.',onVisible:()=>openModal(el('div',{},el('h2',{class:'modal-title'},'Contestația este înregistrată.'),note('Soluționarea poate aștepta disponibilitatea unui alt moderator; nu avem termen garantat.'),el('p',{class:'subtle'},'Poți urmări starea contestației în contul tău.'),b('Am înțeles',()=>dialog.close())))});});openModal(form);
}
async function moderation(options={}){const revision=beginScreen('moderation',options);const data=await api('/api/moderation');if(revision!==S.screenRevision)return;const main=el('main',{class:'page'},eye('Acces restricționat'),el('h1',{class:'page-title'},'Moderare.'),note('Verifică dovezile și contextul. Semnalele și raportările nu reprezintă singure o dovadă. Nu confirma relația cu proprietatea fără verificare.'),el('h3',{},'Anunțuri în așteptare'));for(const l of data.listings||[]){main.append(el('article',{class:'list-item'},el('h3',{},l.title),el('p',{class:'subtle'},l.ownerName||l.ownerId||''),el('p',{class:'detail-description'},l.description),el('div',{class:'photos'},...(l.photos||[]).map(src=>el('img',{src,alt:'Fotografie din anunț'}))),el('div',{class:'item-actions'},b('Aprobă',()=>moderationDecision('/api/moderation/listings/'+l.id,'published'),'button small'),b('Respinge',()=>moderationDecision('/api/moderation/listings/'+l.id,'rejected'),'button small secondary'))));}if(!data.listings?.length)main.append(note('Nu sunt anunțuri în așteptare.'));main.append(el('h3',{style:'margin-top:28px'},'Sesizări'));for(const r of data.reports||[])main.append(el('article',{class:'list-item'},el('span',{class:'status'},r.status||'Deschisă'),el('h3',{},r.reason),el('p',{class:'detail-description'},r.details),el('div',{class:'item-actions'},b('Consultă contextul sesizării',()=>reportEvidence(r.id),'button small secondary'),b('Soluționează',()=>moderationDecision('/api/moderation/reports/'+r.id,'resolved'),'button small'),b('Respinge sesizarea',()=>moderationDecision('/api/moderation/reports/'+r.id,'dismissed'),'button small secondary'))));if(!data.reports?.length)main.append(note('Nu sunt sesizări.'));main.append(el('h3',{style:'margin-top:28px'},'Contestații'));for(const a of data.appeals||[])main.append(el('div',{class:'list-item'},el('p',{class:'subtle'},'Cont: '+(a.userId||'')),el('p',{},a.reason),el('p',{class:'subtle'},a.reportId?'Admiterea redeschide sesizarea asociată. Nu schimbă starea contului.':'Admiterea reactivează contul persoanei care a contestat restricția.'),el('div',{class:'item-actions'},b(a.reportId?'Admite și redeschide sesizarea':'Admite și reactivează contul',()=>moderationDecision('/api/moderation/appeals/'+a.id,'upheld'),'button small'),b('Respinge contestația',()=>moderationDecision('/api/moderation/appeals/'+a.id,'dismissed'),'button small secondary'))));main.append(el('h3',{style:'margin-top:28px'},'Starea unui cont'));const uf=el('form',{class:'form-shell'},field('ID cont',el('input',{name:'userId',required:true})),field('Stare',select('status',[['restricted','Restricționat'],['suspended','Suspendat'],['active','Activ']],'')),field('Motiv documentat',el('textarea',{name:'reason',required:true,minlength:10,maxlength:1000})),el('button',{type:'submit',class:'button'},'Înregistrează decizia'));uf.addEventListener('submit',e=>{e.preventDefault();attempt(async()=>{await api('/api/moderation/users/'+encodeURIComponent(uf.elements.userId.value),'POST',{status:uf.elements.status.value,reason:uf.elements.reason.value});toast('Decizia a fost înregistrată.');moderation();});});main.append(uf);shell(main);}
function moderationDecision(path,decision){
  const key='moderation:'+path,errorHost=el('div',{class:'form-feedback',role:'alert'});
  const form=el('form',{},el('h2',{class:'modal-title'},'Documentează decizia.'),operationFields(key,field('Motiv',el('textarea',{name:'reason',required:true,minlength:10,maxlength:1000})),el('button',{type:'submit',class:'button'},'Confirmă')),errorHost);
  form.addEventListener('submit',event=>{event.preventDefault();const data={decision,reason:form.elements.reason.value,ownershipReviewed:false};return modalSubmission(form,key,()=>api(path,'POST',data),{errorHost,success:'Decizia a fost înregistrată.',onVisible:async()=>{dialog.close();await moderation({historyMode:'none'});}});});openModal(form);
}
function rules(){openModal(el('div',{},eye('Regulile pilotului'),el('h2',{class:'modal-title'},'O piață pentru contact direct.'),...['Publică exclusiv proprietarii și coproprietarii. Agențiile, intermediarii și persoanele care acționează în beneficiul lor nu sunt eligibile pentru acest pilot.','Cauți pentru tine, fără colectarea contactelor pentru intermediari. Nu redistribui numerele către agenții fără acord explicit.','Un telefon confirmat nu dovedește identitatea sau proprietatea. Insignele indică doar verificările efectiv realizate.','Nu copia anunțuri sau fotografii fără permisiune. Nu publica date de contact, adrese exacte sau documente personale în descriere.','Proprietarii cu mai multe imobile pot fi supuși unei revizuiri. Reprezentarea comercială și anunțurile dezvoltatorilor nu fac parte din pilot.','Raportările sunt analizate contextual. Restricțiile pot fi contestate din cont. Nu aplicăm suspendări definitive doar în baza numărului de raportări.','Regulile sunt o versiune de pilot, în curs de validare juridică înaintea lansării comerciale.'].map(t=>el('p',{class:'detail-description'},t))));}
function privacy(){openModal(el('div',{},eye('Date sub control'),el('h2',{class:'modal-title'},'Mai puține date. Mai mult control.'),...['Telefonul și adresa exactă nu sunt incluse în anunțurile publice. Numărul se poate dezvălui numai într-o conversație acceptată, la alegerea proprietarului.','Declarațiile acceptate sunt păstrate cu versiunea și momentul acceptării. Conversațiile și raportările au acces limitat la participanți și personal autorizat pentru moderare.','Nu încărca documente de identitate sau proprietate în fotografii. Verificarea documentelor nu este activată în acest pilot.','Fotografiile sunt redimensionate înainte de încărcare. Anunțurile, favoritele și conversațiile se salvează pe server.','Detaliile operatorului, termenele de retenție și procedurile pentru exercitarea drepturilor trebuie finalizate înainte de deschiderea comercială. Nu folosi pilotul pentru transmiterea de informații sensibile.'].map(t=>el('p',{class:'detail-description'},t))));}
async function init(){
  const revision=beginScreen('initializing');shell(el('div',{class:'loading'},'Pregătim un loc pentru contact direct…'));
  try{
    const boot=await api('/api/bootstrap');if(revision!==S.screenRevision)return;S.boot=boot;
    if(boot.user)try{const f=await api('/api/favorites');if(revision!==S.screenRevision)return;S.favorites=new Set(f.listings.map(l=>l.id));}catch{}
    if(revision!==S.screenRevision)return;
    if(boot.user)await recoverEditorDraft();
    if(revision!==S.screenRevision)return;await restoreLocation();startMessagePolling();
  }catch(e){if(revision!==S.screenRevision)return;shell(el('main',{class:'page'},eye('Între noi · Cluj-Napoca'),el('h1',{class:'page-title'},'Ne pregătim să ne cunoaștem.'),note(e.message,true),b('Reîncearcă',init)));}
}
function contactPreferences(listing){
  const controls=el('fieldset',{class:'owner-preference-fields','data-owner-actions':listing.id,disabled:S.ownerPending.has(listing.id)||!ownerAccountActive()},el('label',{class:'check'},el('input',{name:'acceptsContacts',type:'checkbox',checked:listing.acceptsContacts!==false}),el('span',{},'Primesc solicitări noi pentru acest anunț')),field('Interval preferat · opțional',el('input',{name:'contactHours',value:listing.contactHours||'',maxlength:100,placeholder:'De exemplu: luni–vineri, 17:00–20:00'}),'Nu include numărul de telefon sau alte date de contact.'),note('Oprirea solicitărilor nu ascunde anunțul și nu închide conversațiile existente. Telefonul rămâne ascuns implicit.'),el('button',{type:'submit',class:'button'},'Salvează preferințele'));
  const form=el('form',{},eye('Controlul îți aparține'),el('h2',{class:'modal-title'},'Cum vrei să fii contactat?'),controls);
  form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;return ownerMutation(listing,'preferences',{acceptsContacts:form.elements.acceptsContacts.checked,contactHours:form.elements.contactHours.value},'Preferințele de contact au fost salvate.',{modal:true});});openModal(form);
}

function viewingProposal(id,refresh){
  if(!S.boot.user?.phoneVerified){phoneSetup();return;}
  const localValue=timestamp=>{const date=new Date(timestamp);return new Date(timestamp-date.getTimezoneOffset()*60000).toISOString().slice(0,16);};
  const input=el('input',{name:'startsAt',type:'datetime-local',required:true,min:localValue(Date.now()+61*60000),max:localValue(Date.now()+30*86400000)});
  const preview=el('p',{class:'viewing-time-preview',role:'status'},'Alege un moment pentru a vedea ora corespunzătoare în Cluj.'),errorHost=el('div',{class:'form-feedback',role:'alert'});
  input.addEventListener('input',()=>{input.setCustomValidity('');const timestamp=new Date(input.value).getTime();preview.textContent=Number.isFinite(timestamp)?'În Cluj-Napoca: '+clujDate(timestamp)+' · Europe/Bucharest':'Alege o dată și o oră valide.';});
  const form=el('form',{},eye('Faceți cunoștință cu locuința'),el('h2',{class:'modal-title'},'Propune o vizionare.'),
    conversationActionFields({id},field('Data și ora · ora dispozitivului tău',input,'Între o oră și 30 de zile de acum. Fusul dispozitivului: '+Intl.DateTimeFormat().resolvedOptions().timeZone+'.'),preview,note('Aceasta este o propunere. Vizionarea devine confirmată numai după acceptarea explicită a proprietarului.'),el('button',{type:'submit',class:'button'},'Trimite propunerea')),errorHost);
  form.addEventListener('submit',event=>{event.preventDefault();const startsAt=new Date(input.value).getTime();if(!Number.isFinite(startsAt)||startsAt<Date.now()+3600000||startsAt>Date.now()+30*86400000){input.setCustomValidity('Alege un moment între o oră și 30 de zile de acum.');input.reportValidity();return;}return conversationMutation({id},'/api/conversations/'+id+'/viewings',{startsAt},{refresh:refresh||(()=>messages(id,{historyMode:'none'})),form,errorHost,modal:true,success:'Propunerea a fost trimisă proprietarului.'});});openModal(form);
}
function copyListingLink(id){attempt(async()=>{const url=new URL('/atelier',window.location.origin);url.searchParams.set('listing',id);try{if(!navigator.clipboard?.writeText)throw Error('clipboard unavailable');await navigator.clipboard.writeText(url.href);toast('Linkul anunțului a fost copiat.');}catch{const input=el('input',{value:url.href,readonly:true,'aria-label':'Linkul anunțului'});openModal(el('div',{},el('h2',{class:'modal-title'},'Trimite locuința mai departe.'),el('p',{class:'muted'},'Selectează și copiază linkul de mai jos.'),input));input.select();}});}
function reportEvidence(id){attempt(async()=>{const evidence=await api('/api/moderation/reports/'+id+'/evidence');const content=el('div',{},eye('Context restricționat · acces înregistrat'),el('h2',{class:'modal-title'},'Contextul sesizării'),evidence.listingTitle?el('h3',{},evidence.listingTitle):null,el('p',{class:'detail-description'},evidence.reason||''),el('p',{class:'detail-description'},evidence.details||''),evidence.purpose?note('Scop declarat: '+evidence.purpose):null);for(const m of evidence.messages||[])content.append(el('div',{class:'message'},m.body,el('small',{},'Cont '+m.senderId+' · '+new Date(m.createdAt).toLocaleString('ro-RO'))));if(!evidence.messages?.length)content.append(note('Nu există mesaje disponibile în contextul acestei sesizări.'));const accounts=new Map();for(const entry of evidence.involvedAccounts||[]){if(!accounts.has(entry.id))accounts.set(entry.id,[]);accounts.get(entry.id).push(({reporter:'Autorul sesizării',owner:'Proprietar',requester:'Persoană interesată'})[entry.role]||entry.role);}if(accounts.size)content.append(el('section',{class:'evidence-accounts'},el('h3',{},'Conturi implicate în acest caz'),...[...accounts.entries()].map(([userId,roles])=>el('div',{class:'evidence-account'},el('p',{},roles.join(' · ')),el('p',{class:'subtle'},userId),userId!==S.boot.user.id?el('div',{class:'item-actions'},b('Restricționează',()=>userStatusDecision(userId,'restricted'),'button secondary small'),b('Suspendă',()=>userStatusDecision(userId,'suspended'),'button secondary small'),b('Reactivează',()=>userStatusDecision(userId,'active'),'button secondary small')):el('p',{class:'subtle'},'Nu poți modifica propriul acces.')))));content.append(el('p',{class:'subtle'},'Analizează contextul disponibil înainte de a lua o decizie. Accesul este limitat la această sesizare.'));openModal(content);});}

function createFor(transaction){if(confirmEditorReplacement(()=>createFor(transaction)))return;create();S.draft.transaction=transaction;renderCreate();}
function publishingChoice(){openModal(el('div',{},eye('Proprietatea ta, direct'),el('h2',{class:'modal-title'},'Ce ai vrea să faci?'),el('p',{class:'muted'},'Anunțul începe cu o ciornă. Îl poți completa înainte de a-l trimite spre publicare.'),el('div',{class:'publishing-options'},b('Vreau să vând →',()=>{dialog.close();createFor('sale');}),b('Caut un chiriaș →',()=>{dialog.close();createFor('rent');},'button secondary'))));}
function cozyMotif(){const box=el('div');box.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 160" fill="none"><ellipse cx="111" cy="142" rx="96" ry="9" fill="#dce2d2"/><path d="M46 133V62L106 24l62 38v71" fill="#f4e9d9" stroke="#879b7b" stroke-width="2"/><path d="M35 67l71-46 73 46" stroke="#805747" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M89 134V89a17 17 0 0134 0v45" fill="#a4b49b"/><circle cx="115" cy="110" r="2" fill="#fbf7ed"/><path d="M60 78h17v21H60zM137 78h17v21h-17z" fill="#f6d89f" stroke="#8c9d7c" stroke-width="2"/><path d="M68 78v21m77-21v21" stroke="#8c9d7c" stroke-width="2"/><path d="M183 137v-27m0 8c-16-2-20-16-12-22 10-5 15 8 12 22zm1-5c-2-14 7-24 15-17 6 9-4 17-15 17z" fill="#a2b58c" stroke="#7e9873" stroke-width="2"/><path d="M31 137v-14m0 7c-10-2-14-11-8-15 7-4 10 5 8 15zm1-5c-2-10 5-17 10-12 4 6-2 12-10 12z" fill="#a2b58c" stroke="#7e9873" stroke-width="2"/><path d="M169 37l6-5m11 4l4 4" stroke="#b08c6c" stroke-width="2" stroke-linecap="round"/><circle cx="181" cy="23" r="10" fill="#e8d0a8"/></svg>';return box.firstChild;}

const searchKeys=['district','type','currency','maxPrice','minPrice','minArea','rooms','q'];
function modifiedClick(e){return e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button>0;}
function changeTransaction(value){if(value!==S.transaction){delete S.filters.minPrice;delete S.filters.maxPrice;S.sort='newest';}S.transaction=value;}
function browseUrl(page=S.browsePage){const params=new URLSearchParams({view:'browse',transaction:S.transaction,currency:S.filters.currency||'EUR'});for(const key of searchKeys)if(S.filters[key])params.set(key,S.filters[key]);if(S.sort!=='newest')params.set('sort',S.sort);if(page>1)params.set('page',String(page));return '/atelier?'+params;}
function updateLocation(page,{historyMode='push',listingId,conversationId}={}){
  const names={home:'Direct de la proprietar',browse:S.transaction==='rent'?'De închiriat':'De vânzare',detail:'Proprietate',account:'Contul meu',favorites:'Favorite',messages:'Mesaje',moderation:'Moderare'};
  if(!names[page])return;
  document.title=names[page]+' · Între noi · Cluj-Napoca';paintUnreadIndicators();
  if(historyMode==='none'||!window.history)return;
  let path=page==='home'?'/atelier':page==='browse'?browseUrl():'/atelier?view='+page;
  if(page==='messages'&&conversationId)path+='&conversation='+encodeURIComponent(conversationId);
  if(page==='detail'){const params=new URLSearchParams(browseUrl().split('?')[1]);params.delete('view');params.set('listing',listingId);path='/atelier?'+params;}
  if(path===window.location.pathname+window.location.search)return;
  window.history[historyMode==='replace'?'replaceState':'pushState'](null,'',path);
}
function beginScreen(page,options={}){S.pollConversation=null;S.pollInbox=null;S.page=page;updateLocation(page,options);return ++S.screenRevision;}
async function restoreLocation(){
  const params=new URLSearchParams(window.location.search);
  S.transaction=params.get('transaction')==='rent'?'rent':'sale';
  S.filters=Object.fromEntries(searchKeys.filter(k=>params.has(k)).map(k=>[k,params.get(k)]));
  S.sort=['price_asc','price_desc','area_desc','price_m2_asc','price_m2_desc'].includes(params.get('sort'))?params.get('sort'):'newest';
  const rawPage=Number(params.get('page'));S.browsePage=Number.isSafeInteger(rawPage)&&rawPage>0&&rawPage<=1000?rawPage:1;
  if(dialog.open)dialog.close();
  const listing=params.get('listing');if(listing&&/^[a-f0-9]{32}$/.test(listing))return detail(listing,{historyMode:'none'});
  const requested=params.get('view'),allowed=['browse','account','favorites','messages','moderation'];
  const page=allowed.includes(requested)?requested:'home';
  if(['account','favorites','messages','moderation'].includes(page)&&!S.boot.user){await go('home',{historyMode:'none'});signin();return;}
  const conversation=params.get('conversation');
  return go(page,{historyMode:'none',pageNumber:S.browsePage,conversationId:page==='messages'&&/^[a-f0-9]{32}$/.test(conversation||'')?conversation:undefined});
}
window.addEventListener('popstate',()=>{if(S.boot)attempt(restoreLocation);});
function copySearchLink(){copyLink(new URL(browseUrl(),window.location.origin).href,'Linkul căutării a fost copiat.','Trimite căutarea mai departe.');}
function copyLink(url,success,title){attempt(async()=>{try{if(!navigator.clipboard?.writeText)throw Error('clipboard unavailable');await navigator.clipboard.writeText(url);toast(success);}catch{const input=el('input',{value:url,readonly:true,'aria-label':'Link de copiat'});openModal(el('div',{},el('h2',{class:'modal-title'},title),el('p',{class:'muted'},'Copiază linkul de mai jos. Accesul la pilot rămâne restrâns.'),input));input.select();}});}
function favoriteButton(id,compact=false){const button=b('',()=>toggleFavorite(id),compact?'icon-button favorite-toggle':'button secondary favorite-toggle');button.setAttribute('data-favorite',id);button.setAttribute('data-compact',compact?'true':'false');paintFavoriteButton(button,id,compact);return button;}
function paintFavoriteButton(button,id,compact){const saved=S.favorites.has(id);button.textContent=compact?(saved?'♥':'♡'):(saved?'♥ Salvată în favorite':'♡ Salvează locuința');button.setAttribute('aria-pressed',String(saved));button.setAttribute('aria-label',compact?(saved?'Elimină din favorite':'Adaugă în favorite'):button.textContent);button.disabled=S.favoritePending.has(id);}
function updateFavoriteButtons(id){for(const button of document.querySelectorAll('[data-favorite]'))if(button.getAttribute('data-favorite')===id)paintFavoriteButton(button,id,button.getAttribute('data-compact')==='true');}
function activeFilters(){const names={district:'Cartier',type:'Tip',currency:'Monedă',maxPrice:'Buget maxim',minPrice:'Preț minim',minArea:'Suprafață minimă',rooms:'Camere',q:'Căutare'};const selected=Object.entries(S.filters).filter(([key,value])=>value&&names[key]&&key!=='currency');if(!selected.length)return el('div');return el('div',{class:'active-filters','aria-label':'Filtre active'},...selected.map(([key,value])=>{const label=names[key]+': '+(key==='type'?typeNames[value]:value)+(key==='maxPrice'||key==='minPrice'?' '+(S.filters.currency||'EUR'):key==='minArea'?' m²':key==='rooms'?'+':'');const button=b(label+' ×',()=>{delete S.filters[key];go('browse');},'filter-chip');button.setAttribute('aria-label','Elimină filtrul '+label);return button;}),b('Resetează tot',()=>{S.filters={};go('browse');},'text-button reset-filters'));}
function monthlyTotalLabel(l){return l.monthlyCosts!=null&&Number.isFinite(l.monthlyCosts)?'Total lunar: '+money(Number(l.price)+l.monthlyCosts,l.currency)+' · declarat de proprietar':'Total lunar nespecificat';}
function rentalCosts(l){const row=(label,value)=>el('div',{class:'rental-cost-row'},el('dt',{},label),el('dd',{},value));return el('section',{class:'rental-costs','aria-label':'Detalii costuri închiriere'},el('dl',{},row('Total lunar',monthlyTotalLabel(l)),row('Chirie / lună',money(l.price,l.currency)),row('Garanție',l.rentDeposit!=null?money(l.rentDeposit,l.currency):'Nespecificată'),row('Alte costuri',l.rentCosts||'Nespecificate')),el('p',{class:'subtle'},'Sumele și condițiile sunt declarate de proprietar. Confirmă costurile înainte de a lua o decizie.'));}
function openPhotoViewer(l,start=0,onSelect=()=>{}){
  const photos=[...(l.photos||[])];if(!photos.length)return;
  let selected=0;
  const image=el('img',{class:'viewer-image',alt:'',decoding:'async'}),status=el('p',{class:'viewer-count',role:'status','aria-live':'polite'});
  const thumbs=[];
  const update=index=>{selected=(index+photos.length)%photos.length;image.src=photos[selected];image.alt='Fotografia '+(selected+1)+' din '+photos.length+' · '+l.title;status.textContent=(selected+1)+' / '+photos.length;thumbs.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===selected)));onSelect(selected);};
  const stage=el('div',{class:'viewer-stage'},image);
  if(photos.length>1){const prev=b('‹',()=>update(selected-1),'gallery-arrow previous'),next=b('›',()=>update(selected+1),'gallery-arrow next');prev.setAttribute('aria-label','Fotografia precedentă');next.setAttribute('aria-label','Fotografia următoare');stage.append(prev,next);}
  const root=el('section',{class:'photo-viewer'},el('div',{class:'viewer-heading'},el('h2',{id:'photo-viewer-title'},l.title),status),stage);
  if(photos.length>1){photos.forEach((src,index)=>thumbs.push(el('button',{type:'button',class:'gallery-thumbnail','aria-label':'Vezi fotografia '+(index+1),onclick:()=>update(index)},el('img',{src,alt:'',width:120,height:90,loading:'lazy'}))));root.append(el('div',{class:'gallery-thumbnails','aria-label':'Alege fotografia mărită'},...thumbs),el('p',{class:'viewer-hint'},'← → pentru fotografii · Esc pentru închidere'));}
  const onKeydown=event=>{const moves={ArrowLeft:selected-1,ArrowRight:selected+1,Home:0,End:photos.length-1};if(Object.hasOwn(moves,event.key)){event.preventDefault();update(moves[event.key]);}};
  update(Number.isInteger(start)?Math.max(0,Math.min(photos.length-1,start)):0);openModal(root,{className:'photo-dialog',label:'Fotografii · '+l.title,onKeydown});
}
function photoGallery(l){
  const photos=l.photos||[];if(!photos.length)return el('div',{class:'photo-placeholder detail-placeholder'},el('span',{'aria-hidden':'true'},'⌂'),el('p',{},'Fotografii indisponibile'));
  let selected=0;const image=el('img',{class:'detail-photo',width:1200,height:900,src:photos[0],alt:'Fotografia 1 din '+photos.length+' · '+l.title,decoding:'async'});
  const status=el('span',{class:'photo-counter','aria-live':'polite'},'1 / '+photos.length),thumbnails=[];
  const update=index=>{selected=(index+photos.length)%photos.length;image.src=photos[selected];image.alt='Fotografia '+(selected+1)+' din '+photos.length+' · '+l.title;status.textContent=(selected+1)+' / '+photos.length;thumbnails.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===selected)));};
  const stage=el('div',{class:'gallery-stage'},image,status,b('Mărește fotografiile ↗',()=>openPhotoViewer(l,selected,update),'gallery-expand'));
  if(photos.length>1){const prev=b('‹',()=>update(selected-1),'gallery-arrow previous'),next=b('›',()=>update(selected+1),'gallery-arrow next');prev.setAttribute('aria-label','Fotografia precedentă');next.setAttribute('aria-label','Fotografia următoare');stage.append(prev,next);}
  const container=el('div',{class:'property-gallery',tabindex:'0','aria-label':'Galerie fotografii. Folosește săgețile pentru a schimba fotografia.'},stage);
  let touchStart=null;stage.addEventListener('touchstart',event=>{const t=event.changedTouches[0];touchStart={x:t.clientX,y:t.clientY};},{passive:true});stage.addEventListener('touchend',event=>{if(!touchStart)return;const t=event.changedTouches[0],dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)update(selected+(dx<0?1:-1));touchStart=null;},{passive:true});
  container.addEventListener('keydown',e=>{if(e.target!==container)return;if(e.key==='ArrowRight'){e.preventDefault();update(selected+1);}if(e.key==='ArrowLeft'){e.preventDefault();update(selected-1);}});
  if(photos.length>1){for(const[src,index]of photos.map((src,index)=>[src,index]))thumbnails.push(el('button',{type:'button',class:'gallery-thumbnail','aria-label':'Vezi fotografia '+(index+1),'aria-pressed':String(index===0),onclick:()=>update(index)},el('img',{src,alt:'',width:120,height:90,loading:'lazy'})));container.append(el('div',{class:'gallery-thumbnails','aria-label':'Alege fotografia'},...thumbnails));}
  return container;
}


function caseHistory(data){const statusNames={open:'În analiză',resolved:'Soluționată',dismissed:'Respinsă',upheld:'Admisă'};const root=el('div',{},el('h3',{},'Sesizările și contestațiile tale'));if(data.account?.status&&data.account.status!=='active')root.append(note('Starea contului: '+({restricted:'restricționat',suspended:'suspendat'}[data.account.status]||data.account.status)+(data.account.restrictionReason?'. Motiv: '+data.account.restrictionReason:'')));if(!data.reports?.length&&!data.appeals?.length){root.append(el('p',{class:'subtle'},'Nu ai sesizări sau contestații înregistrate.'));return root;}for(const report of data.reports||[])root.append(el('article',{class:'list-item'},el('span',{class:'status'},'Sesizare · '+(statusNames[report.status]||report.status)),el('h3',{},report.listingTitle||'Sesizare'),el('p',{class:'case-date'},new Date(report.createdAt).toLocaleDateString('ro-RO')),el('p',{},report.details),report.decisionReason?note('Motivul deciziei: '+report.decisionReason):null,['resolved','dismissed'].includes(report.status)?b('Contestă această decizie',()=>appeal(report.id),'text-button'):null));for(const appealCase of data.appeals||[])root.append(el('article',{class:'list-item'},el('span',{class:'status'},'Contestație · '+(statusNames[appealCase.status]||appealCase.status)),el('p',{class:'case-date'},new Date(appealCase.createdAt).toLocaleDateString('ro-RO')),el('p',{},appealCase.reason),appealCase.decisionReason?note('Motivul deciziei: '+appealCase.decisionReason):null));return root;}
function userStatusDecision(userId,status){
  const title={restricted:'Restricționează contul',suspended:'Suspendă contul',active:'Reactivează contul'}[status],key='user-status:'+userId,errorHost=el('div',{class:'form-feedback',role:'alert'});
  const form=el('form',{},el('h2',{class:'modal-title'},title),el('p',{class:'subtle'},'Cont: '+userId),operationFields(key,field('Motiv documentat',el('textarea',{name:'reason',required:true,minlength:10,maxlength:1000})),el('button',{type:'submit',class:'button'},'Înregistrează decizia')),errorHost,note('Aplică o măsură proporțională, după analizarea dovezilor și a contextului.'));
  form.addEventListener('submit',event=>{event.preventDefault();const data={status,reason:form.elements.reason.value};return modalSubmission(form,key,()=>api('/api/moderation/users/'+encodeURIComponent(userId),'POST',data),{errorHost,success:'Decizia a fost înregistrată.',onVisible:async()=>{dialog.close();await moderation({historyMode:'none'});}});});openModal(form);
}

function resumeDraft(){resumeEditor();}
function phoneAvailabilityNotice(){if(S.boot?.capabilities.phoneVerification||S.boot?.user?.phoneVerified)return null;return el('div',{class:'beta-service-note',role:'note'},el('strong',{},'În beta, poți pregăti o ciornă.'),' Confirmarea telefonului prin SMS nu este încă activă. Pentru conturile cu telefon neconfirmat, publicarea și contactarea rămân indisponibile.');}

function listingSubmitControl(listing){
  const user=S.boot.user,canVerify=S.boot.capabilities.phoneVerification;
  let label='Trimite spre publicare',help='',blocked=false;
  if(!ownerAccountActive()){blocked=true;help='Contul are restricții. Poți cere revizuirea deciziei.';}
  else if(!user.phoneVerified){if(canVerify){label='Confirmă telefonul';help='Confirmă telefonul înainte de trimiterea la moderare.';}else{blocked=true;help='Publicarea așteaptă activarea confirmării SMS. Ciorna rămâne disponibilă.';}}
  else if(!listing.photos?.length){blocked=true;help='Adaugă cel puțin o fotografie înainte de trimiterea la moderare.';}
  const button=b(label,()=>{if(blocked)return;if(!user.phoneVerified)return phoneSetup();return ownerMutation(listing,'submit',{},'Anunțul a fost trimis la moderare.');},'button small secondary');
  button.disabled=blocked;if(help)button.setAttribute('aria-describedby','submit-help-'+listing.id);
  return el('div',{class:'submission-control'},button,help?el('small',{id:'submit-help-'+listing.id,class:'subtle'},help):null);
}

function listingAvailabilityNote(listing){if(listing.status!=='published'||!Number.isFinite(listing.availableUntil)||listing.availableUntil>Date.now()+5*86400000)return null;const when=new Date(listing.availableUntil).toLocaleDateString('ro-RO',{day:'numeric',month:'long',year:'numeric'});return note((listing.availableUntil<=Date.now()?'Disponibilitatea anunțului a expirat la ':'Reconfirmă disponibilitatea până la ')+when+'. '+(listing.availableUntil<=Date.now()?'Reconfirmă dacă proprietatea mai este disponibilă.':'Anunțul va ieși din căutări dacă nu îl reconfirmi.'));}

function homeQuestions(){
  const entries=[
    ['Cine poate publica un anunț?','Proprietarii și coproprietarii care oferă direct o proprietate din municipiul Cluj-Napoca. Relația cu proprietatea este declarată; confirmarea telefonului nu dovedește dreptul de proprietate.'],
    ['Ce pot face acum, în etapa de pilot?','Poți pregăti și salva o ciornă. Trimiterea la moderare și contactarea cer un telefon confirmat. '+(S.boot?.capabilities.phoneVerification?'Confirmarea telefonului este disponibilă pentru participanții autorizați.':'Serviciul SMS este încă oprit.')+' Pilotul are acces restrâns.'],
    ['Când devine vizibil numărul meu?','Numărul nu apare în profil sau în anunț. Proprietarul îl poate dezvălui separat unei persoane, după acceptarea solicitării de contact.'],
    ['Anunțul apare imediat după trimitere?','Nu. Un moderator trebuie să îl revizuiască. Modificările importante necesită o nouă revizuire; telefonul confirmat nu înlocuiește moderarea.'],
    ['Sunt incluse Florești, Baciu sau Apahida?','În această etapă, acceptăm numai proprietăți din municipiul Cluj-Napoca. Localitățile învecinate nu sunt incluse.']
  ];
  return el('section',{class:'section questions-section'},el('div',{},eye('Înainte să începi'),el('h2',{},'Răspunsuri clare. De la început.'),el('p',{class:'muted'},'Cum funcționează publicarea, contactul și protejarea datelor tale.')),el('div',{class:'questions-list'},...entries.map(([title,answer])=>el('details',{},el('summary',{},title),el('p',{},answer)))));
}
function accountReadiness(user){
  return el('section',{class:'account-readiness','aria-label':'Pașii publicării'},el('div',{},eye('Pregătește publicarea'),el('h3',{},'De la ciornă la prima conversație.')),el('ol',{},
    el('li',{},el('strong',{},'01 · Cont creat'),el('span',{},'Ai acces la spațiul tău și la ciorne.')),
    el('li',{},el('strong',{},user.phoneVerified?'02 · Telefon confirmat':'02 · Confirmarea telefonului'),el('span',{},user.phoneVerified?(ownerAccountActive()?'Poți continua cu trimiterea anunțului la moderare.':'Telefon confirmat. Restricțiile contului trebuie soluționate înainte de publicare.'):S.boot.capabilities.phoneVerification?'Confirmă numărul înainte de trimiterea anunțului.':'Poți pregăti anunțul acum. Confirmarea va fi disponibilă după activarea SMS.')),
    el('li',{},el('strong',{},'03 · Revizuire umană'),el('span',{},'Completezi anunțul și declarația, apoi îl trimiți unui moderator.'))));
}


function openMobileFilters(){
  let timer,sequence=0;
  const form=el('form',{class:'mobile-filters'},el('h2',{},'Găsește locul potrivit'),el('p',{class:'subtle'},'Cluj-Napoca · direct de la proprietar'));
  const grid=el('div',{class:'mobile-filter-grid'},field('Tranzacție',select('transaction',[['sale','Cumpăr'],['rent','Închiriez']],S.transaction)),field('Monedă',select('currency',[['EUR','EUR'],['RON','RON']],S.filters.currency||'EUR')),field('Cartier',select('district',[['','Toate cartierele'],...districts.map(v=>[v,v])],S.filters.district||'')),field('Tip',select('type',[['','Toate tipurile'],...Object.entries(typeNames)],S.filters.type||'')));
  for(const [name,label]of [['minPrice','Preț minim'],['maxPrice','Preț maxim'],['minArea','Suprafață minimă · m²'],['rooms','Minimum camere']])grid.append(field(label,el('input',{name,type:'number',min:0,inputmode:'decimal',value:S.filters[name]||''})));
  grid.append(field('Cuvinte-cheie',el('input',{name:'q',maxlength:100,value:S.filters.q||''})));
  const count=el('p',{role:'status','aria-live':'polite'}),apply=el('button',{type:'submit',class:'button'},'Arată rezultatele');
  const values=()=>Object.fromEntries(new FormData(form));
  const refresh=()=>{clearTimeout(timer);const current=++sequence;count.textContent='Actualizăm numărul…';timer=setTimeout(async()=>{try{const data=await api('/api/listings?'+new URLSearchParams({...values(),countOnly:'1'}));if(current!==sequence||!form.isConnected)return;apply.textContent='Arată '+data.total+' rezultate';count.textContent=data.total+' rezultate pentru filtrele alese.';}catch(error){if(current===sequence&&form.isConnected){count.textContent=error.message;apply.textContent='Arată rezultatele';}}},300);};
  form.append(grid,count,el('div',{class:'mobile-filter-actions'},b('Resetează',()=>{for(const control of form.querySelectorAll('input,select'))control.value=control.name==='currency'?'EUR':control.name==='transaction'?S.transaction:'';refresh();},'button secondary'),apply));
  form.addEventListener('input',refresh);form.addEventListener('change',refresh);form.addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);sequence++;const data=values();changeTransaction(data.transaction);delete data.transaction;S.filters=data;dialog.close();go('browse');});
  openModal(form,{className:'filter-dialog',label:'Filtrează rezultatele'});refresh();
}
function saveCurrentSearch(){requireUser(()=>attempt(async()=>{await api('/api/saved-searches','POST',{filters:{transaction:S.transaction,currency:'EUR',...S.filters}});toast('Căutarea este salvată în cont. Vezi anunțurile noi când revii.');}));}
async function loadSavedSearches(host,revision){
  try{const data=await api('/api/saved-searches');if(revision!==S.screenRevision)return;
    host.replaceChildren(el('h2',{},'Căutările tale'),el('p',{class:'subtle'},'Anunțurile noi apar aici când revii. Fără notificări prin email sau SMS.'));
    if(!data.searches?.length){host.append(el('p',{},'Nu ai încă o căutare salvată.'),b('Găsește o locuință',()=>go('browse'),'button secondary'));return;}
    for(const search of data.searches){const f=search.filters,label=[f.transaction==='rent'?'Închiriere':'Cumpărare',f.district||'Toate cartierele',f.currency,f.maxPrice?'până la '+f.maxPrice:null,f.q].filter(Boolean).join(' · ');
      host.append(el('article',{class:'saved-search-row'},el('div',{},el('h3',{},label),el('p',{class:'saved-search-count'},search.newCount+' anunțuri noi de la ultima vizită')),
        b('Vezi rezultatele',()=>{S.transaction=f.transaction;S.filters={...f};delete S.filters.transaction;S.sort='newest';S.savedSearchOpening={id:search.id,viewedThrough:search.viewedThrough};go('browse');},'button secondary'),
        b('Șterge',()=>attempt(async()=>{await api('/api/saved-searches/'+search.id,'DELETE');await loadSavedSearches(host,revision);}), 'text-button')));
    }
  }catch(error){if(revision===S.screenRevision)host.replaceChildren(el('h2',{},'Căutările tale'),note(error.message,true),b('Reîncearcă',()=>loadSavedSearches(host,revision),'button secondary'));}
}

init();
