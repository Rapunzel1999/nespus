# Arhitectură

Browser → rute Vinext → handler API → Cloudflare D1. Previzualizarea și destinatarul folosesc aceeași componentă. Textele utilizatorului intră în DOM prin `textContent`. Fotografiile sunt decodate, micșorate la 1200 px și recodificate JPEG în browser, apoi incluse în JSON-ul D1. API verifică limita și antetul JPEG; pentru volume comerciale, mută fotografiile în R2, cu ștergere coerentă.

| Rută | Rol |
| --- | --- |
| `GET /api/health` | Versiune, plăți dezactivate; nu verifică sănătatea bazei |
| `POST /api/gifts` | Creare; JSON și Origin identic obligatorii |
| `GET /api/gifts` | Maximum 50 mesaje ale browserului creatorului |
| `GET /api/gifts/:id` | Citire; 404 pentru lipsă, ștergere sau expirare |
| `GET /api/gifts/:id/qr` | QR SVG cu verificarea aceleiași expirări |
| `DELETE /api/gifts/:id` | Ștergere definitivă, cookie creator și Origin identic |

ID-ul public are 122 biți aleatori (UUID v4 fără separatori). Cookie-ul anonim are două UUID-uri aleatoare, este HttpOnly, SameSite=Strict, Secure pe HTTPS. Baza păstrează numai SHA-256 al cookie-ului. Cookie-ul nu intră în link sau QR. Pierderea lui înseamnă pierderea administrării din UI până la implementarea conturilor. Nu există recuperare pe alt dispozitiv.

Oricine deține linkul poate citi mesajul pe o găzduire publică. Nu există verificare a identității destinatarului sau criptare cap-la-cap. Serverul poate procesa conținutul. `no-store`, `no-referrer`, `noindex`, CSP și lipsa serviciilor QR externe reduc divulgarea accidentală; nu împiedică destinatarii să copieze conținutul. Accesul privat al platformei de găzduire rămâne o restricție suplimentară, independentă de link.

## Durată și limite

Serverul acceptă 1/3/7 zile și ignoră `expiresAt`/`paid` trimise de client. După termen, conținutul și QR-ul sunt blocate. Expirarea accesului **nu șterge fizic** înregistrarea acum; creatorul o poate șterge. Înainte de lansare trebuie stabilită retenția și introdusă purjarea programată.

Limită atomică: 10 creații pe cookie în 24h, corp maximum 420.000 bytes, fotografie maximum 400.000 caractere. Aceasta nu este protecție completă anti-abuz: cookie-ul poate fi resetat, iar ștergerea scade numărul numărat. Lansarea publică necesită limitare globală/pe IP și control anti-bot.

## Conturi și plăți

`gifts.account_id` poate lega mesajul de `accounts` numai după autentificare verificată și dovada cookie-ului anonim. Identitatea declarată de client nu este suficientă. `orders` rezervă suma în unități minore, moneda, statutul și un `provider_event_id` unic. Nicio rută nu creează comenzi acum.

Integrarea viitoare va calcula prețul pe server, va verifica semnătura webhook-ului și evenimentul furnizorului, va scrie idempotent comanda și dreptul de acces și abia apoi va extinde durata. Revenirea din checkout nu confirmă plata. `PLANS` conține propuneri comerciale, nu autorizări.

Nu există panou de administrator. Acesta va necesita roluri server-side, audit și politici de acces. Un URL ascuns nu este autorizare.

## Proveniență

La 15 octombrie 2026 GitHub a raportat `Git Repository is empty`. Serviciile accesibile de găzduire nu aveau Nespus. Arhiva `Nespus-Emotie-v2-surse.zip` a furnizat designul, componenta și rapoarte istorice: era un draft parțial Shopify, fără backend. MVP-ul continuă acel design. Magazinul Luma Lift și tema publicată nu au fost modificate. Rapoartele istorice nu sunt teste ale noului MVP.

Această rundă a fost implementată de ChatGPT. Nu a fost identificată o integrare directă de verificare cu Claude/Gemini; nu se pretinde participarea lor.
