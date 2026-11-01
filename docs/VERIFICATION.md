# Criterii de acceptare și evidențe

## Etapa 10 — 1 noiembrie 2026

Această secțiune descrie starea actuală a codului. Secțiunile datate octombrie de mai jos sunt istorice; afirmațiile lor despre lipsa browserului, numărul testelor sau cache nu descriu Etapa 10.

### Verificat automat

- `pnpm test`: **115/115** teste Node/SQLite/DOM și parser ICS. Nu sunt 115 teste E2E; fișierul DOM conține și aserțiuni grupate.
- `pnpm typecheck`, `pnpm build`: exit 0. `pnpm test:production-isolation`: CI L8 și L9 exit 0; ultima verificare locală L9 a avut un timeout bootstrap de 15 secunde, apoi a trecut la reluare neschimbată. Intermitența este consemnată în raport, fără retry automat sau relaxarea aserțiunilor. Build-ul nu include login-ul DEMO sau providerul simulat; runtime-ul de producție ignoră cookie-ul DEMO chiar cu variabilele de test injectate.
- `pnpm db:migrate`: migrările 0000–0004 verificate în D1 local; migrările aditive 0001–0004 sunt aplicate ulterior prin livrarea privată Sites a versiunii 13. `pnpm db:generate`: fără diferențe de schemă. Niciun seed, backfill sau DELETE pe baza găzduită.
- `pnpm exec playwright test server.spec.mjs --project=chromium`: **1/1**, traseu HTTP real prin Worker/D1 local, fără instalarea unui browser local.
- Playwright din CI: Chromium și WebKit mobil, conturi DEMO separate, fluxuri publicare/moderare, căutare/favorite/comparare, contact/mesaje/vizionare/telefon, blocare/raportare și refuzuri fără verificare. Capturi la 375×812, 768×1024 și 1280×800. Rezultatele exacte ale ultimei rulări, axe și Lighthouse sunt în ETAPA-10-LIVRABILE.md.
- L8: **23 E2E trecute, 1 omis** (Lighthouse WebKit), axe **0 încălcări în 36 de evaluări**, controale 44 px și lipsa overflow-ului. Run `41320296222`; pentru commitul final L9 vezi verificările și artefactul legate în PR-ul de sinteză.
- L6/L7: 19 E2E trecute, 1 omis explicit pentru Lighthouse pe WebKit; 36 capturi standard per livrabil, fișiere ICS și imagini suplimentare. Parserul independent verifică iarna/vara/ambele instanțe ale orei repetate de toamnă.
- `node scripts/twilio-preflight.mjs`: exit **2**, `ready:false`, trei credențiale lipsă, `smsSendingEnabled:false`. Acesta este blocajul așteptat, nu un test SMS real. Testele unitare dovedesc că preflight-ul fără credențiale nu face cereri de rețea.
- Livrare Sites: **versiunea 13, succeeded**, sursă `b2c1bf388ce44de21bd8113b4aeaac19b50c5132`, arbore identic cu PR #19 (`7d1ec9752a025c786c3ea947bb9a39867db692ea`). Acces recitit: custom, un owner, zero grupuri și vizitatori externi. Configurația runtime rămâne revision 2; nu s-au schimbat variabilele SMS. Schema are 16 tabele, inclusiv saved_searches/editor_drafts/message_reads; listings are coloanele noi și zero rânduri.

O singură comandă de verificare, după instalarea dependențelor și bibliotecilor OS: `pnpm qa`. În mediul de lucru browserul local/preview-ul gestionat nu a fost disponibil; browser QA s-a executat pe GitHub Actions cu server și D1 locale runnerului. Aceasta nu este testarea site-ului găzduit.

### Corecție după livrarea inițială

Testul `hiding or restarting the poll during inbox refresh never starts a stale thread request` reproducea o cerere suplimentară pornită după ascunderea filei. După revalidarea vizibilității/generației între etapele polling-ului: `node --test tests/messages-live.test.mjs` 4/4, `pnpm test` 115/115, TypeScript și build exit 0. Testele de browser ale commitului de corecție sunt legate în PR-ul următor; nu sunt confundate cu rularea istorică L9.

### Livrare privată și limite browser

