import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {listingId,draftInput} from './seed.mjs';
const origin='http://127.0.0.1:4180';
const headers={origin};
async function login(page,role){await page.evaluate(()=>{if(typeof S!=='undefined'){clearTimeout(S.messagePollTimer);S.messagePollGeneration=(S.messagePollGeneration||0)+1;}}).catch(()=>{});const r=await page.request.post('/__test/login',{headers,data:{role}});expect(r.ok()).toBeTruthy();}
async function post(page,path,data={}){return page.request.post(path,{headers,data});}
async function accepted(page){await login(page,'buyer');const r=await post(page,'/api/contact-requests',{listingId:listingId(1),purpose:'DEMO: Caut o locuință pentru mine și doresc o vizionare.',contactDeclaration:true,declarationVersion:draftInput.declarationVersion});expect(r.status()).toBe(201);const {id}=await r.json();await login(page,'owner');expect((await post(page,'/api/conversations/'+id+'/decision',{decision:'accepted'})).ok()).toBeTruthy();return id;}
test.beforeEach(async({request})=>{const r=await request.post('/__test/reset',{headers});expect(r.status()).toBe(200);});

test('draft, simulated phone, submission, independent moderation',async({page})=>{
  await login(page,'unverified');
  await page.goto('/atelier');await expect(page.getByRole('button',{name:'Publică anunț +',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Publică anunț +',exact:true}).press('Enter');await page.getByRole('button',{name:'Vreau să vând →',exact:true}).press('Enter');
  const next=()=>page.getByRole('button',{name:'Continuă →',exact:true}).press('Enter');
  await next();await page.locator('[name=district]').selectOption('Centru');await next();
  await page.locator('[name=area]').fill('60');await page.locator('[name=rooms]').fill('2');await next();await page.locator('[name=price]').fill('120000');await next();
  await page.getByLabel('Adaugă fotografii',{exact:true}).setInputFiles({name:'DEMO.jpg',mimeType:'image/jpeg',buffer:Buffer.from(draftInput.photos[0].split(',')[1],'base64')});await expect(page.locator('.editor-photo')).toHaveCount(1);await next();
  await page.locator('[name=title]').fill('DEMO Ciornă creată în browser');await page.locator('textarea[name=description]').fill(draftInput.description);
  await expect(page.locator('.editor-save-state')).toContainText('Salvat acum');await page.reload();await page.getByRole('button',{name:'Continuă editarea',exact:true}).press('Enter');await expect(page.locator('.step-label')).toHaveText('PASUL 6 DIN 8');await expect(page.locator('[name=title]')).toHaveValue('DEMO Ciornă creată în browser');
  await next();await page.locator('[name=contactHours]').fill('DEMO: seara');await next();await page.locator('[name=ownerDeclaration]').press('Space');
  await page.getByRole('button',{name:'Previzualizare mobil',exact:true}).press('Enter');await expect(page.locator('.preview-mobile')).toBeVisible();await expect(page.locator('body')).not.toContainText('DEMO ADRESĂ PRIVATĂ');await page.getByRole('button',{name:'← Înapoi la editare',exact:true}).press('Enter');await page.getByRole('button',{name:'Salvează ciorna',exact:true}).press('Enter');
  await expect(page).toHaveURL(/view=account/);await expect(page.locator('.owner-inventory-host').getByText('DEMO Ciornă creată în browser',{exact:true})).toBeVisible();
  const mine=await (await page.request.get('/api/mine')).json(),id=mine.listings[0].id;
  expect((await post(page,'/api/listings/'+id+'/submit')).status()).toBe(403);
  expect((await post(page,'/api/phone/start',{phone:'+40700000009'})).ok()).toBeTruthy();
  expect((await post(page,'/api/phone/check',{code:'123456'})).ok()).toBeTruthy();
  expect((await post(page,'/api/listings/'+id+'/submit')).ok()).toBeTruthy();
  expect((await page.request.get('/api/listings/'+id)).status()).toBe(404);
  await login(page,'moderator');await page.goto('/atelier?view=moderation');
  const row=page.locator('article').filter({has:page.getByRole('heading',{name:'DEMO Ciornă creată în browser'})});await row.getByRole('button',{name:'Aprobă',exact:true}).press('Enter');
  await page.locator('#modal [name=reason]').fill('DEMO: revizuire editorială locală, fără verificarea proprietății.');await page.locator('#modal button[type=submit]').press('Enter');
  await expect.poll(async()=>(await page.request.get('/api/listings/'+id)).status()).toBe(200);
});

test('autosave distinguishes unsaved edits and preserves typing during a slow response',async({page},info)=>{
  await page.setViewportSize({width:375,height:812});await login(page,'unverified');await page.goto('/atelier');
  const publish=page.getByRole('button',{name:'Publică anunț +',exact:true});await expect(publish).toBeEnabled();await publish.press('Enter');await page.getByRole('button',{name:'Vreau să vând →',exact:true}).press('Enter');
  await page.getByRole('button',{name:'Continuă →',exact:true}).press('Enter');const address=page.locator('[name=exactAddress]'),state=page.locator('.editor-save-state');
  await address.fill('DEMO adresă privată inițială');await expect(state).toContainText('Salvat acum');
  const folder='outputs/e2e/'+info.project.name+'/draft-recovery';await mkdir(folder,{recursive:true});await page.screenshot({path:folder+'/before-edit.png',fullPage:true});
  let release,notify,held=false;const gate=new Promise(resolve=>release=resolve),intercepted=new Promise(resolve=>notify=resolve);
  await page.route('**/api/editor-draft',async route=>{if(route.request().method()==='PUT'&&!held){held=true;notify();await gate;}await route.continue();});
  try{
    await address.fill('DEMO editare înainte de răspuns');await expect(state).toContainText('Modificări nesalvate încă');await intercepted;
    await address.fill('DEMO text nou în timpul salvării');await expect(state).toContainText('Salvăm automat');await page.screenshot({path:folder+'/saving-newer-edits.png',fullPage:true});
  }finally{release();}
  await expect.poll(async()=>((await (await page.request.get('/api/editor-draft')).json()).draft||{}).exactAddress).toBe('DEMO text nou în timpul salvării');await expect(state).toContainText('Salvat acum');
  await page.reload();await page.getByRole('button',{name:'Continuă editarea',exact:true}).press('Enter');await expect(page.locator('[name=exactAddress]')).toHaveValue('DEMO text nou în timpul salvării');await expect(page.locator('.editor-save-state')).toContainText('Salvat acum');
  await expect(page.locator('.editor-save-announcement')).toHaveText('Ciorna este salvată în cont.');await expect(page.locator('.editor-save-state')).toHaveAttribute('aria-live','off');
  const clock=await page.locator('.editor-save-state').textContent();await page.evaluate(()=>{window.announcementWrites=0;window.announcementObserver=new MutationObserver(records=>window.announcementWrites+=records.length);window.announcementObserver.observe(document.querySelector('.editor-save-announcement'),{subtree:true,childList:true,characterData:true});});
  await expect.poll(()=>page.locator('.editor-save-state').textContent()).not.toBe(clock);expect(await page.evaluate(()=>{window.announcementObserver.disconnect();return window.announcementWrites;})).toBe(0);
  await page.screenshot({path:folder+'/after-recovery.png',fullPage:true});
});

test('discard failure retains the working copy and an explicit retry preserves saved listings',async({page},info)=>{
  await page.setViewportSize({width:375,height:812});await login(page,'unverified');const saved=await post(page,'/api/listings',{...draftInput,title:'DEMO Anunț salvat separat'});expect(saved.status()).toBe(201);const {listing}=await saved.json();
  await page.goto('/atelier');const publish=page.getByRole('button',{name:'Publică anunț +',exact:true});await expect(publish).toBeEnabled();await publish.press('Enter');await page.getByRole('button',{name:'Vreau să vând →',exact:true}).press('Enter');await page.getByRole('button',{name:'Continuă →',exact:true}).press('Enter');
  await page.locator('[name=exactAddress]').fill('DEMO ciornă păstrată după eroare');await expect(page.locator('.editor-save-state')).toContainText('Salvat acum');await page.getByRole('button',{name:'Contul meu',exact:true}).press('Enter');
  let deletes=0;await page.route('**/api/editor-draft',async route=>{if(route.request().method()==='DELETE'&&++deletes===1){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'DEMO: eliminarea nu a fost confirmată.'})});return;}await route.continue();});
  await page.getByRole('button',{name:'Renunță',exact:true}).press('Enter');await expect(page.getByRole('dialog')).toContainText('ciorna de lucru din cont');await page.getByRole('button',{name:'Renunță la modificări',exact:true}).press('Enter');await expect(page.locator('#modal .form-feedback')).toContainText('eliminarea nu a fost confirmată');
  expect((await (await page.request.get('/api/editor-draft')).json()).draft.exactAddress).toBe('DEMO ciornă păstrată după eroare');expect(deletes).toBe(1);expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('intre-noi-editor:'+S.boot.user.id)).draft.exactAddress)).toBe('DEMO ciornă păstrată după eroare');
  const folder='outputs/e2e/'+info.project.name+'/draft-discard';await mkdir(folder,{recursive:true});await page.screenshot({path:folder+'/failure-preserves-copy.png',fullPage:true});
  await page.getByRole('button',{name:'Renunță la modificări',exact:true}).press('Enter');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.locator('.draft-resume')).toHaveCount(0);expect(deletes).toBe(2);expect((await (await page.request.get('/api/editor-draft')).json()).draft).toBeNull();
  const mine=await (await page.request.get('/api/mine')).json();expect(mine.listings.some(l=>l.id===listing.id&&l.status==='draft')).toBeTruthy();await expect(page.getByRole('heading',{name:'DEMO Anunț salvat separat',exact:true})).toBeVisible();await page.screenshot({path:folder+'/saved-listing-preserved.png',fullPage:true});
});

