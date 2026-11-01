# Filtrele portofoliului proprietarului · 2 noiembrie 2026

## Problemă observată și modificare

Captura `webkit-mobile/draft-discard/saved-listing-preserved.png` din [artefactul versiunii 16](https://github.com/Rapunzel1999/nespus/actions/runs/41361120694/artifacts/13105596085) arată etichete suprapuse pe butoanele portofoliului la 375 px. Flexbox comprima cele șase butoane până la minimul global de 44 px, deși textul `nowrap` era mai lat. Verificarea axe a celorlalte șase pagini nu acoperea pagina contului și nu certifica această geometrie.

`public/owner.css`: filtrele folosesc mai multe rânduri; butoanele păstrează lățimea conținutului, textul crește de la 11 la 13 px și spațiul dintre țintele mobile este de 8 px. Nu se schimbă ordinea, funcția, etichetele, numerele sau starea selectată. Nicio schimbare de API, schemă ori date găzduite.

`tests/e2e/flows.spec.mjs`: matricea existentă include acum și contul proprietarului, cu anunțuri DEMO. Pentru fiecare dimensiune/motor se verifică șase etichete în interiorul butoanelor, minimum 44×44 px, lipsa suprapunerilor și lipsa ieșirii din viewport. Tab parcurge în ordine toate filtrele; Enter selectează starea fără rezultate; resetarea readuce cele opt anunțuri DEMO. Capturile `owner.png`, rapoartele axe și `owner-filter-geometry.json` sunt produse de aceeași comandă `pnpm run test:e2e`. Aceasta extinde matricea de la 36 la 42 evaluări, fără a inventa șase teste Playwright noi.

README indică ramura continuării, iar CHANGELOG descrie corecția. PR-ul rămâne succesiv după #22; nicio modificare sau îmbinare în `main`.

## Verificări locale efectuate

| Comandă | Rezultat |
| --- | --- |
| `pnpm test` | 127/127 trecute, zero eșecuri |
| `pnpm run typecheck` | Exit 0 |
| `pnpm build` | Exit 0 |
| `pnpm run test:production-isolation` | Exit 0; 55 fișiere scanate, test-login 404, cookie DEMO ignorat, telefonul simulat oprit inclusiv cu flaguri |
| `node --check tests/e2e/flows.spec.mjs` | Exit 0 |
| `git diff --check` | Exit 0 |

Rezultatul browserului și livrarea se consemnează în PR după execuția CI pe sursa exactă. Nu se prezintă drept rezultate deja trecute la redactarea acestui document. Nu a fost rulat un test automat înainte de corecție; dovada problemei este captura existentă. Local nu există browserul necesar; Chromium/WebKit rulează efectiv în runnerul CI, pe Worker și D1 locale acestuia.

Capturi înainte: artefactul versiunii 16 de mai sus, contul din `draft-discard/`. Capturi după: `chromium/{375,768,1280}/owner.png`, `webkit-mobile/{375,768,1280}/owner.png` și aceleași stări din `draft-discard/`. Datele DEMO rămân exclusiv în test.

## Limite și decizii

Prima execuție [CI 41362012695](https://github.com/Rapunzel1999/nespus/actions/runs/41362012695) pe sursa GitHub `8211693ac58db76531cae033068bb23da565d3ae`: verify trecut, browser **8 trecute / 3 eșuate / 17 nerulate**. Oprirea după trei eșecuri păstrează regula existentă. Toate cele trei eșecuri sunt în noua captură a contului: axe a identificat contrast insuficient la cele trei explicații din `.owner-summary p`. [Artefact inițial](https://github.com/Rapunzel1999/nespus/actions/runs/41362012695/artifacts/13105392371).

Culoarea veche `#64745b` pe `#f0f3e9` are raportul calculat **4,4623:1**, sub pragul de 4,5:1. Corecția folosește tokenul existent `--muted`, fără relaxarea testului. Nu au fost modificate aserțiuni, timeout-uri, retry-uri ori limita eșecurilor. Arhiva intermediară a fost pregătită, dar nu a fost livrată; site-ul a rămas la versiunea 16. Rezultatele pe sursa finală sunt consemnate în PR.

Nu sunt verificate dispozitive fizice, VoiceOver/NVDA, două conturi SIWC găzduite sau UI-ul găzduit autentificat. Testele de tastatură și geometrie nu înlocuiesc aceste probe. Nu s-au trimis SMS/emailuri, nu s-a activat facturare și nu s-au modificat autentificarea, audiența, schema sau datele găzduite. Pilotul rămâne privat. Variantele foto L2 și celelalte condiții de lansare din DECISIONS-PENDING rămân deschise. Timeout-ul istoric Wrangler nu este declarat rezolvat.