La 1 noiembrie 2026, 20:53:57 Europe/Bucharest, `save_version_and_deploy_private` a întors `succeeded`. Build-ul din mecanismul sursei a trecut. Schema a fost inspectată înainte și după: 13 → 16 tabele; fără date DEMO. CI L9 `41321120157`: 114 Node, 23 Playwright trecute, 1 omis intenționat; 0 încălcări axe în 36 de evaluări. Cele șase repetări diagnostice locale ulterioare au trecut; intermitența anterioară nu este declarată rezolvată.

### De verificat uman / cu autorizare

- iPhone fizic și Android: SIWC, tastatură virtuală, safe-area, upload foto, galerie, editor, compozitor; VoiceOver și navigare asistată. WebKit emulat nu le substituie.
- Două conturi SIWC găzduite, cu acces privat explicit și telefoane reale; un cont terț și moderatori independenți pentru matricea completă de permisiuni.
- Crearea/configurarea Twilio numai după autorizare, buget și numere aprobate; livrare și confirmare SMS reale, expirare, repetări și refuzul publicării/contactului fără verificare. Contul Twilio nu există încă.
- Importul ICS în Apple Calendar, Google Calendar și Outlook, inclusiv ora ambiguă de toamnă. Captura descărcării și parserul nu dovedesc importul în aceste produse.
- Variantele foto 400/800/1600, WebP, srcset și migrarea reversibilă, după aprobarea arhitecturii/stocării. Niciun serviciu plătit activat; pragul de 100 KB nu este certificat cu imagini DEMO uniforme.
- Revizuire juridică a declarațiilor/regulilor/confidențialității, operator/retenție/ștergere, al doilea moderator, backup/restaurare, buget și proceduri de operare.
- Verificare vizuală autentificată a găzduirii: browserul a ajuns la poarta SIWC, apoi la formularul OpenAI fără sesiune; fluxurile autentificate nu au fost executate. Livrarea privată și accesul sunt confirmate prin Sites, nu prin presupunerea unui login reușit.

Issue #1 rămâne deschis. Rezultatele automate nu autorizează acces public, SMS sau servicii cu facturare. Textele juridice sunt **DE REVIZUIT JURIDIC**.



## Conversații, formulare, accesibilitate și performanță — 27 octombrie 2026

