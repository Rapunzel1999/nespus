# Marcajul căutării aparține navigării sale — 2 noiembrie 2026

Pornire v32 privată / PR #38, checkout curat și documentele de reluare recitite. Ramură succesivă `imobiliare-cluj-etapa-10-search-navigation`, fără main.

## Defect și fișiere

`public/app.js`: savedSearchOpening rămânea global până la răspunsul reușit. Dacă utilizatorul întrerupea căutarea sau aceasta eșua, o altă căutare putea trimite seen pentru prima listă, deși rezultatele ei nu fuseseră afișate. Contextul este acum consumat la începutul browse și păstrat local. Doar butonul explicit Reîncearcă al acelei încărcări îl transmite mai departe. Navigările independente nu îl moștenesc.

`tests/saved-search-ui.test.mjs`: trei teste noi pentru cerere întreruptă, reîncercare explicită și navigare nouă după eroare. `tests/e2e/flows.spec.mjs`: eroare 503 locală, schimbare de cartier prin panoul mobil, zero seen pentru vechea căutare, apoi deschidere explicită din cont și exact un seen. Acest raport, VERIFICATION și CHANGELOG consemnează dovezile. Fără modificare vizuală sau API/schemă.

## Execuții

- `node --test tests/saved-search-ui.test.mjs`: înainte 3/5, după 5/5.
- `pnpm test`: 153/153.
- `pnpm run typecheck`, `pnpm build`, `pnpm run test:production-isolation`, `git diff --check`: exit 0. Izolare: 55 fișiere, test-login 404, cookie DEMO ignorat, telefon simulat inactiv.

CI, capturi și axe după se completează în PR. [Referință înainte v32](https://github.com/Rapunzel1999/nespus/actions/runs/41488467773/artifacts/13163307093); nu conține noul scenariu de navigare. Defectul anterior este demonstrat de regresiile DOM, nu de o captură inventată.

## Limite

Probe locale/CI, fără UI găzduit autentificat, două conturi SIWC găzduite, dispozitive fizice, VoiceOver, SMS real sau import uman ICS. Nu se schimbă semantica paginării căutărilor; corecția izolează contextul unei navigări. Fără retry automat sau aserțiuni slăbite.

Pilot owner-only, SMS off/cap zero, main neatins. Fără secrete, servicii plătite, migrare sau seed găzduit. L2, juridic, operare și timeout-ul istoric rămân deschise.
