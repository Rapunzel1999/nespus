# Între Noi — pilot imobiliar Cluj-Napoca

Platformă în dezvoltare pentru vânzare și închiriere directă între proprietari și destinatarii finali. **Pilotul acceptă numai proprietăți din municipiul Cluj-Napoca.** Florești, Baciu, Apahida și celelalte localități nu intră în această etapă.

Baza acestei direcții este organizată pe branch-ul `imobiliare-cluj` din [Rapunzel1999/nespus](https://github.com/Rapunzel1999/nespus). Proiectul Nespus de pe `main` este păstrat. „Între Noi” este un nume de lucru; disponibilitatea sa comercială și a domeniului nu este verificată.

Etapa curentă este pe branch-ul `imobiliare-conversations-quality`, peste `imobiliare-favorites-comparison`. Modificările rămân în pull request-uri draft, iar versiunea Sites este publicată cu acces numai pentru proprietar.

## Stadiu și limite

MVP-ul este un pilot tehnic, fără plăți. Conturile folosesc Sign in with ChatGPT (SIWC), nu un sistem de identitate propriu. Identitatea de cont nu dovedește identitatea civilă, relația cu proprietatea sau absența intermedierii.

Integrarea telefonului este proiectată pentru Twilio Verify. **Până la configurarea și verificarea reală a furnizorului, telefonul rămâne neconfirmat, iar publicarea și inițierea contactelor trebuie refuzate de server.** Ciornele pot fi create. Declararea relației cu proprietatea nu produce insigna „proprietar verificat”. Publicarea necesită și moderare umană.

Accesul inițial al proiectului Sites este privat proprietarului. Publicarea codului în GitHub nu face aplicația publică și nu configurează GitHub Pages. Deschiderea pilotului necesită verificări și configurare operațională suplimentare.

## Pornire locală

Node.js 24 necesar și pnpm conform câmpului `packageManager` din `package.json`, când acesta este definit. Instalarea necesită acces la registrul de pachete.

```sh
git clone --branch imobiliare-conversations-quality https://github.com/Rapunzel1999/nespus.git
cd nespus
pnpm install --frozen-lockfile
pnpm test
pnpm run typecheck
pnpm build
pnpm db:migrate
pnpm start
```

`pnpm db:migrate` aplică migrările locale; datele din `.wrangler/state` sunt separate de baza găzduită. Nu adăuga această stare sau secretele în Git. Pentru dezvoltare folosește `pnpm dev`. Găzduirea prin Sites urmează fluxul de build și publicare al integrării, separat de pornirea locală.

Verificare la **27 octombrie 2026**: **93/93 teste locale**, TypeScript, sintaxă JavaScript și build de producție trecute. Testele SMS folosesc răspunsuri simulate. În găzduire lipsesc cele trei credențiale Twilio; trimiterea este oprită explicit și plafonul total este zero. Accesul găsit public a fost corectat la **numai proprietarul**. Nu sunt confirmate livrare SMS reală, două conturi SIWC găzduite sau testarea pe iPhone fizic. Detalii în [VERIFICATION.md](docs/VERIFICATION.md) și [configurarea Twilio](docs/TWILIO_VERIFY.md).

## Experiența implementată

- Căutare pe cartier, tranzacție, monedă și buget, cu paginare și linkuri care păstrează filtrele.
- Prezentare detaliată a proprietății, galerie, costuri declarate și comparație pentru 2–3 favorite din aceeași categorie de tranzacție.
- Editor cu ciorne, ordonarea fotografiilor și recuperarea modificărilor în aceeași filă; spațiu separat pentru proprietar.
- Conversații cu stări explicite, căutare în lista încărcată, paginare, texte netrimise păstrate în filă și vizionări afișate în ora Clujului. Reîmprospătare manuală; nu există notificări automate sau indicatori de citire.
- Fotografii încărcate individual prin rute care verifică accesul. Răspunsurile de căutare nu mai transportă imaginile base64. Editorul autorizat primește în continuare imaginile complete.
- Formulare protejate împotriva trimiterilor simultane, feedback de eroare, focus pentru navigarea cu tastatura și adaptări pentru mișcare redusă. Aceste schimbări nu certifică accesibilitatea completă sau ergonomia pe dispozitive reale.

## Configurare

- Worker Vinext și bază Cloudflare D1 cu binding `DB`.
- SIWC gestionat de infrastructura Sites; identitatea se citește numai pe server din contextul de încredere al găzduirii.
- Twilio Verify: configurează `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` și `TWILIO_VERIFY_SERVICE_SID`, numai în mediul de rulare. Activarea mai cere `TWILIO_VERIFY_ENABLED=true` și `TWILIO_VERIFY_TOTAL_SEND_LIMIT` autorizat (1–100 cereri cumulative). Implicit `false`/`0`; credențialele singure nu permit trimiterea. Nu introduce tokenuri în cod sau în browser. Vezi [runbook-ul SMS](docs/TWILIO_VERIFY.md).
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
