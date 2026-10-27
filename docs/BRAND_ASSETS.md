# Între noi — experiența de brand

Direcție realizată la 27 octombrie 2026: un site editorial, cald și local, pentru întâlnirea directă dintre proprietari și cei care caută un loc în Cluj-Napoca. Mesaj central: **„Un loc al tău. Oameni, direct.”**

Pagina pornește de la atmosferă și căutare, arată exclusiv anunțuri primite din API, explică mecanismul de contact, oferă parcursuri distincte pentru solicitant și proprietar, permite explorarea pe cartiere și încheie cu invitația de a pregăti o ciornă. Nu introduce mărturii, statistici, proprietăți sau disponibilități fictive.

## Fișiere și integrare

- `public/app.js`: structură, texte și interacțiuni. Căutarea pe cartiere ajunge la API cu filtre reale. CTA-urile proprietarilor păstrează autentificarea și alegerea tipului de anunț.
- `public/brand.css`: paletă verde/crem, tipografie editorială cu fonturi locale, ritm vizual, adaptări responsive și respectarea preferinței pentru mișcare redusă.
- `lib/document.html`: încărcarea identității vizuale.
- `public/media/home-atmosphere.webp`: imagine principală, 1672 × 941, 207.826 octeți.
- `public/media/home-atmosphere-small.webp`: variantă pentru ecrane mici, 960 × 540, 89.124 octeți; selectată de browser prin `srcset`.
- `public/media/owner-atmosphere.webp`: imagine secundară, 800 × 1000, 85.554 octeți, încărcată lazy.

Imaginile au fost generate cu instrumentul **ImageGen integrat**, fără CLI. Sharp a fost folosit doar pentru redimensionare și conversie WebP. Sunt imagini fictive de atmosferă, nu fotografii ale unor proprietăți listate. Etichetele AI și textele alternative trebuie păstrate. Imaginea principală are prioritate ridicată la încărcare; ambele au dimensiuni declarate. Nu se folosesc fotografiile de brand ca substitute pentru imagini ale anunțurilor.

## Prompturi finale

### Imagine principală

```text
Use case: photorealistic-natural. Asset type: premium editorial real-estate website hero photograph, landscape 16:9, 1920x1080 or larger. Create a beautiful, entirely fictional and unoccupied contemporary European apartment, warm and attainable rather than ostentatious. Late afternoon natural sun falling diagonally onto honey oak flooring, tactile cream plaster, a pale linen sofa, low wood coffee table with one ceramic cup, a small olive tree, and large glass doors opening to a quiet balcony with leafy green trees beyond. A natural soft arch doorway is visible on the left. Keep the left 42 percent darker and visually very quiet (a softly shaded deep olive interior wall and partial doorway) to support large white website copy that will be added in code. Most of the room, pale sofa, sunlight and balcony occupy the right 58 percent. Sophisticated warm ivory, forest green and muted caramel palette. Architectural Digest level editorial interior photography, natural imperfections, authentic textures, restrained styling, 35mm lens, straight architectural verticals, physically plausible scale, cinematic light but not overly contrasty. Full bleed single photograph, no frames, no collage, no typography, no branding, no watermark, no people, no floorplan, no identifiable city landmarks. This is an atmosphere image, not an advertised available property. Avoid glossy CGI, luxury penthouse tropes, orange saturation, cold gray interiors and excessive decor.
```

### Invitație pentru proprietari

```text
Use case: photorealistic-natural. Asset type: vertical editorial photograph for the owner invitation section of a sophisticated Romanian real-estate website. A quiet intimate still life that suggests handing over a home: one simple unbranded brass house key on an unmarked brass keyring resting on a small handmade ivory ceramic dish, on a honey oak console table. A cream linen curtain and a soft sage green wall behind it. One small leafy branch in a muted brown ceramic vase partly cropped at the upper edge. Natural afternoon sun from the right casts beautiful long window shadows and reveals the texture of the wood and linen. Calm optimistic warm forest green, ivory and soft caramel palette, restrained styling, authentic tactile materials, editorial film photography, slight natural grain, no artificial glossy render. Vertical 4:5 composition, close-to-medium framing, key clearly readable as a real key, in the lower-middle area, generous quiet space above. No people, no hands, no text, no logo, no labels, no watermark, no document, no collage. Entirely fictional brand atmosphere; not an actual property listing.
```

## Limite păstrate

Pilot privat; verificare SMS oprită; nicio trimitere contra cost. Ciornele nu sunt publicate automat. Telefonul confirmat nu este prezentat ca verificare a identității ori a dreptului de proprietate. Starea testelor, inclusiv lipsa verificării vizuale în browser și pe iPhone fizic, este consemnată separat în [VERIFICATION.md](VERIFICATION.md).