test('search filters, detail, favorites and comparison',async({page},info)=>{
  await login(page,'buyer');await page.goto('/atelier?view=browse&transaction=sale&currency=EUR');
  if(page.viewportSize().width<=620){await page.setViewportSize({width:375,height:812});await page.getByRole('button',{name:'Filtrează rezultatele',exact:true}).press('Enter');await page.locator('#modal [name=district]').selectOption('Centru');await expect(page.locator('#modal button[type=submit]')).toHaveText('Arată 2 rezultate');const folder='outputs/e2e/'+info.project.name+'/filters';await mkdir(folder,{recursive:true});await page.screenshot({path:folder+'/mobile-panel.png'});await page.locator('#modal button[type=submit]').press('Enter');}
  else {await page.locator('[name=district]').selectOption('Centru');await page.getByRole('button',{name:/Caută anunțuri/}).press('Enter');}
  await page.locator('.save-search-button').press('Enter');await expect(page.locator('#toast')).toContainText('Căutarea este salvată');
  await page.goto('/atelier?view=account');await expect(page.locator('.saved-search-count')).toHaveText('0 anunțuri noi de la ultima vizită');await page.getByRole('button',{name:'Vezi rezultatele',exact:true}).press('Enter');
  await expect(page.locator('.property-card')).toHaveCount(2);await expect(page).toHaveURL(/district=Centru/);
  await page.locator('.card-photo-link').first().press('Enter');await expect(page.locator('h1')).toContainText('DEMO');await expect(page.locator('body')).not.toContainText('DEMO ADRESĂ PRIVATĂ');
  await page.locator('.property-gallery').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('.photo-counter')).toHaveText('2 / 2');
  await page.locator('.favorite-toggle:visible').first().press('Enter');await expect(page.locator('.favorite-toggle[aria-pressed="true"]:visible').first()).toBeVisible();
  await page.goto('/atelier?listing='+listingId(2));await page.locator('.favorite-toggle:visible').first().press('Enter');await expect(page.locator('.favorite-toggle[aria-pressed="true"]:visible').first()).toBeVisible();
  await page.goto('/atelier?view=favorites');await page.locator('.favorite-compare-button[aria-pressed="false"]').first().press('Enter');await page.locator('.favorite-compare-button[aria-pressed="false"]').first().press('Enter');await page.getByRole('button',{name:'Compară proprietățile ↗',exact:true}).press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('table')).toBeVisible();
});

