# Între Noi — pilot imobiliar Cluj-Napoca

Platformă în dezvoltare pentru vânzare și închiriere directă între proprietari și destinatarii finali. **Pilotul acceptă numai proprietăți din municipiul Cluj-Napoca.** Florești, Baciu, Apahida și celelalte localități nu intră în această etapă.

Codul acestei direcții este organizat pe branch-ul `imobiliare-cluj` din [Rapunzel1999/nespus](https://github.com/Rapunzel1999/nespus). Proiectul Nespus de pe `main` este păstrat. „Între Noi” este un nume de lucru; disponibilitatea sa comercială și a domeniului nu este verificată.

## Stadiu și limite

MVP-ul este un pilot tehnic, fără plăți. Conturile folosesc Sign in with ChatGPT (SIWC), nu un sistem de identitate propriu. Identitatea de cont nu dovedește identitatea civilă, relația cu proprietatea sau absența intermedierii.

Integrarea telefonului este proiectată pentru Twilio Verify. **Până la configurarea și verificarea reală a furnizorului, telefonul rămâne neconfirmat, iar publicarea și inițierea contactelor trebuie refuzate de server.** Ciornele pot fi create. Declararea relației cu proprietatea nu produce insigna „proprietar verificat”. Publicarea necesită și moderare umană.

Accesul inițial al proiectului Sites este privat proprietarului. Publicarea codului în GitHub nu face aplicația publică și nu configurează GitHub Pages. Deschiderea pilotului necesită verificări și configurare operațională suplimentare.

## Pornire locală

Node.js 24 necesar și pnpm conform câmpului `packageManager` din `package.json`, când acesta este definit. Instalarea necesită acces la registrul de pachete.

```sh
git clone --branch imobiliare-cluj https://github.com/Rapunzel1999/nespus.git
cd nespus
pnpm install --frozen-lockfile
pnpm test
pnpm run typecheck
pnpm build
pnpm db:migrate
pnpm start
```

`pnpm db:migrate` aplică migrările locale; datele din `.wrangler/state` sunt separate de baza găzduită. Nu adăuga această stare sau secretele în Git. Pentru dezvoltare folosește `pnpm dev`. Găzduirea prin Sites urmează fluxul de build și publicare al integrării, separat de pornirea locală.

Verificări raportate de coordonator: 35 teste SQLite de securitate trecute după corecții, cu regresii suplimentare în lucru și număr final de confirmat, TypeScript și sintaxă JavaScript fără erori, un build de producție reușit și migrarea locală inițială aplicată. A doua rulare a migrării nu a găsit migrări în așteptare. Build-ul sursei finale urmează să fie confirmat. Detalii și limite în [VERIFICATION.md](docs/VERIFICATION.md). Nu este confirmat aici niciun rezultat GitHub CI sau publicare finală.

## Configurare

- Worker Vinext și bază Cloudflare D1 cu binding `DB`.
- SIWC gestionat de infrastructura Sites; identitatea se citește numai pe server din contextul de încredere al găzduirii.
- Twilio Verify: configurează `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` și `TWILIO_VERIFY_SERVICE_SID`, numai în mediul de rulare. Nu introduce tokenuri în cod sau în browser.
- Acces moderator: `MODERATOR_EMAILS`, allowlist de e-mailuri furnizate de gateway-ul de încredere, verificată pe server; niciun utilizator nu poate alege acest rol din formular sau dintr-un parametru client.
- Fotografiile pilotului sunt JPEG stocate în D1, maximum 5 imagini, fiecare de cel mult 400.000 de caractere pentru întregul data URL base64 (aproximativ 300 KB de date binare). Corpul cererii este limitat la 2.100.000 de octeți. Serverul decodează și recodifică pixelii, eliminând metadatele, cu limite de 2 MP, 32 MB pentru decodare și 1.200 px pe fiecare dimensiune. Aceasta este o limită temporară; migrarea la object storage este necesară înainte de creșterea volumului.
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
