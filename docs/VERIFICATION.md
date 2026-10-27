# Criterii de acceptare și evidențe

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