- **93/93 teste locale trecute**. Testele Node/SQLite și DOM folosesc date controlate, fără operațiuni pe conturi găzduite, SMS, solicitări de contact sau anunțuri reale. TypeScript, sintaxa JavaScript, parsarea tuturor fișierelor CSS, `git diff --check` și build-ul de producție Sites/Vinext: trecute. JavaScript-ul și toate foile CSS din build au fost comparate byte cu byte cu sursa.
- Conversații cu listă filtrabilă și căutare fără diacritice, stări explicite, legătură directă în URL, reîmprospătare manuală și paginare. Serverul returnează 25 de conversații/pagină și 50 de mesaje/pagină, pornind de la cele recente. Teste cu 57 de conversații și 123 de mesaje verifică acoperirea fără dubluri pe date stabile și izolarea participanților. Activitatea nouă poate muta rânduri înaintea cursorului; nu se pretinde un snapshot al întregii conversații.
- Mesajele netrimise se păstrează în aceeași filă la schimbarea conversației și după erori. Pentru un retry cu același `requestId`, serverul păstrează o singură înregistrare, verificând autorul, conversația și textul. Testul simulează și inserarea concurentă. Reîncărcarea pierde starea locală; nu există autosalvare a textului, coadă offline, retry automat sau garanție de idempotență pentru toate celelalte operațiuni.
- Formularul de contact, verificarea telefonului, sesizările, contestațiile și dialogurile de moderare au blocare la apăsări repetate, erori în context și protecție împotriva răspunsurilor întârziate care închid un dialog nou. Testele verifică păstrarea textului după eșec și absența mutațiilor la simpla navigare/deschidere.
- Vizionările afișează explicit **Europe/Bucharest**; formularul previzualizează ora Clujului plecând de la ora dispozitivului. Testele acoperă ora de iarnă/vară și refuzul momentelor trecute. Lista limitează istoricul la 100 de vizionări și explică limita. Confirmarea nu trimite invitații în calendar sau alerte.
- Telefonul dezvăluit este recitit cu toate condițiile de acces în aceeași interogare. Patru intercalări simulate — blocare, retragere anunț, suspendare solicitant și retragere acces la număr — nu mai expun telefonul după verificarea inițială. O copie deja văzută sau salvată nu poate fi retrasă de pe alt dispozitiv.
- Fluxul SMS folosește termenul `expiresAt` returnat de server, pauză de minimum 60 de secunde și cereri explicite. Codul expirat/limitat nu declanșează retrimitere automată. Solicitarea pentru același număr deja confirmat pe cont nu apelează furnizorul și nu consumă bugetul. Furnizorul rămâne simulat în teste.
- Fotografiile sunt servite individual, cu autorizare la fiecare cerere, JPEG binar, `private, no-store`, `nosniff` și politică same-origin. Testele acoperă expirarea, retragerea, suspendarea proprietarului, accesul la ciorne, indecși invalizi și date care nu sunt JPEG. Detaliul public și listele nu mai transportă imaginile base64; editorul autorizat primește în continuare imaginile complete, fără pierderi.
- **Măsurătoare sintetică de payload:** 24 de anunțuri, copertă de 390.000 caractere fiecare: JSON cu imagini inline **9.372.364 octeți**, JSON cu URL-uri **13.132 octeți**, reducere **99,86%**. Fotografii descărcate separat, fără miniaturi; rezultatul nu măsoară traficul total, LCP, viteza pe iPhone sau costul real Cloudflare. Stocarea D1 rămâne temporară.
- Accesibilitate: focus la titlul paginii/dialogului, întoarcere la controlul care a deschis dialogul, marcarea navigării curente, regiuni de eroare, câmpuri de 16 px pe mobil, butoane principale de minimum 44 px înălțime pe mobil, mișcare redusă și adaptări pentru culori forțate. Au fost calculate punctual contraste pentru texte și focus din noile componente; **nu este un audit WCAG complet**.
- **QA vizual în browser și iPhone fizic: neconfirmate.** Preview-ul gestionat a întors anterior `ERR_CONNECTION_REFUSED`, fără dovadă de remediere. Nu s-a reluat printr-un server sau o rețea alternativă. Testele DOM nu validează aspectul, focusul nativ, tastatura mobilă sau gateway-ul SIWC.
- Nicio dependență sau migrare DB adăugată. Pilotul rămâne numai pentru proprietar; SMS oprit, plafon total zero. Livrarea reală SMS, două conturi găzduite, verificarea pe iPhone și condițiile operaționale/juridice de lansare rămân deschise. Issue-ul de lansare nu este închis de această etapă.

## Favorite și comparații — 27 octombrie 2026

- Favoritele au o pagină dedicată, cu filtre de vânzare/închiriere și căutare după titlu/cartier fără sensibilitate la diacritice. Starea goală explică faptul că favoritele retrase, expirate sau neeligibile nu sunt returnate de API; nu pretinde că utilizatorul nu a salvat niciodată anunțuri. Limita de 50 este explicată când este atinsă.
- Se pot compara două sau trei proprietăți din aceeași categorie de tranzacție. Selecția există numai în memoria filei, este păstrată la navigarea în acea filă și elimină ID-urile devenite indisponibile la reîncărcarea listei. Filtrele pot ascunde vizual anunțuri selectate, dar selecția rămâne explicită și poate fi golită separat de favorite.
- Tabelul semantic arată preț, monedă, cartier, tip, suprafață, camere, condiții și stările declarate. Monedele diferite sunt semnalate, fără conversii sau clasamente după preț. Costurile nespecificate nu devin zero. Pentru vânzare, prețul/m² rămâne un calcul aproximativ din datele declarate, nu evaluare de piață. Adresa exactă și numărul de telefon nu sunt incluse.
- Din comparație se deschide anunțul real, cu întoarcere la favorite și păstrarea selecției. Eliminarea reușită din favorite elimină și selecția; eșecul păstrează ambele. Apăsările repetate păstrează protecția existentă împotriva cererilor duplicate.
- **Corecție de prezentare:** s-a eliminat numărul de fotografii de pe cardurile de listă, deoarece API-ul de listă returnează numai fotografia principală. Galeria anunțului complet continuă să arate numărul real al fotografiilor încărcate.
- **61/61 teste trecute**, cu scenarii frontend extinse: filtre/căutare/resetare, limitele selecției, tranzacții distincte, EUR/RON, costuri necunoscute/zero, omiterea datelor private, navigare/întoarcere și click modificat, eliminare duplicată/eșuată, curățarea selecției indisponibile, limita listei și acces anonim refuzat înaintea citirii favoritelor.
- TypeScript, sintaxă JS, parsare CSS, `git diff --check` și build Sites/Vinext: trecute. Fișierele JS/CSS din build corespund sursei. Fără dependențe, migrări sau modificări ale API-ului. Testele folosesc răspunsuri simulate; nicio favorită reală nu a fost modificată.
- **QA vizual nou și test iPhone fizic: neconfirmate.** Preview-ul gestionat a eșuat anterior cu `ERR_CONNECTION_REFUSED`, fără dovadă de remediere. Testele DOM nu certifică afișarea tabelului, derularea sau focusul nativ pe dispozitive reale.
- Pilot numai pentru proprietar; SMS oprit. Nu s-au trimis SMS-uri, contacte ori publicări reale. Verificarea SMS și proba cu două conturi găzduite rămân de executat înainte de lansare.

