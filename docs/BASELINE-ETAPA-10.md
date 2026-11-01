# Etapa 10 · L0 · măsurători inițiale

Data: 1 noiembrie 2026. Sursa: PR #9, `imobiliare-conversations-quality`, commit GitHub `a6ab4c72e79ce28e13b1712cb8d48d379937dd46`, arbore `817d7cfe84c959d83e9593b18ff62f30edb7193f`. Copia Sites `2004604531f5a5a8b2dc939929b60c4166ffef42` are exact același arbore. Ramura GitHub nouă `imobiliare-cluj-etapa-10` pornește din PR #9. Nicio modificare a comportamentului în L0.

Au fost citite README, VERIFICATION, ARCHITECTURE, PRODUCT și TWILIO_VERIFY.

## Verificări executate

| Comandă | Rezultat |
| --- | --- |
| `node /root/.codex/plugins/cache/openai-curated-remote/sites/1.1.2/scripts/install-dependencies.mjs` | Instalare reușită cu lockfile existent; pnpm 11.25.0 |
| `pnpm test` | 93 teste, 93 trecute, 0 eșuate, 0 omise |
| `pnpm run typecheck` | Exit 0 |
| `pnpm build` | Exit 0; Vinext construiește Worker-ul |
| `node scripts/measure-baseline.mjs` | Exit 0; măsurători deterministe, SQLite în memorie |
| `sites-preview start /workspace/scratch/0d549cc238f2/intre-noi` | CLI: `Sites preview running at http://terminal.local:4173/` |
| Deschiderea URL-ului exact în browserul gestionat | Eșec: `net::ERR_CONNECTION_REFUSED` |
| `sites-preview status` | Daemonul raportează pornit |
| `sites-preview stop` | Oprit |

## Dimensiunea sursei

KB înseamnă 1.000 octeți; liniile sunt delimitate de LF. Fișierele originale au numeroase instrucțiuni compacte pe aceeași linie.

| Fișier | Linii | Octeți | KB |
| --- | ---: | ---: | ---: |
| public/app.js | 914 | 144215 | 144,215 |
| public/app.css | 168 | 48580 | 48,580 |
| public/brand.css | 172 | 20922 | 20,922 |
| public/property.css | 124 | 14313 | 14,313 |
| public/owner.css | 94 | 12316 | 12,316 |
| public/favorites.css | 74 | 12067 | 12,067 |
| public/conversations.css | 95 | 9969 | 9,969 |
| public/accessibility.css | 33 | 2428 | 2,428 |

Total CSS: **120595 octeți**. Acestea sunt dimensiuni pe disc, nu transfer HTTP comprimat.

## Fotografii și date

Codul confirmă JPEG ca data URL base64 într-un tablou JSON în coloana D1 `listings.photos`. Maximum 5 fotografii/anunț; plafon 400000 caractere/data URL; decodare și recodificare pe server; maximum 1200 px pe fiecare dimensiune. Acestea sunt limite de implementare, nu dimensiuni medii observate.

Citire read-only prin Sites: `read_database_overview`, apoi `read_database_table_rows`, binding `DB`, tabel `listings`, offset 0, limit 25. Rezultat: **0 rânduri**, `has_more=false`, fără trunchiere. Nu există fotografii de anunț în baza găzduită la această citire. Media și maximul sunt **nedefinite**, nu zero. Nu au fost introduse date demo în găzduire.

Măsurătoare sintetică, reproductibilă: 20 de anunțuri DEMO în SQLite în memorie, API-ul real `handleApi`, status 200. JSON UTF-8: **11127 octeți**; 20 rezultate; **fără base64**. Fotografia de test generată procedural are 3937 octeți JPEG / 5275 caractere data URL. Nu reprezintă o fotografie comercială ori o medie din trafic.

Diferență față de ipoteza promptului: răspunsurile de căutare conțin deja URL-uri autorizate, nu date de imagine. L2 trebuie să păstreze acest contract. Obiectivul rămas este micșorarea imaginilor solicitate separat și validarea cache-ului fără pierderea autorizării.

## Măsurători browser executate pe runnerul CI

Preview-ul gestionat din container rămâne inaccesibil. Măsurătorile de mai jos au fost executate cu **D1 local în runnerul GitHub Actions**, Chromium, Lighthouse 13.5.0, la 1 noiembrie 2026, 13:22 UTC. Nu provin din site-ul găzduit sau dintr-un iPhone fizic. Fișierele produsului sunt încă identice cu PR #9; harness-ul adaugă bannerul DEMO și autentificarea de test exclusiv în intrarea locală.

Comandă: `pnpm run test:e2e`, testul `mobile Lighthouse and cold homepage network measurements`: **trecut** în [run 41310837797](https://github.com/Rapunzel1999/nespus/actions/runs/41310837797). Întregul job a eșuat separat în scenarii UI din cauza selectorilor de test; acest lucru nu anulează rezultatul individual și nu este prezentat ca succes al întregii suite.

Context rece, viewport 375×812, înainte de derulare, opt anunțuri DEMO cu imagini procedurale: **15 răspunsuri HTTP**, **208126 octeți transferSize**, **203626 octeți encodedBodySize**, însumate din Navigation/Resource Timing. Nu include traficul după derulare ori gateway-ul SIWC. Fotografiile sintetice sunt mult mai simple decât fotografiile reale; nu extrapola aceste cifre la inventarul viitor.

| Pagină | Lighthouse performance | Lighthouse accessibility | LCP (ms) | CLS | TBT (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Acasă | 98 | 97 | 2158,008 | 0 | 12 |
| Rezultate | 99 | 95 | 1812,9096 | 0 | 0 |
| Anunț | 99 | 94 | 1849,4984 | 0 | 0 |

O singură execuție/pagină, profil mobil cu throttling implicit Lighthouse; scorurile pot varia. Scorul accessibility nu echivalează cu un audit WCAG sau raport axe curat.

Dovezi: [artefact CI 13085422850](https://github.com/Rapunzel1999/nespus/actions/runs/41310837797/artifacts/13085422850), `baseline/measurements.json`, trei rapoarte HTML și capturi ale stării inițiale pentru acasă/rezultate/anunț la 375, 768 și 1280 px, în Chromium și WebKit. Artefactul CI are retenție 14 zile; cifrele și proveniența rămân în acest document. Comparație vizuală înainte/după: L0 nu schimbă interfața; capturile sunt referința pentru livrabilele ulterioare.

L0: inventar și măsurători obținute; niciun comportament al produsului schimbat. Capturile celorlalte trei ecrane și scenariile UI complete aparțin L1 și rămân în verificare.
