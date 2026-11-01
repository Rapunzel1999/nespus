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

### Ajustări ale verificării L5

Prima rulare CI L5, `41315264861`: toate cele 103 teste Node, TypeScript și build au trecut; browserul a avut 18 cazuri trecute și 1 eșec WebKit. Testul căuta titlul ciornei, care exista deja în rezumatul editorului, înainte de încheierea salvării în cont. Așteptarea este acum ancorată în URL-ul și inventarul contului. Verificarea runtime a producției a expirat după cinci minute la un fetch fără timeout propriu. Comenzile au fost corectate să indice pasul, să limiteze fiecare probă la 15 secunde și să includă diagnosticul Worker-ului dacă eșuează. Nu s-a relaxat nicio aserțiune de izolare.

### Confirmare L5 pe CI

[Run 41316015177](https://github.com/Rapunzel1999/nespus/actions/runs/41316015177), commit `698de5d4a266c3eb0c8310cb11cd37e14e594630`: workflow finalizat cu succes. [Artefact 13087058721](https://github.com/Rapunzel1999/nespus/actions/runs/41316015177/artifacts/13087058721); captura editorului WebKit la 375 px a fost inspectată. Aceasta verifică redarea browserului simulat, nu un dispozitiv fizic.

## L6 — conversații actualizate și calendar privat

Fișiere: `public/messages-live.js` separă indicatorii și polling-ul; `public/app.js` adaugă secțiunea «Așteaptă răspunsul tău», mesaje necitite în navigație/titlu, ghidul neutru și descărcarea calendarului. `lib/calendar.mjs` produce iCalendar privat; `lib/api.mjs`, schema și migrarea aditivă `0003_cheerful_the_professor.sql` stochează citirea fiecărui mesaj afișat. Testele verifică accesul, concurența, idempotenta, vizibilitatea filei și calendarul.

Nu există notificări externe. Polling-ul pornește la afișarea filei, apoi așteaptă 10/20/40/60 secunde fără schimbări; o schimbare revine la 10 secunde. Fila ascunsă nu inițiază alte cereri; o cerere deja în zbor poate termina, dar rezultatul ei este ignorat. Estimare algoritmică, nu măsurare de facturare: aproximativ 62 cicluri/oră vizibilă inactivă, 62 GET în afara conversațiilor, până la 186 GET cu inbox și conversație selectată; la schimbări continue, până la aproximativ 1080 GET/oră în acel ecran. Confirmările de citire sunt POST suplimentare numai pentru mesaje afișate; niciun tarif nou nu a fost activat.

Calendarul conține fusul `Europe/Bucharest`, doar ora de început confirmată și cartierul; nu inventează durata/adresa, participanți sau invitații. Ambele instanțe ale orei repetate la trecerea la ora de iarnă folosesc UTC pentru a păstra momentul exact între clienți. Parserul independent `ical.js` verifică iarna, vara și ambele instanțe. Surse: [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545.html) și [IANA Europe](https://data.iana.org/time-zones/tzdb/europe). Importurile manuale în Apple/Google/Outlook rămân neefectuate; captura descărcării din aplicație nu le înlocuiește.

Rulat: `pnpm test` — **109/109**; `pnpm typecheck`, `pnpm build`, `pnpm db:migrate`, `pnpm test:production-isolation` — exit 0. Migrare numai locală. Capturi înainte: L5; după: artefactul CI L6, inclusiv vizionarea confirmată și fișierul ICS. Rezultatul E2E al ramurii se consemnează după rulare. SMS rămâne oprit; fără email/push, conturi noi sau date găzduite modificate.

## L7 — încredere explicită și revizuire umană

Fișiere: `lib/moderation-signals.mjs` calculează dHash de 64 biți din pixeli, exclude imaginile uniforme și compară distanța Hamming ≤4; `lib/model.mjs` produce hash-uri numai după decodarea serverului, fără a accepta valori furnizate de client. `db/schema.ts`/`0004_elite_ezekiel_stane.sql` adaugă o coloană nullable, fără backfill. `lib/api.mjs` adaugă date reale din declarații/audit și semnale numai pentru moderatori; `public/trust.js`, `app.js`, `design.css` afișează panoul de încredere, indiciile și jurnalul deciziilor. Nu se expun hash-uri, numere sau motive de moderare în anunțul public.

Semnale: același telefon pe mai mult de 3 anunțuri pending/published; fotografii similare între conturi; cuvintele comision/agenție/exclusivitate. Se păstrează și indiciul existent titlu/cartier duplicat. Nu se schimbă automat starea contului/anunțului. Inclusiv «fără comision» este un context de citit, nu o acuzație. Hash-ul perceptual poate produce potriviri false și poate rata decupări/rotiri; nu dovedește copierea. Comparația este limitată la 1000 de anunțuri recente și afișează explicit când există date istorice neprocesate sau limita a fost atinsă. Datele existente nu sunt reprocesate în găzduire. Jurnalul afișează ultimele 50 de decizii din evenimentele persistente existente, exclusiv moderatorilor.

Disponibilitatea urmează regula existentă: 30 de zile de la publicare/reconfirmare; expirarea exclude anunțul din rezultate. Nu a fost introdusă o regulă nouă de 14 zile. Lipsa unei date în istoric este afișată ca necunoscută, nu dedusă din ultima editare. Formulările istorice care ar putea sugera verificarea proprietății au fost eliminate.

Rulat: `pnpm db:generate`; `pnpm test` — **113/113**; `pnpm typecheck`, `pnpm build`, `pnpm db:migrate`, `pnpm test:production-isolation` — exit 0. Noua migrare este aditivă, numai locală. Teste pentru fiecare indiciu, autorizare/audit, absența blocării automate și stările panoului. Capturi înainte L6; după în artefactul CI L7. Validarea browserului se consemnează după rulare. Nu este verificată identitatea civilă, proprietatea sau starea reală a locuinței; procedura umană de moderare și pragul pilotului trebuie revizuite înainte de lansare.

### Confirmare L6 pe CI

[Run 41316957911](https://github.com/Rapunzel1999/nespus/actions/runs/41316957911), commit `00f99db5aa9c127b875e511b4db39b499a482afd`: verify și browser trecute; 19 E2E trecute, 1 omis (Lighthouse WebKit). [Artefact 13088015996](https://github.com/Rapunzel1999/nespus/actions/runs/41316957911/artifacts/13088015996) include descărcarea ICS și captura vizionării confirmate. Captura mobilă a fost inspectată; nu este un import într-o aplicație de calendar. Indicatorii, citirea și secțiunea de răspunsuri sunt verificați în ambele motoare.

## L8 — accesibilitate și finisaj mobil

Fișiere: `public/gallery.js` extrage incremental galeria din `app.js`, fără schimbare de comportament. Măsurarea L0 (144215 octeți pentru app.js) justifică separarea responsabilităților; modulele de salvare, mesaje și încredere rămân separate. După extragere: `pnpm test` 113/113, `pnpm typecheck` și `pnpm build` exit 0. `lib/document.html` încarcă modulul și permite safe-area prin viewport-fit.

`public/design.css` corectează contrastul măsurat, aplică sans-serif titlurilor H3–H6, mărește controalele la minimum 44 px și câmpurile mobile la 16 px. Editorul lateral se întinde corect pe mobil. `app.js` aliniază numele accesibile cu textele vizibile, păstrează focusul după închiderea dialogului pe titlul ecranului când elementul inițial a dispărut și declară explicit aria-live pentru erori. `messages-live.js` adaptează compozitorul la Visual Viewport. Reduce-motion existent este păstrat pentru toate elementele.

`tests/e2e/flows.spec.mjs` folosește Enter/Space pentru acțiunile fluxurilor și adaugă traversare Tab, focus vizibil, închiderea/izolarea dialogului, păstrarea textului și geometria compozitorului la 375×500. Alegerea fișierului și selectoarele native sunt automatizate prin Playwright, nu prin dialogul sistemului de operare. Axe serious/critical și țintele sub 44 px sunt acum aserțiuni, nu doar raport. Cele șase pagini sunt capturate la toate cele trei dimensiuni pe Chromium și WebKit.

După corecții: `pnpm test` 113/113; `pnpm typecheck`, `pnpm build`, `pnpm test:production-isolation` exit 0. Rezultatul browserului și cifrele finale axe/Lighthouse se consemnează după CI. Capturi înainte L7, după L8. Profilul WebKit mobil și micșorarea viewport-ului NU înlocuiesc tastatura virtuală și VoiceOver pe un iPhone fizic; acestea rămân verificări umane.

Prima rulare strictă L8 (`41317736409`) a oprit cele trei capturi Chromium la numele accesibile ale butoanelor de cartier; cele șase fluxuri anterioare au trecut. Adăugarea indexului într-un aria-label separat nu rezolva concatenarea textului randat. Suprascrierea aria-label este eliminată: numele accesibil vine direct din conținutul butonului. Aserțiunile axe rămân active.

A doua rulare strictă L8 (`41318102891`) a confirmat eliminarea problemelor axe acasă, dar a identificat trei controale de căutare de 40 px. Regulile CSS specifice sunt corectate la 44 px; aserțiunile rămân blocante, iar orice încălcare face cazul să eșueze. S-au adăugat lipsa overflow-ului paginii și un mesaj primit între două contexte browser locale distincte, cu păstrarea textului și focusului compozitorului.

Rularea L8 `41318519159`: 15 E2E trecute, 3 eșecuri, 1 omis și restul oprite la prag. Capturile Chromium 375/768 au trecut axe și dimensiunile; două capturi au apăsat Publică în timpul inițializării, iar testul Tab a detectat ieșirea focusului din dialog. Controalele inițiale sunt acum dezactivate până la încărcarea contului, iar dialogul păstrează explicit focusul la Tab/Shift+Tab. Verificarea runtime a avut din nou timeout la bootstrap după două răspunsuri HTTP neconsumate; probele consumă acum corpurile și închid conexiunile, fără retry și fără relaxarea aserțiunilor. După aceste corecții: `pnpm test` 113/113; TypeScript, build și izolarea producției exit 0.

Rularea L8 `41319293947`: verify trecut, 22 E2E trecute, 1 eșec WebKit și 1 omis. Toate cele 36 de capturi au trecut axe serious/critical, ținte și overflow. Trace-ul arată că între focus și Enter un GET schimba doar `unreadCount`/`unreadMessageIds`, recreând butonul de confirmare a vizionării; niciun POST de confirmare nu era trimis. Polling-ul nu mai reconstruiește conversația pentru confirmări de citire și ignoră răspunsurile sosite în timpul unei mutații/dialog. Testul de regresie verifică identitatea DOM și focusul butonului, apoi o schimbare reală a vizionării.

### Confirmare finală L8

[Run 41320296222](https://github.com/Rapunzel1999/nespus/actions/runs/41320296222), commit `4746c22dc4ac0b21a3c23032254833b549a7f830`: verify și browser trecute. `pnpm test`: **114/114**; `pnpm typecheck`, `pnpm build`, `pnpm test:production-isolation`: exit 0. `pnpm run test:e2e`: **23 trecute, 1 omis** (Lighthouse pe WebKit). [Artefact 13088907215](https://github.com/Rapunzel1999/nespus/actions/runs/41320296222/artifacts/13088907215).

Axe: **0 încălcări de orice severitate în 36 de evaluări** (6 pagini × 3 dimensiuni × 2 motoare). Pragurile serious/critical, 44 px și lipsa overflow-ului sunt aserțiuni blocante. Capturile acasă/editor și compozitorul la 375×500 au fost inspectate în rularea anterioară cu aceleași stiluri; ultima rulare confirmă și fluxul de confirmare a vizionării după corecția confirmărilor de citire.

| Pagină | Performanță | Accesibilitate | LCP ms | CLS | TBT ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| home | 98 | 100 | 2435.2485 | 0 | 0 |
| results | 99 | 100 | 1885.3095 | 0.004956926884903783 | 0 |
| listing | 99 | 100 | 2009.12175 | 0 | 0 |

Acasă rece, înainte de scroll: 20 răspunsuri, 221388 octeți transferați, 215388 codificați. O singură rulare Lighthouse 13.5.0, Chromium cu D1 local/DEMO, fără gateway-ul găzduit. Față de baseline, accesibilitatea automată crește de la 97/95/94 la 100/100/100; performanța variază, iar funcțiile/modulele noi cresc traficul. Nu se afirmă că variantele foto sunt optimizate sau că aceste scoruri reprezintă telefoane fizice.

### Confirmări ulterioare L2 și L7

L2 [run 41313026295](https://github.com/Rapunzel1999/nespus/actions/runs/41313026295) este acum reușit: jobul verify cu timeout tranzitoriu a fost reluat și a trecut; browserul trecuse deja 19 cazuri, cu Lighthouse WebKit omis. [Artefact 13085874572](https://github.com/Rapunzel1999/nespus/actions/runs/41313026295/artifacts/13085874572): Lighthouse acasă 98/97, rezultate 100/95, anunț 99/94 (performanță/accesibilitate), CLS 0; 15 răspunsuri, 208162 octeți transferați, 203662 codificați. Sunt imagini DEMO și o singură execuție; nu certifică optimizarea unor variante inexistente.

L7 [run 41317287944](https://github.com/Rapunzel1999/nespus/actions/runs/41317287944), commit `97bbca7f7481ebc7297f1bed65c5ca97442392c5`: verify și browser trecute, 19 E2E trecute și 1 omis. [Artefact 13088350671](https://github.com/Rapunzel1999/nespus/actions/runs/41317287944/artifacts/13088350671). Panoul de încredere din anunțul mobil a fost inspectat. Lighthouse acasă 98/97, rezultate 99/100, anunț 99/100; problema de contrast/nume accesibile de pe acasă a fost corectată în L8.

## L9 — documentație, dovezi și limita livrării private

Fișiere: README descrie starea actuală și comanda QA; PRODUCT explică fluxurile și limitele; ARCHITECTURE documentează tabelele, modulele și contractele implementate; VERIFICATION separă automat de uman; TWILIO_VERIFY consemnează reverificarea configurației/documentației fără trimiteri; CHANGELOG și DECISIONS-PENDING consemnează schimbările și condițiile rămase. Scriptul de măsurare indică acum commitul efectiv și dacă arborele are modificări, în loc de eticheta fixă PR #9, și inventariază toate modulele JS/CSS.

Nu există modificări de interfață în L9. Capturile înainte/după sunt cele din L8, plus rularea finală de verificare a ramurii L9. Capturile CI și rapoartele au retenție 14 zile; cifrele și legăturile către run/commit sunt păstrate în Git. Nu se inventează capturi ale găzduirii.

Citirea Sites în această sesiune: versiunea 12 activă, acces custom exclusiv proprietarul, fără grupuri, zero vizitatori externi. Cele trei chei Twilio lipsesc. Flagurile SMS/cap există ca secrete mascate; nu au fost modificate și nu se pretinde o recitire în clar. `node scripts/twilio-preflight.mjs`: exit 2, ready false și trei credențiale lipsă, fără trimitere sau apel de provider. Nicio migrare și nicio dată DEMO în găzduire.

**Livrarea Etapei 10 este oprită:** accesul temporar la sursa Sites a expirat la 2026-11-01 13:18:21 UTC. Condiția L9 cere oprire dacă trebuie o credențială nouă. Nu s-a emis alta, nu s-a ocolit mecanismul de sincronizare și nu s-a făcut site-ul public. Continuarea necesită autorizarea reînnoirii accesului temporar pentru același proiect și livrare exclusiv privată. Fotografiile cu variante necesită separat decizia de arhitectură L2; condițiile reale de lansare rămân deschise.

Verificări locale finale L9: `pnpm test` **114/114**, `pnpm typecheck`, `pnpm build`, `node scripts/measure-baseline.mjs` și `git diff --check` — exit 0. `pnpm test:production-isolation` — exit 0, scanare și probe runtime. Sursa produsului este identică cu L8; diferențele L9 sunt documentație și scriptul de măsurare. CI exact L9 și artefactul final sunt legate în descrierea PR-ului de sinteză după execuție.

Măsurare finală a sursei: `public/app.js` **956 linii / 152684 octeți (152,684 KB)**, CSS total **131842 octeți**, galerie **4382**, draft-storage **5272**, messages-live **3558**, trust **2241** octeți. Răspunsul sintetic pentru 20 de rezultate: **13167 octeți UTF-8**, status 200, fără date base64. KB = 1000 octeți. Acestea sunt măsurători pe disc/API sintetic, nu trafic real găzduit.

La închiderea L9, prima rulare locală `pnpm test:production-isolation` a eșuat după 15 secunde la bootstrap, după health 200 și login de test 404. Reluarea aceleiași comenzi, fără modificarea codului sau aserțiunilor, a trecut. Nu este considerată o cauză rezolvată: consumarea răspunsurilor/conexiunile închise nu elimină complet intermitența runtime-ului local. Testul rămâne blocant, fără retry automat; CI L8 exact a trecut, iar CI L9 trebuie evaluat separat. Nu există dovezi că acest timeout local reprezintă starea găzduirii.
