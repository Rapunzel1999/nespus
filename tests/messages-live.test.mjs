import test from 'node:test';
import assert from 'node:assert/strict';
import {frontend,deferred} from './helpers/frontend.mjs';
test('visible polling backs off, paints title/navigation, and stops while hidden',async()=>{
  const f=frontend({fetcher:()=>({unreadMessages:2})}),jobs=[];f.doc.title='Între noi';f.doc.visibilityState='visible';f.context.setTimeout=(fn,ms)=>{jobs.push({fn,ms});return jobs.length;};
  f.run("shell(el('main',{},'Acasă')); startMessagePolling()");assert.equal(jobs[0].ms,0);await jobs.shift().fn();if(jobs[0]?.ms===4500)jobs.shift();assert.equal(f.doc.title,'(2) Între noi');assert.match(f.doc.querySelector('[data-message-nav]').textContent,/\(2\)/);
  for(const delay of [10000,10000,20000,40000,60000]){assert.equal(jobs[0].ms,delay);await jobs.shift().fn();}
  f.doc.visibilityState='hidden';const requests=f.requests.length;f.run('startMessagePolling()');await jobs.shift().fn();assert.equal(f.requests.length,requests);
});
test('late hidden poll cannot rewrite indicators or schedule further requests',async()=>{
  const response=deferred(),f=frontend({fetcher:()=>response.promise});f.doc.title='Între noi';f.doc.visibilityState='visible';f.run('startMessagePolling()');const pending=f.timers.shift()();f.doc.visibilityState='hidden';f.run('startMessagePolling()');response.resolve({unreadMessages:99});await pending;assert.equal(f.doc.title,'Între noi');assert.equal(f.timers.length,0);
});

test('receipt-only poll preserves the focused viewing button; a viewing change still renders',async()=>{
  let read=false,confirmed=false;
  const conversation=()=>({id:'thread',listingId:'listing',listingTitle:'DEMO',otherName:'DEMO buyer',status:'accepted',amOwner:true,available:true,unreadCount:read?0:1});
  const f=frontend({user:{id:'owner',name:'DEMO owner',status:'active'},fetcher:path=>path==='/api/conversations'?{conversations:[conversation()]}:path==='/api/conversations/thread'?{conversation:conversation(),messages:[],viewings:[{id:'visit',startsAt:Date.now()+86400000,status:confirmed?'accepted':'proposed'}],unreadMessageIds:read?[]:['message']}:path.endsWith('/read')?{marked:1}:undefined});
  f.doc.visibilityState='visible';await f.run("messages('thread')");
  const button=f.button(f.roots.get('#app'),'Confirmă vizionarea');assert.ok(button);button.focus();read=true;
  // Hold the timestamp stable: only receipt metadata changes in this first response.
  f.context.receiptData=JSON.parse(f.run('JSON.stringify(S.renderedConversation.data)'));f.context.receiptData.unreadMessageIds=[];f.context.receiptData.conversation.unreadCount=0;
  const fetch=f.context.fetch;f.context.fetch=async()=>Response.json(f.context.receiptData);
  assert.equal(await f.run('S.pollConversation()'),false);assert.equal(f.doc.activeElement,button);assert.ok(button.isConnected);
  f.context.fetch=fetch;confirmed=true;assert.equal(await f.run('S.pollConversation()'),true);assert.equal(f.button(f.roots.get('#app'),'Confirmă vizionarea'),undefined);assert.match(f.roots.get('#app').textContent,/Confirmată/);
});
