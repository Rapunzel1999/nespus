# Master prompt — piață imobiliară directă în Cluj-Napoca

## Proveniență și decizia curentă

Cerință utilizator, 15 octombrie 2026: oprirea dezvoltării Nespus și pornirea unei platforme imobiliare fără intermediere, cu colaborare ChatGPT, Claude și Gemini dacă integrările permit. Ultima precizare: **începem numai cu Cluj**. Pentru pilot aceasta înseamnă municipiul Cluj-Napoca; extinderea la localitățile limitrofe nu este inclusă.

Implementarea se organizează în branch-ul `imobiliare-cluj` al `Rapunzel1999/nespus`. Nespus de pe `main` nu se șterge. Găzduirea este un proiect Sites separat, privat inițial. Acesta este un prompt de lucru și un contract de produs, nu dovada că fiecare funcție este finalizată.

Implementarea este coordonată de ChatGPT, cu agenți ChatGPT pe componente distincte. **Claude a furnizat o verificare independentă de produs și securitate**, prin Claude Code CLI, fără acces la instrumente sau la implementare. Modelul raportat de CLI a fost `claude-opus-5`; a existat și o cerere internă mică Haiku. Această verificare inițială nu constituie audit al codului. Ulterior, Claude a primit și o versiune a implementării pentru analiză read-only: opt constatări, fără execuție de cod sau teste; ChatGPT a aplicat corecțiile confirmate. **Gemini a fost încercat, dar autentificarea a eșuat** cu `IneligibleTierError UNSUPPORTED_CLIENT`; nu există contribuție Gemini. Nu prezenta această muncă drept implementare realizată de trei modele. Detalii și decizii: [COLLABORATION.md](COLLABORATION.md).

---

Acționează ca o echipă senior de strategie de produs, UX/UI, dezvoltare full-stack, securitate și moderare. Construiește o platformă pentru vânzarea și închirierea directă între proprietari și destinatari finali, cu pilot exclusiv în **municipiul Cluj-Napoca**. Numele și domeniul sunt provizorii.

## Obiectiv

Construiește o piață unde proprietarii publică propriile imobile, cumpărătorii/chiriașii caută pentru ei, iar intermediarii nu pot utiliza produsul pentru prospectare, recrutare sau colectare de contacte. Proprietarul controlează accesul la telefon. Nu promite eliminarea completă a agenților ascunși.

## 1. Politica de acces

Definește rolurile proprietar/coproprietar, cumpărător final, chiriaș final, moderator și administrator. Interzice intermedierea prin conturi personale, colaboratori sau persoane interpuse. Reprezentanții comerciali nu publică în MVP. Reprezentarea personală/legală necesită analiză separată, nu o bifă ambiguă. Mai multe proprietăți nu sunt dovada unei agenții. Dezvoltatorii și vânzătorii profesionali rămân în afara pilotului până la o politică explicită. Regulile și textele contractuale necesită validare juridică înainte de lansare.

## 2. Modelul de infiltrare

Analizează: agent drept proprietar; agent drept cumpărător/chiriaș; colector de numere; conturi multiple după suspendare; anunțuri/fotografii copiate; mesaje în masă; mutare insistentă în exterior; raportări abuzive. Pentru fiecare, documentează prevenția, semnalele, limitarea, revizuirea umană și erorile posibile. Nu folosi supraveghere invazivă ori colectare excesivă pentru scoruri speculative.

## 3. Verificări distincte

Cont conectat ≠ identitate civilă verificată. Telefon confirmat ≠ proprietar verificat. Declarație ≠ dovada absenței intermedierii. Folosește numai etichete susținute de procese reale. În MVP: proprietar/coproprietar declarat și revizuire pentru publicare, fără certificarea titlului. Nu colecta acte KYC sau de proprietate și nu inventa o verificare manuală a acestora. Compară procesele înainte de a introduce documente sensibile.

## 4. Declarații obligatorii

