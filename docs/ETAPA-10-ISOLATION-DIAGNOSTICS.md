# Diagnostic al izolării producției — 2 noiembrie 2026

Starea de pornire verificată: versiunea 19 owner-only, PR #25, checkout curat. Testul istoric se oprise intermitent la bootstrap, fără a distinge așteptarea răspunsului de citirea corpului. Prima verificare neschimbată din această sesiune a trecut; timeout-ul nu s-a reprodus.

## Schimbare

`scripts/check-production-isolation.mjs` înregistrează etapele startup, răspuns/status/corp pentru login-ul de test și bootstrap, apoi aserțiunile bootstrap. Duratele folosesc performance.now(). Eroarea include etapa, durata și exitCode/signalCode ale procesului copil, urmate de diagnosticul existent. Nu se înregistrează corpuri de răspuns, cookie-uri sau credențiale suplimentare.

Bootstrap cere explicit HTTP 200 înainte de parsare; validările user=null și phoneVerification=false rămân. Nu s-au modificat limitele de 15 secunde, verificările statice, cookie-ul DEMO, ordinea cererilor ori mecanismul de oprire. Niciun retry automat. Nu se modifică aplicația din app/lib/public, autentificarea, API-ul, schema sau găzduirea. CHANGELOG, VERIFICATION și acest raport documentează livrabilul.

## Verificări efective

- `pnpm run test:production-isolation` înaintea modificării: exit 0.
- Aceeași comandă instrumentată: exit 0; bootstrap response 5 ms, body 1 ms. Nu sunt valori de performanță găzduită.
- `node /tmp/isolation-status-probe.mjs`: **exit 1 intenționat**, diagnostic `bootstrap status`, 404 != 200, copil încă activ. Copia temporară diferă numai prin înlocuirea unicului `fetch(origin+'/api/bootstrap'` cu `fetch(origin+'/__test/login'`. Este o probă controlată de eșec HTTP, nu o reproducere a timeout-ului și nu intră în build. Codul 1 a fost verificat explicit în shell.
- `pnpm test`: **130/130**, fără inventarea unor teste unitare noi pentru mesajele de log.
- `pnpm run typecheck`, `pnpm build`, `git diff --check`: exit 0.
- `pnpm run test:production-isolation` după build-ul final: exit 0; startup 1167 ms, login response 37 ms, login body 5 ms, bootstrap response 6 ms, bootstrap body 2 ms. Scanare 55 fișiere; login test 404, cookie DEMO ignorat, telefon simulat oprit inclusiv cu flaguri.
- Rezultatele CI și livrarea sursei exacte sunt în PR după execuție. Nu sunt afirmate anticipat.

## Capturi și limite

UI-ul este neschimbat. Referința înainte: [artefact v19](https://github.com/Rapunzel1999/nespus/actions/runs/41370413268/artifacts/13108953725). CI produce matricea existentă după; modificarea este verificată în log, nu prin capturi decorative.

Cauza timeout-ului istoric rămâne necunoscută. Următorul eșec natural va putea fi localizat mai precis; succesul actual nu închide problema. Nu s-au verificat UI găzduit autentificat, dispozitive fizice, două conturi SIWC găzduite, VoiceOver/NVDA, SMS real sau importuri umane ICS. Fără scrieri/seed/migrări găzduite, costuri noi, schimbare de autentificare/audiență ori modificări main. SMS oprit, pilot privat. Decizia foto L2 și condițiile juridice/operaționale rămân deschise.
