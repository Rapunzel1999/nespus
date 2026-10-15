# Sarcină pentru Gemini 4 Argon — verificare independentă

Cu Google AI Pro: deschide https://gemini.google.com/ și selectează Gemini 4 Argon dacă apare în cont. Furnizează fișierele de mai jos ca atașamente sau într-un checkout accesibil. Accesul la un URL GitHub nu garantează că modelul a citit toate fișierele. Nu trimite secrete, date ale utilizatorilor ori documente personale.

## Context și instrucțiuni de copiat

Ești reviewer independent pentru o platformă imobiliară românească, pilot exclusiv în municipiul Cluj-Napoca. Proprietari/coproprietari persoane fizice publică propriile imobile; cumpărătorii și chiriașii caută pentru ei. Intermedierea este interzisă. Nu promitem eliminarea completă a agenților ascunși. Interfața trebuie să fie simplă, profesională, cozy și onestă: «Direct de la proprietar», «Fără comision de agenție», «Persoane fizice, nu agenții».

Sursa proiectului: https://github.com/Rapunzel1999/nespus/tree/imobiliare-cluj — folosește ramura imobiliare-cluj, nu main. Proiectul Nespus este separat și nu trebuie modificat.

Citește docs/PRODUCT.md, docs/THREAT_MODEL.md (dacă există; cere fișierul echivalent în caz contrar), docs/ARCHITECTURE.md, docs/VERIFICATION.md, lib/api.mjs, lib/model.mjs, db/schema.ts, migrarea drizzle/0000_nervous_leader.sql și tests/security.test.mjs. Pentru UX citește public/app.js, public/app.css și lib/document.html.

Priorități pentru review:
1. Încearcă să găsești acces neautorizat între conturi la anunțuri, conversații, rapoarte și date private.
2. Verifică dacă telefonul și adresa exactă pot ajunge în răspunsuri publice sau la un solicitant neacceptat; acceptarea conversației și dezvăluirea telefonului trebuie să fie două acțiuni distincte.
3. Analizează blocarea, expirarea anunțului, suspendarea și schimbarea telefonului după o dezvăluire.
4. Caută ocolirea limitelor prin concurență, ștergere/recreare și cereri directe API.
5. Verifică conflictele moderatorilor, contestațiile și raportările abuzive. Volumul sesizărilor nu dovedește vinovăția.
6. Verifică sinceritatea textelor: telefon confirmat ≠ identitate verificată ≠ proprietar verificat. SMS-ul este neconfigurat; nu trebuie să existe confirmări fictive. Plățile sunt inactive.
7. Evaluează claritatea mobilă și accesibilitatea din cod; dacă nu ai browser, nu pretinde inspecție vizuală.

Livrează maximum 10 constatări prioritizate. Pentru fiecare: severitate, fișier și funcție, scenariu reproductibil, impact, corecție minimă și test care ar demonstra remedierea. Separă erorile confirmate de ipoteze și îmbunătățiri. Nu declara că ai executat teste fără să le rulezi efectiv. Dacă fișierele lipsesc, precizează limita înainte de concluzii. Nu modifica ori publica nimic în primul review.

## Integrarea rezultatelor

Răspunsul se aduce coordonatorului ChatGPT. Constatările se verifică în cod; modificările se fac izolat și se testează. Un răspuns doar propus nu este raportat drept contribuție executată sau audit de securitate finalizat.
