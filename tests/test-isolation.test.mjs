import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {localTestAllowed} from './e2e/guard.mjs';
test('DEMO auth and phone provider require explicit test mode AND local HTTP host',()=>{
  const flags={INTRE_NOI_TEST_MODE:'local-d1-only',INTRE_NOI_BUILD:'test'};
  assert.equal(localTestAllowed(new Request('http://127.0.0.1:4180'),flags),true);
  for(const env of [{},{...flags,INTRE_NOI_TEST_MODE:''},{...flags,INTRE_NOI_BUILD:'production'}])assert.equal(localTestAllowed(new Request('http://127.0.0.1:4180'),env),false);
  for(const url of ['https://127.0.0.1','https://imobiliare-cluj-direct.verdant11.chatgpt.site','http://localhost.evil.invalid'])assert.equal(localTestAllowed(new Request(url),flags),false);
  const production=readFileSync('app/api/[...path]/route.ts','utf8');
  assert.match(production,/getChatGPTUser/);assert.match(production,/smsFromEnv/);assert.doesNotMatch(production,/e2e|DEMO|localTestAllowed|fakeSms/);
});
