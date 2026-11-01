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

## L2 — fotografii existente; variante oprite la decizia de arhitectură

Fișiere: `lib/model.mjs` plafonează totalul fotografiilor pentru limita de rând D1; `lib/api.mjs` servește ETag după autorizare și permite revalidare 304; `public/app.js` rezervă dimensiuni pentru fotografii și încarcă imediat prima imagine din rezultate; `tests/security.test.mjs` verifică schimbarea conținutului, accesul condițional revocat și fotografii valide care împreună depășesc bugetul. Motivul opririi variantelor, propunerea și limitele sunt în `DECISIONS-PENDING.md`.

Rulat: `pnpm test` — **96/96**; `pnpm run typecheck` — exit 0; `pnpm build` — exit 0; `pnpm run test:production-isolation` — exit 0. Datele de căutare rămân fără imagine inline. Nu s-a migrat nicio bază găzduită și nu s-a activat stocare cu facturare.

Capturi înainte: artefactul L1. După și Lighthouse: suita browser din CI pentru această ramură (rezultatul se completează după execuție). Schimbarea nu produce un nou layout; comparația nu poate demonstra optimizarea variantelor, care nu este implementată. Pragul de ~100 KB pentru fotografii reale și migrarea variantelor rămân neverificate/blocate de decizia de stocare. Nu se confundă dimensiunea fotografiilor DEMO uniforme cu o medie de producție.

## L3 — ierarhie vizuală și mobil

Fișiere: `public/design.css` formalizează verde/crem, culori semantice, spațiere și tipografie; `lib/document.html` încarcă stratul comun; `public/app.js` reorganizează cardurile (fotografie 4:3, preț/monedă/tranzacție, date, disponibilitate, favorite), adaugă sumarul mobil și bara de acțiuni, glisare în galerie și nume accesibile concordante. `lib/api.mjs` și `lib/model.mjs` expun doar data evenimentelor reale de publicare/reconfirmare, fără a transforma o simplă editare în reconfirmare. Testele și seed-ul DEMO sunt adaptate.

Rulat: `pnpm test` — **97/97**; `pnpm run typecheck` și `pnpm build` — exit 0. Caz nou: editarea anunțului nu falsifică data disponibilității. Selectorii E2E păstrează verificarea reală a salvării favoritelor și adaugă navigarea galeriei cu tastatura.

Capturi înainte: L1. Capturi după, axe și Lighthouse: CI pentru ramura L3; rezultatul se consemnează după rulare. Nu s-au folosit imagini noi, statistici sau testimoniale. Fotografiile DEMO sunt numai în test. Comportamentul tactil este implementat, dar nu a fost verificat pe iPhone fizic. Contrastele sunt corectate pentru constatările L1; certificarea tuturor paginilor rămâne în L8.

### Confirmare L3 pe CI

