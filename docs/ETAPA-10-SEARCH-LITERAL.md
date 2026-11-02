# Căutare literală — 2 noiembrie 2026

Pornire: versiunea privată 17, PR #23, checkout curat. `get_site` confirmă acces custom, un singur owner. Nicio lucrare concurentă identificată în ultimele PR-uri.

## Problemă și corecție

În `lib/search.mjs`, textul căutării era concatenat într-un parametru LIKE. Parametrizarea prevenea injecția SQL, dar caracterele `%` și `_` aveau sens de wildcard. Testul API a demonstrat că `%` returna toate cele patru anunțuri de test în locul celui care conținea caracterul.

Acum modelul de căutare escapează `%`, `_` și caracterul de escape `\`, cu clauza SQL ESCAPE explicită. Parametrii rămân legați prin bind. Textul original rămâne în filters.q pentru căutările salvate. Căutarea obișnuită după un fragment de text și toate filtrele de eligibilitate rămân neschimbate. Nu este prezentată drept remediere a unei injecții SQL.

Fișiere: `lib/search.mjs`, `tests/security.test.mjs`, CHANGELOG și acest raport. Testul API/SQLite verifică caractere izolate, combinații, lipsa rezultatelor, text obișnuit și păstrarea filtrelor salvate. Datele sunt exclusiv locale.

## Comenzi efectiv rulate

- `node --test --test-name-pattern='search treats' tests/security.test.mjs`: înainte 0 trecute / 1 eșuat; după corecție 1/1 trecut.
- `pnpm test`: 128/128 trecute; reluat cu verificarea suplimentară a filtrelor salvate, tot 128/128.
- `pnpm run typecheck`, `pnpm build`, `pnpm run test:production-isolation`, `git diff --check`: exit 0. Izolare: 55 fișiere, login de test 404, cookie DEMO ignorat și telefon simulat oprit inclusiv cu flaguri.
- CI pe sursa finală și proveniența livrării vor fi consemnate în PR, după executare. Nu sunt declarate anticipat trecute.

## Capturi și limite

Nu se modifică HTML, CSS sau codul UI. Referința vizuală înainte este [artefactul versiunii 17](https://github.com/Rapunzel1999/nespus/actions/runs/41362390939/artifacts/13105243409). CI păstrează matricea existentă de capturi/axe pentru compararea sursei finale; comportamentul corectat este demonstrat prin aserțiuni pe rezultatele API, nu printr-o captură decorativă.

Nu s-au verificat UI găzduit autentificat, două conturi SIWC găzduite, iPhone/Android fizic, VoiceOver/NVDA, SMS real ori importuri umane ICS. Fără migrare, seed, ștergere găzduită, schimbare de autentificare/audiență sau serviciu plătit. SMS rămâne oprit; pilot privat. Variantele foto L2 și condițiile de lansare rămân deschise; timeout-ul istoric Wrangler nu este declarat rezolvat. Nicio modificare sau îmbinare în main.
