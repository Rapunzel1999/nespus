# Pilot Cluj-Napoca și pregătirea lansării

## Etape

1. **Pilot tehnic privat:** cont SIWC, ciorne, persistență, interfață și teste de autorizare. Fără plăți, fără promisiunea unei piețe active.
2. **Activarea telefonului:** configurare Twilio Verify, verificare reală, limite de tentative și buget SMS. Fără acest pas, publicarea și contactele noi rămân închise.
3. **Pregătire operațională:** moderator desemnat și un al doilea decident pentru cazuri cu conflict de interese/contestații, teste cu conturi distincte, proces de raportare/contestare și politici validate juridic.
4. **Pilot restrâns în municipiu:** invitații controlate, proprietari reali, moderare înainte de publicare, monitorizarea abuzurilor și a ratelor de eroare.
5. **Creștere prudentă:** object storage pentru fotografii, actualizări de securitate, backup/restaurare testate, accesibilitate și revizuire a costurilor. Extinderea geografică necesită o decizie ulterioară.

## Condiții înainte de acces public

- Furnizor SMS conectat și testat, fără telefon „confirmat” artificial.
- Roluri de moderator configurate pe server și parcurs complet al unei sesizări.
- Teste de izolare a datelor și dezvăluire a telefonului cu utilizatori distincți.
- Termeni, declarații, politica de acces, informarea despre date și retenția validate și implementate.
- Expirare/reconfirmare verificată și controale împotriva publicării numerelor în descrieri.
- QA pe telefon real, inclusiv formulare, imagini și mesagerie.
- Stocare, restaurare și costuri urmărite; limite operaționale explicite.
- Prezentare exactă a nivelurilor de verificare. Revizuirea editorială nu verifică titlul de proprietate.

## Ipoteze numerice de operare — nu tarife sau promisiuni

Exemplu de calcul pentru dimensionarea unui pilot, de înlocuit cu date reale:

| Ipoteză | Volum / timp |
| --- | --- |
| Anunțuri noi pe lună | 100 |
| Revizuire inițială | 8 minute/anunț = 800 minute |
| Cazuri cu clarificări | 20% × 100 × 10 minute = 200 minute |
| Raportări | 30/lună × 12 minute = 360 minute |
| Contestații | 5/lună × 20 minute = 100 minute |
| Total lucru direct | 1.460 minute, aproximativ 24,3 ore/lună |
| Rezervă coordonare și situații neprevăzute | 30%, total aproximativ 31,6 ore/lună |

La un **cost intern ipotetic de 50–90 lei/oră**, moderarea ar însemna aproximativ **1.580–2.850 lei/lună**. Aceste sume sunt ipoteze de buget, nu cotații, salarii recomandate sau prețuri confirmate. Nu includ consultanță juridică, suport general, taxe, TVA, dezvoltare ori infrastructură.

Un moderator part-time poate acoperi un astfel de volum numai dacă timpul măsurat confirmă ipotezele și există înlocuitor pentru absențe/contestații. Nu promiteți moderare instantanee sau disponibilitate permanentă.

Costul SMS se estimează prin `număr încercări × cost efectiv per încercare/finalizare`, conform contractului furnizorului; prețul nu este verificat aici. Impuneți bugete și limite înainte de activare. Infrastructura, object storage și notificările se bugetează separat după măsurarea utilizării.

## Indicatori

- Procent anunțuri reconfirmate și actuale.
- Contacte acceptate raportate la solicitări.
- Raportări confirmate, timp de soluționare și contestații admise.
- Conturi legitime restricționate eronat.
- Tentative de acces neautorizat și ocolire a limitelor.
- Ore de moderare și cost per anunț valid/contact relevant.

Nu publicați cifre demonstrative ca performanță reală. „Fără intermediere” este politica produsului; nu este garanția că fiecare tentativă de infiltrare a fost eliminată.
