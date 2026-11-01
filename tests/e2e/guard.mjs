export function localTestAllowed(request, env) {
  const url = new URL(request.url);
  return env.INTRE_NOI_TEST_MODE === 'local-d1-only' && env.INTRE_NOI_BUILD === 'test'
    && url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
}
