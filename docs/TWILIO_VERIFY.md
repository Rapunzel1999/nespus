# Twilio Verify — pilot privat, 27 octombrie 2026

## Stare verificată

Sursa găzduită `76d2dad` corespundea fișierelor ramurii GitHub `imobiliare-cluj` la `7fe6ffa`. La inspecție, accesul Sites era **public**, contrar intenției de pilot privat; a fost schimbat la **custom, numai proprietarul**, fără invitații sau alți utilizatori. Issue #1 rămâne deschis.

În configurația găzduită exista numai `MODERATOR_EMAILS`. Nu existau cele trei credențiale Twilio; nici mediul acestei sesiuni nu le conținea. Nu s-a găsit un plugin Twilio în căutarea disponibilă. Nu au fost create conturi, cumpărate numere sau trimise mesaje. Schimbările sunt pregătire tehnică, **nu dovadă de livrare SMS**.

## Configurația exactă

Introduceți aceste valori exclusiv ca **secrete runtime Sites** pentru proiectul existent. Nu le puneți în GitHub, chat, comenzi shell, `.openai/hosting.json` sau variabile expuse clientului. `.env.example` documentează numai numele; `.env*` și `.dev.vars*` sunt ignorate.

| Cheie | Valoare / regulă |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | SID-ul contului/subcontului dedicat pilotului: `AC` + 32 caractere hexazecimale |
| `TWILIO_AUTH_TOKEN` | Tokenul acelui cont/subcont; acces numai pe server |
| `TWILIO_VERIFY_SERVICE_SID` | Serviciu Verify din același cont: `VA` + 32 caractere hexazecimale |
| `TWILIO_VERIFY_ENABLED` | `false` în această etapă; numai valoarea exactă `true` permite activarea |
| `TWILIO_VERIFY_TOTAL_SEND_LIMIT` | `0` în această etapă. După autorizare: plafon cumulativ întreg 1–100 pentru cererile de trimitere ale pilotului |
| `MODERATOR_EMAILS` | Se păstrează configurația existentă; SIWC furnizează identitatea |

Cele două valori de control au fost configurate în găzduire ca `false` și `0`. O versiune salvată trebuie redeployată pentru aplicarea reviziei de mediu. Nu este necesară o migrare DB pentru această schimbare.

Un token de cont are privilegii largi: folosiți un subcont dedicat, fără alte produse active, și rotație prin secrete runtime. Adaptorul curent folosește Account SID/Auth Token; un API Key SID nu se introduce în câmpul Account SID. Nu pretindem suport pentru chei restricționate în această versiune.

## Configurarea serviciului, înainte de orice trimitere

1. Selectați sau creați serviciul Verify în subcontul destinat acestui proiect. Numele afișat trebuie recunoscut de tester, fără a afirma verificarea proprietății.
2. Setați coduri de **6 cifre**, valabilitate **10 minute**, coduri generate de Twilio (`CustomCodeEnabled=false`) și avertizare de a nu distribui codul (`DoNotShareWarningEnabled=true`). Aplicația acceptă numai 6 cifre.
3. În **Verify Geo Permissions**, permiteți numai România; confirmați **Fraud Guard** activ. Nu dezactivați protecțiile pentru a forța un test. Setările Messaging Geo Permissions nu înlocuiesc setările Verify.
4. Păstrați numai traseul SMS necesar. Adaptorul trimite `Channel=sms`, `Locale=ro`, `RiskCheck=enable`, fără voice/WhatsApp/auto fallback, custom OTP sau retry automat. Evitați opțiuni suplimentare cu plată până sunt evaluate și autorizate. Verify folosește un pool gestionat; nu este necesară cumpărarea unui număr pentru acest flux standard.
5. Configurați monitorizarea consumului în cont și verificați prețul efectiv, taxele și creditul disponibil. Alertele de consum nu sunt tratate ca un plafon financiar garantat. În trial, destinația reală trebuie mai întâi verificată în contul Twilio, conform restricțiilor trial.
6. Introduceți cele trei secrete în Sites cu trimiterea încă oprită. Efectuați verificarea read-only și confirmați în Console setările pe care ea nu le verifică. Activarea și orice test cu SMS cer autorizarea separată a destinațiilor și bugetului.

