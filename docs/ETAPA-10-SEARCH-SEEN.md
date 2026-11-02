# Rezultate păstrate la eroarea marcajului de citire — 2 noiembrie 2026

Pornire v31 privată / PR #37, sursă curată și documentele de reluare recitite. Ramură succesivă `imobiliare-cluj-etapa-10-search-seen`, fără main.

## Defect și fișiere

- `public/app.js`: rezultatele și marcajul de citire al căutării salvate împărțeau același catch. Dacă POST seen eșua după încărcarea rezultatelor, cardurile erau înlocuite cu eroarea falsă „Căutarea nu s-a putut încărca”. Marcajul are acum tratare separată: rezultatele rămân utilizabile, iar un mesaj role=status explică faptul că numărul de anunțuri noi poate rămâne neschimbat în cont. Un răspuns întârziat nu afectează alt ecran. Fără retry automat sau modificarea numărătorii în client.
- `tests/saved-search-ui.test.mjs`: regresia păstrării cardurilor, lipsa erorii false, aria-busy finalizat și răspuns întârziat după navigare.
- `tests/e2e/flows.spec.mjs`: scenariu nou pentru Chromium/WebKit, D1 local și eroare 503 simulată numai pentru seen. Verifică două carduri, o singură cerere, navigare în anunț, captură mobilă și axe.
- Acest raport, VERIFICATION și CHANGELOG documentează schimbarea. Fără schemă/API/auth modificate.

## Comenzi

- `node --test tests/saved-search-ui.test.mjs`: înainte 1 trecut/1 eșuat (cardul dispărea), după 2/2.
- `pnpm test`: 150/150.
- `pnpm run typecheck`, `pnpm build`, `pnpm run test:production-isolation`, `git diff --check`: exit 0. Izolare: 55 fișiere, test-login 404, cookie DEMO ignorat, telefon simulat oprit.

CI, capturile după și rezultatele axe exacte sunt în PR după execuție. Referința înainte: [v31](https://github.com/Rapunzel1999/nespus/actions/runs/41472028020/artifacts/13156171780). Acea referință nu conține cazul de eroare; comportamentul anterior este demonstrat de regresia DOM, nu de o captură inventată.

## Limite

Fără probă UI autentificată găzduită, două conturi SIWC găzduite, iPhone/Android fizic, VoiceOver, SMS real sau import uman ICS. Eroarea este simulată local/CI. Dacă seen nu se salvează, numărul din cont rămâne conservator; nu se pretinde sincronizare reușită. L2, juridic, operare și timeout-ul istoric rămân deschise.

Pilot owner-only, SMS off/cap zero. Fără main, secrete, servicii plătite, migrări sau seed în baza găzduită.
