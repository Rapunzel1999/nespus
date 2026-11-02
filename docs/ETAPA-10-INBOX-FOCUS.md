# Focus păstrat la actualizarea conversațiilor — 2 noiembrie 2026

Pornire: v24 privată, PR #30, checkout curat. README, VERIFICATION, jurnalul și deciziile deschise consultate; flux Sites existent reutilizat.

## Corecție

renderList recrea butoanele la polling și pierdea focusul unui utilizator care naviga din tastatură. Înaintea reconstruirii se reține ID-ul conversației numai dacă focusul este pe un buton de conversație; după reconstruire se focalizează butonul aceleiași conversații, dacă mai există, cu preventScroll. Nu se preia focusul din căutare sau compozitor și nu se selectează altă conversație. Ordinea, cotele și API-ul rămân neschimbate.

Fișiere: public/app.js, tests/conversations.test.mjs, tests/e2e/flows.spec.mjs, acest raport, VERIFICATION și CHANGELOG.

## Verificări

- `node --test --test-name-pattern='inbox refresh preserves' tests/conversations.test.mjs`: înainte 0/1, aserțiunea focusului eșuează; după 1/1. Verifică mutarea conversației în listă și păstrarea focusului în câmpul de căutare la următoarea actualizare.
- `pnpm test`: 137/137.
- `pnpm run typecheck`, `pnpm build`, `pnpm run test:production-isolation`, `git diff --check`: exit 0; 55 fișiere scanate, login DEMO 404, cookie ignorat, telefon simulat oprit.
- Scenariu browser nou: două contexte locale, mesaj primit în timp ce butonul conversației este focalizat, aserțiune de focus după actualizare. Execuția Chromium/WebKit și axe sunt raportate în PR după CI.

## Capturi și limite

Referință vizuală a versiunii anterioare: [artefact v24](https://github.com/Rapunzel1999/nespus/actions/runs/41398209569/artifacts/13120118256). Scenariul nou produce inbox-focus/before-refresh.png și after-refresh.png în fiecare motor; sunt două stări ale build-ului corectat, nu capturi ale codului vechi. Matricea standard și axe rămân active.

Nu sunt verificate UI autentificat găzduit, dispozitive fizice, VoiceOver/NVDA, două conturi SIWC găzduite, SMS real sau import uman ICS. Layout, schema, autentificarea, audiența și costurile nu se schimbă. Nicio migrare, ștergere sau seed găzduit; main nemodificat, SMS oprit/cap zero. L2 și condițiile juridice/operaționale rămân deschise; timeout-ul istoric nu este declarat rezolvat. Livrarea și proveniența sunt în PR.
