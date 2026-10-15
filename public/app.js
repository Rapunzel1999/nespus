/* Persistent MVP layer over the recovered Emotion v2 custom element. */
(async () => {
  'use strict';
  await customElements.whenDefined('nespus-atelier');
  const atelier=document.querySelector('nespus-atelier');
  const $=s=>document.querySelector(s);
  const status=message=>{$('.ns-form-status').textContent=message;};
  const date=value=>new Intl.DateTimeFormat('ro-RO',{dateStyle:'medium',timeStyle:'short'}).format(value);
  async function request(path,options={}) {
    const r=await fetch(path,{...options,headers:{'Content-Type':'application/json',...options.headers}});
    const data=await r.json();if(!r.ok) throw Error(data.error || 'Cererea nu a reușit.');return data;
  }
  const recipient=location.pathname.match(/^\/g\/([a-f0-9]{32})$/);
  if(location.pathname.startsWith('/g/')) {
    try {
      if(!recipient) throw Error('invalid');
      const {gift,expiresAt}=await request('/api/gifts/'+recipient[1]);
      Object.entries(gift).forEach(([key,value])=>{const field=atelier.fields[key];if(field){if(field.type==='checkbox')field.checked=value;else field.value=value;}});
      atelier.currentOccasion=gift.occasion;atelier.styleName=gift.style;atelier.sync();
      atelier.openPreview(false, null);atelier.renderGift(gift,gift.photo);
      const close=atelier.querySelector('[data-close]');close.textContent='Creează și tu ↗';close.setAttribute('aria-label','Creează propria experiență Nespus');
      atelier.dialog.addEventListener('close',()=>{location.href='/';},{once:true});
      const duration=document.createElement('p');duration.className='ns-editor-note';duration.textContent='Disponibil până la '+date(expiresAt)+'.';atelier.dialog.querySelector('.ns-gift').append(duration);
    } catch { $('#recipient-error').hidden=false; }
    return;
  }
  async function photoData() {
    if(!atelier.photoUrl) return null;
    const image=new Image();image.src=atelier.photoUrl;await image.decode();
    const ratio=Math.min(1,1200/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*ratio);canvas.height=Math.round(image.naturalHeight*ratio);
    const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    let data=canvas.toDataURL('image/jpeg',.78);
    if(data.length>400000) data=canvas.toDataURL('image/jpeg',.45);
    if(data.length>400000) throw Error('Alege o fotografie mai simplă sau mai mică.');
    return data;
  }
  function showShare(data) {
    const area=$('#share-result');area.replaceChildren();area.hidden=false;
    const title=document.createElement('h3');title.textContent='Gândul tău are un loc al lui.';
    const note=document.createElement('p');note.textContent='Disponibil până la '+date(data.expiresAt)+'. Oricine are linkul îl poate deschide. Nu îl publica dacă mesajul este personal.';
    const link=new URL(data.url,location.origin).href;
    const input=document.createElement('input');input.value=link;input.readOnly=true;input.setAttribute('aria-label','Linkul experienței');input.addEventListener('click',()=>input.select());
    const copy=document.createElement('button');copy.type='button';copy.className='ns-btn';copy.textContent='Copiază linkul';copy.onclick=async()=>{try{await navigator.clipboard.writeText(link);copy.textContent='Copiat ✓';}catch{input.focus();input.select();status('Selectează și copiază linkul de mai sus.');}};
    const open=document.createElement('a');open.href=link;open.target='_blank';open.rel='noopener';open.textContent='Deschide experiența ↗';
    const image=document.createElement('img');image.src='/api/gifts/'+data.id+'/qr';image.alt='Cod QR către experiența ta';image.width=180;image.height=180;
    image.onerror=()=>{image.hidden=true;status('QR-ul nu s-a încărcat. Linkul poate fi copiat în continuare.');};
    const download=document.createElement('a');download.href=image.src;download.download='nespus-qr.svg';download.textContent='Descarcă QR (SVG)';
    area.append(title,note,input,copy,open,image,download);
    if(navigator.share){const share=document.createElement('button');share.className='ns-btn';share.textContent='Distribuie';share.type='button';share.onclick=async()=>{try{await navigator.share({title:'Un gând pentru tine · Nespus',url:link});}catch(e){if(e.name!=='AbortError')status('Poți distribui copiind linkul.');}};area.append(share);}
  }
  $('#publish').onclick=async()=>{
    const button=$('#publish');button.disabled=true;status('Pregătim locul pentru gândul tău…');
    try{
      const gift={...atelier.readState(),days:Number($('#availability').value),photo:await photoData()};
      const data=await request('/api/gifts',{method:'POST',body:JSON.stringify(gift)});
      showShare(data);status('Link creat. Îl poți trimite acum.');await loadGifts();
    }catch(e){status(e.message || 'Nu am putut crea linkul. Textul tău este păstrat în editor.');}
    finally{button.disabled=false;}
  };
  $('#save-draft').onclick=()=>{try{localStorage.setItem('nespus-draft-v2',JSON.stringify(atelier.readState()));status('Ciornă salvată în acest browser, fără fotografie.');}catch{status('Browserul nu permite salvarea ciornei.');}};
  $('#restore-draft').onclick=()=>{try{
    const saved=JSON.parse(localStorage.getItem('nespus-draft-v2') || 'null');if(!saved){status('Nu există o ciornă salvată.');return;}
    Object.entries(saved).forEach(([key,value])=>{const f=atelier.fields[key];if(!f)return;if(f.type==='checkbox')f.checked=value===true;else if(typeof value==='string')f.value=value.slice(0,f.maxLength>0?f.maxLength:1500);});
    atelier.styleName=['paper','sage','midnight'].includes(saved.style)?saved.style:'paper';atelier.currentOccasion=atelier.fields.occasion.value;atelier.sync();status('Ciorna a fost reluată. Fotografia se adaugă separat.');
  }catch{status('Ciorna nu a putut fi citită.');}};
  async function loadGifts(){
    const list=$('#gift-list');
    try{
      const {gifts}=await request('/api/gifts');list.replaceChildren();
      if(!gifts.length){list.textContent='Încă nu ai creat un link în acest browser.';return;}
      for(const gift of gifts){
        const row=document.createElement('article'),title=document.createElement('strong'),note=document.createElement('p'),link=document.createElement('a'),remove=document.createElement('button');
        title.textContent=gift.title;note.textContent=(gift.expiresAt<=Date.now()?'Expirat la ':'Disponibil până la ')+date(gift.expiresAt);
        link.href='/g/'+gift.id;link.textContent='Deschide ↗';link.target='_blank';link.rel='noopener';
        remove.textContent='Șterge linkul și mesajul';remove.type='button';remove.onclick=async()=>{if(!confirm('Ștergi definitiv acest mesaj? Linkul și QR-ul nu vor mai funcționa.'))return;remove.disabled=true;try{await request('/api/gifts/'+gift.id,{method:'DELETE'});if($('#share-result input')?.value.endsWith('/'+gift.id))$('#share-result').hidden=true;await loadGifts();}catch(e){status(e.message);remove.disabled=false;}};
        row.append(title,note,link,document.createTextNode(' · '),remove);list.append(row);
      }
    }catch{list.textContent='Nu am putut încărca linkurile. Reîncearcă deschizând această secțiune.';}
  }
  $('#my-gifts').addEventListener('toggle',()=>{if($('#my-gifts').open)void loadGifts();});
})();
