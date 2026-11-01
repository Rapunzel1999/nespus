# Arhitectură și contracte de securitate

Stare implementată în codul Etapei 10, 1 noiembrie 2026. Găzduirea rămâne la versiunea 12 până la livrarea autorizată. Stack-ul, găzduirea, D1 și SIWC sunt păstrate. Verificările efective sunt în VERIFICATION.md; descrierea nu este dovadă de test uman.

## Componente

- Vinext / React pentru interfață și rutele serverului, pe Cloudflare Workers.
- Cloudflare D1, binding `DB`, pentru date persistente și autorizări.
- Sign in with ChatGPT gestionat de găzduire pentru autentificare.
- Adaptor Twilio Verify pentru confirmarea telefonului; neconectat până la configurarea secretelor și verificare efectivă.
- Proiect Sites separat de Nespus, cu acces inițial privat proprietarului.
- Branch `imobiliare-cluj` în repository-ul existent; `main` și instanța Nespus rămân distincte.

SIWC stabilește identitatea contului. Rutele protejate utilizează numai identitatea furnizată de infrastructura de încredere, niciodată un `userId` ales de client. O găzduire diferită trebuie să înlocuiască acest mecanism cu autentificare verificată; acceptarea unor antete arbitrare direct din internet nu este autentificare.

## Modelul datelor

| Tabel | Scop și relații |
| --- | --- |
| `users` | Cheie stabilă SIWC, profil minimal, stare cont, rol acordat pe server, telefon privat și stare confirmare |
| `listings` | Proprietar, categorie, vânzare/închiriere, date imobil, cartier public, fără coordonate, date private separate logic, fotografii, stare și termen de reconfirmare |
| `saved_searches` | Filtre canonice private, maximum 10/cont și marcaj monoton al evenimentelor de publicare |
| `editor_drafts` | O ciornă incompletă privată per cont, revizie CAS monotonă și conținut de maximum 1.850.000 octeți |
| `message_reads` | Confirmări unice utilizator–mesaj numai pentru mesajele afișate |
| `favorites` | Asociere unică utilizator–anunț, citire doar pentru titular |
| `contact_requests` | Anunț, solicitant, proprietar, scop, stare, decizie și permisiune individuală de dezvăluire telefon |
| `viewings` | Solicitare legată de conversație, inițiator, moment și stare; numai proprietarul acceptă/refuză |
| `messages` | Conversație/solicitare, autor, conținut și moment; acces numai participanților autorizați |
| `blocks` | Persoana care blochează și persoana blocată; blochează contactele/mesajele conform regulii serverului |
| `declarations` | Tip, versiune și momentul acceptării, legate de utilizator |
| `reports` | Autor, țintă, categorie, context și stare; acces limitat |
| `appeals` | Contestație legată de decizie și autor, cu soluție motivată |
| `audit_events` | Acțiuni sensibile și moderare, cu autor, țintă și moment; fără secrete sau copii inutile de mesaje |
| `phone_challenges` | Provocări de confirmare, expirare, tentative și rezultat; nu conține coduri în clar în răspunsuri publice |
| `rate_limits` | Ferestre și contoare actualizate atomic pentru operațiuni limitate |

## Contracte server obligatorii

- Ciornele aparțin autorului. Publicarea cere telefon confirmat real, declarație validă, eligibilitate Cluj-Napoca și aprobare umană.
- În lipsa furnizorului SMS, publicarea și solicitările noi eșuează explicit. Nu există OTP de test acceptat în producție.
- Listele publice și pagina publică exclud telefonul, adresa exactă, e-mailul, identitatea furnizorului și datele interne. Construiți o proiecție explicită, fără serializarea întregului rând.
- Telefonul se livrează numai solicitantului autorizat de o relație acceptată și de acordul explicit al proprietarului. Se verifică blocările, starea conturilor și starea anunțului la acces.
- Citirea și scrierea mesajelor verifică participarea, restricțiile și starea blocărilor pe server.
- Favoritele, ciornele, rapoartele și contestațiile nu sunt colecții publice.
- Moderarea necesită rol de server. Un simplu parametru, e-mail afișat sau câmp din client nu oferă rol.
- Limitele contactării trebuie să reziste cererilor concurente; verificarea urmată de incrementare neatomică nu este suficientă.
- Publicarea expiră după 30 de zile fără reconfirmare. Toate citirile publice verifică termenul; cron-ul este auxiliar.
- Modificările materiale revin în moderare; identitatea proprietarului nu poate fi mutată prin payload.
- Plățile nu sunt active. Nu există tranzacții simulate ca reușite.