## Spațiul proprietarului — 27 octombrie 2026

- Contul are o structură vizuală dedicată, card de stare a telefonului, acces la favorite/conversații, filtre pe stări și căutare după titlu/cartier fără sensibilitate la diacritice. Rezumatele folosesc exclusiv înregistrările primite; limita API de 50 de anunțuri este explicată când este atinsă.
- Anunțurile expirate sau fără termen valid sunt separate pentru reconfirmare. Ciornele, retragerile, modificările cerute, moderarea și închiderea au explicații distincte. Adresa exactă nu este afișată în acest rezumat. Editarea cere înregistrarea completă pentru păstrarea tuturor fotografiilor, nu doar fotografia principală din lista sumarizată.
- Trimiterea la moderare cere în interfață telefon confirmat și cel puțin o fotografie; când serviciul este activ dar telefonul neconfirmat, butonul deschide verificarea, fără a trimite prematur cererea de publicare. Regulile serverului rămân autoritatea finală.
- Acțiunile proprietarului au protecție împotriva cererilor simultane pentru același anunț. Răspunsurile întârziate nu schimbă ecranul după navigare și nu închid un dialog mai nou. Preferințele introduse sunt păstrate după eșec. Conturile restricționate au acțiunile dezactivate, cu istoricul și contestațiile accesibile.
- **61/61 teste trecute**, cu scenarii frontend noi: numărători, filtrare/resetare, diacritice, expirare, limita de 50, fotografii complete la editare, eșec parțial al încărcării, răspuns întârziat, restricții, condiții de publicare, cereri duplicate, păstrarea dialogului nou și reluarea preferințelor după eroare. Toate cererile din aceste teste sunt simulate; nu s-au operat anunțuri reale.
- TypeScript, sintaxă JavaScript, parsare CSS, `git diff --check` și build Sites/Vinext: trecute. JavaScript și CSS rezultate în build corespund sursei. Fără dependențe, migrări sau modificări ale API-ului.
- **Limită:** QA vizual nou, focus nativ în browser și test iPhone fizic rămân neconfirmate. Preview-ul a eșuat anterior cu `ERR_CONNECTION_REFUSED` și nu există dovadă de remediere; nu s-a reluat. Testele DOM nu țin loc de verificare vizuală.
- Pilot numai pentru proprietar; SMS oprit, fără trimiteri contra cost. Verificarea SMS reală și proba cu două conturi găzduite rămân de executat înainte de lansare.

## Pagina proprietății și galeria — 27 octombrie 2026

