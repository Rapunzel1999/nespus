# Decizii și verificări în așteptare · Etapa 10

Pilotul rămâne privat proprietarului. SMS oprit; plafon zero. Nicio decizie de mai jos nu este aprobare implicită pentru costuri, acces public sau migrarea datelor găzduite.

- **QA browser:** preview-ul gestionat întoarce `ERR_CONNECTION_REFUSED`. Pregătirea Playwright/D1 local nu certifică browserul găzduit, SIWC cu două conturi ori un iPhone fizic.
- **Fotografii / L2:** stocarea JPEG în D1 este temporară, cu limite existente de 1200 px și 400000 caractere. Trei variante, inclusiv 1600 px/WebP, cer o revizuire a stocării și a validării serverului; nu se relaxează limitele doar pentru a bifa promptul. Alternativa cu object storage necesită decizie de arhitectură și autorizare de facturare. Nu se activează R2.
- **Lansare:** rămân necesare contul/serviciul Twilio, credențiale securizate, buget și destinații autorizate, SMS real, două conturi găzduite cu acces privat autorizat, iPhone fizic, Android, VoiceOver, al doilea moderator, retenție/restaurare și revizuire juridică. Issue #1 rămâne deschis.
- **Texte:** declarațiile, regulile, termenii și confidențialitatea sunt **DE REVIZUIT JURIDIC**. Nu sunt texte juridice finale.

## L2 — decizie necesară pentru variante (2026-11-01)

D1 limitează un șir, BLOB **și întregul rând** la 2.000.000 octeți: [limite oficiale](https://developers.cloudflare.com/d1/platform/limits/). Cinci fotografii × 400.000 caractere pot depăși această limită înainte de adăugarea câmpurilor anunțului. L2 limitează acum totalul JSON al fotografiilor la 1.800.000 caractere ASCII, înainte și după recodare. Limitele individuale rămân neschimbate.

**Propunere, neimplementată:** păstrarea în D1 doar a metadatelor și folosirea unui spațiu de obiecte privat pentru variante 400/800/1600 px. Rutele existente ar continua să autorizeze accesul înainte de citirea obiectului; niciun bucket public. Necesită alegerea furnizorului, buget, retenție, ștergere, backup și autorizarea serviciului cu facturare. Nu s-a creat sau activat R2.

În consecință, generarea celor trei variante, WebP, `srcset` și migrarea reversibilă sunt **oprite la limita arhitecturală cerută de L2**. Nu furnizăm un `srcset` fictiv care descarcă aceeași imagine de trei ori. Nu certificăm pragul de 100 KB cu imagini DEMO uniforme. Nicio migrare a fotografiilor găzduite nu a fost executată. EXIF/GPS continuă să fie eliminate prin recodarea existentă a pixelilor în browser și server.

Partea independentă: ETag SHA-256 și `private, no-cache` permit răspunsuri 304 după verificarea eligibilității/permisiunilor la fiecare cerere. Retragerea, expirarea și suspendarea nu pot fi ocolite cu un ETag vechi. Browserul poate păstra bytes locali; aplicația nu poate retrage copii deja salvate de utilizator. Dimensiuni explicite pe card/galerie/miniaturi; prima fotografie din rezultate nu mai este încărcată leneș.