## Fotografii și limite de stocare

În pilot: maximum cinci imagini JPEG, fiecare de cel mult **400.000 de caractere pentru întregul data URL base64**, adică aproximativ 300 KB binari. Nu este o limită de 400 KB binari. JSON-ul fotografiilor este limitat suplimentar la 1.800.000 caractere ASCII înainte și după recodare, rezervând spațiu în rândul D1. Corpul JSON complet este limitat la 2.100.000 de octeți.

Serverul folosește `jpeg-js` pentru decodare și recodificarea pixelilor, eliminând metadatele. Limitele decodorului sunt 2 MP și 32 MB; fiecare dimensiune este de cel mult 1.200 px. Rezultatul recodificat este verificat din nou față de plafon. Comportamentul de eliminare a metadatelor are test de regresie.

Feed-ul returnează cel mult 24 de rezumate cu URL-ul primei fotografii; favoritele și lista proprie cel mult 50 de rezumate. `GET /api/mine/:id` încarcă galeria completă a unui anunț propriu. Coada moderatorului încarcă cel mult 10 anunțuri în așteptare cu galerii complete. Aceste limite reduc răspunsurile, fără a rezolva scalarea imaginilor în D1.

Aceasta este o arhitectură temporară pentru pilot. Mutarea în object storage și variantele de imagine sunt propuse, nu implementate sau autorizate; vezi DECISIONS-PENDING.md. Nu se acceptă acte KYC în câmpurile de fotografie.

## Vizionări și moderare implementate

`POST /api/conversations/:id/viewings` este rezervat solicitantului într-o conversație acceptată și disponibilă, fără blocare, cu conturi eligibile. Momentul propus trebuie să fie între o oră și 30 de zile în viitor; se aplică limita de solicitări. `POST /api/viewings/:id` permite numai proprietarului să accepte/refuze o solicitare în așteptare. Propunerea nu este programare confirmată.

Un moderator nu poate aproba propriul anunț, examina probele sau soluționa o raportare în care este implicat ori decide o contestație proprie. Contestația legată de o raportare soluționată de acel moderator cere un alt decident. Configurarea actuală a unui singur moderator nu asigură personalul necesar cazurilor independente: un al doilea moderator trebuie desemnat înainte de operarea lor.

Probele unei raportări sunt limitate la cazul respectiv și la ultimele 30 de mesaje, returnate cronologic. Accesul este auditat. Acesta nu este un instrument de explorare a tuturor conversațiilor unui utilizator.

Configurație: `MODERATOR_EMAILS` folosește e-mailul din gateway-ul de încredere; SMS cere `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`. Serviciul SMS nu este conectat în prezent; publicarea și contactele noi rămân închise pentru telefoane neconfirmate. Localizarea publică este cartierul, fără hartă sau precizie numerică fictivă.

## Retenție și operare

Nu există documente KYC în MVP. Numărul de telefon și probele de moderare sunt private. Înainte de lansare, stabiliți și implementați retenția pentru conturi, mesaje, solicitări SMS, audit și rapoarte, inclusiv accesul moderatorilor și ștergerea contului. Nu păstrați date nelimitat doar pentru posibilă detecție viitoare.

Secretele SMS și configurația moderatorilor rămân pe server. Logurile nu includ OTP-uri, tokenuri, telefoane complete ori mesaje integrale. Back-up-ul, restaurarea și răspunsul la incidente necesită verificare operațională înainte de pilot public.

## Reguli operaționale suplimentare după revizuire

