# Între Noi — pilot imobiliar Cluj-Napoca

Platformă în dezvoltare pentru vânzare și închiriere directă între proprietari și destinatarii finali. **Pilotul acceptă numai proprietăți din municipiul Cluj-Napoca.** Florești, Baciu, Apahida și celelalte localități nu intră în această etapă.

Baza acestei direcții este organizată pe branch-ul `imobiliare-cluj` din [Rapunzel1999/nespus](https://github.com/Rapunzel1999/nespus). Proiectul Nespus de pe `main` este păstrat. „Între Noi” este un nume de lucru; disponibilitatea sa comercială și a domeniului nu este verificată.

Etapa 10 este organizată în PR-uri succesive, începând cu [PR #10](https://github.com/Rapunzel1999/nespus/pull/10), peste PR #9. Ramura de sinteză este `imobiliare-cluj-etapa-10-l9`. Codul nou și dovezile sunt în GitHub. Etapa 10 este livrată începând cu **versiunea 13**, privată proprietarului, la [Între noi](https://imobiliare-cluj-direct.verdant11.chatgpt.site). Accesul temporar Sites a fost reînnoit după autorizarea continuării; accesul privat a fost reverificat după livrare. Niciun PR nu este îmbinat în `main`.

## Stadiu și limite

MVP-ul este un pilot tehnic, fără plăți. Conturile folosesc Sign in with ChatGPT (SIWC), nu un sistem de identitate propriu. Identitatea de cont nu dovedește identitatea civilă, relația cu proprietatea sau absența intermedierii.

Integrarea telefonului este proiectată pentru Twilio Verify. **Până la configurarea și verificarea reală a furnizorului, telefonul rămâne neconfirmat, iar publicarea și inițierea contactelor trebuie refuzate de server.** Ciornele pot fi create. Declararea relației cu proprietatea nu produce insigna „proprietar verificat”. Publicarea necesită și moderare umană.

Accesul inițial al proiectului Sites este privat proprietarului. Publicarea codului în GitHub nu face aplicația publică și nu configurează GitHub Pages. Deschiderea pilotului necesită verificări și configurare operațională suplimentare.

## Pornire locală

Node.js 24 necesar și pnpm conform câmpului `packageManager` din `package.json`, când acesta este definit. Instalarea necesită acces la registrul de pachete.

```sh
git clone --branch imobiliare-cluj-etapa-10-l9 https://github.com/Rapunzel1999/nespus.git
cd nespus
pnpm install --frozen-lockfile
pnpm test
pnpm run typecheck
pnpm build
pnpm db:migrate
pnpm start
```

`pnpm db:migrate` aplică migrările locale; datele din `.wrangler/state` sunt separate de baza găzduită. Nu adăuga această stare sau secretele în Git. Pentru dezvoltare folosește `pnpm dev`. Găzduirea prin Sites urmează fluxul de build și publicare al integrării, separat de pornirea locală.

Verificare la **2 noiembrie 2026**: **127/127 teste Node**, TypeScript, build și izolarea producției trecute. Playwright rulează în CI pe Chromium și WebKit cu D1 local și conturi DEMO, nu pe site-ul găzduit. Rezultatele exacte pe livrabil, capturile, axe și Lighthouse sunt în [raportul Etapei 10](docs/ETAPA-10-LIVRABILE.md). SMS rămâne neconfigurat: nu există cont Twilio sau cele trei credențiale. Nu s-au efectuat SMS reale, testare cu două conturi SIWC găzduite, iPhone fizic sau VoiceOver.

## Experiența implementată

- Căutare pe cartier, tranzacție, monedă și buget, filtre într-un panou mobil, sortare preț/m² și căutări salvate cu anunțuri noi la revenire. Fără conversii valutare.
- Prezentare detaliată a proprietății, galerie, costuri declarate și comparație pentru 2–3 favorite din aceeași categorie de tranzacție.
- Editor în opt pași, autosalvare privată în cont, copie de recuperare în filă, control de revizii, ordonarea fotografiilor și previzualizare mobil/desktop.
- Conversații cu stări explicite, căutare în lista încărcată, paginare, texte netrimise păstrate în filă și vizionări afișate în ora Clujului. Indicatori de mesaje necitite, actualizare progresivă numai în fila vizibilă și calendar ICS privat pentru vizionări confirmate. Nu trimite email, SMS, push sau invitații de calendar.
- Panou «Ce știm despre acest anunț», date din declarații și audit, semnale private pentru revizuire umană și jurnal de moderare. Telefonul nu dovedește identitatea sau proprietatea.
- Fotografii încărcate individual prin rute care verifică accesul. Răspunsurile de căutare nu mai transportă imaginile base64. Editorul autorizat primește în continuare imaginile complete.
- Formulare protejate împotriva trimiterilor simultane, feedback de eroare, focus pentru navigarea cu tastatura și adaptări pentru mișcare redusă. Aceste schimbări nu certifică accesibilitatea completă sau ergonomia pe dispozitive reale.

## Configurare

### Etapa 10 · verificare locală reproductibilă

După `pnpm install --frozen-lockfile`, rulează **`pnpm qa`**: teste Node/SQLite, TypeScript, build, verificarea absenței autentificării/SMS de test din build, instalarea browserelor și Playwright (Chromium + WebKit mobil), capturi și axe. Instalarea browserelor necesită acces la CDN-ul oficial Playwright și bibliotecile sistemului (`pnpm exec playwright install --with-deps chromium webkit` pe un runner Linux curat).

Runnerul pornește singur un Worker **exclusiv local**, D1 în `.wrangler/e2e`, pe `127.0.0.1:4180`. Seed-ul conține opt anunțuri DEMO, imagini procedurale și conturi DEMO proprietar/căutător/moderator/neconfirmat. Nu folosește baza găzduită sau Twilio. Worker-ul de test este separat de intrarea de producție și refuză orice host care nu este localhost, orice HTTPS și lipsa ambelor marcaje de test. Nu publica această configurație.

`pnpm exec playwright test server.spec.mjs --project=chromium` verifică API-ul pe D1 local fără browser. Capturile, rapoartele axe, Lighthouse și urmele erorilor sunt în `outputs/e2e/` (ignorate în Git); CI păstrează artefactul `local-d1-browser-evidence` timp de 14 zile. Profilul WebKit mobil **nu reprezintă testare pe iPhone fizic**, iar conturile DEMO nu verifică SIWC găzduit.

Starea măsurătorilor și limitările sunt în [BASELINE-ETAPA-10.md](docs/BASELINE-ETAPA-10.md). Rapoartele fiecărei rulări sunt legate în [ETAPA-10-LIVRABILE.md](docs/ETAPA-10-LIVRABILE.md); rezultatele istorice nu înlocuiesc CI pentru noul commit.

- Worker Vinext și bază Cloudflare D1 cu binding `DB`.
- SIWC gestionat de infrastructura Sites; identitatea se citește numai pe server din contextul de încredere al găzduirii.
- Twilio Verify: configurează `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` și `TWILIO_VERIFY_SERVICE_SID`, numai în mediul de rulare. Activarea mai cere `TWILIO_VERIFY_ENABLED=true` și `TWILIO_VERIFY_TOTAL_SEND_LIMIT` autorizat (1–100 cereri cumulative). Implicit `false`/`0`; credențialele singure nu permit trimiterea. Nu introduce tokenuri în cod sau în browser. Vezi [runbook-ul SMS](docs/TWILIO_VERIFY.md).
- Acces moderator: `MODERATOR_EMAILS`, allowlist de e-mailuri furnizate de gateway-ul de încredere, verificată pe server; niciun utilizator nu poate alege acest rol din formular sau dintr-un parametru client.
- Fotografiile pilotului sunt JPEG stocate în D1, maximum 5 imagini, fiecare de cel mult 400.000 de caractere pentru întregul data URL base64 (aproximativ 300 KB de date binare). JSON-ul cumulat al fotografiilor este limitat la 1.800.000 de caractere ASCII pentru a lăsa loc în rândul D1. Corpul cererii este limitat la 2.100.000 de octeți. Serverul decodează și recodifică pixelii, eliminând metadatele, cu limite de 2 MP, 32 MB pentru decodare și 1.200 px pe fiecare dimensiune. Trei variante WebP și migrarea fotografiilor sunt oprite la decizia de stocare din [DECISIONS-PENDING.md](docs/DECISIONS-PENDING.md); R2 nu este activat.
- Nu se colectează acte de identitate sau titluri de proprietate în acest MVP.

## Documentație

- [Definiție, acces și fluxuri](docs/PRODUCT.md)
- [Referința Bezrealitky și adaptarea locală](docs/REFERENCE.md)
- [Scenarii de infiltrare și moderare](docs/THREAT_MODEL.md)
- [Arhitectură și date](docs/ARCHITECTURE.md)
- [Criterii și evidențe de verificare](docs/VERIFICATION.md)
- [Plan de lansare și ipoteze de cost](docs/LAUNCH.md)
- [Master prompt](docs/MASTER_PROMPT.md)
- [Colaborare și verificare independentă](docs/COLLABORATION.md)

Regulile de acces, declarațiile, retenția și procedurile de moderare sunt propuneri de produs care necesită validare juridică înainte de lansare. Nu sunt o certificare de conformitate.
