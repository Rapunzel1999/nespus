# Infiltrare și moderare

Nici declarațiile, nici numărul de telefon nu elimină complet intermediarii ascunși. Obiectivul este să reducem accesul la date, să detectăm comportamente repetate și să soluționăm cazurile corect.

| Scenariu | Prevenție / limitare | Semnal de analizat | Revizuire și risc de eroare |
| --- | --- | --- | --- |
| Agentul publică drept proprietar | Declarație versionată, telefon confirmat, revizuire umană înainte de publicare | Neconcordanțe, materiale repetate, solicitări de intermediere | Mai multe proprietăți nu dovedesc agenție; cere clarificare înainte de sancțiune |
| Agentul pozează în cumpărător/chiriaș | Mesagerie internă, telefon ascuns, limită de solicitări | Mesaje aproape identice, recrutare, promovare servicii | O persoană care caută activ poate contacta legitim mai mulți proprietari |
| Persoană interpusă colectează contacte | Dezvăluire individuală, jurnal de acces și angajament de netransmitere | Raportare contextuală și tipar repetat | Datele deja dezvăluite nu pot fi recuperate; raportarea nu este singură dovadă |
| Conturi multiple după suspendare | Limite pe cont și telefon, verificarea recurenței incidentelor confirmate | Reutilizarea unor date asociate unor abuzuri confirmate | Numerele pot fi realocate sau împărțite; nu bloca definitiv doar pe coincidență |
| Copiere anunț/fotografii | Fără telefon public, procedură de raportare; ulterior detecție duplicat | Fotografie/descriere reutilizată în contexte diferite | Coproprietarii pot avea aceleași fotografii; nu pretinde blocarea capturilor |
| Mesaje în masă | Limită atomică pe server, blocare înainte de trimitere | Ritm și conținut repetitiv | Nu trata volumul singur ca verdict; permite contestare |
| Mutare imediată în exterior | Telefon ascuns implicit, profil minimal, avertisment contextual | Cereri insistente de a părăsi platforma | Preferința legitimă pentru apel nu dovedește intermediere |
| Raportări abuzive | Acces controlat la dovezi, revizuire umană | Raportări coordonate, fără context | Numărul de sesizări nu produce suspendare definitivă automată |
| Acces la telefon prin API | Proiecții publice fără câmpuri private, autorizare pentru fiecare dezvăluire | Cereri către contacte fără relație acceptată | Teste între conturi; ascunderea CSS nu este control de acces |
| Acces la conversația altuia | Identitate de server și verificare participant la fiecare operațiune | Identificatori de conversații încercați repetat | ID-urile greu de ghicit nu înlocuiesc autorizarea |
| Editare după aprobare | Reintroducere în moderare pentru modificări materiale | Schimbarea descrierii/imaginilor după revizuire | Păstrează ciorna; nu pierde conținutul legitim al proprietarului |
| Anunț expirat încă vizibil | Verificarea termenului în toate citirile publice | Reconfirmare lipsă | Nu depinde exclusiv de cron sau de filtrarea client |

## Procedura operațională propusă

1. Sesizarea reține categoria și contextul necesar; nu solicită publicarea datelor personale.
2. Moderatorul stabilește ce dovezi poate vedea și notează motivul deciziei.
3. O măsură temporară poate limita contacte noi în caz de risc imediat, fără verdict public.
4. Sancțiunile definitive necesită analiză umană și motiv comunicat persoanei afectate.
5. Contestația este analizată separat; unde echipa permite, de alt moderator.
6. Acțiunile și modificările de rol sunt auditate; nu se publică lista persoanelor suspectate.

O raportare nu deschide moderatorului acces nelimitat la toate conversațiile utilizatorului. Accesul trebuie legat de caz și documentat. Nu se folosesc recunoaștere facială, amprentare invazivă sau colectare de documente pentru scoruri speculative.

## Limite inițiale

Detectarea duplicatelor și a textelor repetitive este o direcție ulterioară dacă nu există implementare și teste. Nu o prezenta în interfață ca funcționalitate activă. MVP-ul trebuie să aplice cel puțin limite atomice pe server, blocări, declarații, acces controlat la telefon și moderare înainte de publicare.
