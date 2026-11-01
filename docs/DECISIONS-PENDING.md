# Decizii și verificări în așteptare · Etapa 10

Pilotul rămâne privat proprietarului. SMS oprit; plafon zero. Nicio decizie de mai jos nu este aprobare implicită pentru costuri, acces public sau migrarea datelor găzduite.

- **QA browser:** preview-ul gestionat întoarce `ERR_CONNECTION_REFUSED`. Pregătirea Playwright/D1 local nu certifică browserul găzduit, SIWC cu două conturi ori un iPhone fizic.
- **Fotografii / L2:** stocarea JPEG în D1 este temporară, cu limite existente de 1200 px și 400000 caractere. Trei variante, inclusiv 1600 px/WebP, cer o revizuire a stocării și a validării serverului; nu se relaxează limitele doar pentru a bifa promptul. Alternativa cu object storage necesită decizie de arhitectură și autorizare de facturare. Nu se activează R2.
- **Lansare:** rămân necesare contul/serviciul Twilio, credențiale securizate, buget și destinații autorizate, SMS real, două conturi găzduite cu acces privat autorizat, iPhone fizic, Android, VoiceOver, al doilea moderator, retenție/restaurare și revizuire juridică. Issue #1 rămâne deschis.
- **Texte:** declarațiile, regulile, termenii și confidențialitatea sunt **DE REVIZUIT JURIDIC**. Nu sunt texte juridice finale.
