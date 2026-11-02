# Trimitere și reconfirmare — 2 noiembrie 2026

Pornire verificată: v30 privată / PR #36, checkout curat; documentele de reluare și fluxul Sites recitite. Ramură succesivă `imobiliare-cluj-etapa-10-owner-gates`, fără main.

## Defect și corecție

Verificările de eligibilitate precedau UPDATE-ul pentru submit/reconfirm. O restricționare, suspendare sau pierdere a confirmării telefonului între cele două momente putea permite acțiunea. Separat, o editare concurentă putea elimina fotografiile după verificarea lor și înainte de submit.

- `lib/api.mjs`: ambele UPDATE-uri verifică proprietarul activ și telefonul confirmat; submit verifică și existența fotografiilor în rândul curent. Un conflict întoarce 409, fără schimbarea stării/termenului și fără audit fals. Regula existentă nu este relaxată.
- `tests/security.test.mjs`: două teste noi; șase combinații acțiune/eligibilitate și eliminarea fotografiilor înainte de UPDATE. Verifică refuzul, păstrarea câmpurilor și absența auditului.
- Acest raport, VERIFICATION și CHANGELOG documentează schimbarea. Interfața, schema și textele juridice nu sunt modificate.

## Execuții reale

- `node --test --test-name-pattern='owner submit|submission rechecks' tests/security.test.mjs`: înainte 0/2; după 2/2.
- `pnpm test`: 148/148 trecute.
- `pnpm run typecheck`, `pnpm build`, `pnpm run test:production-isolation`, `git diff --check`: exit 0. Izolare: 55 fișiere scanate, login test 404, cookie DEMO ignorat, verificator simulat inactiv chiar cu flaguri test.
- `pnpm exec playwright test server.spec.mjs --project=chromium`: rezultatul exact și CI complet sunt consemnate în PR.

Capturi înainte: [artefact v30](https://github.com/Rapunzel1999/nespus/actions/runs/41463092014/artifacts/13149922745). Capturile după și axe Chromium/WebKit se leagă în PR după CI. Schimbarea este pe server, nu vizuală.

## Limite

Intercalări simulate în SQLite în memorie, nu concurență distribuită găzduită. Succesul normal este verificat și prin Worker/D1 local; nu se injectează erori în găzduire. Fără testare UI găzduită autentificată, două conturi SIWC găzduite, iPhone/Android fizic, VoiceOver, SMS real sau import uman ICS. Nu certifică eliminarea tuturor curselor din toate rutele.

Pilot owner-only; SMS off/cap zero. Fără main, migrări, seed găzduit, servicii plătite sau secrete în GitHub. L2, juridic și operare rămân deschise în DECISIONS-PENDING. Timeout-ul istoric al izolării nu este declarat rezolvat.
