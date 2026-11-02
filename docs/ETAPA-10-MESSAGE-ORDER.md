# Activitatea conversațiilor la trimiteri suprapuse — 2 noiembrie 2026

Pornire: versiunea 22 privată, PR #28, checkout curat, CI 41386837339 verde. Instrucțiunile Sites și punctele de reluare au fost consultate; fără AGENTS.md în repository.

## Problemă și schimbare

Mesajul este inserat, apoi contact_requests.updated_at este actualizat cu momentul cererii. Două cereri pot termina în ordine inversă: cererea mai veche suprascria ora celei noi, afectând recența raportată în lista conversațiilor.

Actualizarea de după inserarea mesajului folosește acum MAX(updated_at, momentul cererii), evaluat în SQL pe valoarea curentă. Nu se modifică timestamp-urile mesajelor, sortarea lor, cotele, idempotența sau permisiunile. Nu există migrare ori backfill. Această corecție nu transformă cele două operațiuni într-o tranzacție și nu revendică rezolvarea tuturor intercalărilor posibile ale altor acțiuni.

Fișiere: lib/api.mjs, tests/security.test.mjs, acest raport, CHANGELOG și VERIFICATION.

## Dovadă și comenzi

Testul SQLite intercalează determinist două apeluri reale handleApi: cererea cumpărătorului este oprită înainte de actualizarea activității; mesajul proprietarului cu moment +1000 ms se finalizează; apoi primul apel continuă. Nu sunt două conturi SIWC găzduite și nu este un test de concurență distribuită Cloudflare.

- `node --test --test-name-pattern='a delayed message cannot' tests/security.test.mjs` înainte: **0/1**, ora 1792087200000 în loc de 1792087201000.
- Aceeași comandă după: **1/1**, verifică timestamp-ul din SQLite, updatedAt din inbox și ordinea celor două mesaje din API.
- `pnpm test`: **133/133**.
- `pnpm run typecheck`, `pnpm build`, `pnpm run test:production-isolation`, `git diff --check`: **exit 0**. 55 fișiere scanate; login test 404, cookie DEMO ignorat, telefon simulat oprit.
- CI și livrarea sursei exacte sunt consemnate în PR după execuție.

## Capturi și limite

UI neschimbat. Referință înainte: [artefact v22](https://github.com/Rapunzel1999/nespus/actions/runs/41386837339/artifacts/13115374544). CI produce matricea standard după; dovada regresiei este testul API, nu o captură statică.

Nu s-au verificat UI autentificat găzduit, două conturi SIWC, iPhone/Android fizic, VoiceOver/NVDA, SMS real sau import uman ICS. Nicio scriere de test, migrare sau seed în baza găzduită; main, autentificarea, audiența și costurile rămân neschimbate. SMS oprit, plafon zero. L2, juridic și operare rămân deschise. Timeout-ul istoric Wrangler nu este declarat rezolvat.
