# Eligibilitate la aprobarea anunțului — 2 noiembrie 2026

Pornire: v29 privată / PR #35, sursă curată, instrucțiunile și documentele de reluare recitite. Ramură succesivă `imobiliare-cluj-etapa-10-publication-gate`. Fără main.

## Defect și fișiere

`lib/api.mjs`: verificarea contului proprietarului și UPDATE-ul publicării erau separate. Dacă între ele contul devenea restricționat/suspendat sau pierdea confirmarea telefonului, decizia putea salva status published și audit de aprobare. Filtrul public existent ascundea anunțul cât proprietarul era neeligibil, dar revenirea eligibilității putea expune anunțul fără o nouă aprobare.

UPDATE verifică acum în aceeași instrucțiune că proprietarul este activ și are telefon confirmat. Conflictul întoarce 409, păstrează pending și nu produce audit de aprobare. Respingerea rămâne permisă și pentru proprietarul devenit neeligibil. Nicio regulă de produs nouă; se aplică atomic regula existentă.

`tests/security.test.mjs`: două teste noi, cu trei schimbări ale eligibilității injectate înainte de UPDATE; verifică refuzul, lipsa auditului, lipsa publicării la reactivare și necesitatea unei aprobări explicite ulterioare. Al doilea test păstrează posibilitatea respingerii. Acest raport, VERIFICATION și CHANGELOG documentează schimbarea. Interfața și schema rămân neschimbate.

## Execuții

- `node --test --test-name-pattern='moderation publication|moderation rejection' tests/security.test.mjs`: înainte 1 trecut/1 eșuat, HTTP 200 în loc de 409; după 2/2 trecute.
- `pnpm test`: 146/146 trecute.
- `pnpm run typecheck`, `pnpm build`, `pnpm run test:production-isolation`, `git diff --check`: exit 0.
- Izolare: 55 fișiere scanate, login test 404, cookie DEMO ignorat și verificator simulat inactiv chiar cu flaguri test.

CI complet Chromium/WebKit, axe și capturile după sunt consemnate în PR după execuție. Referință înainte: [artefact v29](https://github.com/Rapunzel1999/nespus/actions/runs/41452157445/artifacts/13144832994). Nu se revendică schimbare vizuală; fluxul normal de moderare este acoperit de suita D1 local existentă.

## Limite și decizii

Intercalările sunt simulate în SQLite în memorie, nu într-o probă de concurență distribuită găzduită. Nu s-au injectat erori sau schimbat conturi/date în găzduire. Fără testare pe dispozitive fizice, VoiceOver, două conturi SIWC găzduite, SMS real sau import uman ICS. Capturile CI nu certifică interfața autentificată găzduită.

Pilot owner-only, SMS off/cap zero. Fără migrare, seed găzduit, secrete, schimbare de autentificare sau servicii facturate. L2, juridic și operațional rămân în DECISIONS-PENDING. Acest supliment nu certifică eliminarea tuturor curselor din toate rutele și nu declară rezolvat timeout-ul istoric al izolării.
