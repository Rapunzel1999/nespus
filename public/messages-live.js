'use strict';
function messageNavButton(label,action,className='text-button'){
  const button=b(label,action,className);button.setAttribute('data-message-nav',label);return button;
}
function paintUnreadIndicators(){
  const count=Math.max(0,Number(S.unreadMessages)||0);
  for(const node of document.querySelectorAll('[data-message-nav]'))node.textContent=node.getAttribute('data-message-nav')+(count?' ('+count+')':'');
  if(typeof document.title==='string')document.title=(count?'('+count+') ':'')+document.title.replace(/^\(\d+\)\s*/,'');
}
async function markMessagesRead(conversationId,ids){
  if(document.visibilityState==='hidden'||!ownerAccountActive()||!Array.isArray(ids)||!ids.length)return;
  S.readPending??=new Set();const pending=ids.filter(id=>!S.readPending.has(id));for(const id of pending)S.readPending.add(id);
  try{for(let i=0;i<pending.length;i+=50){const result=await api('/api/conversations/'+conversationId+'/read','POST',{messageIds:pending.slice(i,i+50)});S.unreadMessages=Math.max(0,(S.unreadMessages||0)-(result.marked||0));paintUnreadIndicators();}}
  catch{/* A failed receipt remains unread; the next visible refresh can retry. */}
  finally{for(const id of pending)S.readPending.delete(id);}
}
// Read receipts update navigation; they must not replace focused controls in the thread.
function conversationDisplaySignature(data){
  const {unreadMessageIds,...visible}=data;const {unreadCount,...conversation}=visible.conversation;
  return JSON.stringify({...visible,conversation});
}
function startMessagePolling(){
  clearTimeout(S.messagePollTimer);S.messagePollGeneration=(S.messagePollGeneration||0)+1;
  if(!S.boot?.user||S.boot.user.status==='suspended'||document.visibilityState==='hidden')return;
  const generation=S.messagePollGeneration;S.messagePollDelay=10000;
  const run=async()=>{
    if(generation!==S.messagePollGeneration||document.visibilityState==='hidden')return;
    let changed=false;
    try{const result=await api('/api/notifications');if(generation!==S.messagePollGeneration||document.visibilityState==='hidden')return;
      const previous=S.unreadMessages||0;S.unreadMessages=result.unreadMessages||0;changed=S.unreadMessages!==previous;paintUnreadIndicators();
      if(S.unreadMessages>previous)toast('Ai '+S.unreadMessages+' mesaje necitite.');
      if(S.page==='messages'&&S.pollInbox)changed=(await S.pollInbox())||changed;
      // The tab may hide or start a new poll while the inbox request is in flight.
      if(generation!==S.messagePollGeneration||document.visibilityState==='hidden')return;
      if(S.page==='messages'&&S.pollConversation)changed=(await S.pollConversation())||changed;
    }catch(error){if(error.status===401||error.status===403)return;}
    if(generation!==S.messagePollGeneration||document.visibilityState==='hidden')return;
    const delay=S.messagePollDelay;S.messagePollDelay=changed?10000:Math.min(60000,delay*2);S.messagePollTimer=setTimeout(run,changed?10000:delay);
  };S.messagePollTimer=setTimeout(run,0);
}
document.addEventListener?.('visibilitychange',()=>{if(typeof S==='undefined')return;startMessagePolling();});
// Layout viewport correction for a focused composer when the mobile keyboard reduces the visual viewport.
function updateComposerViewport(){
  const viewport=window.visualViewport;if(!viewport||!document.documentElement?.style)return;
  const inset=Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop);
  document.documentElement.style.setProperty('--keyboard-inset',inset+'px');
}
window.visualViewport?.addEventListener('resize',updateComposerViewport);
window.visualViewport?.addEventListener('scroll',updateComposerViewport);
document.addEventListener?.('focusin',updateComposerViewport);
