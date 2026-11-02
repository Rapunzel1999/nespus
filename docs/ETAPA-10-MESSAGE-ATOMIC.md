# Mesajul și activitatea conversației se salvează împreună — 2 noiembrie 2026

Pornire: v26 privată / PR #32, CI 41423741066 verde, checkout curat. README, VERIFICATION, jurnalul Etapei 10 și deciziile deschise recitite. Sursa deschisă cu helperul Sites; ramură succesivă `imobiliare-cluj-etapa-10-message-atomic`, fără main.

## Defect reprodus

Inserarea mesajului și actualizarea `contact_requests.updated_at` erau două operații independente. Un eșec al celei de-a doua întorcea 503 după ce mesajul era deja salvat. Reîncercarea cu același requestId era considerată replay și nu repara ordinea inboxului. Mesajul exista deși expeditorul primise eroare, iar conversația putea rămâne la vechea poziție.

Un trigger SQLite TEMP, exclusiv în fixture-ul în memorie, a provocat eroarea la actualizarea activității. Testul a eșuat înainte de corecție: un mesaj rămas în loc de zero. Nu s-a simulat o eroare pe baza găzduită.

## Schimbări pe fișiere

- `lib/api.mjs`: mesajul și actualizarea activității sunt în același `db.batch`. `changes()>0` permite actualizarea numai după inserare; `MAX` păstrează timpul mai nou. Duplicatele și refuzul la inserare nu mută conversația. Cota se consumă înainte de batch și nu se rambursează automat la eroare.
- `tests/security.test.mjs`: rollback la eroare, reîncercare cu același ID, replay fără duplicare sau consum suplimentar, refuz după blocare fără actualizarea inboxului. Regresia existentă de ordine inversă păstrează toate aserțiunile; intercalarea are loc înaintea tranzacției, deoarece operațiile unui batch nu se pot intercala. Nu se simulează tranzacții SQLite imbricate.
- `tests/e2e/server.spec.mjs`: D1 local verifică egalitatea dintre ora mesajului și activitatea conversației, apoi replay fără duplicare sau modificarea activității.
- Acest raport, `docs/VERIFICATION.md` și `CHANGELOG.md`: evidențe și limite.

## Comenzi executate local

- `node --test --test-name-pattern='message and inbox activity roll back' tests/security.test.mjs`: înainte 0/1; răspuns 503, dar mesajul rămânea salvat.
- `node --test --test-name-pattern='message|simultaneous duplicate' tests/security.test.mjs`: după 9/9.
- `pnpm test`: 140/140, zero omise.
- `pnpm run typecheck`, `pnpm build`, `pnpm run test:production-isolation`, `git diff --check`: exit 0. Izolare: 55 fișiere scanate, test-login 404, cookie DEMO ignorat, telefon simulat oprit, inclusiv cu flaguri de test.

## Browser și capturi

Nu se modifică HTML, CSS sau JavaScript de interfață. Nu se revendică diferențe vizuale înainte/după. Referința anterioară: [artefact v26](https://github.com/Rapunzel1999/nespus/actions/runs/41423741066/artifacts/13131771119). Matricea existentă Chromium/WebKit, capturile și axe se rulează prin CI pe noua sursă; comanda `pnpm run test:e2e`, rezultatele și artefactul exact sunt consemnate în PR. Browserul local gestionat a fost indisponibil la ultima probă (server Vinext existent pe 4173); nu s-a ocolit infrastructura.

## Limite și riscuri

Fixture-ul SQLite verifică rollback-ul; scenariul D1 local verifică integrarea și replay-ul. Nu este test de concurență distribuită sau injecție de erori în găzduire. Cota rămasă consumată la o eroare este intenționată. Un răspuns de rețea pierdut după un batch reușit continuă să necesite reîncercarea cu același requestId; contractul idempotent existent este păstrat.

Nicio migrare sau ștergere, seed găzduit, cont/serviciu plătit, SMS/email, secret în GitHub, modificare main, schimbare de autentificare ori audiență. SMS rămâne oprit/cap zero. Nu sunt verificate dispozitive fizice, VoiceOver, UI găzduit autentificat, două conturi SIWC găzduite, SMS real sau import uman ICS. L2, juridic și operare rămân deschise; timeout-ul istoric nu este declarat rezolvat. Livrarea privată și proveniența sunt în PR.