- Fișa proprietății continuă identitatea editorială: galerie înaintea contactului pe mobil, informații grupate, panou de preț/proprietar, condiții de închiriere și context de localizare fără adresa exactă.
- Fotografii mărite într-un dialog nativ, cu selecție sincronizată în galerie, miniaturi și navigare cu săgeți/Home/End. Imaginile lipsă sunt afișate explicit; nu sunt înlocuite cu imagini de brand. Dialogurile obișnuite își recuperează stilul și numele accesibil.
- Cardurile arată numărul fotografiilor, camerele la singular/plural și solicitările oprite. Pentru vânzare, prețul aproximativ pe m² se calculează exclusiv din prețul, moneda și suprafața declarate. Nu este o evaluare de piață. Pentru chirie, garanția și costurile lipsă rămân nespecificate.
- Butonul de contact diferențiază autentificarea, confirmarea telefonului, indisponibilitatea SMS, telefonul confirmat și oprirea solicitărilor. Previzualizarea ciornei nu oferă contactare. Aceste stări explică regulile serverului, fără să le înlocuiască.
- **61/61 teste trecute**, cu scenarii suplimentare în testul frontend existent: sincronizare/înfășurare galerie, Home/End, o fotografie/nicio fotografie, resetarea dialogului, valori invalide pentru preț/m², păstrarea monedei, neafișarea adresei private, costuri necunoscute, click modificat pe card și toate stările contactului. Navigarea pasivă și deschiderea formularelor nu trimit solicitări, SMS sau publicări.
- TypeScript, sintaxă JavaScript, parsare CSS, `git diff --check` și build Sites/Vinext: trecute. JavaScript și CSS rezultate în build comparate cu sursa. Fără dependențe, migrări sau schimbări ale serverului.
- **QA vizual nou în browser, accesibilitate completă și test iPhone fizic: neconfirmate.** Preview-ul gestionat a eșuat anterior cu `ERR_CONNECTION_REFUSED`; nu există dovadă de remediere, deci nu s-a reluat. Testele DOM nu certifică aspectul, focusul nativ sau gesturile pe dispozitive reale.
- Pilot numai pentru proprietar, SMS oprit. Livrarea SMS reală și testul cu două conturi găzduite rămân neexecutate; issue-ul de lansare rămâne deschis.

## Experiența de brand — 27 octombrie 2026

- Pagină principală refăcută: imagine de atmosferă cu etichetă AI, căutare funcțională, anunțuri reale din API, principii de contact direct, parcursuri solicitant/proprietar, explorare pe cartiere și invitație pentru proprietari. Identitate vizuală comună pentru navigare și subsol.
- **61/61 teste trecute**. Scenarii noi în testul frontend existent: comutarea parcursului, căutarea pe cartier fără filtre vechi, păstrarea tipului de tranzacție, navigarea către explicații din alte ecrane, focus la căutare cu mișcare redusă, CTA-uri cu autentificare și fără operațiuni de publicare/SMS, stare goală sinceră și etichete AI.
- TypeScript, sintaxa JavaScript, `git diff --check` și build-ul de producție Sites/Vinext: trecute. Fără dependențe, migrări sau schimbări ale serverului.
- Cele trei fișiere WebP însumează 382.504 octeți. Browserul alege o variantă a imaginii principale prin `srcset`; imaginea secundară este lazy. Prompturile și proveniența sunt în [BRAND_ASSETS.md](BRAND_ASSETS.md).
- **Limită de verificare:** preview-ul gestionat a întors anterior `ERR_CONNECTION_REFUSED`; nu există dovadă de remediere a infrastructurii. Nu s-a repetat testarea în browser și nu se certifică aspectul pe mobil, accesibilitatea completă sau funcționarea pe iPhone fizic prin testele DOM.
- Pilotul rămâne privat, cu SMS oprit și fără trimiteri cu cost. SMS real și testul cu două conturi găzduite rămân neexecutate. Condițiile issue-ului de lansare rămân deschise.

## Editorul proprietarului — 27 octombrie 2026

