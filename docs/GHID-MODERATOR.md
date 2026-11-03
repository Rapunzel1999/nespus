# De la anunț în așteptare la decizie

Ghid intern pentru pilotul privat din Cluj-Napoca. Aprobarea este o decizie editorială. Telefonul confirmat și declarația autorului nu dovedesc identitatea civilă sau dreptul de proprietate.

## Prima revizuire

1. Intră în **Moderare → Anunțuri în așteptare**. Dacă anunțul îți aparține, lasă-l unui alt moderator. Dacă nu există un decident independent disponibil, anunțul rămâne în așteptare.
2. Verifică dacă locuința este în municipiul Cluj-Napoca și autorul publică în nume propriu ca proprietar sau coproprietar. Citește descrierea și privește fotografiile. Dacă apar indicii de intermediere, verifică contextul înainte să decizi. Un cuvânt-cheie sau o fotografie asemănătoare nu justifică singure o respingere.
3. Alege **Aprobă** sau **Respinge** și scrie motivul concret. Pentru o corecție, numește câmpul și ce trebuie schimbat. De exemplu, pentru o chirie cu costuri neclare: „Precizează ce costuri lunare sunt incluse în chirie și ce se plătește separat.” Evită datele de contact, adresa exactă și afirmațiile despre identitatea autorului în motiv.
4. După confirmare, deschide **Jurnalul deciziilor**. Verifică anunțul, acțiunea și motivul. Dacă răspunsul s-a pierdut, verifică jurnalul și coada înainte de altă decizie. Dacă primești mesajul că starea s-a schimbat, reîncarcă lista și citește starea actuală.

## Dacă proprietarul corectează anunțul

Proprietarul găsește în cont starea **Necesită modificări** și **Motivul moderatorului**. Poate edita și retrimite. Cumpărătorul nu poate deschide detaliile sau fotografia cât timp anunțul este respins, în ciornă sau în așteptare. Citește versiunea corectată înainte să decizi din nou. Prima respingere rămâne în jurnal și după aprobarea ulterioară.

## Sesizări și contestații

În **Sesizări**, folosește **Consultă contextul sesizării** dacă ai nevoie de dovezi pentru cazul respectiv. Lista îți arată numai sesizările în care nu ești autor, proprietar sau participant la conversație. Un alt moderator le poate analiza pe cele în care ești implicat. Pentru o sesizare depusă de tine, urmărește starea în contul personal. Lista de contestații exclude cazurile în care ești implicat sau ai luat decizia contestată. Autorul își poate urmări contestația în contul personal. Până la desemnarea celui de-al doilea moderator, lasă cazurile cu conflict deschise. Nu trimite conversații sau fotografii private în afara pilotului.

## Repetiția locală

Din rădăcina proiectului, rulează:

```sh
node --test --test-name-pattern='moderation rehearsal' tests/security.test.mjs
```

Proba folosește API-ul și SQLite în memorie. Un proprietar trimite un anunț DEMO, un prim moderator îl respinge, autorul îl corectează, iar un alt moderator îl aprobă. Testul verifică vizibilitatea, accesul la motiv și la jurnal, inclusiv faptul că repetarea respingerii nu creează o a doua decizie. Rolurile sunt simulate local. Înainte de pilotul cu invitați rămân necesare desemnarea moderatorilor și verificarea rolurilor cu conturi distincte în mediul găzduit.
