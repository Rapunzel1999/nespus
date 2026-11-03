import './sites-env.mjs';
import {createRequire} from 'node:module';
import {unstable_getMiniflareWorkerOptions} from 'wrangler';
import {glob,readdir,readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {get} from 'node:http';
import {json as readJson} from 'node:stream/consumers';
import assert from 'node:assert/strict';
import {diagnoseLocalRuntime} from './isolation-diagnostics.mjs';
let files=0;
async function scan(path){for(const entry of await readdir(path,{withFileTypes:true})){const p=join(path,entry.name);if(entry.isDirectory())await scan(p);else if(/\.(?:js|mjs|html)$/.test(p)){files++;const source=await readFile(p,'utf8');if(/DEMO-test-role|local-d1-only|DEMO-fixture-only-not-a-credential|__test\/reset/.test(source))throw Error('Test auth/phone/seed leaked into production: '+p);}}}
await scan('dist');if(!files)throw Error('Production build missing');console.log('Production isolation: '+files+' built files scanned; test auth, fake phone and seed absent.');
// Even if test flags are injected accidentally, the production entry point must
// not recognize test sessions or expose a simulated phone provider.
// Use the runtime paired with the installed Wrangler config parser.
const {Miniflare} = createRequire(import.meta.resolve('wrangler'))('miniflare');
const {workerOptions, main, externalWorkers} =
  unstable_getMiniflareWorkerOptions('dist/server/wrangler.json');
assert.equal(externalWorkers.length, 0, 'Review additional workers before running the isolation check');
const modulesRoot = dirname(main);
const modules = [{type: 'ESModule', path: main}];
for await (const file of glob('**/*.{js,mjs}', {cwd: modulesRoot})) {
  const path = join(modulesRoot, file);
  if (path !== main) modules.push({type: 'ESModule', path});
}
const runtime = new Miniflare({
  ...workerOptions, modulesRoot, modules, host: '127.0.0.1', port: 0,
  bindings: {...workerOptions.bindings, INTRE_NOI_TEST_MODE: 'local-d1-only', INTRE_NOI_BUILD: 'test'},
});
let origin, startupTimer;
let phase='startup',phaseStarted=performance.now();
const checkpoint=next=>{console.log('Production runtime phase: '+phase+' completed in '+Math.round(performance.now()-phaseStarted)+' ms');phase=next;phaseStarted=performance.now();};
try{
  const url = await Promise.race([
    runtime.ready,
    new Promise((_, reject) => {
      startupTimer = setTimeout(() => reject(Error('Local workerd startup timed out')), 25000);
    }),
  ]);
  clearTimeout(startupTimer);
  origin = url.origin;
  const health = await fetch(origin + '/api/health', {signal: AbortSignal.timeout(1000)});
  assert.equal(health.status, 200);
  await health.arrayBuffer();
  checkpoint('test-login response');
  console.log('Production runtime: checking disabled test login route.');
  const login=await fetch(origin+'/__test/login',{signal:AbortSignal.timeout(15000),method:'POST',headers:{origin,connection:'close','Content-Type':'application/json'},body:JSON.stringify({role:'moderator'})});checkpoint('test-login status');assert.equal(login.status,404);checkpoint('test-login body');await login.arrayBuffer();
  console.log('Production runtime: checking anonymous bootstrap with DEMO cookie.');
  checkpoint('bootstrap response');
  // A single fresh loopback connection, with the same deadline for headers and body.
  const response = await new Promise((resolve, reject) => {
    const request = get(origin + '/api/bootstrap', {
      agent: false,
      signal: AbortSignal.timeout(15000),
      headers: {cookie: 'DEMO-test-role=moderator', connection: 'close'},
    }, resolve);
    request.on('error', reject);
  });
  checkpoint('bootstrap status');assert.equal(response.statusCode,200);
  checkpoint('bootstrap body');const bootstrap=await readJson(response);
  checkpoint('bootstrap assertions');
  assert.equal(bootstrap.user,null);assert.equal(bootstrap.capabilities.phoneVerification,false);
  checkpoint('complete');
  console.log('Production runtime: test login 404; DEMO cookie ignored; simulated phone disabled, including with test flags.');
}catch(error){
  const failedAfter=Math.round(performance.now()-phaseStarted);
  if(phase==='bootstrap response')console.error('Independent local HTTP diagnostics: '+JSON.stringify(await diagnoseLocalRuntime(origin)));
  throw new Error('Production isolation runtime failed at '+phase+' after '+failedAfter+' ms: '+error.message,{cause:error});
} finally {
  clearTimeout(startupTimer);
  await runtime.dispose();
}