Crearea/editarea este limitată înainte de procesarea imaginilor la 20 operațiuni/oră per cont. Cotele expirate sunt curățate în lot limitat după mai mult de o zi; ștergerea unei resurse nu resetează cotele. Declarațiile și auditul unui contact sunt persistate numai dacă inserarea condiționată a contactului reușește.

Numele public al profilului este sanitizat pentru a limita scurgerile de date de contact prin acest câmp. Moderatorul nu poate restricționa contrapărți din propriile conversații sau alți moderatori. Contestația restricționării contului cere un alt decident; admiterea restabilește starea activă. Admiterea contestației unei raportări redeschide raportarea.

Un anunț retras poate fi editat și retrimis spre moderare. Vândut/închiriat sunt stări terminale. Contul suspendat nu poate citi conversații, însă își poate consulta propriile anunțuri și contestații. Aceste excepții sunt deliberate și nu permit publicare sau contacte noi.


## Contracte actualizate — 1 noiembrie 2026

### Fotografii la cerere

Listele de anunțuri, favoritele și detaliul public returnează URL-uri în `photos`. `/api/listings/:id/photos/:index` acceptă indecși 0–4 și citește o singură fotografie, numai dacă anunțul trece filtrul public `LIVE`. `/api/mine/:id/photos/:index` cere contul proprietarului; citirea propriului istoric rămâne permisă și după restricționare, conform politicii existente. Nu permite citirea de către alte conturi sau anonim.

Răspunsul este JPEG binar cu `Cache-Control: private, no-cache` și ETag SHA-256, `X-Content-Type-Options: nosniff` și `Cross-Origin-Resource-Policy: same-origin`. Fiecare cerere nouă verifică accesul; imaginile deja descărcate sau văzute nu pot fi retrase de pe dispozitive. SQL-ul de listare returnează doar existența copertei, iar detaliul public doar pozițiile fotografiilor. `/api/mine/:id` și fluxurile de editare/moderare păstrează datele complete, autorizate. Stocarea rămâne în D1, fără migrare; miniaturile și object storage rămân o etapă ulterioară.

### Conversații paginate

`GET /api/conversations` returnează cel mult 25 de înregistrări, `limit` și `nextCursor`. Cursorul `before` are forma `timestamp:id`, validată strict. Ordinea este `updated_at DESC, id DESC`. Apartenența, disponibilitatea și blocarea sunt evaluate în interogarea comună; lista nu mai execută interogări separate pentru fiecare conversație. Filtrele interfeței se aplică explicit conversațiilor încărcate. Activitatea nouă poate muta un rând înaintea cursorului; reîmprospătarea restabilește ordinea curentă, iar clientul elimină duplicatele între pagini.

`GET /api/conversations/:id` deschide cele mai recente 50 de mesaje, returnate cronologic. `nextMessageCursor` permite cererea mesajelor mai vechi, cu departajare prin ID pentru timestamp-uri egale. Fiecare pagină reautorizează participantul și dezvăluirea telefonului. Ultimele 100 de vizionări după data propusă sunt returnate cu `viewingsHasMore`; interfața explică limita când este atinsă. Un moment deja trecut nu poate fi acceptat/refuzat prin ruta de decizie a vizionării.

Citirea numărului dezvăluit revalidează în aceeași interogare permisiunea individuală, apartenența, eligibilitatea conturilor/anunțului și absența blocării. Astfel, o blocare intervenită între citirea conversației și citirea telefonului nu mai permite expunerea numărului.

### Trimiteri și stare în browser

Clientul trimite un `requestId` aleator de 32 de caractere hexazecimale la fiecare mesaj nou. Repetarea aceluiași ID, de același autor, în aceeași conversație, cu același text normalizat, întoarce mesajul deja salvat fără dublare. Refolosirea cu alt text/autor/conversație este respinsă. Cheia unică existentă a mesajelor acoperă și inserările concurente; reîncercarea verifică în continuare accesul. Cota poate fi consumată de două cereri simultane care ajung înaintea primei inserări. Nu este o garanție globală de trimitere exact o dată pentru orice operațiune: numai mesajele cu același `requestId` au această protecție.