test('request, acceptance, messages, viewing and explicit phone disclosure',async({page},info)=>{
  await login(page,'buyer');await page.goto('/atelier?listing='+listingId(1));await page.locator('.detail-panel .property-contact-button').press('Enter');
  await page.locator('#modal textarea').fill('DEMO: Mă interesează această locuință pentru uz personal.');await page.locator('#modal input[type=checkbox]').press('Space');await page.getByRole('button',{name:'Trimite solicitarea',exact:true}).press('Enter');
  await expect(page).toHaveURL(/conversation=/);const id=new URL(page.url()).searchParams.get('conversation');
  await login(page,'owner');await page.reload();await page.getByRole('button',{name:'Acceptă conversația',exact:true}).press('Enter');await expect(page.locator('.conversation-composer')).toBeVisible();
  await login(page,'buyer');await page.reload();await page.locator('textarea[name=body]').fill('DEMO: Putem stabili o vizionare?');await page.getByRole('button',{name:'Trimite mesajul ↗',exact:true}).press('Enter');await expect(page.locator('.message-bubble')).toContainText('DEMO: Putem stabili o vizionare?');
  await page.getByRole('button',{name:'Propune o vizionare →',exact:true}).press('Enter');const time=Date.now()+2*86400000;const value=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Bucharest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(time).replace(' ','T');await page.locator('[name=startsAt]').fill(value);await expect(page.locator('.viewing-time-preview')).toContainText('Europe/Bucharest');await page.getByRole('button',{name:'Trimite propunerea',exact:true}).press('Enter');await expect(page.locator('.viewing-card')).toContainText('Așteaptă confirmarea');
  await login(page,'owner');await page.goto('/atelier');await expect(page).toHaveTitle(/^\(1\)/);await expect(page.locator('[data-message-nav]:visible').first()).toContainText('(1)');await page.goto('/atelier?view=messages&conversation='+id);await expect(page.locator('.inbox-awaiting')).toBeVisible();await expect.poll(async()=>(await (await page.request.get('/api/notifications')).json()).unreadMessages).toBe(0);await page.getByRole('button',{name:'Confirmă vizionarea',exact:true}).press('Enter');await expect(page.locator('.viewing-card')).toContainText('Confirmată');const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'Descarcă în calendar (.ics)',exact:true}).press('Enter');const download=await downloadPromise;const folder='outputs/e2e/'+info.project.name+'/calendar';await mkdir(folder,{recursive:true});await download.saveAs(folder+'/vizionare.ics');await page.screenshot({path:folder+'/confirmed.png',fullPage:true});
  await page.locator('.conversation-safety summary').press('Enter');await page.getByRole('button',{name:'Oferă acces la numărul meu',exact:true}).press('Enter');await page.getByRole('button',{name:'Ofer acces acestei persoane',exact:true}).press('Enter');await expect(page.locator('.conversation-safety')).toContainText('Ai oferit acces la telefon');
  await login(page,'buyer');await page.reload();await expect(page.locator('.shared-phone a')).toHaveAttribute('href',/^tel:/);expect((await (await page.request.get('/api/conversations/'+id)).json()).phone).toBeTruthy();
});