### Preflight fără SMS

`npm run sms:preflight` citește numai variabilele procesului și face exclusiv `GET /v2/Services/{ServiceSid}`. Nu încarcă implicit fișiere `.env`, nu creează servicii și nu trimite SMS. Folosiți un mediu securizat cu secrete injectate; nu copiați tokenuri în linia de comandă. Ieșirea conține numai verificări booleene și numele valorilor lipsă.

Verifică apartenența serviciului/contului, lungimea codului, custom codes dezactivate și avertizarea de partajare. `ready:true` validează numai aceste verificări read-only, **nu lansarea**. Geo Permissions, Fraud Guard, retenția/transferurile, livrarea și integrarea SIWC se verifică separat. În sesiunea de față a returnat cele trei chei lipsă și exit code 2; nu a efectuat apeluri la Twilio.

## Limite impuse de server

| Control | Comportament |
| --- | --- |
| Acces | SIWC real + cont activ + aceeași origine pentru mutații |
| Destinații | Numere românești în formatul mobil acceptat de proiect (`+40[67]` + 8 cifre); nu este o verificare a operatorului sau posesiei |
| Retrimitere | Minimum 60 secunde între trimiteri pe cont **și** număr, inclusiv la schimbarea orei |
| Volum | 3 încercări de trimitere/oră pe cont și număr; 10/24 h global, ferestre pornite la prima cerere |
| Buget pilot | Plafon cumulativ atomic, persistat în `rate_limits` la cheia `sms-pilot-total`; nu se resetează zilnic |
| Cost incert | Cererile rezervă cota înainte de apel; timeout-ul sau eroarea nu rambursează automat cota |
| Concurență | Un singur start/check în curs pe cont; lease de 30 s, verificat din nou la salvare, apel furnizor limitat la 12 s |
| Încercări cod | Maximum 5 pe SID de verificare, comun și între conturi cu același SID; nu se resetează la retrimitere |
| Expirare | Maximum 10 minute de la crearea verificării; retrimiterea aceluiași SID nu prelungește termenul |
| Aprobare | Se cer `approved` și concordanța exactă SID, număr, cont, serviciu și canal SMS; starea contului, provocarea și lock-ul se reverifică atomic |
| Refolosire | Provocarea consumată se șterge; un cod consumat/expirat nu confirmă altă cerere |
| Confidențialitate | Fără loguri cu OTP, telefon, credentiale ori răspunsuri Twilio brute; erori sanitizate |

Un plafon de **cereri** nu este un plafon exact în USD: segmentele, taxele și traficul făcut direct din Console sau de alte aplicații nu sunt controlate aici. Nu ștergeți/resetati contorul cumulativ; o creștere a plafonului cere autorizarea diferenței. O restaurare DB veche poate restaura și un contor mai mic: opriți SMS înainte de restaurare și reconciliați consumul cu Twilio înainte de reactivare.

Aplicația stochează numărul și SID-ul provocării în D1, plus hashuri ale numerelor în limite. Acestea nu sunt date anonime. Curățarea ratelimit-urilor expirate este oportunistă; nu există încă un proces programat de ștergere pentru toate provocările abandonate. Politica de retenție, operatorul, acordurile cu furnizorii și ștergerea operațională rămân condiții de lansare, nu sunt validate prin testele tehnice.

## Costuri de referință, verificate la 27.10.2026

Twilio afișează **0,05 USD/verificare reușită**, plus transportul. Pagina SMS România indică **0,0781 USD/segment outbound**, cu posibile taxe suplimentare și schimbări de tarif. Încercările SMS pot fi facturate și fără confirmare; verificarea nereușită nu atrage taxa de succes standard.

