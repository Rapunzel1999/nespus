import test from 'node:test';
import assert from 'node:assert/strict';
import {twilioRequest} from '../lib/twilio-verify.mjs';

test('disabled Verify transport refuses both POST operations before contacting the provider', async () => {
  const fixture = {
    accountSid: 'AC' + 'a'.repeat(32),
    serviceSid: 'VA' + 'b'.repeat(32),
    authToken: 'fixture-only-not-a-credential',
  };
  let calls = 0;
  const provider = async () => {
    calls++;
    return Response.json({status: 'pending'});
  };
  for (const config of [
    {enabled: 'false', totalLimit: '1'},
    {enabled: 'true', totalLimit: '0'},
    {enabled: 'true', totalLimit: '101'},
  ]) {
    for (const operation of ['Verifications', 'VerificationCheck']) {
      await assert.rejects(
        twilioRequest({...fixture, ...config}, operation, {}, provider),
        {code: 'SMS_UNAVAILABLE'},
      );
    }
  }
  assert.equal(calls, 0);
});