Textul netrimis și cheia de retry se păstrează în memoria filei. Editarea textului generează o trimitere nouă; reîncărcarea/închiderea poate pierde starea. Nu se folosește localStorage pentru conținut privat. Cererile simultane din aceeași conversație/formular sunt oprite în client, iar răspunsurile întârziate nu schimbă ecranul sau dialogul deschis între timp. API-ul rămâne autoritatea pentru toate permisiunile.

Pornirea verificării SMS returnează termenul real `expiresAt` păstrat pe server. Clientul folosește acest termen, o pauză de minimum 60 de secunde și cereri explicite; nu retrimite automat coduri. Codurile expirate și limitele de încercări sunt explicate fără a modifica starea în „confirmat”. Configurația pilotului rămâne oprită.

Solicitarea unui SMS pentru același număr deja confirmat pe cont este refuzată înaintea cotelor și a furnizorului (`PHONE_ALREADY_VERIFIED`). Nu se verifică preventiv dacă numărul aparține altui cont; asocierea unică rămâne verificată după dovada accesului la număr.


## Module și contracte Etapa 10

- `public/app.js`: compunerea interfeței și fluxurile; `design.css`: valori vizuale comune peste stilurile existente. `gallery.js`, `draft-storage.js`, `messages-live.js` și `trust.js` separă galeria, autosalvarea, actualizarea conversațiilor și transparența. Scripturile sunt first-party, defer, fără framework nou.
- `lib/search.mjs`: o singură validare pentru rezultate/numărare/căutări salvate; preț/m² se sortează numai într-o monedă selectată. `monthly_costs` nullable distinge costul necunoscut de zero, fără parsarea textului liber.
- `PUT /api/editor-draft`: revizie așteptată obligatorie; conflictul nu suprascrie altă filă. Golirea păstrează un marcaj cu revizie crescută. Bufferul nu este anunț public și nu acceptă stări/declarații injectate. Salvarea anunțului trece prin validarea și recodarea normală.
- Fotografiile au SHA-256 ETag și `private, no-cache`; autorizarea și eligibilitatea preced inclusiv 304. Nu se folosesc cache-uri publice. Numai URL-uri în căutare/detaliu/favorite; nu există variante WebP/srcset încă.
- `/api/notifications`, `/api/conversations/:id/read`: participare verificată pe server, citire individuală/idempotentă, fără a marca mesaje sosite după citirea paginii. Polling vizibil 10→20→40→60 secunde; costul în cereri este estimat în raportul L6.
- `/api/viewings/:id/calendar`: numai participanții, vizionare confirmată, calendar privat fără adresa exactă/telefon/invitați; Europe/Bucharest, UTC pentru ora locală ambiguă de toamnă. Nu se trimite nicio invitație.
- `lib/moderation-signals.mjs`: indicii telefon >3 anunțuri, cuvinte-cheie și dHash calculat pe server. Comparație între conturi, maximum 1000 de anunțuri recente; lipsurile sunt afișate. Niciun semnal nu schimbă automat eligibilitatea.
- `/api/moderation/audit`: numai rol de moderator; ultimele 50 de decizii persistente, nu acces global la conversații. Datele de încredere provin din declarații și evenimente efective, nu din `updated_at`.

Migrările `0001`–`0004` sunt aditive: căutări salvate/costuri lunare/index audit, ciornă cu revizie, confirmări de citire/index participant, metadate foto nullable. Au fost aplicate numai în D1 local. Nu conțin seed, ștergeri sau backfill găzduit. `pnpm db:generate` nu mai produce diferențe între schema TS și metadata.

## Izolarea testelor

`tests/e2e/worker.mjs` este o intrare distinctă, exclusiv HTTP localhost și două marcaje explicite de test. Are D1 cu ID fictiv, nu un binding găzduit. Opt oferte și toate conturile sunt DEMO; banner vizibil. Providerul SMS este funcție locală și refuză orice URL neașteptat. Build-ul de producție este scanat și pornit cu marcajele injectate pentru a verifica ruta de login inexistentă, ignorarea cookie-ului DEMO și lipsa confirmării simulate. Nu se încarcă seed-ul în migrările de producție.