- Formular în doi pași, cu rezumat și repere de completare. Cartierul trebuie ales explicit; camerele sunt obligatorii la apartamente/case, iar limitele numerice reflectă validarea existentă a serverului. Declarația nu este bifată automat la editare.
- Fotografia principală poate fi aleasă, iar imaginile pot fi reordonate. Loturile sunt procesate înainte de a fi adăugate: un fișier respins nu lasă selecția parțial adăugată. Limitele existente de cinci fotografii și procesarea JPEG pe server rămân neschimbate.
- Modificările nesalvate se păstrează în memoria filei la navigarea în aplicație, cu buton de reluare. Înlocuirea cu alt anunț cere confirmare în interfață; se solicită avertizarea nativă la închiderea/reîncărcarea filei. **Nu este autosalvare**: închiderea forțată, reîncărcarea acceptată sau pierderea procesului pot pierde modificările. Confirmarea salvării în cont depinde de răspunsul serverului.
- Salvarea și procesarea fotografiilor dezactivează câmpurile formularului. O a doua apăsare nu trimite o cerere simultană; un răspuns întârziat nu înlocuiește ecranul pe care utilizatorul a navigat între timp. La eroare, textul și fotografiile rămân în editor. Nu există retry automat sau garanție de idempotență la pierderea răspunsului din rețea.
- **61/61 teste trecute**, cu scenarii noi în fișierul frontend existent: recuperare în aceeași filă, avertizare la plecare, confirmarea înlocuirii, câmpuri obligatorii, copie independentă a fotografiilor, reordonare, copertă, încărcare eșuată/capacitate, previzualizare, salvări simultane și recuperare după eroare. Testele folosesc DOM/furnizori simulați; nu au creat anunțuri în producție și nu au trimis SMS.
- Sintaxă JavaScript, TypeScript și `git diff --check`: trecute. QA vizual nou și testul pe iPhone fizic rămân neconfirmate; previzualizarea gestionată a fost inaccesibilă în verificarea precedentă. Nu a fost ocolită izolarea rețelei.
- Nu au fost modificate API-ul, schema bazei de date, accesul pilotului sau configurația SMS. Nu este revendicată o revizuire nouă Claude/Gemini.

## Căutare și navigare — 27 octombrie 2026

- **61/61 teste trecute**: suita existentă, trei regresii server noi și scenarii frontend extinse în același fișier de test.
- Căutarea oferă 24 de rezultate pe pagină, număr total, sortare pe server după preț/suprafață/recență și departajare stabilă prin ID. Sortarea după preț cere o monedă explicită; numărarea exclude aceleași anunțuri indisponibile, private sau neeligibile ca lista.
- SQLite: 30 de anunțuri sunt accesibile în două pagini fără dubluri pe un set stabil; paginile/sortările invalide și intervalele de preț inversate sunt respinse. Modificările live ale inventarului pot muta un rezultat între pagini.
- DOM simulat: filtre/pagină/sortare restaurate din URL; revenire din detaliu; evenimentul de navigare înapoi; resetarea paginii la sortare; resetarea bugetului la schimbarea vânzare/închiriere; validarea bugetului; stări goale și linkuri de paginare. Linkurile păstrează accesul privat existent.
- Interfață: bară de rezultate cu sortare, copierea căutării, stare de încărcare, mesaj de eroare cu reîncercare, formular adaptat pentru mobil și legătură de acces direct la conținut. Textele despre SMS reflectă capabilitatea reală.
- Sintaxă JavaScript, TypeScript, `git diff --check` și build Sites/Vinext: trecute. Fără dependențe sau migrări noi.
- **QA vizual nou neconfirmat:** daemonul de preview raportează pornirea, dar browserul întoarce `ERR_CONNECTION_REFUSED`. Nu s-a modificat rețeaua și nu s-au introdus date demonstrative în producție. Testele DOM nu certifică aspectul pe mobil sau pe iPhone fizic.
- Pilotul rămâne numai pentru proprietar; SMS-ul rămâne oprit. Livrarea SMS și testul cu două conturi găzduite sunt în continuare neexecutate.

## Verificare curentă — 27 octombrie 2026

- Baseline reluat: 40/40 teste. După întărirea integrării Twilio: **58/58**, inclusiv 18 regresii suplimentare (16 server, 2 preflight).
- `npm run typecheck`, `node --check public/app.js`, `git diff --check` și build-ul Sites/Vinext: trecute. Fără migrare DB nouă.
- Teste: identificatori Twilio concordanți, cod expirat/consumat/greșit, lipsa configurației sau activării, maximum cinci încercări pe SID, retrimitere fără prelungirea termenului, cote concurente/cumulative, eșec furnizor, stare schimbată în timpul apelului, refuz publicare/contact fără telefon.
- `npm run sms:preflight`: exit code 2, exact cele trei credențiale Twilio lipsă, zero apeluri externe. Testul pozitiv al preflight folosește un răspuns simulat.
- Configurația Sites citită: fără credențiale Twilio. Configurate `TWILIO_VERIFY_ENABLED=false` și `TWILIO_VERIFY_TOTAL_SEND_LIMIT=0`, ca secrete runtime.
- Audiența găsită **publică** a fost schimbată la **custom, numai proprietarul** (revizie acces 3). Nicio invitație trimisă.
- **Neexecutate:** SMS real, autentificare cu două conturi găzduite, test iPhone fizic și QA vizual nou. Nu există review nou Claude/Gemini în această etapă.
- Testele folosesc SQLite în memorie cu migrarea proiectului și adaptor D1 simulat; nu certifică concurența infrastructurii Cloudflare sau livrarea furnizorului.