test('viewings from another device zone preserve the instant and reject the DST gap',async({page,browser},info)=>{
  const id=await accepted(page);
  const context=await browser.newContext({baseURL:origin,timezoneId:'America/New_York',viewport:{width:375,height:812}});
  try{
    const foreign=await context.newPage();await login(foreign,'buyer');await foreign.goto('/atelier?view=messages&conversation='+id);
    await foreign.getByRole('button',{name:'Propune o vizionare →',exact:true}).press('Enter');
    const target=new Date(Date.now()+2*86400000);target.setUTCHours(12,0,0,0);const expected=target.getTime();
    const value=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(expected).replace(' ','T');
    const input=foreign.locator('[name=startsAt]');await input.fill(value);
    await expect(foreign.locator('#modal')).toContainText('Fusul dispozitivului: America/New_York');
    await expect(foreign.locator('.viewing-time-preview')).toHaveText('În Cluj-Napoca: '+new Intl.DateTimeFormat('ro-RO',{timeZone:'Europe/Bucharest',dateStyle:'long',timeStyle:'short'}).format(expected)+' · Europe/Bucharest');
    const folder='outputs/e2e/'+info.project.name+'/viewing-time';await mkdir(folder,{recursive:true});
    await foreign.screenshot({path:folder+'/foreign-zone.png'});
    await foreign.getByRole('button',{name:'Trimite propunerea',exact:true}).press('Enter');await expect(foreign.locator('#modal')).not.toBeVisible();
    const saved=await (await foreign.request.get('/api/conversations/'+id)).json();expect(saved.viewings).toHaveLength(1);expect(saved.viewings[0].startsAt).toBe(expected);
    // Only the browser clock moves. No simulated date is submitted to local D1.
    await foreign.clock.setFixedTime(new Date('2027-03-12T12:00:00Z'));
    await foreign.getByRole('button',{name:'Propune o vizionare →',exact:true}).press('Enter');
    let writes=0;foreign.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/viewings'))writes++;});
    await input.fill('2027-03-14T02:30');await expect(foreign.locator('.viewing-time-preview')).toContainText('Ora aleasă nu există');
    await foreign.getByRole('button',{name:'Trimite propunerea',exact:true}).press('Enter');
    expect(await input.evaluate(node=>node.validity.customError)).toBe(true);await expect(input).toHaveValue('2027-03-14T02:30');await expect(foreign.locator('#modal')).toBeVisible();expect(writes).toBe(0);
    await foreign.screenshot({path:folder+'/nonexistent-time.png'});
    await input.fill('2027-03-14T03:30');expect(await input.evaluate(node=>node.validationMessage)).toBe('');
    await expect(foreign.locator('.viewing-time-preview')).toContainText('09:30');
    await foreign.screenshot({path:folder+'/corrected-time.png'});
  }finally{await context.close();}
});

test('report and block revoke phone and prevent further messages',async({page})=>{
  const id=await accepted(page);await post(page,'/api/conversations/'+id+'/share-phone');await login(page,'buyer');await page.goto('/atelier?view=messages&conversation='+id);
  await page.locator('.conversation-safety summary').press('Enter');await page.getByRole('button',{name:'Raportează o problemă',exact:true}).press('Enter');await page.locator('#modal textarea').fill('DEMO: raport local pentru verificarea fluxului de moderare.');await page.getByRole('button',{name:'Trimite raportarea',exact:true}).press('Enter');await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button',{name:'Blochează acest contact',exact:true}).press('Enter');await page.getByRole('button',{name:'Confirmă blocarea',exact:true}).press('Enter');await expect(page.locator('.conversation-state')).toContainText('blocat');
  const detail=await (await page.request.get('/api/conversations/'+id)).json();expect(detail.phone).toBeNull();expect((await post(page,'/api/conversations/'+id+'/messages',{body:'DEMO mesaj blocat'})).status()).toBe(403);
});

test('unverified phone allows drafts but blocks publishing and contacting',async({page})=>{
  await login(page,'unverified');const r=await post(page,'/api/listings',draftInput);expect(r.status()).toBe(201);const {listing}=await r.json();expect((await post(page,'/api/listings/'+listing.id+'/submit')).status()).toBe(403);
  expect((await post(page,'/api/contact-requests',{listingId:listingId(1),purpose:'DEMO: interes personal pentru această locuință.',contactDeclaration:true,declarationVersion:draftInput.declarationVersion})).status()).toBe(403);
  await page.goto('/atelier?view=account');await expect(page.locator('body')).toContainText(draftInput.title);
});