Publicarea cere declarația relației cu proprietatea, corectitudinii informațiilor, dreptului de folosire a fotografiilor și absenței intermedierii. Contactarea cere interes final real, absența colectării pentru agenții, angajamentul de a nu transfera datele către intermediari fără acord explicit prealabil, de a nu republica materialele fără permisiune și acceptarea procedurii de moderare. Fără căsuțe prebifate. Păstrează contul, versiunea și momentul. Fără amenzi automate ori consecințe penale inventate.

## 5. Contact protejat

Navigarea poate fi publică. Contactarea cere cont și telefon confirmat real. Mesageria este canalul principal. Telefonul/adresa exactă sunt excluse din HTML, API și metadate publice. Dezvăluirea este individuală, acceptată explicit de proprietar și autorizată pe server. Include profil minimal, scop declarat, limite mai stricte pentru conturi noi, blocare, raportare, pauza solicitărilor și disponibilitate. Vizionările, dacă sunt implementate, cer acceptare explicită. Nu colecta informații financiare sensibile pentru o conversație. Explică imposibilitatea retragerii unui număr deja divulgat.

## 6. Moderare corectă

Semnalele prioritizează analiza, nu stabilesc automat vinovăția. Include raport cu context, coadă, restricții temporare proporționale, decizie motivată, contestare și audit. Fără liste publice de suspecți. Numărul de raportări nu produce singur sancțiuni definitive. Moderatorii primesc acces numai la probele necesare cazului.

## 7. Anunțuri

Vânzare/închiriere pentru apartamente/garsoniere, case, terenuri și spații comerciale. Preț, monedă, suprafețe definite, costuri declarate, disponibilitate și localizare aproximativă. Pentru chirie separă chiria, garanția și costurile. Ciornă, previzualizare, editare, închidere, reconfirmare la 30 zile. Serverul elimină accesul public după expirare chiar fără cron. Modificările materiale necesită revizuire nouă.

## 8. Interfață

Premium, luminoasă, adaptată telefonului, lizibilă și accesibilă. Fotografii mari, informații comparabile, filtre clare și stări complete. Fără statistici, testimoniale sau disponibilitate inventate. Datele demonstrative sunt marcate distinct. Mesaj: „Tu alegi locuința. Tu vorbești cu proprietarul.”

## 9. Model comercial

Anunț de bază gratuit și eventual promovare marcată. Nu vinde contacte, abonamente agențiilor, ocolirea verificărilor sau insigne de încredere. Blocarea, raportarea și protecția datelor nu depind de plată. Nu activa încasări și nu simula tranzacții reușite.

## 10. MVP tehnic

Vinext/Workers și D1; SIWC pentru conturi reale. Twilio Verify pregătit dar neconectat până la secrete și verificare reală. Ciorne permise fără telefon; publicarea și contactele noi sunt refuzate de server dacă telefonul nu este confirmat. Publicarea cere și moderare umană.

Date: users, listings, favorites, contact_requests, messages, blocks, declarations, reports, appeals, audit_events, phone_challenges, rate_limits. Autorizare pe fiecare operațiune, limite atomice și proiecții publice explicite. Fotografii JPEG în D1, max. 5 imagini × 400.000 caractere data URL fiecare în pilot, corp JSON max. 2.100.000 octeți; decodare/recodificare JPEG pe server cu max. 1.200 px/dimensiune; pregătește migrarea la object storage. Fără acte KYC. Nu confunda configurarea pregătită cu integrarea activă.

## 11. Livrabile și succes

Livrează definiția/politica, tabelul amenințărilor, fluxurile, schema, MVP executabil, criteriile de acceptare, instrucțiunile și ipotezele de operare. Verifică sursele existente înainte de reutilizare. Păstrează Nespus. Nu inventa teste trecute. Testează izolarea între conturi, telefonul ascuns, acceptarea individuală, blocarea, moderarea, expirarea și concurența limitelor. Documentează testele care cer servicii reale și rămân neexecutate.

Măsoară anunțuri valide, contacte relevante, incidente confirmate, erori de moderare, timp și cost operațional. Nu optimiza exclusiv pentru volum. Scopul este intermedierea ascunsă dificilă, detectabilă și gestionată corect.