[Run 41313386114](https://github.com/Rapunzel1999/nespus/actions/runs/41313386114), commit `7cbbf64a93547639fbdac055819c1302abfbcdde`: verificări de cod/build/izolare trecute; **19 teste E2E trecute, 1 omis** (Lighthouse WebKit). [Artefactul 13086388326](https://github.com/Rapunzel1999/nespus/actions/runs/41313386114/artifacts/13086388326) conține capturile după L3; au fost inspectate anunțul și rezultatele la 375 px și acasă la 1280 px. Comparabil cu artefactul L1, aceeași bază DEMO. Anunțul mobil afișează fotografia, prețul și datele esențiale în primul ecran, cu bara de contact fixă.

Lighthouse mobil Chromium, o rulare: acasă 98 performanță / 97 accesibilitate; rezultate 99/100; anunț 100/100; CLS 0 pe toate. Trafic acasă rece înainte de scroll: 16 răspunsuri, 210746 octeți transferați, 205946 octeți codificați. Diferența față de baseline nu dovedește o optimizare a fotografiilor: nu există variante implementate și datele sunt sintetice. Axe: zero încălcări pe rezultate, anunț, comparație, conversație, editor, la toate cele trei viewport-uri în ambele motoare. Acasă: 1 nod contrast și 6 nume accesibile, rămase pentru L8. L3 nu este declarat complet din perspectiva contrastului tuturor ecranelor până la această corecție.

## L4 — căutări și costuri pentru decizie

Fișiere: `lib/search.mjs` centralizează validarea filtrelor și sortarea, inclusiv preț/m² în aceeași monedă; `lib/api.mjs` adaugă numărare fără încărcarea rezultatelor și căutări salvate private (maximum 10/cont); `lib/model.mjs` și `db/schema.ts` adaugă costurile lunare numerice opționale. `drizzle/0001_pale_sauron.sql` și metadata sunt aditive: tabel de căutări, coloană nullable și index de audit. `public/app.js`/`design.css` implementează panoul mobil cu debounce 300 ms, căutările din cont și totalul lunar declarat. Testele și inițializarea D1 local aplică toate migrările. E2E include panoul mobil, numărul live, salvarea și redeschiderea căutării.

Noile anunțuri sunt numărate după evenimentele reale de publicare. Marcajul ultimei vizite este secvența evenimentelor, nu ceasul clientului: o publicare în aceeași milisecundă, după citirea listei, nu se pierde. Reconfirmarea sau simpla editare nu devin un anunț nou. Anunțurile retrase/expirate sunt excluse. Numărul se marchează citit numai după încărcarea cu succes a rezultatelor. Căutările și marcajele nu pot fi citite/modificate de alt cont.

Rulat: `pnpm run db:generate` — migrare generată și inspectată; `pnpm test` — **99/99**; `pnpm run typecheck`, `pnpm build`, `pnpm run db:migrate`, `pnpm run test:production-isolation` — exit 0. `pnpm exec playwright test server.spec.mjs --project=chromium` — **1/1**, API real pe D1 local, fără browser. Migrarea este aplicată numai local; nu s-au modificat datele găzduite. Nu sunt trimise emailuri sau SMS.

Capturi înainte: L3. Capturi după și panoul de filtre: CI L4, rezultat în așteptare. Totalul lunar nu este calculat din textul liber al costurilor; gol rămâne necunoscut, zero înseamnă explicit fără costuri suplimentare. Harta opțională nu a fost inventată: modelul conține nume de cartiere, nu geometrie verificată.

### Confirmare L4 pe CI

[Run 41314069138](https://github.com/Rapunzel1999/nespus/actions/runs/41314069138), commit `8fa2d681221ca7d4932716848128c6bbbf2baf6e`: verify și browser trecute; **19 E2E trecute, 1 omis** (Lighthouse WebKit). [Artefact 13085973752](https://github.com/Rapunzel1999/nespus/actions/runs/41314069138/artifacts/13085973752). Panoul mobil a fost inspectat vizual în captura WebKit: acțiunea de aplicare rămâne jos în timp ce câmpurile pot fi derulate. Captura suplimentară a panoului folosea profilul de 390 px; L5 o fixează explicit la 375×812 și compactează titlul. Cele șase ecrane standard continuă să fie capturate la 375/768/1280 px.

Lighthouse L4: performanță/accesibilitate acasă 98/97, rezultate 99/100, anunț 99/100. CLS rezultate 0,006962, celelalte 0. Acasă rece: 16 răspunsuri, 212793 octeți transferați, 207993 codificați. Aceleași limite DEMO/local și variație între rulări ca în baseline.

## L5 — opt pași și ciornă recuperabilă

Fișiere: `public/app.js` păstrează editorul, ordonarea fotografiilor, previzualizarea și controalele de publicare, împărțite în opt pași; `public/draft-storage.js` gestionează salvarea automată după 1,5 secunde fără modificări și copia de recuperare din filă; `public/design.css` stilizează pașii și previzualizarea mobilă; `lib/document.html` încarcă noul modul. `lib/editor-draft.mjs`, `lib/api.mjs`, `db/schema.ts` și migrarea aditivă `0002_gray_nomad.sql` păstrează o singură ciornă incompletă privată per cont, separată de anunțuri și declarații. Testele și seed-ul local sunt actualizate.

Reviziile ciornei cresc monoton inclusiv după golirea ei, pentru ca o filă veche să nu poată suprascrie o ciornă nouă. Erorile și conflictele păstrează textul local. O copie locală diferită de server poate fi recuperată explicit; nu înlocuiește automat versiunea din cont. Fotografiile din ciorna incompletă nu au rută de servire; la salvarea anunțului trec în continuare prin validare/recodare. Publicarea și contactarea cer aceleași verificări de telefon. Adresa exactă rămâne exclusă din datele publice și din previzualizare.

Declarația proprietarului este textul cerut în prompt, versiunea `2026-11-01.1`, marcată **DE REVIZUIT JURIDIC** în cod și interfață. Data, versiunea și textul acceptat continuă să fie stocate în declarații. Ghidul recomandă cinci fotografii, fără a modifica regula existentă de minimum una pentru publicare.

Rulat: `pnpm run db:generate` — migrare inspectată, exclusiv CREATE TABLE; `pnpm test` — **103/103**; `pnpm run typecheck`, `pnpm build`, `pnpm run db:migrate`, `pnpm run test:production-isolation` — exit 0. `pnpm exec playwright test server.spec.mjs --project=chromium` — **1/1**, traseu HTTP/D1 local. E2E de publicare este actualizat pentru opt pași, autosalvare, reîncărcare/reluare și previzualizare mobilă; rezultatul browser exact al ramurii este în așteptare.

Capturi înainte: L4; după: CI L5. Nu s-au rulat migrări găzduite. Nu s-au testat iPhone fizic, două conturi SIWC găzduite sau SMS real. Retenția ciornelor și procedura de ștergere a contului trebuie stabilite înainte de lansarea publică; copia din filă se șterge la ieșirea explicită din cont sau renunțarea la ciornă. Dacă stocarea filei este indisponibilă/plină, textul rămâne în memorie cât fila este deschisă.
