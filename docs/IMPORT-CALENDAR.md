# Verificarea importului unei vizionări

Cele patru fișiere de probă provin din funcția care exportă vizionările confirmate. Conțin evenimente DEMO fără participanți sau organizator. Pentru test nu ai nevoie de cont pe site, de telefon confirmat sau de acces la baza de date.

Descarcă fișierele originale din [directorul de probe](../tests/fixtures/calendar), folosind **Download raw file** pentru fiecare. Creează un calendar privat de test, fără partajare, invitați sau notificări. Importă fișierele în acel calendar și setează fusul de afișare la **Europe/Bucharest**. Verifică ora de început pentru fiecare titlu.

| Fișier | Data în Cluj | Ora în Cluj | Ora UTC |
| --- | --- | --- | --- |
| 01-primavara-inainte.ics | 28 martie 2027 | 02:59 | 00:59 |
| 02-primavara-dupa.ics | 28 martie 2027 | 04:00 | 01:00 |
| 03-toamna-prima.ics | 31 octombrie 2027 | 03:30 | 00:30 |
| 04-toamna-a-doua.ics | 31 octombrie 2027 | 03:30 | 01:30 |

În martie, primele două vizionări sunt la un minut distanță. În octombrie, caută ambele titluri. Schimbă temporar fusul de afișare al calendarului de test în UTC și verifică diferența de o oră dintre ele. Durata vizionării nu este stabilită în fișier.

Pentru Apple Calendar, Google Calendar și Outlook, consemnează separat aplicația și versiunea, fusul afișat, numărul de evenimente și orele observate. Dacă apare o diferență, notează fișierul și ora efectiv afișată. Folosește doar capturi ale calendarului DEMO. Importurile umane rămân neverificate până la consemnarea rezultatului în fiecare aplicație.

Din rădăcina proiectului, `node --test tests/calendar.test.mjs` compară fișierele cu exportul aplicației, le citește cu un parser iCalendar și verifică momentele UTC, orele locale și identificatorii distincți.
