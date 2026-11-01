# Decizii și verificări în așteptare · Etapa 10

Pilotul rămâne privat proprietarului. SMS oprit; plafon zero. Nicio decizie de mai jos nu este aprobare implicită pentru costuri, acces public sau migrarea datelor găzduite.

- **QA browser:** Chromium și WebKit rulează efectiv în CI cu Worker/D1 locale runnerului. Preview-ul gestionat local a întors `ERR_CONNECTION_REFUSED`. Aceste probe nu certifică browserul pe site-ul găzduit, SIWC cu două conturi ori un iPhone fizic.
- **Fotografii / L2:** stocarea JPEG în D1 este temporară, cu limite existente de 1200 px și 400000 caractere. Trei variante, inclusiv 1600 px/WebP, cer o revizuire a stocării și a validării serverului; nu se relaxează limitele doar pentru a bifa promptul. Alternativa cu object storage necesită decizie de arhitectură și autorizare de facturare. Nu se activează R2.
- **Lansare:** rămân necesare contul/serviciul Twilio, credențiale securizate, buget și destinații autorizate, SMS real, două conturi găzduite cu acces privat autorizat, iPhone fizic, Android, VoiceOver, al doilea moderator, retenție/restaurare și revizuire juridică. Issue #1 rămâne deschis.
- **Texte:** declarațiile, regulile, termenii și confidențialitatea sunt **DE REVIZUIT JURIDIC**. Nu sunt texte juridice finale.

## L2 — decizie necesară pentru variante (2026-11-01)

D1 limitează un șir, BLOB **și întregul rând** la 2.000.000 octeți: [limite oficiale](https://developers.cloudflare.com/d1/platform/limits/). Cinci fotografii × 400.000 caractere pot depăși această limită înainte de adăugarea câmpurilor anunțului. L2 limitează acum totalul JSON al fotografiilor la 1.800.000 caractere ASCII, înainte și după recodare. Limitele individuale rămân neschimbate.

**Propunere, neimplementată:** păstrarea în D1 doar a metadatelor și folosirea unui spațiu de obiecte privat pentru variante 400/800/1600 px. Rutele existente ar continua să autorizeze accesul înainte de citirea obiectului; niciun bucket public. Necesită alegerea furnizorului, buget, retenție, ștergere, backup și autorizarea serviciului cu facturare. Nu s-a creat sau activat R2.

În consecință, generarea celor trei variante, WebP, `srcset` și migrarea reversibilă sunt **oprite la limita arhitecturală cerută de L2**. Nu furnizăm un `srcset` fictiv care descarcă aceeași imagine de trei ori. Nu certificăm pragul de 100 KB cu imagini DEMO uniforme. Nicio migrare a fotografiilor găzduite nu a fost executată. EXIF/GPS continuă să fie eliminate prin recodarea existentă a pixelilor în browser și server.

Partea independentă: ETag SHA-256 și `private, no-cache` permit răspunsuri 304 după verificarea eligibilității/permisiunilor la fiecare cerere. Retragerea, expirarea și suspendarea nu pot fi ocolite cu un ETag vechi. Browserul poate păstra bytes locali; aplicația nu poate retrage copii deja salvate de utilizator. Dimensiuni explicite pe card/galerie/miniaturi; prima fotografie din rezultate nu mai este încărcată leneș.

- **Ciorne / retenție L5:** o ciornă incompletă per cont, maximum 1.850.000 octeți, rămâne privată în D1; copie de recuperare per filă, separată pe cont. Stabilirea retenției, ștergerii contului și exportului rămâne condiție de lansare. Revizia este păstrată după golirea conținutului pentru a preveni suprascrierea de către file vechi. Nicio politică juridică de retenție nu este prezentată ca finală.

- L6: import uman al fișierului ICS în Apple Calendar, Google Calendar și Outlook, inclusiv ora repetată de toamnă; parserul automat nu dovedește comportamentul acestor aplicații. Retenția confirmărilor de citire trebuie inclusă în politica de date revizuită juridic. Polling-ul folosește numai infrastructura existentă, estimarea de cereri este în raportul livrabilului.

- L7: pragul de revizuire este >3 anunțuri active pe telefon, fără sancțiune automată. Revizuirea operațională a pragului, potrivirilor false dHash și procedurii umane rămâne necesară. Datele foto istorice sunt semnalate ca neprocesate; orice backfill găzduit se propune separat, cu buget de execuție. Limita de comparație este 1000 de anunțuri recente, afișată moderatorului când restrânge verificarea.


## L9 — livrare privată efectuată după autorizare

Blocajul inițial a fost ridicat prin răspunsul utilizatorului la cererea de reînnoire a accesului și livrare privată. Accesul temporar a fost reînnoit fără persistarea tokenului. Mecanismul Sites a sincronizat sursa exactă, a construit arhiva și a livrat **versiunea 13** la **1 noiembrie 2026, 20:53:57 Europe/Bucharest**.

Accesul recitit după livrare este custom, exclusiv proprietarul, fără grupuri și cu zero vizitatori externi. Cele patru migrări aditive sunt aplicate; tabelul `listings` rămâne gol. Nu există date DEMO, ștergeri sau backfill în găzduire. SMS și revision 2 de configurare au rămas neschimbate; nu au fost activate servicii noi sau acces public.

Browserul a afișat poarta de autentificare, apoi formularul OpenAI fără sesiune. Verificarea vizuală autentificată a site-ului găzduit rămâne neefectuată. Nu a fost folosit niciun token în browser și nu s-a încercat ocolirea autentificării. Celelalte condiții umane/de stocare de mai sus rămân deschise.

- **Runtime local / CI:** proba bootstrap a build-ului de producție a expirat intermitent în Wrangler local; ultima reluare neschimbată a trecut și CI L8 este verde. Cauza nu este stabilită. Aserțiunea rămâne blocantă fără retry automat; orice nou eșec trebuie investigat și raportat, nu etichetat ca succes.

Investigare suplimentară runtime: șase porniri consecutive neschimbate au trecut, fiecare în 1,34–1,49 secunde, într-o probă temporară care ar fi folosit un GET HTTP independent numai pentru diagnostic după eșec. Ramura de diagnostic nu a fost executată fiindcă nu s-a reprodus timeout-ul. Nu afirmăm că problema este rezolvată și nu schimbăm implementarea pe baza unei cauze presupuse.