for(const viewport of [{width:375,height:812},{width:768,height:1024},{width:1280,height:800}])test('screenshots and axe '+viewport.width,async({page},info)=>{
  test.setTimeout(90000);await page.setViewportSize(viewport);const id=await accepted(page);await login(page,'buyer');
  for(const n of [1,2])expect((await page.request.put('/api/favorites/'+listingId(n),{headers})).ok()).toBeTruthy();
  const folder='outputs/e2e/'+info.project.name+'/'+viewport.width;await mkdir(folder,{recursive:true});
  const report=[];
  async function capture(name){await expect(page.locator('#main-content')).toBeVisible();await expect(page.locator('.loading')).toHaveCount(0);await page.evaluate(async()=>{const start=scrollY;for(let y=0;y<document.body.scrollHeight;y+=innerHeight){scrollTo(0,y);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);}scrollTo(0,start);});await page.waitForLoadState('networkidle');await page.screenshot({path:folder+'/'+name+'.png',fullPage:name!=='comparison'});const result=await new AxeBuilder({page}).analyze();report.push({page:name,violations:result.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});await writeFile(folder+'/axe.json',JSON.stringify(report,null,2));expect(result.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),name+' serious/critical axe').toEqual([]);const small=await page.locator('button,select,textarea,input:not([type=checkbox]):not([type=radio]),summary,a.button').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&!n.closest('[hidden]')&&(r.width<43.9||r.height<43.9);}).map(n=>({tag:n.tagName,text:n.textContent?.slice(0,60),width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));expect(small,name+' targets 44px').toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' no page overflow').toBeTruthy();}
  await page.goto('/atelier');await capture('home');await page.goto('/atelier?view=browse&transaction=sale&currency=EUR');await capture('results');await page.goto('/atelier?listing='+listingId(1));await capture('listing');
  await page.goto('/atelier?view=favorites');for(let n=0;n<2;n++)await page.locator('.favorite-compare-button[aria-pressed="false"]').first().press('Enter');await page.getByRole('button',{name:'Compară proprietățile ↗',exact:true}).press('Enter');await capture('comparison');await page.keyboard.press('Escape');
  await page.goto('/atelier?view=messages&conversation='+id);await capture('conversation');
  await login(page,'owner');await page.goto('/atelier');await expect(page.getByRole('button',{name:'Publică anunț +',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Publică anunț +',exact:true}).press('Enter');await page.getByRole('button',{name:'Vreau să vând →',exact:true}).press('Enter');await capture('editor');
  await page.goto('/atelier?view=account');await expect(page.locator('.owner-listing')).toHaveCount(8);await capture('owner');
  const geometry=await page.locator('.owner-filter').evaluateAll(buttons=>buttons.map(button=>{
    const box=button.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(button);const label=range.getBoundingClientRect();
    return {text:button.textContent,left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height,labelLeft:label.left,labelRight:label.right};
  }));
  expect(geometry).toHaveLength(6);
  for(const button of geometry){
    expect(button.labelLeft,button.text+' left edge').toBeGreaterThanOrEqual(button.left+1);expect(button.labelRight,button.text+' right edge').toBeLessThanOrEqual(button.right-1);
    expect(button.width,button.text+' touch width').toBeGreaterThanOrEqual(44);expect(button.height,button.text+' touch height').toBeGreaterThanOrEqual(44);
    expect(button.left,button.text+' viewport left').toBeGreaterThanOrEqual(0);expect(button.right,button.text+' viewport right').toBeLessThanOrEqual(viewport.width);
  }
  for(let i=0;i<geometry.length;i++)for(let j=i+1;j<geometry.length;j++){const a=geometry[i],b=geometry[j];expect(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,a.text+' / '+b.text+' do not overlap').toBeTruthy();}
  await writeFile(folder+'/owner-filter-geometry.json',JSON.stringify(geometry,null,2));
  const filters=page.locator('.owner-filter');await filters.first().focus();for(let i=1;i<6;i++){await page.keyboard.press('Tab');await expect(filters.nth(i)).toBeFocused();}
  await page.keyboard.press('Enter');await expect(filters.last()).toHaveAttribute('aria-pressed','true');await expect(page.locator('.owner-results')).toContainText('Niciun anunț în această selecție.');
  await page.getByRole('button',{name:'Arată toate anunțurile',exact:true}).press('Enter');await expect(filters.first()).toHaveAttribute('aria-pressed','true');await expect(page.locator('.owner-listing')).toHaveCount(8);
  await writeFile(folder+'/axe.json',JSON.stringify(report,null,2));await info.attach('axe-report',{body:JSON.stringify(report),contentType:'application/json'});
});


test('keyboard navigation, dialog containment and mobile composer geometry',async({page},info)=>{
  const id=await accepted(page);await login(page,'buyer');await page.goto('/atelier');await expect(page.locator('html')).toHaveAttribute('lang','ro');
  async function tabTo(locator){await expect(locator).toBeEnabled();for(let n=0;n<120;n++){if(await locator.evaluate(node=>node===document.activeElement))return;await page.keyboard.press('Tab');}throw Error('Unreachable by Tab: '+await locator.textContent());}
  const publish=page.getByRole('button',{name:'Publică anunț +',exact:true});await tabTo(publish);await expect(publish).toBeFocused();expect(await publish.evaluate(n=>getComputedStyle(n).outlineStyle)).not.toBe('none');await page.keyboard.press('Enter');
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();for(let n=0;n<12;n++){await page.keyboard.press('Tab');expect(await dialog.evaluate(d=>d.contains(document.activeElement))).toBeTruthy();}await page.keyboard.press('Escape');await expect(publish).toBeFocused();
  await page.goto('/atelier?view=messages&conversation='+id);const input=page.locator('textarea[name=body]');await tabTo(input);await page.keyboard.type('DEMO text păstrat când se schimbă dimensiunea ferestrei');await page.setViewportSize({width:375,height:500});await expect(input).toHaveValue('DEMO text păstrat când se schimbă dimensiunea ferestrei');
  const box=await page.locator('.conversation-composer').boundingBox();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(501);expect(await input.evaluate(n=>parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(16);
  const folder='outputs/e2e/'+info.project.name+'/keyboard';await mkdir(folder,{recursive:true});await page.screenshot({path:folder+'/composer-small-viewport.png'});
  await page.keyboard.press('Tab');await page.keyboard.press('Enter');await expect(page.locator('.message-bubble')).toContainText('DEMO text păstrat');
});


test('incoming live message preserves focused unsent text across two local contexts',async({page,browser})=>{
  const id=await accepted(page);await login(page,'buyer');await page.goto('/atelier?view=messages&conversation='+id);
  const input=page.locator('textarea[name=body]');await input.fill('DEMO ciornă netrimisă');
  const owner=await browser.newContext({baseURL:origin});try{
    expect((await owner.request.post('/__test/login',{headers,data:{role:'owner'}})).ok()).toBeTruthy();
    expect((await owner.request.post('/api/conversations/'+id+'/messages',{headers,data:{body:'DEMO mesaj primit în timp real'}})).ok()).toBeTruthy();
    await expect(page.locator('.message-bubble')).toContainText('DEMO mesaj primit în timp real',{timeout:20000});await expect(input).toHaveValue('DEMO ciornă netrimisă');await expect(input).toBeFocused();
    await expect.poll(async()=>(await (await page.request.get('/api/notifications')).json()).unreadMessages).toBe(0);
  }finally{await owner.close();}
});

test('live inbox refresh preserves keyboard focus on the conversation row',async({page,browser},info)=>{
  const id=await accepted(page);await login(page,'buyer');await page.goto('/atelier?view=messages&conversation='+id);
  const row=page.locator('.inbox-row').first();await row.focus();await expect(row).toBeFocused();
  const folder='outputs/e2e/'+info.project.name+'/inbox-focus';await mkdir(folder,{recursive:true});await page.screenshot({path:folder+'/before-refresh.png',fullPage:true});
  const owner=await browser.newContext({baseURL:origin});try{
    expect((await owner.request.post('/__test/login',{headers,data:{role:'owner'}})).ok()).toBeTruthy();
    expect((await owner.request.post('/api/conversations/'+id+'/messages',{headers,data:{body:'DEMO mesaj pentru verificarea focusului'}})).ok()).toBeTruthy();
    await expect(page.locator('.message-bubble')).toContainText('DEMO mesaj pentru verificarea focusului',{timeout:20000});
    await expect(row).toBeFocused();await expect(row).toHaveAttribute('data-conversation-id',id);
    await page.screenshot({path:folder+'/after-refresh.png',fullPage:true});
  }finally{await owner.close();}
});

test('saved search seen failure preserves usable results',async({page},info)=>{
  await page.setViewportSize({width:375,height:812});await login(page,'buyer');
  const saved=await post(page,'/api/saved-searches',{filters:{transaction:'sale',currency:'EUR',district:'Centru'}});expect(saved.status()).toBe(201);
  let seenRequests=0;await page.route('**/api/saved-searches/*/seen',async route=>{seenRequests++;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'DEMO: marcaj indisponibil.'})});});
  await page.goto('/atelier?view=account');await page.getByRole('button',{name:'Vezi rezultatele',exact:true}).press('Enter');
  await expect(page.locator('.saved-search-sync-warning')).toContainText('Nu am putut actualiza numărul');await expect(page.locator('.property-card')).toHaveCount(2);await expect(page.locator('.search-error')).toHaveCount(0);expect(seenRequests).toBe(1);
  // These local DEMO cards both have a photo. Exercise the lazy image as a
  // visitor would, then return to the original position for the full-page proof.
  const photos = page.locator('.property-card .card-photo-link img');
  await expect(photos).toHaveCount(2);
  const initialScroll = await page.evaluate(() => window.scrollY);
  for (const photo of await photos.all()) {
    await photo.scrollIntoViewIfNeeded();
    const width = await photo.evaluate(async image => {
      await image.decode();
      return image.naturalWidth;
    });
    expect(width).toBeGreaterThan(0);
  }
  await page.evaluate(async y => {
    window.scrollTo({top: y, behavior: 'instant'});
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  }, initialScroll);
  const folder='outputs/e2e/'+info.project.name+'/saved-search-failure';await mkdir(folder,{recursive:true});await page.screenshot({path:folder+'/results-preserved.png',fullPage:true});
  const axe=await new AxeBuilder({page}).analyze();await writeFile(folder+'/axe.json',JSON.stringify(axe.violations,null,2));expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);
  await page.locator('.card-photo-link').first().press('Enter');await expect(page.locator('h1')).toContainText('DEMO');
});