Configurația exactă, limitele, costurile și planul de verificare reală sunt în [TWILIO_VERIFY.md](TWILIO_VERIFY.md). Secțiunile de mai jos păstrează istoricul verificărilor anterioare.

## Starea verificării la redactare

Verificări raportate de coordonator la 15 octombrie 2026:

| Verificare | Rezultat observat |
| --- | --- |
| Teste SQLite de securitate | **35/35 trecute**, inclusiv regresiile după revizuirea Claude |
| `npm run typecheck` | Trecut |
| Sintaxă JavaScript | Trecut |
| Build de producție | Build-ul versiunii anterioare reușit; redesignul este construit separat la publicare |
| `pnpm db:migrate` | Migrarea inițială locală aplicată; a doua rulare confirmată fără migrări în așteptare |
| Smoke frontend în Node VM | 13 ecrane fără excepții JavaScript; **nu este QA în browser** |
| JPEG pe server | Decodare/recodificare și eliminare metadate cu test de regresie |

Nu sunt executate/confirmate teste pe iPhone fizic, cu două conturi SIWC găzduite sau cu furnizorul SMS extern real. Versiunea anterioară a fost publicată; GitHub Actions 38792032762 a trecut. Revizuirea read-only Claude a implementării a fost primită și a identificat opt constatări. ChatGPT a aplicat corecțiile confirmate; Claude nu a executat teste. Detalii în COLLABORATION.md.

Testele SQLite verifică logica serverului cu date controlate. Nu dovedesc livrarea SMS, autentificarea multiutilizator în găzduire sau utilizabilitatea pe dispozitiv real.

## Criterii MVP

| Domeniu | Rezultat necesar | Evidență necesară |
| --- | --- | --- |
| Geografie | Nu publică imobile din afara municipiului Cluj-Napoca | Caz pozitiv și caz Florești/Baciu respins pe server |
| Autentificare | Acțiunile protejate cer identitate SIWC reală | Cerere anonimă respinsă; verificare găzduită |
| Ciorne | Contul poate salva o ciornă fără telefon confirmat | Persistență după reîncărcare și izolare între conturi |
| Publicare | Telefon real + declarație + revizuire umană | Solicitare neeligibilă respinsă; aprobarea necesită moderator |
| SMS neconfigurat | Nicio confirmare inventată, contactul/publicarea refuzate | Răspuns explicit fără schimbarea stării în confirmat |
| Declarații | Acceptare explicită, versiune și dată persistate | Încercare fără acceptare respinsă; istoric verificat |
| Telefon privat | Nu apare în HTML, API public, căutare sau metadate | Inspectarea răspunsurilor și teste de proiecție |
| Dezvăluire | Numai solicitantul acceptat și autorizat | Cont terț și solicitant neacceptat respinși |
| Conversații | Numai participanții pot citi și scrie | Cont A nu poate accesa conversația B–C |
| Blocare | Blochează mesaje/contacte noi pe server | Cereri directe și concurente respinse conform regulii |
| Rate limiting | Concurența nu ocolește limita de contacte | Mai multe cereri simultane cu limită controlată |
| Fotografii | JPEG decodat/recodificat, max. 5 × 400.000 caractere data URL, max. 1.200 px/dimensiune | Tip invalid, depășire și metadate în fixture-uri verificate |
| Moderare | Rol verificat, motiv și audit; fără aprobare automată | Utilizator obișnuit respins; acțiune moderator jurnalizată |
| Raportare/contestare | Datele nu devin publice; deciziile sunt motivate | Autor terț fără acces; parcurs de caz verificat |
| Editare | Modificarea materială nu ocolește moderarea | Anunț aprobat editat revine la revizuire |
| Expirare | Anunțul nereconfirmat după 30 zile nu e public | Acces direct și căutare fără cron îl exclud |
| Interfață | Utilizabilă pe mobil, tastatură, stări goale/eroare | QA vizual la lățimi mobile și desktop |
| Demonstrații | Etichetate și separate de oferte reale | Niciun exemplu nu pretinde disponibilitate sau proprietar real |
| Plăți | Nicio încasare sau confirmare fictivă | Absența checkout-ului activ |

