# Changelog

## Corecție ulterioară Etapei 10 — pregătită pentru livrare privată

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
