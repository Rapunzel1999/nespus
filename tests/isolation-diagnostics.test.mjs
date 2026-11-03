import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {diagnoseLocalRuntime} from '../scripts/isolation-diagnostics.mjs';

async function server(t,handler){const s=createServer(handler);s.listen(0,'127.0.0.1');await once(s,'listening');t.after(()=>new Promise(resolve=>{s.closeAllConnections();s.close(resolve);}));return 'http://127.0.0.1:'+s.address().port;}
test('runtime diagnostics report only safe metadata and issue exactly two local GETs',async t=>{
  const calls=[];const origin=await server(t,(req,res)=>{calls.push([req.method,req.url,req.headers.cookie]);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({user:null,capabilities:{phoneVerification:false},private:'NEVER_PRINT_ME'}));});
  const results=await diagnoseLocalRuntime(origin);assert.equal(results.length,2);assert.ok(results.every(r=>r.status===200&&r.json));assert.equal(results[1].anonymous,true);assert.equal(results[1].phoneVerification,false);assert.ok(!JSON.stringify(results).includes('NEVER_PRINT_ME'));assert.deepEqual(calls.map(c=>c[1]).sort(),['/api/bootstrap','/api/health']);assert.ok(calls.every(c=>c[0]==='GET'&&c[2]==='DEMO-test-role=moderator'));
});
test('runtime diagnostics preserve HTTP errors and invalid JSON without body disclosure',async t=>{
  const origin=await server(t,(_req,res)=>{res.statusCode=503;res.end('PRIVATE_FAILURE_BODY');});const results=await diagnoseLocalRuntime(origin);assert.ok(results.every(r=>r.status===503&&r.json===false));assert.ok(!JSON.stringify(results).includes('PRIVATE_FAILURE_BODY'));
});
test('runtime diagnostics terminate stalled responses without retrying',async t=>{
  let calls=0;const origin=await server(t,()=>{calls++;});const results=await diagnoseLocalRuntime(origin,100);assert.equal(calls,2);assert.ok(results.every(r=>r.error==='TIMEOUT'));
});
test('runtime diagnostics refuse external origins before any request',async()=>{
  for(const origin of ['https://127.0.0.1','http://example.invalid','http://user:secret@127.0.0.1','http://127.0.0.1/private'])await assert.rejects(diagnoseLocalRuntime(origin),/Local loopback/);
});

test('runtime diagnostics cap response size without returning its body',async t=>{
 const origin=await server(t,(_req,res)=>res.end('x'.repeat(70000)));const results=await diagnoseLocalRuntime(origin);assert.ok(results.every(r=>r.error==='BODY_TOO_LARGE'));assert.ok(results.every(r=>!('body' in r)));
});
