import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
let files=0;
async function scan(path){for(const entry of await readdir(path,{withFileTypes:true})){const p=join(path,entry.name);if(entry.isDirectory())await scan(p);else if(/\.(?:js|mjs|html)$/.test(p)){files++;const source=await readFile(p,'utf8');if(/DEMO-test-role|local-d1-only|DEMO-fixture-only-not-a-credential|__test\/reset/.test(source))throw Error('Test auth/phone/seed leaked into production: '+p);}}}
await scan('dist');if(!files)throw Error('Production build missing');console.log('Production isolation: '+files+' built files scanned; test auth, fake phone and seed absent.');
// Even if test flags are injected accidentally, the production entry point must
// not recognize test sessions or expose a simulated phone provider.
const origin='http://127.0.0.1:4181';
const child=spawn(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/production-isolation','--ip','127.0.0.1','--port','4181','--inspector-port','0','--var','INTRE_NOI_TEST_MODE:local-d1-only','--var','INTRE_NOI_BUILD:test'],{stdio:['ignore','pipe','pipe']});
let diagnostic='';for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{diagnostic=(diagnostic+chunk).slice(-4000);});
let phase='startup',phaseStarted=performance.now();
const checkpoint=next=>{console.log('Production runtime phase: '+phase+' completed in '+Math.round(performance.now()-phaseStarted)+' ms');phase=next;phaseStarted=performance.now();};
try{
  let ready=false;
  for(let n=0;n<100;n++){
    if(child.exitCode!==null)throw Error('Production test server exited: '+diagnostic);
    try{const response=await fetch(origin+'/api/health',{signal:AbortSignal.timeout(1000),headers:{connection:'close'}});ready=response.ok;await response.arrayBuffer();}catch{}
    if(ready)break;await new Promise(resolve=>setTimeout(resolve,250));
  }
  if(!ready)throw Error('Production test server unavailable: '+diagnostic);
  checkpoint('test-login response');
  console.log('Production runtime: checking disabled test login route.');
  const login=await fetch(origin+'/__test/login',{signal:AbortSignal.timeout(15000),method:'POST',headers:{origin,connection:'close','Content-Type':'application/json'},body:JSON.stringify({role:'moderator'})});checkpoint('test-login status');assert.equal(login.status,404);checkpoint('test-login body');await login.arrayBuffer();
  console.log('Production runtime: checking anonymous bootstrap with DEMO cookie.');
  checkpoint('bootstrap response');
  const response=await fetch(origin+'/api/bootstrap',{signal:AbortSignal.timeout(15000),headers:{cookie:'DEMO-test-role=moderator',connection:'close'}});
  checkpoint('bootstrap status');assert.equal(response.status,200);
  checkpoint('bootstrap body');const bootstrap=await response.json();
  checkpoint('bootstrap assertions');
  assert.equal(bootstrap.user,null);assert.equal(bootstrap.capabilities.phoneVerification,false);
  checkpoint('complete');
  console.log('Production runtime: test login 404; DEMO cookie ignored; simulated phone disabled, including with test flags.');
}catch(error){throw new Error('Production isolation runtime failed at '+phase+' after '+Math.round(performance.now()-phaseStarted)+' ms (child exit='+child.exitCode+', signal='+child.signalCode+'): '+error.message+'\n'+diagnostic,{cause:error});}finally{if(child.exitCode===null){const closed=once(child,'exit');child.kill('SIGTERM');await closed;}}