test('failed saved search does not mark unseen results through a different search',async({page},info)=>{
  await page.setViewportSize({width:375,height:812});await login(page,'buyer');
  expect((await post(page,'/api/saved-searches',{filters:{transaction:'sale',currency:'EUR',district:'Centru'}})).status()).toBe(201);
  let seenRequests=0;page.on('request',request=>{if(request.url().includes('/saved-searches/')&&request.url().endsWith('/seen'))seenRequests++;});
  let failNext=true;await page.route('**/api/listings?*',async route=>{if(failNext){failNext=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'DEMO: căutare indisponibilă.'})});}else await route.continue();});
  await page.goto('/atelier?view=account');await page.getByRole('button',{name:'Vezi rezultatele',exact:true}).press('Enter');await expect(page.locator('.search-error')).toBeVisible();
  await page.getByRole('button',{name:'Filtrează rezultatele',exact:true}).press('Enter');await page.locator('#modal [name=district]').selectOption('Zorilor');await expect(page.locator('#modal button[type=submit]')).toContainText('Arată');await page.locator('#modal button[type=submit]').press('Enter');
  await expect(page.locator('.search-results')).toHaveAttribute('aria-busy','false');await expect(page.locator('.search-error')).toHaveCount(0);await expect(page).toHaveURL(/district=Zorilor/);expect(seenRequests).toBe(0);
  const folder='outputs/e2e/'+info.project.name+'/saved-search-navigation';await mkdir(folder,{recursive:true});await page.screenshot({path:folder+'/independent-search.png',fullPage:true});
  await page.getByRole('button',{name:'Contul meu',exact:true}).first().press('Enter');await page.getByRole('button',{name:'Vezi rezultatele',exact:true}).press('Enter');await expect(page.locator('.property-card')).toHaveCount(2);await expect(page.locator('.search-results')).toHaveAttribute('aria-busy','false');expect(seenRequests).toBe(1);
});

