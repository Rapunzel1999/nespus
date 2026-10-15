# Produsul și politica de acces

## Definiție

O piață de locuințe între proprietari și destinatari finali, în care proprietarul controlează contactul. Prima etapă este **municipiul Cluj-Napoca**, nu județul sau zona metropolitană. Succesul înseamnă anunțuri actuale și discuții relevante; volumul brut de conturi nu este obiectivul principal.

Sunt prevăzute apartamente/garsoniere, case, terenuri și spații comerciale, pentru vânzare sau închiriere. Proprietățile demonstrative sunt etichetate și separate de datele reale. Nu se sugerează că un exemplu este ofertă disponibilă.

## Cine poate utiliza pilotul

| Situație | Regula pilotului |
| --- | --- |
| Proprietar sau coproprietar | Poate crea o ciornă; publicarea necesită telefon confirmat, declarația curentă și moderare |
| Cumpărător sau chiriaș final | Poate consulta anunțurile; contactul necesită cont, telefon confirmat și declarația curentă |
| Agent, angajat/colaborator de agenție, persoană interpusă | Nu poate utiliza platforma în scop de intermediere, prospectare sau colectare de contacte |
| Proprietar cu mai multe imobile | Nu este presupus agent; cere revizuire contextuală la activitate neobișnuită |
| Dezvoltator sau vânzător profesional | În afara pilotului; necesită politică separată înaintea oricărei admiteri |
| Reprezentant personal ori legal | Nu poate publica prin simplă bifă; cazurile se examinează separat, fără admitere automată în MVP |
| Persoană cu profesie în imobiliare, tranzacție personală | Necesită decizie manuală documentată înainte de acces la publicare/contact; nu există excepție automată |
| Moderator | Acces acordat pe server, numai la informațiile necesare soluționării |

Regula vizează comportamentul de intermediere și păstrează un proces pentru situațiile legitime. Nu se publică liste de suspecți. Nu se vinde acces special agențiilor.

## Patru intenții, două fluxuri de date

Navigarea principală separă „Vreau să cumpăr”, „Vreau să închiriez”, „Vreau să vând” și „Caut chiriaș”. Primele două deschid căutarea cu tipul tranzacției selectat; ultimele două deschid publicarea ghidată corespunzătoare. Acestea sunt intrări adaptate intenției, nu patru sisteme separate sau promisiuni de servicii de intermediere.

Structura este informată de [referința Bezrealitky](REFERENCE.md), furnizată de utilizator. Preluăm principiul clarității parcursurilor, fără copierea mărcii, anunțurilor sau fotografiilor și fără a revendica verificările oferite de acel serviciu.

## Declarații

Acceptarea este explicită, cu căsuțe nebifate inițial, înaintea acțiunii relevante. Serverul înregistrează utilizatorul, tipul declarației, versiunea și momentul. O versiune nouă poate cere reacceptare pentru acțiunile viitoare; nu rescrie istoricul.

**Publicare:** persoana declară că este proprietar/coproprietar, că informațiile sunt corecte după cunoștința sa, că are dreptul să folosească fotografiile și că nu publică pentru intermediere.

**Contact:** persoana declară un interes final real, că nu prospectează pentru intermediari, că nu transferă datele proprietarului către agenții direct sau prin terți fără acord prealabil explicit, că nu republică materialele fără permisiune și că acceptă procedura de moderare.

Acestea sunt angajamente de utilizare, nu dovezi că declarația este adevărată. Textele finale și efectele încălcării necesită validare juridică. Nu sunt prevăzute amenzi automate ori acuzații penale.

## Niveluri de încredere

- **Cont conectat:** autentificare SIWC reușită; nu reprezintă verificare civilă.
- **Telefon confirmat:** numai după răspunsul real de aprobare al furnizorului SMS.
- **Proprietar declarat / coproprietar declarat:** declarație acceptată, fără certificarea titlului.
- **Revizuit pentru publicare:** verificare editorială și de politică, nu verificarea juridică a proprietății.

Nu există etichetă de identitate ori proprietate verificată în acest MVP. Nu se colectează acte pentru a susține o etichetă pe care procesul nu o poate livra.

## Fluxul proprietarului

Conectare → ciornă → date și fotografii → previzualizare → confirmare telefon reală → declarație de publicare → solicitare moderare → decizie umană → publicare. Revizuirea nu este simulată sau aprobată automat.

Proprietarul primește solicitări, discută în platformă, poate accepta o solicitare și decide dezvăluirea telefonului persoanei respective. Poate opri solicitările, bloca, raporta, închide sau reconfirma anunțul. Editările materiale ale unui anunț public trebuie să intre din nou în moderare; o simplă modificare client nu trebuie să ocolească această regulă.

## Fluxul persoanei interesate

Căutare și filtre → anunț → conectare → confirmare telefon → declarație de contact → scop scurt al solicitării → conversație. Acceptarea unei solicitări și dezvăluirea telefonului sunt acțiuni explicite ale proprietarului. Un număr divulgat nu poate fi retras din memoria/dispozitivul destinatarului.

Vizionările necesită acceptare explicită dacă sunt implementate; un mesaj trimis nu este programare confirmată. Adresa exactă se comunică separat, la alegerea proprietarului.

## Actualitate și monetizare

Disponibilitatea se reconfirmă la cel mult 30 de zile. Serverul exclude anunțurile expirate din căutare și acces public chiar dacă un job programat nu a rulat.

Nu există plăți active. Modelul posibil este anunț gratuit și promovare clar marcată. Plata nu cumpără verificare, acces la contacte, ocolirea moderării sau protecții de bază.
