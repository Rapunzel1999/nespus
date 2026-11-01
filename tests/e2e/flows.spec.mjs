import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {listingId,draftInput} from './seed.mjs';
const origin='http://127.0.0.1:4180';
const headers={origin};
async function login(page,role){const r=await page.request.post('/__test/login',{headers,data:{role}});expect(r.ok()).toBeTruthy();}
async function post(page,path,data={}){return page.request.post(path,{headers,data});}
async function accepted(page){await login(page,'buyer');const r=await post(page,'/api/contact-requests',{listingId:listingId(1),purpose:'DEMO: Caut o locuință pentru mine și doresc o vizionare.',contactDeclaration:true,declarationVersion:draftInput.declarationVersion});expect(r.status()).toBe(201);const {id}=await r.json();await login(page,'owner');expect((await post(page,'/api/conversations/'+id+'/decision',{decision:'accepted'})).ok()).toBeTruthy();return id;}
test.beforeEach(async({request})=>{const r=await request.post('/__test/reset',{headers});expect(r.status()).toBe(200);});

test('draft, simulated phone, submission, independent moderation',async({page})=>{
  await login(page,'unverified');
  await page.goto('/atelier');await page.getByRole('button',{name:'Publică anunț +',exact:true}).click();await page.getByRole('button',{name:'Vreau să vând →',exact:true}).click();
  await page.locator('[name=district]').selectOption('Centru');await page.locator('[name=price]').fill('120000');await page.locator('[name=area]').fill('60');await page.locator('[name=rooms]').fill('2');
  await page.getByRole('button',{name:'Continuă →',exact:true}).click();
  await page.locator('[name=title]').fill('DEMO Ciornă creată în browser');await page.locator('textarea[name=description]').fill(draftInput.description);
  await page.getByLabel('Adaugă fotografii',{exact:true}).setInputFiles({name:'DEMO.jpg',mimeType:'image/jpeg',buffer:Buffer.from(draftInput.photos[0].split(',')[1],'base64')});
  await expect(page.locator('.editor-photo')).toHaveCount(1);await page.locator('[name=ownerDeclaration]').check();await page.getByRole('button',{name:'Salvează ciorna',exact:true}).click();
  await expect(page.getByText('DEMO Ciornă creată în browser',{exact:true})).toBeVisible();
  const mine=await (await page.request.get('/api/mine')).json(),id=mine.listings[0].id;
  expect((await post(page,'/api/listings/'+id+'/submit')).status()).toBe(403);
  expect((await post(page,'/api/phone/start',{phone:'+40700000009'})).ok()).toBeTruthy();
  expect((await post(page,'/api/phone/check',{code:'123456'})).ok()).toBeTruthy();
  expect((await post(page,'/api/listings/'+id+'/submit')).ok()).toBeTruthy();
  expect((await page.request.get('/api/listings/'+id)).status()).toBe(404);
  await login(page,'moderator');await page.goto('/atelier?view=moderation');
  const row=page.locator('article').filter({has:page.getByRole('heading',{name:'DEMO Ciornă creată în browser'})});await row.getByRole('button',{name:'Aprobă',exact:true}).click();
  await page.locator('#modal [name=reason]').fill('DEMO: revizuire editorială locală, fără verificarea proprietății.');await page.locator('#modal button[type=submit]').click();
  await expect.poll(async()=>(await page.request.get('/api/listings/'+id)).status()).toBe(200);
});

test('search filters, detail, favorites and comparison',async({page})=>{
  await login(page,'buyer');await page.goto('/atelier?view=browse&transaction=sale&currency=EUR');
  await page.locator('[name=district]').selectOption('Centru');await page.getByRole('button',{name:/Caută anunțuri/}).click();
  await expect(page.locator('.property-card')).toHaveCount(2);await expect(page).toHaveURL(/district=Centru/);
  await page.locator('.card-photo-link').first().click();await expect(page.locator('h1')).toContainText('DEMO');await expect(page.locator('body')).not.toContainText('DEMO ADRESĂ PRIVATĂ');
  await page.locator('.property-gallery').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('.photo-counter')).toHaveText('2 / 2');
  await page.locator('.favorite-toggle:visible').first().click();await expect(page.locator('.favorite-toggle[aria-pressed="true"]:visible').first()).toBeVisible();
  await page.goto('/atelier?listing='+listingId(2));await page.locator('.favorite-toggle:visible').first().click();await expect(page.locator('.favorite-toggle[aria-pressed="true"]:visible').first()).toBeVisible();
  await page.goto('/atelier?view=favorites');await page.locator('.favorite-compare-button[aria-pressed="false"]').first().click();await page.locator('.favorite-compare-button[aria-pressed="false"]').first().click();await page.getByRole('button',{name:'Compară proprietățile ↗',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('table')).toBeVisible();
});

