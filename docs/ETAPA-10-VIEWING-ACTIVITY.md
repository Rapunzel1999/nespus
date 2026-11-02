# Vizionări vizibile în recența conversațiilor — 2 noiembrie 2026

Pornire: versiunea 23 privată, PR #29, checkout curat, CI 41392442842 verde. Punctele de reluare și instrucțiunile Sites consultate; fără AGENTS.md în repository.

## Schimbare

Propunerea, acceptarea și refuzul unei vizionări nu actualizau updated_at al conversației. O activitate nouă putea rămâne jos în lista ordonată după recență. Acum operațiunea de vizionare și actualizarea conversației sunt în același db.batch. Actualizarea folosește MAX(updated_at, momentul cererii), numai când operațiunea precedentă a schimbat un rând (changes()>0). Cererile respinse, blocarea concurentă și deciziile repetate nu ridică conversația în listă. Nu se schimbă ora vizionării sau mesajele necitite.

Fișiere: lib/api.mjs; tests/security.test.mjs; tests/e2e/server.spec.mjs; acest raport; CHANGELOG și VERIFICATION. Fără schemă nouă, backfill, UI nou sau notificări externe. Mecanismul batch existent este reutilizat.

## Verificări

- `node --test --test-name-pattern='viewing proposals and decisions|viewing activity preserves' tests/security.test.mjs`: înainte 1 trecut / 1 eșuat (updatedAt 1792087200000 în loc de 1792087201000), după 2/2.
- `node --test --test-name-pattern='viewing proposals and decisions|viewing activity preserves|viewing and activity writes' tests/security.test.mjs`: 3/3 pe sursa finală. Acoperă acceptare/refuz, cont terț, repetare, timestamp mai nou, blocare intercalată și rollback la eșecul actualizării activității. Rollback este verificat cu adaptorul SQLite tranzacțional; nu simulează toate defecțiunile infrastructurii găzduite.
- `pnpm test`: 136/136 final (135/135 înaintea testului rollback suplimentar).
- `pnpm run typecheck`, `pnpm build`, `pnpm run test:production-isolation`, `git diff --check`: exit 0. 55 fișiere scanate; login test 404, cookie DEMO ignorat, telefon simulat oprit.
- Scenariul API/Worker/D1 local din Playwright verifică suplimentar updatedAt după propunere și acceptare; rezultatul CI este consemnat în PR după execuție.

## Capturi și limite

Referință înainte: [artefact v23](https://github.com/Rapunzel1999/nespus/actions/runs/41392442842/artifacts/13118057922). Matricea standard după este produsă de CI. Layout neschimbat; diferența este recența datelor, nu un redesign.

Nu s-au testat UI autentificat găzduit, două conturi SIWC găzduite, iPhone/Android fizic, VoiceOver/NVDA, SMS real sau import uman ICS. Fără seed/scrieri de test/migrări în baza găzduită, fără modificări main, autentificare, audiență sau servicii plătite. SMS oprit, plafon zero. L2, juridic și operare rămân deschise; timeout-ul istoric Wrangler nu este declarat rezolvat. Proveniența și verificarea audienței după livrare sunt în PR.
