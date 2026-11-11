# PLAN — Armata de agenți de marketing

Stare: **Faza 1 — produs de test schimbat de Paul în „creion pentru barbă” (`products/creion-barba/`). Întrebările 1, 3, 4, 5 încă deschise; lucrez cu valorile recomandate.**
Data: 10 noiembrie 2026

## 1. Ce am găsit (Faza 0)

| Constatare | Detaliu |
| --- | --- |
| Repo-ul primit nu e „armata-marketing” | E `Rapunzel1999/nespus`: aplicația Nespus (mesaje digitale cu link/QR), MVP 0.1 construit de ChatGPT. Next/Vinext + Cloudflare D1, Node 24, pnpm. |
| Istoric git | 2 commit-uri, ambele pentru Nespus. Nimic legat de marketing. |
| `AGENTS.md`, `CLAUDE.md` | Nu există. Trebuie create. |
| Structura cerută (`agents/`, `pipelines/`, `config/`, `products/`, `state/`, `logs/`) | Nu există nimic. Se pornește de la zero. |
| Coliziuni cu Nespus | `tests/` și `README.md` există deja și aparțin Nespus. CI rulează `node --test tests/*.test.mjs`, typecheck și build pe tot repo-ul. |
| Unelte disponibile în sesiune | ffmpeg ✔, Python 3.13 ✔, Node 22 ✔, Chromium/Playwright ✔. |
| Higgsfield | Conectat. Sold: **123,15 credite**, plan Max. |
| Shopify | Conectat la un singur magazin: **Luma Lift** (`megashop-romania.ro`, RON). Coditza și INclaziSele nu sunt conectate. |
| Meta Ads | Niciun conector. Campania rămâne draft în fișiere (oricum asta cere regula). |
| Câmpuri necompletate în master prompt | URL repo, limita de credite, pragurile kill/scale, produsul de test. Am tratat exemplele ca propuneri, nu ca decizii. |

## 2. Arhitectură propusă

Totul într-un singur dosar izolat, `armata/`, ca să nu ating munca lui ChatGPT pe Nespus:

```
armata/
  AGENTS.md  CLAUDE.md  README.md  PLAN.md
  agents/            # 10 definiții: rol, intrări, ieșiri JSON, unelte, criterii de calitate
  pipelines/         # cycle.md (fluxul complet) + pașii: hunt → spy → offer → copy → creative → edit → site → campaign → qa
  config/            # criteria.yaml, kill_scale.yaml, budgets.yaml, brands/<magazin>.yaml
  schemas/           # JSON Schema pentru fiecare livrabil
  scripts/           # Python: stare ciclu, scor, calcul marjă, validări, montaj ffmpeg, analiză CSV, raport
  products/<slug>/   # brief.json, research/, ads/, video/, site/, campaign/, report.md
  state/  logs/  tests/
```

La rădăcina repo-ului adaug doar `AGENTS.md` și `CLAUDE.md` scurte, care spun: Nespus e la rădăcină, armata e în `armata/`, regulile de fier, cine ce nu atinge.

**Cum se împarte munca**

- *Judecată și creație* (alegere produs, tipare de reclame, ofertă, texte, scenarii): agenți LLM definiți în `agents/*.md`, rulați de Claude Code ca subagenți sau de Codex citind aceleași fișiere.
- *Tot ce e determinist* e cod Python testat: scor 0–100, marjă și cost landed, verdict kill/scale din CSV, validare de format, numărătoarea creditelor, montajul ffmpeg, asamblarea raportului.
- *Inspectorul* are două straturi: validări automate (schemă, cuvinte interzise gen „vindecă/garantat”, placeholder-e nemarcate, diacritice, durată și format video) și o trecere LLM pentru ton și conformitate.

**Comanda unică:** `/ciclu <nume sau link produs>` în Claude Code. Pentru Codex: `python armata/scripts/cycle.py start "<produs>"`, care creează starea și spune exact ce pas urmează. Ambele folosesc aceeași stare din `state/`, deci un ciclu poate fi reluat de oricare.