test('request, acceptance, messages, viewing and explicit phone disclosure',async({page})=>{
  await login(page,'buyer');await page.goto('/atelier?listing='+listingId(1));await page.locator('.detail-panel .property-contact-button').click();
  await page.locator('#modal textarea').fill('DEMO: Mă interesează această locuință pentru uz personal.');await page.locator('#modal input[type=checkbox]').check();await page.getByRole('button',{name:'Trimite solicitarea',exact:true}).click();
  await expect(page).toHaveURL(/conversation=/);const id=new URL(page.url()).searchParams.get('conversation');
  await login(page,'owner');await page.reload();await page.getByRole('button',{name:'Acceptă conversația',exact:true}).click();await expect(page.locator('.conversation-composer')).toBeVisible();
  await login(page,'buyer');await page.reload();await page.locator('textarea[name=body]').fill('DEMO: Putem stabili o vizionare?');await page.getByRole('button',{name:'Trimite mesajul ↗',exact:true}).click();await expect(page.locator('.message-bubble')).toContainText('DEMO: Putem stabili o vizionare?');
  await page.getByRole('button',{name:'Propune o vizionare →',exact:true}).click();const time=Date.now()+2*86400000;const value=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Bucharest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(time).replace(' ','T');await page.locator('[name=startsAt]').fill(value);await expect(page.locator('.viewing-time-preview')).toContainText('Europe/Bucharest');await page.getByRole('button',{name:'Trimite propunerea',exact:true}).click();await expect(page.locator('.viewing-card')).toContainText('Așteaptă confirmarea');
  await login(page,'owner');await page.reload();await page.getByRole('button',{name:'Confirmă vizionarea',exact:true}).click();await expect(page.locator('.viewing-card')).toContainText('Confirmată');
  await page.locator('.conversation-safety summary').click();await page.getByRole('button',{name:'Oferă acces la numărul meu',exact:true}).click();await page.getByRole('button',{name:'Ofer acces acestei persoane',exact:true}).click();await expect(page.locator('.conversation-safety')).toContainText('Ai oferit acces la telefon');
  await login(page,'buyer');await page.reload();await expect(page.locator('.shared-phone a')).toHaveAttribute('href',/^tel:/);expect((await (await page.request.get('/api/conversations/'+id)).json()).phone).toBeTruthy();
});

test('report and block revoke phone and prevent further messages',async({page})=>{
  const id=await accepted(page);await post(page,'/api/conversations/'+id+'/share-phone');await login(page,'buyer');await page.goto('/atelier?view=messages&conversation='+id);
  await page.locator('.conversation-safety summary').click();await page.getByRole('button',{name:'Raportează o problemă',exact:true}).click();await page.locator('#modal textarea').fill('DEMO: raport local pentru verificarea fluxului de moderare.');await page.getByRole('button',{name:'Trimite raportarea',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button',{name:'Blochează acest contact',exact:true}).click();await page.getByRole('button',{name:'Confirmă blocarea',exact:true}).click();await expect(page.locator('.conversation-state')).toContainText('blocat');
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
  async function capture(name){await expect(page.locator('#main-content')).toBeVisible();await expect(page.locator('.loading')).toHaveCount(0);await page.evaluate(async()=>{const start=scrollY;for(let y=0;y<document.body.scrollHeight;y+=innerHeight){scrollTo(0,y);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);}scrollTo(0,start);});await page.waitForLoadState('networkidle');await page.screenshot({path:folder+'/'+name+'.png',fullPage:name!=='comparison'});const result=await new AxeBuilder({page}).analyze();report.push({page:name,violations:result.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});await writeFile(folder+'/axe.json',JSON.stringify(report,null,2));}
  await page.goto('/atelier');await capture('home');await page.goto('/atelier?view=browse&transaction=sale&currency=EUR');await capture('results');await page.goto('/atelier?listing='+listingId(1));await capture('listing');
  await page.goto('/atelier?view=favorites');for(let n=0;n<2;n++)await page.locator('.favorite-compare-button[aria-pressed="false"]').first().click();await page.getByRole('button',{name:'Compară proprietățile ↗',exact:true}).click();await capture('comparison');await page.keyboard.press('Escape');
  await page.goto('/atelier?view=messages&conversation='+id);await capture('conversation');
  await login(page,'owner');await page.goto('/atelier');await page.getByRole('button',{name:'Publică anunț +',exact:true}).click();await page.getByRole('button',{name:'Vreau să vând →',exact:true}).click();await capture('editor');
  await writeFile(folder+'/axe.json',JSON.stringify(report,null,2));await info.attach('axe-report',{body:JSON.stringify(report),contentType:'application/json'});
});
