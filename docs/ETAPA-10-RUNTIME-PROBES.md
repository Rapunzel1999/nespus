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

### 3 noiembrie 2026 · PR #44

[CI 41582170970](https://github.com/Rapunzel1999/nespus/actions/runs/41582170970) a înregistrat un timeout după 15000 ms la cererea bootstrap. În același proces Wrangler, după eșec, diagnosticul HTTP independent a obținut health 200 în 17 ms și bootstrap 200 în 13 ms, cu utilizator anonim și verificarea telefonului dezactivată. Aceste date confirmă că serverul răspundea atunci când a început diagnosticul. Cauza cererii inițiale rămâne necunoscută.

Verificarea principală cere acum bootstrap o singură dată prin HTTP, pe o conexiune dedicată. Termenul de 15 secunde acoperă inclusiv citirea corpului. Verificările pentru status 200, JSON valid, utilizator anonim și telefon dezactivat sunt obligatorii. Diagnosticul după o eroare de conectare rămâne separat. Proba istorică prin înlocuirea fetch nu mai injectează o eroare în noua cale HTTP.

O probă locală cu răspuns HTTP 200 și utilizator DEMO în corp a produs exit 1 la verificarea utilizatorului anonim. Proba normală folosește Wrangler și baza locală. Niciuna dintre probe nu accesează site-ul găzduit.

### Localizarea întârzierii înainte de intrarea în Worker

[Al doilea CI cu eroare](https://github.com/Rapunzel1999/nespus/actions/runs/41582562225/job/125740603133) a expirat și cu socket dedicat. Pentru a compara momentele, am copiat `dist` într-un director temporar local. Numai în copie, un modul intermediar a înregistrat calea și ora la intrare și imediat după `await worker.fetch(req, env, ctx)`. Clientul a înregistrat ora înainte de cererea bootstrap. Configurația și cererile de izolare au fost cele ale PR #44. Experimentul a pornit procese succesive și s-a oprit la primul eșec.

Cinci porniri au trecut. La pornirea șase, clientul a început la 1793685890380 ms. Prima intrare bootstrap în Worker a fost la 1793685905388 ms, la 15008 ms după pornirea clientului. Worker-ul a returnat status 200 la 1793685905390 ms, după 2 ms. Cererile diagnostice ulterioare au răspuns în 13 ms (health) și 14 ms (bootstrap). Intervalul observat se află înainte de intrarea în handler. Nu am identificat componenta internă care a întârziat transmiterea.

`scripts/check-production-isolation.mjs` pornește acum workerd prin Miniflare, cu opțiunile calculate de aceeași versiune Wrangler din configurația generată de build. Include modulele JavaScript construite, assets, D1 local și cele două variabile de test injectate. Cererile folosesc HTTP real pe loopback, pe un port alocat de sistem. La final runtime-ul este închis. Proxy-ul de dezvoltare Wrangler rămâne folosit în testele Playwright. Verificarea de izolare țintește artefactul de producție.

Rezultate locale pe această schimbare:
- `pnpm test`, `pnpm run typecheck`, `pnpm run build` au trecut, cu 161/161 teste Node.
- `pnpm run test:production-isolation` a trecut. După build, 12 invocări seriale ale `node scripts/check-production-isolation.mjs` au trecut în ordine, fără reluări după eșec. Timpii bootstrap în ms au fost 8, 9, 7, 11, 8, 7, 7, 8, 9, 8, 7, 12. Fiecare a scanat artefactul, a cerut 404 pentru login de test și a cerut utilizator anonim cu telefonul dezactivat.
- `node --import /tmp/p44-reject-account.mjs scripts/check-production-isolation.mjs` a respins răspunsul sintetic cu utilizator DEMO la aserțiunea de anonimat. Termenul de 15 secunde și erorile blocante sunt păstrate.
- Pachetul Miniflare este rezolvat din dependențele versiunii Wrangler instalate. Încercarea inițială de adăugare separată offline a fost blocată de metadate incomplete ale registrului local. Manifestul și lockfile-ul nu au modificări. Nu s-au schimbat găzduirea sau serviciile de producție.
