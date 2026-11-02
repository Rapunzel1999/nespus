# Validarea căutărilor salvate — 2 noiembrie 2026

Pornire: versiunea privată 21, PR #27, checkout curat, CI 41381489079 verde. Fără AGENTS.md în repository.

## Problemă și corecție

POST /api/saved-searches convertea direct `data.filters` cu URLSearchParams. O listă de perechi incompletă producea o excepție și HTTP 503; șirurile și listele puteau fi convertite implicit. API-ul cere acum un obiect JSON cu valori text sau numere finite, apoi aplică validarea existentă a filtrelor. Structurile invalide primesc HTTP 400 înainte de inserarea unei căutări. Cota existentă se consumă în continuare la încercare; nu se promite absența tuturor scrierilor de rate limiting.

Fișiere: `lib/api.mjs`, `tests/security.test.mjs`, acest raport, CHANGELOG și VERIFICATION. Fără schimbare de schemă, UI, autentificare sau căutări deja salvate. Filtrele valide și deduplicarea normalizată rămân compatibile.

## Comenzi și rezultate

- `node --test --test-name-pattern='saved search rejects malformed|saved search accepts scalar' tests/security.test.mjs` înainte: 1 trecut / 1 eșuat, HTTP **503 != 400** pentru lista incompletă.
- Aceeași comandă după: **2/2**. Cazuri: pereche incompletă, șir de query, valoare array, obiect cu toString null; niciun rând salvat. Filtrele valide cu număr 100 și text '100' recunosc aceeași căutare, inclusiv textul Mărăști.
- `pnpm test`: **132/132**.
- `pnpm run typecheck`, `pnpm build`, `pnpm run test:production-isolation`, `git diff --check`: exit 0. Izolare: 55 fișiere, login test 404, cookie DEMO ignorat, telefon simulat oprit.
- CI, artefactele și livrarea sursei finale sunt consemnate în PR după execuție.

## Limite

UI neschimbat. Referință vizuală înainte: [artefact v21](https://github.com/Rapunzel1999/nespus/actions/runs/41381489079/artifacts/13113003685); CI produce matricea standard după. Nu există capturi ale unui nou comportament vizual.

Nu s-au verificat browser autentificat găzduit, două conturi SIWC, iPhone/Android fizic, VoiceOver/NVDA, SMS real sau import uman ICS. Nu s-au scris date/seed/migrări în baza găzduită și nu s-au schimbat main, audiența, costurile sau plafonul SMS zero. L2 și condițiile juridice/operaționale rămân deschise; timeout-ul istoric nu este declarat rezolvat.