**Porți de aprobare** (ciclul se oprește și scrie în `state/` ce așteaptă):
1. după ofertă — merită produsul continuat?
2. înainte de generarea video — cost estimat în credite;
3. la final — pachetul de lansare.

**Garduri tehnice pentru regulile de fier**
- Buget de credite ținut într-un registru per produs; pasul de generare refuză să pornească dacă estimarea depășește limita.
- Niciun script nu are cod care scrie în Shopify sau Meta. Pagina de produs iese ca fișiere de import; campania ca JSON + ghid de configurare.
- Test care caută secrete și afirmații interzise în tot ce e în `products/`.

## 3. Ordinea de lucru

1. Schelet: dosare, `AGENTS.md`/`CLAUDE.md`, config-uri, scheme, starea ciclului, teste de bază.
2. Agenții de analiză: Vânător, Spion, Strateg (+ scripturile de scor și marjă).
3. Agenții de conținut, în paralel: Copywriter, Constructor de site, Media buyer.
4. Lanțul video: Regizor (Higgsfield) → Editor (ffmpeg; Remotion doar dacă subtitrările ffmpeg nu arată destul de bine).
5. Analist (CSV → verdict) și Inspector.
6. Dry run pe produsul de test, apoi raportul final.

Pașii 2, 3 și 5 nu depind unul de altul la nivel de cod, deci merg în paralel cu subagenți. Lanțul video e secvențial.

## 4. Riscuri

| Risc | Ce fac |
| --- | --- |
| **Video AI al unui produs fără poze reale** poate arăta altceva decât primește clientul → reclamă înșelătoare (ANPC, Meta). | Regizorul lucrează din poze reale de referință. Fără ele, generează doar cadre „de context” și marchează clipul ca neaprobat pentru lansare. |
| Credite: 3 reclame video de 15–30 s pot depăși limita per produs. | Estimare înainte, clipuri scurte refolosite între variante, voce + subtitrări în loc de mult video generat. Dacă nu încape, cer aprobare cu cifra exactă. |
| Meta Ad Library și TikTok Creative Center pot fi blocate din mediul cloud sau pot refuza accesul automat. | Spionul are și mod manual: Paul lipește linkuri sau capturi, agentul extrage tiparele. Spun clar în raport ce sursă a mers. |
| Cifre de cost și concurență estimate, nu verificate. | Fiecare cifră are sursă și nivel de încredere. Estimările sunt marcate ca estimări în raport. |
| Fișiere MP4 mari în git. | În repo intră doar exporturile finale, comprimate. Materialul intermediar e ignorat de git. |
| Containerul cloud e efemer. | Commit și push după fiecare pas încheiat; starea ciclului e în repo. |
| CI-ul Nespus (Node 24, build complet) rulează și pe ramura mea. | Nu ating fișierele Nespus. Testele armatei sunt Python, separate; le adaug în CI ca job distinct doar cu acordul tău. |
| Română „de AI”. | Inspectorul are listă de clișee interzise și verifică diacriticele; textele se scriu direct în română, nu se traduc. |

## 5. Întrebări pentru Paul (maxim 5)

1. **Unde construiesc?** În `armata/` din repo-ul Nespus (recomandat, e singurul la care am acces) sau într-un repo separat pe care îl creezi tu?
2. **Produsul de test** e kitul de parbriz (spray antiaburire + tablete)? Ai poze reale și prețul de la furnizor?
3. **Limite:** 50 credite Higgsfield per produs; oprire la 150 lei fără comandă; scalare la CPA ≤ 40% din marja brută. Le confirmi?
4. **Pe ce magazin** merge produsul de test? Doar Luma Lift e conectat. Propun fișiere de import, fără nicio scriere în magazin.
5. **Reclame cu voce**: voce AI în română peste clipuri (mai ieftin în credite) sau avatar/UGC AI care vorbește la cameră?
