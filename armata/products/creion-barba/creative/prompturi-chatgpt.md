# Prompturi ChatGPT — poze produs „Creion pentru barbă”

**Cum le folosești**

1. Deschide un chat nou în ChatGPT și **încarcă poza de la furnizor** (`research/referinta-furnizor.png`).
2. Lipește întâi „Promptul de bază”. Apoi câte un prompt de poză, pe rând, în același chat.
3. Verifică la fiecare poză: textul de pe creion și cutie e identic cu originalul? Vârful are 4 dinți? Dacă nu, scrie: `Refă. Produsul trebuie să fie identic cu poza încărcată.`

Prompturile sunt în engleză pentru că generatorul de imagini le urmează mai exact. Textele care apar în imagine sunt în română.

> ⚠️ Pozele cu persoane sunt **ilustrative** (generate cu AI). Nu le prezenta ca rezultate reale ale unui client. Pentru reclama principală, cea mai sigură variantă e o filmare reală cu mostra.

---

## Promptul de bază (o singură dată, la început)

```
I uploaded a reference photo of a real product: a beard filler pen kit (black box, black pen with a 4-prong fine tip, cap, and a small black blending brush).

For every image I ask for in this chat:
- Keep the product EXACTLY as in the reference: same shape, proportions, colors, and the same text and logo placement on the pen and box. Do not redesign it, do not invent new text, do not add other brands.
- The pen tip must have 4 fine prongs, like a small fork.
- Photorealistic, natural light, looks like a real photo shot on a modern phone or a studio camera. No CGI look, no plastic skin.
- No added text, badges, prices, star ratings or watermarks unless I explicitly ask.
- People must look like ordinary Romanian men aged 25–40, not models and not any real or famous person.
Confirm you understood, then wait for my first request.
```

## 1. Poza principală (packshot, pătrat)

```
Square 1:1 product photo. The full kit from the reference (box standing upright, pen lying diagonally in front with the cap off next to it, brush on the right) on a clean light-grey seamless background, soft studio light from the top left, soft natural shadow under each item. Sharp focus on the 4-prong tip. Nothing else in the frame.
```

## 2. Macro pe vârf

```
Square 1:1 extreme close-up macro of the pen tip from the reference, showing the 4 fine prongs clearly. A male hand holds the pen; the tip has just drawn four thin parallel hair-like strokes in dark brown on the back of the other hand. Shallow depth of field, neutral bathroom light.
```

## 3. Aplicare pe barbă

```
Vertical 4:5 photo. Close-up of the lower half of a man's face (from nose down, eyes not visible), short dark-brown beard with a naturally thinner patch on the cheek. His hand holds the pen from the reference and draws fine strokes on the thin patch. Bathroom mirror light, real skin texture with pores, natural and unretouched look.
```

## 4. Estompare cu peria

```
Vertical 4:5 photo. Same man and same bathroom as the previous image. He now holds the small black brush from the reference and brushes his cheek beard downward to blend. The pen stands on the sink edge, slightly out of focus.
```

## 5. Comparație ilustrativă (aceeași față, două jumătăți)

```
Vertical 4:5 photo. Front view of a man's lower face and beard, split down the middle by a thin white vertical line. Left half: beard with a visibly thinner patch on the cheek and an uneven cheek line. Right half: the same beard looking fuller in that patch with a cleaner cheek line. The difference must be modest and realistic, like makeup, not like a different person or a much longer beard. Same lighting on both halves.
Add small plain white text at the bottom: "Imagine ilustrativă"
```

## 6. Ce primești în colet (cu text în română)

```
Square 1:1 flat-lay, top-down, on a dark slate surface: the box, the pen with cap off, the cap, and the brush from the reference, neatly spaced. Add thin white lines pointing to each item with these exact Romanian labels, spelled exactly like this, including diacritics:
"Creion cu 4 dinți fini"
"Capac"
"Perie pentru estompare"
"Cutie"
Clean sans-serif font, small, white. No other text.
```

## 7. Lifestyle (pentru reclamă și site)

```
Vertical 9:16 photo. A bathroom shelf in the morning: the pen and brush from the reference next to a folded towel and a simple glass. In the blurred background, a man in a plain t-shirt checks his beard in the mirror. Warm, calm, realistic home bathroom in a normal apartment, not a luxury hotel.
```

## 8. Unghi de cadou

```
Square 1:1 photo. The product box from the reference lies on kraft wrapping paper with a simple dark ribbon and a small sprig of fir, as if being gift-wrapped. Top-down, soft warm light, minimal. No text.
```

---

## Prompt pentru cadrul de început al fiecărui clip video (9:16)

Folosește-l dacă generezi clipurile din imagine (image-to-video). Schimbă doar descrierea scenei, după scenariile din `scenarii.md`.

```
Vertical 9:16 photo, first frame of a short phone video. [DESCRIEREA SCENEI]. The product is identical to the reference photo. Handheld phone look, natural bathroom light, real skin texture. Leave the top 15% and bottom 25% of the frame free of important details (space for subtitles and app buttons).
```
