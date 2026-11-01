'use strict';
function listingTrust(l){
  const date=value=>Number.isFinite(value)&&value>0?clujDate(value,true):'Nu avem o dată înregistrată';
  return el('section',{class:'listing-trust'},el('h2',{},'Ce știm despre acest anunț'),el('dl',{},
    el('dt',{},'Telefon confirmat'),el('dd',{},l.phoneVerified?'Da':'Nu'),
    el('dt',{},'Declarație de proprietar acceptată'),el('dd',{},date(l.ownerDeclaredAt)),
    el('dt',{},'Disponibilitate reconfirmată'),el('dd',{},date(l.availabilityConfirmedAt)),
    el('dt',{},'Aprobat de moderare'),el('dd',{},date(l.moderationApprovedAt))),
    el('p',{},'Ce nu verificăm: identitatea civilă, dreptul de proprietate, starea reală a locuinței.'));
}
function reviewSignalPanel(l){
  const labels={phone_many_listings:'Același telefon este asociat cu mai mult de 3 anunțuri active.',keyword_comision:'Textul conține „comision”.',keyword_agentie:'Textul conține „agenție”.',keyword_exclusivitate:'Textul conține „exclusivitate”.',similar_photo_other_account:'Fotografie posibil similară într-un alt cont.',possible_duplicate_title_district:'Titlu și cartier comune cu alt anunț.'};
  return el('section',{class:'review-signals'},el('h4',{},'Semnale pentru revizuire'),el('p',{},'Indicii, nu dovezi. Verifică și contextul, inclusiv formulări precum „fără comision”.'),...(l.riskSignals||[]).map(code=>el('p',{},labels[code]||'Indiciu suplimentar de revizuit.')),!(l.riskSignals||[]).length?el('p',{},'Niciun indiciu în verificările disponibile.'):null,l.photoReviewLimited?el('p',{},'Comparația fotografiilor este incompletă: există date istorice neprocesate sau limita de 1000 de anunțuri a fost atinsă.'):null);
}
async function moderationAudit(){
  const data=await api('/api/moderation/audit');openModal(el('section',{},el('h2',{class:'modal-title'},'Jurnalul deciziilor'),el('p',{},'Ultimele '+data.limit+' de decizii, în ordine descrescătoare.'),...(data.events||[]).map(event=>el('article',{class:'list-item'},el('strong',{},event.action),el('p',{},clujDate(event.createdAt)),el('p',{},'Moderator: '+event.actorId+' · Caz: '+event.targetId),el('p',{},event.reason))),!data.events?.length?el('p',{},'Nu există decizii înregistrate.'):null));
}
