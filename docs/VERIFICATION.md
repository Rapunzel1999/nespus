# Verificări — 15 octombrie 2026

- `npm test`: 9 teste API reușite pe SQLite real în memorie, cu migrarea proiectului.
- Creare, citire din cerere nouă, listare limitată la creator, QR SVG și ștergere autorizată.
- Expirare la limita exactă pentru conținut și QR; ignorarea datei și stării de plată din client.
- Câmpuri invalide, limite de text/corp, antet foto invalid, durate comerciale respinse.
- Refuz pentru scrieri cross-origin/fără Origin și JSON malformat.
- Cookie HttpOnly/SameSite, proprietate neexpusă, lipsa bazei tratată ca indisponibilitate.
- Cotă atomică pe proprietar și fereastră de 24 ore.
- Text malițios păstrat ca date JSON; componenta folosește textContent.
- Sintaxă JavaScript și `npm run typecheck`: reușite.

Build-ul de producție Vinext a trecut. Publicarea este verificată separat prin rezultatul serviciului de găzduire; confirmarea finală din conversație indică starea efectivă.

Nu este disponibil instrumentul autorizat de browser QA în acest runtime. Nu s-au efectuat teste vizuale ale MVP-ului, teste pe iPhone fizic, scanare QR cu telefonul, test auditiv, test de încărcare sau audit independent. Testele API nu confirmă Safari sau aspectul tuturor ecranelor. Capturile prototipului recuperat sunt istorice, fără pretenția că sunt teste noi.

Plățile sunt dezactivate; schema pentru conturi și comenzi nu înseamnă că aceste integrări sunt active.
