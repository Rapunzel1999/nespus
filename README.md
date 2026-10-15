# Nespus

Experiențe digitale personalizate de iubire, scuze, mulțumiri și felicitări, prin link sau cod QR. MVP 0.1, 15 octombrie 2026.

## Funcționalități

- Interfață mobilă premium continuată din **Emoție v2**, cu atmosferele Scrisoare, Grădină și Miez de noapte.
- Nume, scrisoare, amintire, fotografie, P.S. ascuns și trei plicuri „Deschide când…”.
- Previzualizare locală, sunet ambiental opțional, mișcare redusă și ciornă salvată explicit pe dispozitiv, fără fotografie.
- Salvare reală în D1, link aleator individual și QR SVG generat pe server, fără servicii QR externe.
- Durată beta 1/3/7 zile, verificată pe server; listare și ștergere din browserul creatorului.

**Fără checkout, tranzacții simulate, încasări, conturi active sau trimiteri automate.** Prețurile 19/49/99 lei și duratele comerciale sunt propuneri. În beta toate opțiunile creative sunt gratuite, maximum 7 zile. Schema pregătește conturi și comenzi, dar numai tabelul `gifts` este utilizat acum.

## Pornire locală

Node.js **24** (testele folosesc `node:sqlite`), pnpm **11.25.0**, acces la registrul de pachete. Dacă lipsește pnpm: `npm install -g pnpm@11.25.0`.

```sh
git clone https://github.com/Rapunzel1999/nespus.git
cd nespus
pnpm install --frozen-lockfile
pnpm test
pnpm run typecheck
pnpm build
```

După primul build, aplică migrarea inițială bazei locale **o singură dată**:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_glamorous_giant_man.sql
pnpm start
```

Deschide adresa afișată de Wrangler. `/` redirecționează către `/atelier`. Păstrează aceeași origine pentru editor și API. `pnpm dev` oferă modul de dezvoltare. Datele locale din `.wrangler/state` sunt separate de datele găzduite și nu intră în Git. Pentru schimbări de schemă: `pnpm db:generate`, inspectează SQL-ul și aplică numai migrările noi, în ordine. Nu rescrie migrările aplicate.

## Cod

| Cale | Rol |
| --- | --- |
| `lib/document.html`, `public/emotion.js`, `public/atelier.css` | Design și componentă recuperate și adaptate |
| `public/app.js`, `public/app.css` | Persistență, ciorne, linkuri, QR, destinatar |
| `lib/api.mjs`, `lib/model.mjs` | API, validare, proprietate și expirare |
| `app/atelier`, `app/g`, `app/api` | Adaptoare Vinext / Cloudflare Workers |
| `db/schema.ts`, `drizzle` | Schema și migrările D1 |
| `tests`, `docs` | Verificări și documentație |
| `.openai/hosting.json`, `build`, `scripts` | Găzduire și build |

## Găzduire

Build-ul produce un Cloudflare Worker și asseturile client. Binding-ul D1 este `DB`. Publicarea prin Sites păstrează sursa și aplică migrările. Configurația conține deja identitatea proiectului: reutilizeaz-o pentru actualizări. Pentru găzduire separată, creează propria configurație Cloudflare și propria bază, aplică migrările și păstrează binding-ul `DB`.

Instanța creată acum începe cu **acces privat proprietarului**. Linkurile nu ocolesc această restricție. Destinatarii externi necesită trecerea explicită la acces public sau găzduire publică separată. Publicarea codului în GitHub nu activează GitHub Pages; Pages nu poate executa acest backend.

Nu sunt necesare chei de plată, e-mail sau AI. Nu adăuga secrete în Git. Consultă [arhitectura](docs/ARCHITECTURE.md), [verificările](docs/VERIFICATION.md) și [pregătirea lansării](docs/LAUNCH.md).
