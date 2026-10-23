# CoachMate Volleyball – versione web (Android, iPhone, computer)

Stesse funzioni dell'app iPhone: lavagna tattica, segnapunti con statistiche e report, squadre miste, calendario e convocazioni, presenze, esercizi con timer, quiz, storico e backup.
Funziona anche **senza connessione** dopo la prima apertura.

I dati restano **sul telefono**, nel browser. Fai spesso un backup da *Backup e impostazioni*. I dati della web app sono separati da quelli dell'app iPhone nativa.

---

## 1. Mettere l'app online (gratis, una volta sola)
La cartella va pubblicata su un indirizzo web **https**. Il modo più semplice è **GitHub Pages**:

1. Crea un account gratuito su **github.com**.
2. In alto a destra premi **+ › New repository**:
   - nome: `coachmate`;
   - visibilità: **Public**;
   - premi **Create repository**.
3. Nella pagina del repository premi **uploading an existing file**. Trascina **tutto il contenuto** di questa cartella: `index.html`, `manifest.webmanifest`, `sw.js` e le cartelle `css`, `js`, `img`. Poi premi **Commit changes**.
4. Vai in **Settings › Pages**:
   - in "Branch" scegli **main** e **/(root)**;
   - premi **Save**.
5. Dopo circa un minuto l'app è online su: `https://TUONOME.github.io/coachmate/`

In alternativa puoi usare **Netlify** (app.netlify.com › Add new site › Deploy manually) e trascinarci la cartella. Serve un account gratuito, altrimenti il sito scade.

## 2. Installarla su Android
**Modo semplice (consigliato)**
1. Apri l'indirizzo con **Chrome**.
2. Menu **⋮ › Installa app** (oppure "Aggiungi a schermata Home").

L'icona CoachMate compare tra le app, si apre a tutto schermo e funziona offline.

**Come vero file APK** (da passare ad altri o tenere come file)
1. Vai su **pwabuilder.com**, incolla l'indirizzo dell'app e premi **Start**.
2. Premi **Package For Stores › Android › Generate Package** e scarica lo zip.
3. Dentro c'è il file **`.apk`**: mandalo sul telefono, aprilo e consenti "installa app sconosciute".
4. **Conserva** il file della chiave (signing key) che trovi nello zip: serve per gli aggiornamenti futuri e per un'eventuale pubblicazione sul Play Store (file `.aab`).

L'APK apre l'app pubblicata online. Quando aggiorni i file su GitHub, l'app si aggiorna da sola su tutti i telefoni.

## 3. Installarla su iPhone (senza scadenza dei 7 giorni)
1. Apri l'indirizzo con **Safari**.
2. Premi **Condividi › Aggiungi alla schermata Home**.

## 4. Aggiornare l'app
Ricarica su GitHub i file modificati (Add file › Upload files). Alla successiva apertura con connessione tutti i telefoni ricevono la nuova versione.

---
Prova in locale sul computer: da questa cartella esegui `python3 -m http.server 8000` e apri http://localhost:8000
