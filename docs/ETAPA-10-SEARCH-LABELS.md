# Căutări salvate ușor de deosebit — 2 noiembrie 2026

Pornire v33 privată / PR #39, checkout curat și documente de reluare recitite. Ramură succesivă `imobiliare-cluj-etapa-10-search-labels`, fără main.

## Problemă și fișiere

`public/app.js`: titlurile omiteau tipul locuinței, prețul minim, suprafața minimă și camerele. Două căutări diferite afișau același titlu. Rezumatul include acum toate filtrele persistate, moneda lângă fiecare limită de preț, m² și semnul + pentru minimum camere. Cuvintele-cheie au etichetă. Valorile zero explicite se păstrează; filtrele absente nu sunt inventate. Folosește noduri text, nu HTML din filtre. Deschiderea și ștergerea păstrează comportamentul existent.

`tests/saved-search-ui.test.mjs`: două regresii pentru deosebirea căutărilor și bugetul zero. `tests/e2e/flows.spec.mjs`: două căutări DEMO diferențiate pe mobil, absența overflow-ului, captură, axe și verificarea filtrelor din URL după deschidere. Acest raport, VERIFICATION și CHANGELOG documentează livrabilul.

## Execuții

- `node --test --test-name-pattern='saved search headings' tests/saved-search-ui.test.mjs`: înainte 0/2.
- `node --test tests/saved-search-ui.test.mjs`: după 7/7.
- `pnpm test`: 155/155.
- `pnpm run typecheck`, `pnpm build`, `pnpm run test:production-isolation`, `git diff --check`: exit 0. 55 fișiere, login test 404, cookie DEMO ignorat, telefon simulat inactiv.

CI/capturi/axe după și proveniența livrării se completează în PR. [Referința înainte v33](https://github.com/Rapunzel1999/nespus/actions/runs/41498113304/artifacts/13168336425) conține ecranele standard; omisiunile sunt reproduse exact în regresia DOM. Nu există o captură anterioară inventată a celor două căutări.

## Limite

Nu sunt verificate UI autentificat găzduit, două conturi SIWC găzduite, dispozitive fizice, VoiceOver, SMS real ori import uman ICS. DEMO numai local/CI. Fără conversie valutară sau modificare API, schemă, autentificare. Pilot owner-only, SMS off/cap zero; main neatins. Fără secrete, servicii plătite, migrări sau seed găzduit. L2, juridic, operare și timeout-ul istoric rămân deschise.

## Contrast descoperit în scenariul nou

Prima rulare CI 41517246587: 155 teste Node reușite; browser 35 reușite, 2 eșuate, 1 omis. Ambele motoare au identificat contrast 4,49:1 pentru `.owner-empty > p` (#627358 pe #eef2e7), în contul căutătorului fără anunțuri. `public/owner.css` folosește acum tokenul existent `--muted` (#52634f). Aserțiunea axe rămâne strictă. [Capturi înainte de corecția contrastului](https://github.com/Rapunzel1999/nespus/actions/runs/41517246587/artifacts/13177225097), în `<engine>/saved-search-labels/distinct-searches.png`. Rezultatul rerulării și livrarea sunt consemnate în PR.

După corecția CSS: `pnpm test` 155/155; `pnpm run typecheck`, `pnpm build`, `pnpm run test:production-isolation`, `git diff --check` exit 0.
