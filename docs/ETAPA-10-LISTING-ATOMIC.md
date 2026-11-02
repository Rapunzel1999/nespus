# Editarea anunțului și declarația — 2 noiembrie 2026

Pornire verificată: versiunea 28 privată / PR #34, checkout curat. README, VERIFICATION, ETAPA-10-LIVRABILE și DECISIONS-PENDING recitite. Ramură succesivă `imobiliare-cluj-etapa-10-listing-atomic`, fără main GitHub.

## Defect și schimbări pe fișiere

- `lib/api.mjs`: editarea anunțului și acceptarea declarației sunt în același `db.batch`. Declarația se inserează numai dacă UPDATE a modificat anunțul. La eroarea declarației, toate câmpurile anunțului, inclusiv starea și motivul moderării, revin la valorile anterioare. Un conflict de stare nu produce declarație falsă. Crearea anunțului avea deja scrieri grupate și nu este modificată.
- `tests/security.test.mjs`: două regresii noi. Un trigger TEMP SQLite produce eșecul declarației; se compară întregul rând înainte/după 503, apoi se verifică reîncercarea explicită și o singură declarație cu utilizator, versiune și dată. Un hook schimbă starea înainte de UPDATE și verifică 409, conținut neschimbat și zero declarații.
- `tests/e2e/server.spec.mjs`: fluxul Worker/D1 local editează înainte de verificarea telefonului, păstrează refuzul publicării fără verificare, refuză editarea după submit și verifică prețul final după moderare.
- Acest raport, `docs/VERIFICATION.md` și `CHANGELOG.md` consemnează dovezile. Nicio schimbare de interfață, schemă, declarație juridică sau autentificare.

## Comenzi și rezultate măsurate

| Comandă | Rezultat |
| --- | --- |
| `node --test --test-name-pattern='listing edit' tests/security.test.mjs` înainte de corecție | 2 trecute, 1 eșuat: răspuns 503, dar întregul anunț fusese modificat și motivul respingerii șters |
| `node --test --test-name-pattern='listing edit\|actual listing creation' tests/security.test.mjs` după | 4/4 trecute |
| `pnpm test` | 144/144 trecute |
| `pnpm run typecheck` | exit 0 |
| `pnpm build` | exit 0 |
| `pnpm run test:production-isolation` | exit 0; 55 fișiere, login test 404, cookie DEMO ignorat, telefon simulat indisponibil chiar cu flaguri test |
| `pnpm exec playwright test server.spec.mjs --project=chromium` | 1/1 trecut în 3,6 s; HTTP/Worker/D1 local, fără browser |
| `git diff --check` | exit 0 |

Nu se slăbește nicio aserțiune și nu se adaugă retry automat. Reîncercarea din regresie este o nouă cerere explicită după eliminarea erorii injectate.

## Capturi, CI și limite

Referința vizuală înainte: [artefact v28](https://github.com/Rapunzel1999/nespus/actions/runs/41442732851/artifacts/13140749265). Interfața este neschimbată; nu se revendică un redesign. CI complet, capturile după la 375/768/1280 px, axe, Lighthouse și proveniența livrării se consemnează în PR după execuție.

Rollback-ul este demonstrat în SQLite în memorie, nu prin erori injectate în baza găzduită. Fluxul D1 verifică succesul și refuzurile normale; hook-ul nu este o probă de concurență distribuită găzduită. Nu sunt verificate browserul autentificat găzduit, două conturi SIWC găzduite, iPhone/Android fizic, VoiceOver, SMS real sau import uman ICS.

Pilotul rămâne exclusiv proprietarului. SMS oprit/plafon zero. Fără main, servicii facturate, seed găzduit, migrări sau secrete în GitHub. L2 și condițiile juridice/operaționale rămân în DECISIONS-PENDING; timeout-ul istoric al izolării nu este declarat rezolvat. Modificarea nu introduce control nou de revizie pentru editările simultane ale unui anunț; domeniul ei este atomicitatea anunț–declarație.
