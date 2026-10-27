import test from 'node:test';
import assert from 'node:assert/strict';
import {preflight} from '../scripts/twilio-preflight.mjs';

test('preflight with missing credentials makes no network requests',async()=>{
  let calls=0;const report=await preflight({},async()=>{calls++;throw Error();});
  assert.equal(report.ready,false);assert.equal(report.missing.length,3);assert.equal(calls,0);
});
test('preflight only GETs the selected service and redacts credentials and service data',async()=>{
  const env={TWILIO_ACCOUNT_SID:'AC'+'a'.repeat(32),TWILIO_VERIFY_SERVICE_SID:'VA'+'b'.repeat(32),TWILIO_AUTH_TOKEN:'fixture-only-not-a-credential'};
  const report=await preflight(env,async(url,init)=>{
    assert.equal(init.method,'GET');assert.equal(init.body,undefined);assert.equal(init.redirect,'error');
    assert.equal(url,'https://verify.twilio.com/v2/Services/'+env.TWILIO_VERIFY_SERVICE_SID);
    return Response.json({sid:env.TWILIO_VERIFY_SERVICE_SID,account_sid:env.TWILIO_ACCOUNT_SID,code_length:6,custom_code_enabled:false,do_not_share_warning_enabled:true,friendly_name:'PRIVATE'});
  });
  assert.equal(report.ready,true);assert.equal(report.smsSendingEnabled,false);
  for(const secret of [...Object.values(env),'PRIVATE'])assert.ok(!JSON.stringify(report).includes(secret));
});