test('saved search summaries distinguish all saved filters on mobile',async({page},info)=>{
 await page.setViewportSize({width:375,height:812});await login(page,'buyer');
 const filters={transaction:'sale',currency:'RON',district:'Centru',type:'apartment',minPrice:'100000',maxPrice:'200000',minArea:'50',rooms:'2',q:'balcon'};
 for(const f of [filters,{...filters,type:'house',minPrice:'120000',minArea:'80',rooms:'3'}])expect((await post(page,'/api/saved-searches',{filters:f})).status()).toBe(201);
 await page.goto('/atelier?view=account');const rows=page.locator('.saved-search-row');await expect(rows).toHaveCount(2);
 const apartment=rows.filter({has:page.getByRole('heading',{name:/Apartament/})});const house=rows.filter({has:page.getByRole('heading',{name:/Casă/})});
 await expect(apartment).toContainText('de la 100000 RON');await expect(apartment).toContainText('până la 200000 RON');await expect(apartment).toContainText('minimum 50 m²');await expect(apartment).toContainText('2+ camere');await expect(house).toContainText('minimum 80 m²');await expect(house).toContainText('3+ camere');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 const folder='outputs/e2e/'+info.project.name+'/saved-search-labels';await mkdir(folder,{recursive:true});await page.screenshot({path:folder+'/distinct-searches.png',fullPage:true});const axe=await new AxeBuilder({page}).analyze();await writeFile(folder+'/axe.json',JSON.stringify(axe.violations,null,2));expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);
 await apartment.getByRole('button',{name:'Vezi rezultatele',exact:true}).press('Enter');await expect(page).toHaveURL(/type=apartment/);await expect(page).toHaveURL(/minArea=50/);await expect(page).toHaveURL(/rooms=2/);await expect(page).toHaveURL(/currency=RON/);
});

