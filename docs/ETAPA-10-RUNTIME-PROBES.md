# Diagnostic HTTP după timeout bootstrap — 3 noiembrie 2026

Bază: v35 / PR #41, ramură succesivă `imobiliare-cluj-etapa-10-runtime-probes`. Timeout-ul de 15001 ms reprodus în auditul anterior rămâne neexplicat. În această sesiune, 20 porniri diagnostice `node scripts/_isolation-probe.mjs` au trecut fără schimbare de produs; ramura de eroare nu s-a executat. Nu este dovadă de remediere.

## Modificare

- `scripts/isolation-diagnostics.mjs`: după eșec, două GET-uri independente prin node:http către `/api/health` și `/api/bootstrap`, exclusiv HTTP 127.0.0.1. Maximum 3 secunde, cereri paralele, fără retry sau redirect. Răspuns limitat la 65536 bytes. Se raportează numai cale, durată, status, validitate JSON și indicatori anonimat/telefon; niciun corp, cookie primit sau antet nu este tipărit.
- `scripts/check-production-isolation.mjs`: lansează probele numai la eșecul fazei bootstrap response, apoi aruncă eroarea originală. Păstrează durata originală a fazei, limita de 15 secunde și toate aserțiunile. Diagnosticul nu poate transforma un eșec în succes.
- `tests/isolation-diagnostics.test.mjs`: cinci teste pentru metadata minimă, HTTP/JSON invalid, cereri blocate fără retry, refuzul destinațiilor externe și limita corpului.
- VERIFICATION, DECISIONS-PENDING și CHANGELOG leagă acest raport.

## Execuții locale

- `node --test tests/isolation-diagnostics.test.mjs`: 5/5.
- `pnpm test`: 160/160.
- `pnpm run typecheck`, `pnpm build`, `pnpm run test:production-isolation`, `git diff --check`: exit 0. 55 fișiere scanate; test login 404, DEMO cookie ignorat, telefon simulat inactiv. Bootstrap a răspuns în 6 ms în această execuție.
- Probă integrată: `node --import /tmp/r27-inject-bootstrap.mjs scripts/check-production-isolation.mjs` a păstrat **exit 1**, deși ambele GET-uri independente au întors 200, bootstrap anonim și telefon simulat dezactivat. Este un eșec injectat local, NU reproducerea timeout-ului intermitent.

Preload-ul temporar folosit în proba integrată (doar procesul de verificare local):

```js
const original=globalThis.fetch;
globalThis.fetch=(input,options)=>String(input).endsWith('/api/bootstrap')
  ?Promise.reject(new DOMException('LOCAL_DIAGNOSTIC_FIXTURE','TimeoutError'))
  :original(input,options);
```

Rezultatele CI și proveniența livrării se consemnează în PR. Nu există schimbare UI; capturi înainte/după nu se aplică. Nu s-au verificat UI/SIWC găzduite, dispozitive fizice, VoiceOver, SMS real sau import uman ICS. Fără schimbare de framework, autentificare, D1, audiență sau servicii; main neatins. SMS oprit/plafon zero, DEMO numai local/CI. Cauza timeout-ului și celelalte condiții de lansare rămân deschise.
