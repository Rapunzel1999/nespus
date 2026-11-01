'use strict';
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


