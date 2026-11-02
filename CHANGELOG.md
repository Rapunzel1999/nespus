# Changelog

## Integritatea datelor JSON — 2026-11-02

- API-ul verifică exact tipul `application/json`, fără diferențiere între majuscule și minuscule; respinge prefixe precum `application/jsonp`.
- UTF-8 invalid este refuzat înainte de salvare, fără înlocuirea tacită a caracterelor și fără modificarea ciornei existente. Diacriticele și emoji valide sunt păstrate.
- Două regresii reproduse înainte de corecție; raport în `docs/ETAPA-10-JSON-INPUT.md`.

## Căutare literală — 2026-11-02

- `%`, `_` și `\` sunt căutate ca text, fără a deveni operatori SQL LIKE. Căutările salvate păstrează textul original. Nicio schimbare de interfață sau schemă.
- Regresie API/SQLite reprodusă înainte de corecție; rezultate și limite în `docs/ETAPA-10-SEARCH-LITERAL.md`.

## Portofoliul proprietarului — 2026-11-02

- Filtrele de stare se așează pe rânduri, cu etichete de 13 px și fără comprimarea butoanelor peste text. Toate cele șase opțiuni rămân accesibile fără derulare orizontală.
- Explicațiile sumarului portofoliului folosesc culoarea semantică existentă pentru text secundar; noua verificare a contului a detectat contrastul insuficient al culorii vechi.
- Pagina contului intră în matricea de capturi și axe la 375, 768 și 1280 px, în Chromium și WebKit. Verificările de geometrie acoperă etichetele, suprapunerile, țintele tactile și marginile ecranului; navigarea Tab și resetarea selecției sunt verificate separat.
- Filtrarea, numerele afișate, API-ul și datele contului nu se schimbă. Rezultatele efective sunt în raportul livrabilului și PR.

## Editor — 2026-11-02

- Contorul de secunde rămâne vizibil, iar regiunea accesibilă anunță numai schimbările stării de salvare.
- Părăsirea unei ciorne confirmate nu mai produce avertisment de pierdere; modificările nesalvate, operațiunile în curs și copiile locale în conflict rămân protejate.
- Confirmarea renunțării explică și eliminarea ciornei de lucru din cont. Copia locală se șterge numai după confirmarea serverului; un refuz sau conflict păstrează textul și afișează eroarea.
- Apăsările repetate, editorul din spatele dialogului și răspunsurile întârziate au protecții. Anunțurile salvate separat nu sunt șterse.

## Ciorne — corecții după versiunea 14

- Răspunsurile autosave întârziate nu mai refac copia din sessionStorage eliminată la ieșirea din cont, nici la succes, nici la eroare. Dacă navigarea este anulată, editarea deliberată poate crea o copie nouă.
- „Salvat acum” apare numai cât textul, fotografiile, pasul și declarația corespund copiei confirmate. Modificările noi au o stare distinctă până la confirmare.
- La reîncărcare, confirmarea locală este păstrată numai după verificarea reviziei și datei de pe server. Editările încă nesalvate reiau autosalvarea; o eroare de citire a contului păstrează copia și explică incertitudinea fără scriere automată.
- Regresii Node pentru cele șase cazuri și scenariu Chromium/WebKit cu răspuns lent, editare în timpul salvării și recuperare după reîncărcare. Rezultatele exacte sunt în jurnalul livrării.

## Corecție ulterioară Etapei 10 — versiunea 14 livrată privat

- Polling-ul verifică din nou vizibilitatea filei și identitatea ciclului după răspunsul inbox-ului, înainte de cererea conversației. Nu mai pornește o cerere suplimentară dacă fila se ascunde sau un ciclu nou îl înlocuiește pe cel vechi.
- Test de regresie cu răspuns întârziat: eșua înaintea corecției, trece după; cele 115 teste Node trec. Layout-ul și permisiunile nu se schimbă.

## Etapa 10 — 2026-11-01 — versiunea 13 livrată privat

- Baseline măsurat, Playwright cu D1 local, conturi și anunțuri DEMO izolate de producție; capturi, axe și Lighthouse în CI.
- Limită cumulată pentru fotografii în D1, ETag cu reautorizare și dimensiuni explicite. Variantele WebP/srcset/migrarea rămân condiționate de decizia de stocare, fără activare R2.
- Identitate verde/crem formalizată, carduri cu date comparabile, galerie mobilă și bară de solicitare/favorite.
- Filtre mobile, preț/m² fără conversii, total lunar declarat și căutări salvate private cu număr de publicații noi.
- Editor în opt pași, autosalvare cu revizii și recuperare, previzualizare mobil/desktop, declarație datată/versionată DE REVIZUIT JURIDIC.
- Mesaje necitite, polling numai în fila vizibilă, răspunsuri în așteptare și descărcare ICS privată pentru vizionări confirmate.
- Panou de încredere cu date din istoric; indicii pentru moderatori și jurnal de decizii, fără sancțiuni automate.
- Contrast, nume accesibile, controale de 44 px, focus, aria-live, câmpuri mobile de 16 px, safe-area și compozitor adaptat la Visual Viewport; modul separat pentru galerie.
- README, produs, arhitectură, verificări și decizii actualizate. Tarifele de referință Twilio sunt reverificate, fără cont sau trimiteri.

Nu este o lansare publică. Prima livrare Etapa 10 este versiunea 13, privată proprietarului. Accesul temporar Sites a fost reînnoit după autorizarea continuării, iar migrările aditive au fost aplicate prin mecanismul de livrare existent. SMS real, două conturi găzduite, dispozitive fizice, VoiceOver, importuri umane ICS și condițiile juridice/operaționale rămân neconfirmate. `main` nu este modificată.
