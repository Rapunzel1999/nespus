# Ora vizionării fără ajustare tacită — 2 noiembrie 2026

Pornire: v25 privată / PR #31, arbore curat. Site și ultimul PR recitite; sursa deschisă prin helperul Sites. Ramură succesivă `imobiliare-cluj-etapa-10-viewing-time`, fără main.

## Defect și corecție

Formularul folosește intenționat ora dispozitivului și previzualizează conversia Europe/Bucharest. `new Date(datetimeLocal)` normaliza însă o oră inexistentă în timpul saltului de primăvară: București, 28 martie 2027, 03:30 devenea 04:30. Propunerea putea fi trimisă cu altă oră decât cea introdusă.

`public/app.js`: se verifică întoarcerea timestamp-ului la aceeași valoare locală înainte de previzualizare și trimitere. O oră inexistentă rămâne în câmp, cu mesaj explicit și validare nativă; nu se face cerere. Corectarea câmpului elimină eroarea. Limitele o oră–30 zile, interpretarea în fusul dispozitivului, contractul API și stocarea timestamp-ului sunt păstrate.

`tests/forms.test.mjs`: regresie cu ceas controlat, salturile Europe/Bucharest și America/New_York; verifică zero cereri pentru ora inexistentă, păstrarea textului și timestamp exact după corectare. TZ procesului este restaurat, ceasul este schimbat numai în contextul VM.

`tests/e2e/flows.spec.mjs`: context New York în fiecare motor; o propunere reală pe D1 local trebuie să păstreze instantul exact și previzualizarea Cluj. Ulterior se schimbă numai ceasul browserului pentru saltul DST; nicio dată simulată nu se trimite la D1. Mesaj, blocarea trimiterii și eliminarea erorii după corectare sunt verificate. Datele/conturile sunt exclusiv DEMO local/CI.

## Comenzi și rezultate locale

- `node --test --test-name-pattern='viewing proposal rejects nonexistent' tests/forms.test.mjs`: înainte 0/1, o cerere nepermisă în loc de zero.
- `node --test --test-name-pattern='viewing proposal' tests/forms.test.mjs`: după 2/2.
- `pnpm test`: 138/138.
- `pnpm run typecheck`, `pnpm build`: exit 0.
- `pnpm run test:production-isolation`: exit 0; 55 fișiere scanate, test-login 404, cookie DEMO ignorat și telefon simulat oprit, inclusiv cu flaguri de test.
- `git diff --check`: exit 0.

## Browser, capturi și limite

`sites-preview start /workspace/scratch/0d549cc238f2/intre-noi` nu a pornit: Vinext raportează un alt server pe 4173, PID 14, director /site. Nu a fost oprit acel proces și nu s-a improvizat altă infrastructură. QA Chromium/WebKit cu D1 local este delegată mecanismului CI existent; comanda `pnpm run test:e2e`, rezultatele și artefactul sunt în PR după execuție.

Referința vizuală anterioară este artefactul [v25](https://github.com/Rapunzel1999/nespus/actions/runs/41417745929/artifacts/13129280129). Scenariul nou produce `viewing-time/foreign-zone.png`, `nonexistent-time.png` și `corrected-time.png` pentru fiecare motor. Acestea sunt stări ale sursei corectate, nu capturi ale defectului înainte. Matricea standard și axe rămân active. Defectul anterior este demonstrat de testul DOM eșuat.

Observația despre „Sari la conținut” într-o captură WebKit full-page nu a fost confirmată în viewport; nu se schimbă CSS pe această ipoteză. Nu se declară remediată.

Nu s-au verificat iPhone/Android fizic, VoiceOver, UI autentificat găzduit, două conturi SIWC găzduite, SMS real sau import uman ICS. La ora repetată de toamnă rămâne alegerea standard Date a primei apariții; nu se adaugă aici un selector între cele două apariții. L2, juridic și operare rămân deschise. Fără migrări, date găzduite, secrete, costuri, autentificare sau audiență schimbate. SMS oprit/cap zero. Proveniența și livrarea privată se consemnează în PR.
