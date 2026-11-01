'use strict';
// One private working copy per account. Listing publication remains a separate API.
function draftStorageKey(){return 'intre-noi-editor:'+S.boot?.user?.id;}
function preserveDraftLocally(){
  if(!S.boot?.user)return;
  try{window.sessionStorage?.setItem(draftStorageKey(),JSON.stringify({draft:{...S.draft,photos:S.photos},step:S.step,revision:S.draftVersion||0,confirmedAt:draftMatchesConfirmed()?S.draftSavedAt:0,modifiedAt:Date.now()}));}catch{/* RAM remains intact if tab storage is full/unavailable. */}
}
function draftMatchesConfirmed(){
  const saved=S.draftConfirmed;if(!saved||saved.step!==S.step||saved.draft.photos.length!==S.photos.length)return false;
  // Compare image references without serializing up to 1.8 MB on every clock tick.
  return S.photos.every((photo,index)=>photo===saved.draft.photos[index])&&Object.keys({...saved.draft,...S.draft}).every(key=>key==='photos'||saved.draft[key]===S.draft[key]);
}
function draftSaveLabel(){
  if(S.autosaveError)return S.autosaveError+' Modificările sunt păstrate în această filă.';
  if(S.autosaveBusy)return 'Salvăm automat ciorna în cont…';
  if(S.draftSavedAt&&draftMatchesConfirmed())return 'Salvat acum '+Math.max(0,Math.floor((Date.now()-S.draftSavedAt)/1000))+' secunde';
  if(S.editorDirty)return 'Modificări nesalvate încă · salvarea automată urmează';
  return 'Ciornă în lucru · salvare automată după completare';
}
function paintDraftSaveState(){const node=document.querySelector('.editor-save-state');if(node&&!S.editorSaving&&!S.editorProcessing)node.textContent=draftSaveLabel();}
function scheduleDraftSave(){
  if(!S.boot?.user||!S.editorDirty)return;preserveDraftLocally();clearTimeout(S.autosaveTimer);
  S.autosaveTimer=setTimeout(()=>flushDraftSave().catch(()=>{}),1500);
}
function flushDraftSave(){
  clearTimeout(S.autosaveTimer);const session=S.editorSession,storageGeneration=S.draftStorageGeneration||0;
  const task=(S.draftQueue||Promise.resolve()).then(async()=>{
    if(session!==S.editorSession||!S.editorDirty)return;
    const payload={draft:{...S.draft,photos:[...S.photos]},step:S.step,revision:S.draftVersion||0};
    const signature=JSON.stringify({draft:payload.draft,step:payload.step});if(signature===S.draftSavedSignature)return;
    S.autosaveBusy=true;S.autosaveError='';paintDraftSaveState();
    try{const result=await api('/api/editor-draft','PUT',payload);if(!Number.isSafeInteger(result.revision))throw Error('Salvarea automată nu a fost confirmată.');S.draftVersion=result.revision;S.draftHasContent=true;S.draftSavedSignature=signature;if(session===S.editorSession){S.draftConfirmed=payload;S.draftSavedAt=result.savedAt||Date.now();if(storageGeneration===(S.draftStorageGeneration||0))preserveDraftLocally();}}
    catch(error){if(session===S.editorSession){S.autosaveError=error.message;if(storageGeneration===(S.draftStorageGeneration||0))preserveDraftLocally();}throw error;}
    finally{S.autosaveBusy=false;paintDraftSaveState();}
  });S.draftQueue=task.catch(()=>{});return task;
}
function resetDraftBuffer(){
  clearTimeout(S.autosaveTimer);try{window.sessionStorage?.removeItem(draftStorageKey());window.sessionStorage?.removeItem(draftStorageKey()+':conflict');S.conflictingDraft=null;}catch{}
  S.draftSavedAt=0;S.draftSavedSignature='';S.draftConfirmed=null;S.autosaveError='';
  const task=(S.draftQueue||Promise.resolve()).then(async()=>{if(!S.draftHasContent||!S.draftVersion)return;const result=await api('/api/editor-draft','DELETE',{revision:S.draftVersion});if(!Number.isSafeInteger(result.revision))throw Error('Ștergerea ciornei nu a fost confirmată.');S.draftVersion=result.revision;S.draftHasContent=false;});
  S.draftQueue=task.catch(error=>{S.autosaveError=error.message;});return task;
}
async function recoverEditorDraft(){
  if(!S.boot?.user)return;let local;try{local=JSON.parse(window.sessionStorage?.getItem(draftStorageKey())||'null');}catch{}
  try{S.conflictingDraft=JSON.parse(window.sessionStorage?.getItem(draftStorageKey()+':conflict')||'null');}catch{}
  let remote,remoteRead=true;try{remote=await api('/api/editor-draft');}catch{remoteRead=false;remote={revision:local?.revision||0};S.autosaveError='Nu am putut verifica ciorna din cont. Reîncearcă atunci când conexiunea revine.';}
  S.draftVersion=remote.revision||0;S.draftHasContent=!!remote.draft;
  const chosen=local&&local.revision===S.draftVersion?local:remote;
  if(local&&local.revision!==S.draftVersion){S.conflictingDraft=local;try{window.sessionStorage?.setItem(draftStorageKey()+':conflict',JSON.stringify(local));}catch{}}
  if(!chosen.draft)return;
  S.draft=chosen.draft;S.photos=[...(chosen.draft.photos||[])];S.step=Math.max(0,Math.min(7,Number(chosen.step)||0));S.editorDirty=true;
  // A local acknowledgement is valid only after checking the same account revision
  // and server timestamp; pending edits never inherit an older confirmation.
  const confirmed=remoteRead&&(chosen===remote||(Number.isFinite(local?.confirmedAt)&&local.confirmedAt>0&&local.confirmedAt===remote.updatedAt));
  S.draftSavedAt=confirmed?remote.updatedAt:0;S.draftConfirmed=confirmed?{draft:{...chosen.draft,photos:[...S.photos]},step:S.step}:null;
  if(S.draft.ownerDeclaration&&S.draft.declarationVersion!==S.boot.declarations.version)S.draft.ownerDeclaration=false;
  if(local&&local.revision!==S.draftVersion){S.conflictingDraft=local;try{window.sessionStorage?.setItem(draftStorageKey()+':conflict',JSON.stringify(local));}catch{}S.autosaveError='Versiunea din cont diferă de copia locală. Poți recupera separat copia locală.';}
  if(remoteRead&&!draftMatchesConfirmed())scheduleDraftSave();
}

function recoverConflictingDraft(){
  const copy=S.conflictingDraft;if(!copy)return;
  openModal(el('div',{},el('h2',{},'Copia păstrată în această filă'),el('p',{},copy.draft?.title||'Ciornă fără titlu'),el('p',{},'Versiunea din cont rămâne intactă până alegi să continui cu această copie. O modificare mai nouă din altă filă va fi refuzată, fără suprascriere.'),b('Continuă cu copia locală',()=>{S.draft=copy.draft;S.photos=[...(copy.draft.photos||[])];S.step=Math.max(0,Math.min(7,Number(copy.step)||0));if(S.draft.declarationVersion!==S.boot.declarations.version)S.draft.ownerDeclaration=false;S.editorDirty=true;S.draftSavedSignature='';S.autosaveError='';S.conflictingDraft=null;dialog.close();resumeEditor();}),b('Păstrează versiunea din cont',()=>dialog.close(),'button secondary')));
}

function forgetLocalDraftOnSignout(){clearTimeout(S.autosaveTimer);S.draftStorageGeneration=(S.draftStorageGeneration||0)+1;try{window.sessionStorage?.removeItem(draftStorageKey());window.sessionStorage?.removeItem(draftStorageKey()+':conflict');}catch{}}
