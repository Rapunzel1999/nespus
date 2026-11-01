# Etapa 10 · jurnal de livrare

## L0 — PR #10

Fișiere: `docs/BASELINE-ETAPA-10.md`, `docs/DECISIONS-PENDING.md`, `scripts/measure-baseline.mjs`. Fără modificări ale produsului. Sursa exactă din PR #9 a fost recuperată și comparată prin hash-ul arborelui Git.

Rezultate: `pnpm test` 93/93; `pnpm run typecheck` și `pnpm build` exit 0; `node scripts/measure-baseline.mjs` exit 0. API sintetic pentru 20 rezultate: 11127 octeți, fără date de imagine. D1 găzduit: zero anunțuri la citirea read-only. Cifrele complete sunt în documentul de baseline.

L0 nu schimbă interfața. Preview-ul gestionat nu a putut fi deschis (`ERR_CONNECTION_REFUSED`), dar măsurătorile au fost obținute ulterior pe runnerul CI cu D1 local; documentul de baseline include cifrele și proveniența.

## L1 — PR #11, scenarii executate

Fișiere:

- `tests/e2e/guard.mjs`, `worker.mjs`, `wrangler.json`, `seed.mjs`: intrare exclusiv de test, D1 local, identități și date DEMO, furnizor Verify simulat fără apeluri externe.
- `tests/e2e/server.spec.mjs`: verificare reală a API-ului pe D1 local și verificarea servirii HTML/JS/CSS.
- `tests/e2e/flows.spec.mjs`: scenarii UI și capturi/axe pentru șase ecrane la trei dimensiuni.
- `tests/e2e/baseline.spec.mjs`: măsurători de transfer și Lighthouse mobil; date sintetice și lipsa gateway-ului găzduit sunt explicate în rezultat.
- `tests/test-isolation.test.mjs`, `scripts/check-production-isolation.mjs`: protecții pentru configurarea și build-ul de producție, inclusiv probă HTTP pe Worker-ul construit.
- `playwright.config.mjs`, `scripts/run-qa.mjs`, `package.json`, `pnpm-lock.yaml`, `.github/workflows/ci.yml`, `.gitignore`, `README.md`: runner, dependențe de dezvoltare, CI și documentarea comenzii unice.

Comenzi executate în container:

| Comandă | Rezultat |
| --- | --- |
| `node "$SITES_PNPM_BIN" add -D @playwright/test @axe-core/playwright lighthouse` | Exit 0; versiuni în lockfile |
| `pnpm test` | 94/94 trecute |
| `pnpm run typecheck` | Exit 0 |
| `pnpm build` | Exit 0 |
| `pnpm run test:production-isolation` | Exit 0; 51 fișiere construite scanate; ruta test-login 404, cookie DEMO ignorat, telefon simulat indisponibil chiar cu variabile de test injectate |
| `pnpm exec playwright test server.spec.mjs --project=chromium` | După corectarea tokenului fictiv prea scurt: 1/1 trecut, D1 local, inclusiv HTML/JS/CSS |
| `pnpm exec playwright test --list` | 20 cazuri enumerate, în trei fișiere; enumerarea nu este execuție |
| `pnpm exec playwright install chromium webkit` | Eșec: descărcarea oficială a primit arhive invalide; niciun browser local instalat |
| `pnpm exec playwright test flows.spec.mjs --project=chromium --grep 'unverified phone allows'` | Eșec înainte de UI: executabil Chromium absent |
| `git diff --check` | Exit 0 |

`server.spec` nu folosește un browser, deși este executat de runnerul Playwright. El verifică traseul HTTP/Worker/D1 și furnizorul simulat. Nu trebuie prezentat ca test UI.

CI, [run 41311839840](https://github.com/Rapunzel1999/nespus/actions/runs/41311839840), commit `4fe533f362d85649420c25895dcd7ac5081dd03e`: `pnpm run test:e2e` — **19 trecute, 1 omis intenționat** (Lighthouse nu rulează pe WebKit). Scenariile UI rulează în Chromium și WebKit mobil; API-ul folosește D1 local pe runner. Verificările Node/TypeScript/build și izolarea producției au trecut în același run. Primele rulări au eșuat din cauza selectorilor de test ambigui/neconcordanți; au fost corectați, fără modificarea comportamentului produsului.

[Artefact 13085344319](https://github.com/Rapunzel1999/nespus/actions/runs/41311839840/artifacts/13085344319): **36 capturi**, șase pagini × trei viewport-uri × două motoare, șase rapoarte axe și trei rapoarte Lighthouse. Capturile înainte/după L1 reprezintă aceeași interfață; L1 introduce teste, nu redesign. Retenție CI 14 zile.

Axe în L1 este raportat, nu folosit încă drept criteriu de blocare. La 375 px în Chromium:

| Ecran | Probleme serious: noduri pe regulă | Alte reguli |
| --- | --- | --- |
| Acasă | contrast: 24; nepotrivire text/nume accesibil: 6 | — |
| Rezultate | contrast: 3 | aria-allowed-role (minor), heading-order (moderate) |
| Anunț | contrast: 4; nepotrivire text/nume accesibil: 1 | heading-order (moderate) |
| Comparare (dialog deschis) | 0 | 0 |
| Conversație | contrast: 3 | — |
| Editor, pasul inițial | contrast: 5 | — |

Nicio problemă critical în aceste rapoarte. Desktop/tabletă au și ele probleme de contrast și nume accesibile pe acasă, anunț și editor. WebKit are rezultate similare (23 noduri de contrast pe acasă la 375 px). Numerele sunt noduri raportate pentru fiecare regulă, nu probleme juridice/WCAG distincte. L3 și L8 trebuie să remedieze aceste constatări și să reruleze auditul. Dialogul deschis de comparație exclude conținutul inert din spate; nu certifică întreaga pagină de favorite.

Nu au fost verificate: SMS real, două conturi SIWC găzduite, iPhone fizic, Android, VoiceOver. Nu s-a făcut livrare Sites în această etapă. Nicio migrare sau scriere în D1 găzduit; SMS și audiența nu au fost modificate.