## Matrice minimă de conturi

A = proprietar, B = solicitant, C = utilizator terț, M = moderator. Verificați separat fiecare operațiune cu A/B/C/M și anonim. Un ID greu de ghicit nu este o verificare de acces.

Testele automate nu dovedesc livrarea SMS, funcționarea SIWC în găzduire, accesul multiutilizator sau utilizabilitatea pe un iPhone real. Aceste verificări rămân distincte până la executare.

## Teste SMS și acces după suspendare

Testele adaptorului SMS folosesc un test-double al furnizorului, inclusiv scenarii de provocare expirată și răspuns de aprobare. Aceste teste nu reprezintă confirmarea unui SMS real; furnizorul extern rămâne neconectat.

Politica explicită implementată pentru conturi suspendate refuză citirea conversațiilor și contactele, păstrând accesul la lista proprie și la contestații. Această păstrare nu restabilește dreptul de publicare sau de contact.

## Închiderea verificărilor locale

- `npm test`: **35/35** teste trecute după integrarea corecțiilor din revizuirea Claude, pe migrarea de producție și SQLite real.
- `npm run typecheck` și `node --check public/app.js`: trecute.
- `npm run db:migrate`: migrare locală aplicată; a doua rulare a raportat `No migrations to apply`.
- Regresii suplimentare: nume de profil fără date de contact, conflicte de moderare, contestație independentă cu restabilirea accesului, cote înainte de procesarea imaginilor, tranziții concurente fără audit fals, editare după retragere și refuzul citirii conversațiilor de către conturi suspendate.
- Testele adaptorului SMS utilizează răspunsuri controlate de test, nu trimiteri reale.

Build-ul și GitHub Actions pentru redesign sunt verificate separat la publicare. Nu sunt confirmate QA vizual, livrare SMS reală sau autentificare multiutilizator găzduită.

## Redesign: simplu, profesional, cozy și onest

Căutare prioritară, taburi cumpărare/închiriere, filtre avansate compacte, patru intenții cu valori corecte pentru ciorne. Fără anunțuri sau statistici fictive. 11 scenarii DOM raportate de agentul frontend au trecut; suita serverului 35/35 a fost reluată cu succes de coordonator. Verificarea DOM nu este QA vizual în browser. Această verificare inițială nu includea browser; sprintul ulterior adaugă QA intern, descris mai jos.

## Sprint de profesionalizare: verificări suplimentare

- 39 teste server trecute, inclusiv istoricul privat al sesizărilor/contestațiilor, izolarea între conturi și căutarea cu filtre combinate.
- Fixture-ul frontend portabil `tests/frontend.test.mjs`: 9 scenarii de ecran plus interacțiuni pentru galerie, favorite, filtre, răspunsuri întârziate, păstrarea textului la eliminarea fotografiei, garanția eliminată, previzualizare și disponibilitatea SMS. Este un DOM simplificat, nu browser real.
- QA intern în browser: pagina principală, etichetele românești, mesajul beta/SMS, căutare vânzare + Gheorgheni + EUR cu rezultat gol legitim, resetarea filtrelor și autentificarea cerută la publicare. Eroarea observată inițial în căutare a fost remediată și retestată.
- Nu există anunțuri reale în preview. Galeria și conturile/moderarea sunt verificate prin fixture și SQLite, nu prin falsificarea identităților în browser.
- Nu au fost executate SMS reale, teste pe iPhone fizic ori un test găzduit cu două conturi SIWC. Browserul desktop nu dovedește aspectul sau ergonomia pe toate telefoanele.

Suita finală a sprintului: `npm test` **40/40** (39 teste server și un fișier de regresii frontend cu scenariile de mai sus). QA vizual a fost efectuat intern pe desktop. Captura din browser nu s-a sincronizat către checkout și nu este inclusă ca artefact; nu reprezintă testare pe telefon.