Estimare orientativă, cu un singur segment per trimitere, fără taxe suplimentare:

| Scenariu | Calcul | USD |
| --- | --- | ---: |
| 1 SMS + 1 confirmare | 0,0781 + 0,05 | 0,1281 |
| 4 SMS + 2 confirmări | 4 × 0,0781 + 2 × 0,05 | 0,4124 |
| 100 SMS + 100 confirmări | 100 × (0,0781 + 0,05) | 12,81 |

Aceste estimări nu sunt ofertă contractuală, cost final verificat în cont sau autorizare de plată. Reconfirmați tariful aplicabil Verify România, segmentarea șablonului și taxele în cont înainte de test. Nu au fost activate Lookup plătit, achiziții de numere sau abonamente suplimentare.

## Plan de test real — neexecutat

Păstrați accesul privat. Începeți numai după configurarea secretelor, autorizarea numerelor testerilor și aprobarea plafonului. Pentru testul cu două conturi, proprietarul trebuie să autorizeze explicit accesul privat al celui de-al doilea tester; nu faceți site-ul public.

1. Cont A neconfirmat: salvează ciornă, dar trimiterea la moderare și inițierea contactului sunt refuzate inclusiv prin cereri API directe.
2. A solicită SMS la propriul telefon autorizat: confirmați recepția pe dispozitiv, nu doar `sent:true` (care înseamnă acceptare de furnizor). Verificați că retrimiterea imediată este refuzată fără alt apel Twilio.
3. Introduceți un cod greșit, apoi codul corect: numai răspunsul real `approved` confirmă telefonul. Încercați refolosirea după consumare; trebuie refuzată. Telefonul nu trebuie să apară în API/HTML public.
4. Solicitați separat o verificare și lăsați-o să expire fără confirmare. După 10 minute, codul este refuzat. Verificați și starea reală în Twilio; nu raportați expirarea simulată drept probă live.
5. Pentru un cod nou, cinci încercări greșite; a șasea trebuie refuzată local fără apel Twilio. Respectați cota 3/oră; împărțiți scenariile în sesiuni dacă este necesar, fără relaxarea limitelor.
6. Cont B real, cu alt telefon autorizat: repetați confirmarea; testați izolarea ciornelor/conversațiilor și dezvăluirea individuală. A treia identitate și moderatorul rămân necesare pentru matricea completă din VERIFICATION.md.
7. Testați pe Safari **iPhone fizic**: autentificare, tastatură numerică, autofill OTP, erori, expirare, confirmare și navigare. Un viewport mobil desktop nu echivalează cu această probă.
8. Opriți `TWILIO_VERIFY_ENABLED` după sesiunea autorizată și redeployați. Înregistrați rezultatele și consumul, fără numere complete/OTP/tokenuri. Limitele globale/concurente se testează cu simulări; nu generați trafic SMS pentru a le epuiza.

Evidențe încă lipsă: autorizare SMS, credențiale și serviciu real, livrare/confirmare, expirare/repetări cu furnizorul, două conturi găzduite, iPhone fizic, al doilea moderator și celelalte condiții din issue #1. Nu închideți issue-ul și nu deschideți accesul public pe baza testelor simulate.

## Surse oficiale

- [Verify pricing](https://www.twilio.com/en-us/verify/pricing)
- [SMS România](https://www.twilio.com/en-us/sms/pricing/ro)
- [Valabilitate și limite](https://www.twilio.com/docs/verify/api/rate-limits-and-timeouts)
- [Verification Check și 404 după expirare/consumare](https://www.twilio.com/docs/verify/api/verification-check)
- [Verifications, identificatori și RiskCheck](https://www.twilio.com/docs/verify/api/verification)
- [Service API](https://www.twilio.com/docs/verify/api/service)
- [Prevenirea fraudei](https://www.twilio.com/docs/verify/preventing-toll-fraud)