test('favorite pages preserve loaded cards after failure and expose older saves',async({page},info)=>{
  await page.setViewportSize({width:375,height:812});
  await login(page,'buyer');
  for(const n of [1,2,3]){
    expect((await page.request.put('/api/favorites/'+listingId(n),{headers})).ok()).toBeTruthy();
  }
  let failNext=true;
  // Small real D1 pages exercise the boundary with three existing DEMO listings.
  await page.route('**/api/favorites*',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname!=='/api/favorites')return route.continue();
    if(!url.searchParams.has('idsOnly') && url.searchParams.has('cursor') && failNext){
      failNext=false;
      return route.fulfill({status:503,json:{error:'Pagina următoare este temporar indisponibilă.'}});
    }
    url.searchParams.set('limit','2');
    return route.continue({url:url.href});
  });
  await page.goto('/atelier?view=favorites');
  const cards=page.locator('.property-card');
  await expect(cards).toHaveCount(2);
  const folder='outputs/e2e/'+info.project.name+'/favorite-pages';
  await mkdir(folder,{recursive:true});
  await page.screenshot({path:folder+'/first-page.png',fullPage:true});
  const more=page.getByRole('button',{name:'Arată mai multe favorite'});
  await expect(page.getByRole('group',{name:'Proprietăți selectate pentru comparație'})).toBeAttached();
  const firstAxe=await new AxeBuilder({page}).analyze();
  await writeFile(folder+'/axe-first.json',JSON.stringify(firstAxe.violations,null,2));
  expect(firstAxe.violations).toEqual([]);
  await cards.first().locator('.favorite-compare-button').press('Enter');
  await more.press('Enter');
  await expect(page.getByText('Pagina următoare este temporar indisponibilă.',{exact:false})).toBeVisible();
  await expect(cards).toHaveCount(2);
  await more.press('Enter');
  await expect(cards).toHaveCount(3);
  await expect(more).toHaveCount(0);
  await expect(cards.last().locator('.card-title')).toBeFocused();
  await expect(cards.last().locator('.favorite-toggle')).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:folder+'/all-pages.png',fullPage:true});
  await cards.last().locator('.favorite-compare-button').press('Enter');
  await page.getByRole('button',{name:'Compară proprietățile ↗'}).press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  const result=await new AxeBuilder({page}).analyze();
  await writeFile(folder+'/axe.json',JSON.stringify(result.violations,null,2));
  expect(result.violations).toEqual([]);
  await cards.first().locator('.card-title').press('Enter');
  failNext=true;
  await page.getByRole('button',{name:'← Înapoi la favorite'}).press('Enter');
  await expect(cards).toHaveCount(2);
  const retry=page.getByRole('button',{name:'Reîncearcă încărcarea selecției'});
  await expect(retry).toBeVisible();
  await page.screenshot({path:folder+'/return-partial.png',fullPage:true});
  const partialAxe=await new AxeBuilder({page}).analyze();
  await writeFile(folder+'/axe-return.json',JSON.stringify(partialAxe.violations,null,2));
  expect(partialAxe.violations).toEqual([]);
  await retry.press('Enter');
  await expect(cards).toHaveCount(3);
  const restored=page.getByRole('button',{name:'Compară proprietățile ↗'});
  await expect(restored).toBeFocused();
  await restored.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('photo draft stays editable when account save and tab storage both fail',async({page},info)=>{
  await page.setViewportSize({width:375,height:812});
  await login(page,'unverified');await page.goto('/atelier');
  const publish=page.getByRole('button',{name:'Publică anunț +',exact:true});
  await expect(publish).toBeEnabled();
  await publish.press('Enter');
  await page.getByRole('button',{name:'Vreau să vând →',exact:true}).press('Enter');
  const next=()=>page.getByRole('button',{name:'Continuă →',exact:true}).press('Enter');
  await next();await page.locator('[name=district]').selectOption('Centru');await next();
  await page.locator('[name=area]').fill('60');await page.locator('[name=rooms]').fill('2');await next();
  await page.locator('[name=price]').fill('120000');await next();
  const state=page.locator('.editor-save-state');
  await expect(state).toHaveText(/^Salvat acum \d+ secunde$/);
  const fixture=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=2600;c.height=1950;
    const ctx=c.getContext('2d');ctx.fillStyle='#435d45';ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle='white';ctx.font='120px sans-serif';ctx.fillText('DEMO',100,200);
    return c.toDataURL('image/jpeg').split(',')[1];
  });
  const folder='outputs/e2e/'+info.project.name+'/draft-storage-full';
  await mkdir(folder,{recursive:true});
  await page.screenshot({path:folder+'/before-photo.png',fullPage:true});
  await page.evaluate(()=>{
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      if(key.startsWith('intre-noi-editor:'))throw new DOMException('DEMO: spațiu epuizat','QuotaExceededError');
      return original.call(this,key,value);
    };
  });
  let offline=true;
  await page.route('**/api/editor-draft',route=>offline && route.request().method()==='PUT'
    ? route.fulfill({status:503,json:{error:'Salvarea în cont este temporar indisponibilă.'}})
    : route.continue());
  await page.getByLabel('Adaugă fotografii',{exact:true}).setInputFiles({name:'DEMO.jpg',mimeType:'image/jpeg',buffer:Buffer.from(fixture,'base64')});
  const photo=page.locator('.editor-photo img');
  await expect(photo).toHaveCount(1);
  await expect(state).toContainText('Salvarea în cont este temporar indisponibilă.');
  await expect(state).toContainText('Ține fila deschisă');
  await expect(page.locator('.editor-save-announcement')).toContainText('Ține fila deschisă');
  expect(await photo.evaluate(async image=>{await image.decode();return [image.naturalWidth,image.naturalHeight];})).toEqual([1200,900]);
  await page.screenshot({path:folder+'/unsaved-photo.png',fullPage:true});
  const axe=await new AxeBuilder({page}).analyze();
  await writeFile(folder+'/axe.json',JSON.stringify(axe.violations,null,2));
  expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);
  offline=false;await next();
  await page.locator('[name=title]').fill('DEMO Ciornă recuperată după întrerupere');
  await expect(state).toHaveText(/^Salvat acum \d+ secunde$/);
  const stored=await (await page.request.get('/api/editor-draft')).json();
  expect(stored.draft.title).toBe('DEMO Ciornă recuperată după întrerupere');
  expect(stored.draft.photos).toHaveLength(1);
  await page.reload();await page.getByRole('button',{name:'Continuă editarea',exact:true}).press('Enter');
  await expect(page.locator('[name=title]')).toHaveValue('DEMO Ciornă recuperată după întrerupere');
  await page.getByRole('button',{name:'← Pasul anterior'}).press('Enter');
  await expect(page.locator('.editor-photo')).toHaveCount(1);
});
