# Integritatea datelor JSON — 2 noiembrie 2026

Pornire verificată: versiunea privată 18, PR #24, ramura `imobiliare-cluj-etapa-10-search-literal`, checkout curat. Sites confirmă acces custom, un owner. Ramura acestui livrabil este `imobiliare-cluj-etapa-10-json-input`, fără modificări main.

## Problemă și modificare

`lib/api.mjs`: verificarea Content-Type cu startsWith accepta `application/jsonp` și `application/json-evil`. Decodorul UTF-8 înlocuia secvențele invalide, permițând salvarea unui text modificat tacit. Testele au reprodus status 200 în loc de 415, respectiv 200 în loc de 400.

Acum se compară tipul media exact, ignorând majusculele și separând parametrii; decodarea UTF-8 folosește fatal:true în blocul existent care întoarce 400. Limita corpului, autorizarea, controlul reviziilor și validarea câmpurilor rămân neschimbate. Cererile invalide pot consuma cota existentă de încercări; nu se promite absența oricărei scrieri tehnice, ci păstrarea conținutului și reviziei ciornei.

`tests/security.test.mjs`: două regresii API/SQLite cu bytes reali în Request, tipuri media nepermise, JSON valid cu majuscule/parametri, secvență UTF-8 coruptă, păstrarea ciornei/reviziei și actualizare ulterioară cu diacritice și emoji. Datele sunt exclusiv de test. CHANGELOG și acest raport documentează schimbarea.

## Verificări locale

- `node --test --test-name-pattern='JSON input' tests/security.test.mjs`: înainte 0/2, după 2/2 trecute.
- `pnpm test`: 130/130 trecute.
- `pnpm run typecheck`, `pnpm build`, `git diff --check`: exit 0.
- Prima execuție `pnpm run test:production-isolation`: **exit 1**, timeout la bootstrap anonim după health 200 și test-login 404. Scanarea statică a celor 55 de fișiere a trecut. Acesta este simptomul intermitent deja documentat; cauza nu este stabilită, iar rezultatul nu este prezentat ca succes. Orice reluare este raportată separat; aserțiunile și timeout-ul nu sunt modificate.
- A doua execuție a aceleiași comenzi pe același build: **exit 0**, login test 404, cookie DEMO ignorat, telefon simulat dezactivat inclusiv cu flaguri. Această reușită nu stabilește cauza primului timeout și nu îl șterge din raport. CI rămâne verificare independentă și blocantă.
- CI pe sursa exactă și livrarea sunt consemnate în PR după execuție, fără a le declara anticipat trecute.

## Capturi, limite și decizii

Nu se schimbă HTML/CSS/UI. Referința înainte este [artefactul versiunii 18](https://github.com/Rapunzel1999/nespus/actions/runs/41365686036/artifacts/13106809381); CI păstrează aceeași matrice de capturi/axe pentru sursa nouă. Regresia este demonstrată prin status HTTP și citirea ciornei, nu prin capturi decorative.

Nu s-au verificat UI găzduit autentificat, două conturi SIWC, iPhone/Android fizic, VoiceOver/NVDA, SMS real sau import uman ICS. Nicio migrare, ștergere, seed ori probă de scriere pe date găzduite. Nu se schimbă autentificarea, audiența sau configurația SMS; nu se activează costuri. Pilotul rămâne privat. L2 și condițiile juridice/operaționale rămân deschise; timeout-ul istoric Wrangler nu este declarat rezolvat.
