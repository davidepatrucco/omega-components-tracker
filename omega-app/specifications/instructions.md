## Omega — Reverse engineering & bootstrap instructions

Questo documento è un reverse-engineering della codebase "Omega / Component Tracker" e contiene: specifiche tecniche, API e data model, requisiti funzionali (login, pagine, ricerca) e istruzioni rapide per bootstrap.

### Scopo
Fornire una guida utilizzabile per ricreare o bootstrappare una applicazione molto simile su cui proseguire lo sviluppo.

---



## 3) API principali (contratto essenziale)

Base path: il frontend usa axios con base `/` in sviluppo (Vite proxy) e `VITE_API_URL` in produzione. Il backend serve API e file statici.

- Auth
  - POST /login
    - body: { username, password }
    - returns: { token, username, profilo } (token è JWT memorizzato in localStorage `authToken`; server setta refreshToken cookie)
  - POST /register
  - GET /verify-token (protetto) — verifica validità token
  - POST /logout — invalida refresh cookie

- Commesse
  - GET /commesse — lista commesse
  - GET /commesse/:id — commessa specifica
  - POST /commesse — crea commessa (code, name, note, ...) richiesti
  - PUT /commesse/:id, DELETE /commesse/:id

- Componenti
  - GET /components — lista componenti (campo `cancellato: false` filtrato dal server)
  - POST /components — crea componente
    - expected (server-side required): commessaId, parentOrderCode, parentOrderName, name, treatmentType, status
    - supports multipart/form-data with `files[]` (multer)
  - PUT /components/:id — update (supporta files, history update when status changes)
  - DELETE /components/:id — soft-delete (cancellato: true)
  - POST /changestatus — helper per cambiare stato con history
  - POST /components/import-excel — import Excel (multipart) crea commessa + componenti
  - GET /components/export-excel — export
  - POST /components/send-report — invia report via email


- Configurazione stati
  - GET /getstati — restituisce lista WorkStatus (se DB vuoto popola default)
  - POST /getstati — sovrascrive lista stati

## 4) Stati di lavoro (WorkStatus) — vista e significato

Questa sezione descrive il concetto di "stato di lavoro" usato per tracciare il ciclo di vita di un componente e come può essere presentata nell'interfaccia utente.

- Campi principali (WorkStatus):
  - `code` (String, unique): identificatore corto dello stato (es. `0`, `1`, `R1`).
  - `label` (String): etichetta leggibile mostrata all'utente (es. `0 - creato`, `1 - in lavorazione`).
  - `order` (Number): ordine numerico per ordinare gli stati nelle liste e nei menu a tendina.
  - `active` (Boolean): se lo stato è disponibile per nuove transizioni o deve essere nascosto.
  - `profili` ([String]): ruoli autorizzati a usare/assegnare questo stato (es. `['OP', 'QA']`).
  - `note` (String): testo libero per spiegazioni o vincoli operativi.

- Uso e regole consigliate:
  - Mostrare gli stati in ordine crescente di `order` nelle dropdown e nelle rappresentazioni timeline.
  - Usare `active=false` per nascondere stati obsoleti ma preservare la cronologia nei `history` dei componenti.
  - Limitare la selezione di alcuni stati in base al `profilo` dell'utente usando `profili`.



gli stati sono
1 - Nuovo
2 - Produzione Interna oppure 3 - Produzione Esterna
3 - Costruito
    per ogni trattamento previsto (nel data model, il field trattamenti è una array di più trattamenti)
    4a - in preparazione <nome trattamento>) 4b - in trattamento <nome trattamento> 4c - arrivato da <nome trattamento>
5 - Pronto per consegna
6 - Spedito

Nota: nel caso di siano tre trattamenti (possono essercene N) TRATT1 TRATT2 E TRATT3, la sequenza di stati possibili (allowedStatuses) sarà
1,
2 oppure 3,
4a, 4b, 4c per ciascun trattamento (TRATT2 può avvenire prima di TRATT1 o comunque in qualunque ordine
quando TUTTI i trattamenti sono in stato 4c, automaticamente lo stato si modifica in Pronto per consegna

## 4 bis) Regole operative per `allowedStatuses` e transizioni

- `allowedStatuses` deve contenere TUTTI gli stati consentiti per il componente, sia le direzioni "avanti" che quelle di "rollback" (in modo da poter tornare indietro in caso di errori). Non rimuovere dagli `allowedStatuses` gli stati già completati: mantenere la visibilità delle possibili transizioni.

- Convenzione consigliata per gli stati di trattamento (per permettere N trattamenti distinti):
  - usare una codifica univoca per sotto-stati di trattamento, ad esempio `4:<NOME_TRATTAMENTO>:PREP`, `4:<NOME_TRATTAMENTO>:IN`, `4:<NOME_TRATTAMENTO>:ARR` (corrispondenti a 4a, 4b, 4c nella descrizione utente).

- Composizione di `allowedStatuses` per un componente:
  - includere sempre gli stati globali canonici: `1`, `2`, `3`, `5`, `6`;
  - includere per ciascun elemento di `trattamenti` tutte le sotto-fasi `4:<tratt>:PREP|IN|ARR`;
  - il backend può comunque validare ogni cambio (permessi, logica di business, controlli su `history`) ma non deve nascondere le opzioni di rollback.

- Regola automatica (backend): dopo ogni aggiornamento di stato o dopo ogni aggiornamento relativo ai trattamenti, verificare se per TUTTI i trattamenti esiste uno stato `4:<tratt>:ARR` nella `history`. Se sì, eseguire automaticamente la transizione a `5` (Pronto per consegna) e registrare l'evento in `history`.

- UX/Frontend: l'interfaccia può presentare una vista filtrata di `allowedStatuses` (es. suggerire solo le azioni "consigliate" o "avanti") ma la sorgente di verità deve essere `allowedStatuses` fornito dal backend.

Esempio JS minimale (backend) — calcola `allowedStatuses` e applica la transizione automatica a `5` quando tutti i trattamenti sono `ARR`:

```javascript
// component: { status, trattamenti: ['A','B'], history: [...] }
function buildAllowedStatuses(component) {
  const globals = ['1','2','3','5','6'];
  const treatmentStates = (component.trattamenti || []).flatMap(t =>
    [`4:${t}:PREP`, `4:${t}:IN`, `4:${t}:ARR`]
  );
  // includi tutti gli stati possibili (no filtering dei già completati)
  return Array.from(new Set([...globals, ...treatmentStates]));
}

function maybeAutoTransitionToReady(component, saveFn) {
  const tratt = component.trattamenti || [];
  if (tratt.length === 0) return false;
  const allArr = tratt.every(t => {
    // verifica se history contiene un evento che porta il trattamento a ARR
    return component.history?.some(h => h.to === `4:${t}:ARR`);
  });
  if (allArr && component.status !== '5') {
    component.history = component.history || [];
    component.history.push({ from: component.status, to: '5', date: new Date(), note: 'auto: all treatments ARR' });
    component.status = '5';
    if (typeof saveFn === 'function') saveFn(component);
    return true;
  }
  return false;
}
```

Note: puoi adattare la codifica degli stati (es. prefissi numerici o label testuali) ma la logica chiave è: 1) `allowedStatuses` esplicita TUTTE le transizioni ammessa; 2) il backend valida ogni singola transizione; 3) solo quando TUTTI i trattamenti sono `ARR` viene forzata la transizione a `5`.

## 4 ter) DDT (Documento di trasporto)

Per i casi "Arrivato da trattamento" (ogni stato `4:<TRATT>:ARR`) e per lo stato "Spedito" (`6`) deve essere possibile allegare uno o più Documenti di Trasporto (DDT).

- Comportamento richiesto:
  - quando l'operatore imposta lo stato su `4:<tratt>:ARR` o su `6`, l'interfaccia deve offrire la possibilità di allegare un DDT (file + metadati: numero DDT, data DDT, note opzionali);
  - l'allegato non è obbligatorio a livello di regola universale (l'utente può aggiungerlo se disponibile), ma deve sempre essere possibile inserirlo in corrispondenza di questi stati;
  - il backend deve accettare upload multipart/form-data (multer) con campo `ddtFile` e campi correlati `ddtNumber`, `ddtDate`, `ddtNote`, salvare il file in `upload/` e memorizzare un riferimento/record associato al componente (vedi suggerimento sotto).

- Suggerimento di modellazione (non modificare la sezione 3 già presente qui):
  - convenzionalmente si può aggiungere al `Component` un array `ddt: [{ number, date, fileRef, note, createdBy, createdAt }]` oppure inserire il DDT nella struttura `files` esistente con un `type: 'DDT'` per distinguerlo dagli altri allegati.

- UX / visualizzazione:
  - nella vista Dettaglio Commessa / tabella componenti mostrare un'icona DDT se il componente ha DDT associati; clic apre elenco DDT con download e metadati;
  - quando si esegue la transizione a `ARR` o `6` mostrare un piccolo modal per allegare il DDT o lasciare l'azione a posteriori tramite un pulsante "Aggiungi DDT".

Questa aggiunta mantiene la retrocompatibilità: i DDT sono opzionali ma sempre supportati per i due stati indicati.


---

## 6) Data model (sintesi)

- Components
  - codice commessa: ObjectId (required)
  - nome commessa : String (required)
  - description, notes
  - barcode: String
  - current status: String (required)
  - allowedStatuses: [String]
  - status history [{ from: String, to: String, date: Date, note: String, user: String, ddt_number: String, ddt_date: Date }]
  - level: { type: String },
  - crit: { type: String },
  - bom_text: { type: String },
  - oda_text: { type: String },
  - qty_u: { type: Number },
  - uta_u: { type: String },
  - qty_t: { type: Number },
  - uta_t: { type: String },
  - trattamenti: [String] 
  - ddt: [{ ddt_number: String, ddt_date: Date}]
  - verificato: { type: Boolean },
  - cancellato: { type: Boolean, default: false }

- User
  - username, password (hash), email, profilo

- WorkStatus
  - code, label, order, active, profili, note

---

## 6 bis) Mongoose schemas (copia/incolla)

Puoi usare questi schemi direttamente in `component-tracker/backend/models/*.js`.

```javascript
// models/Component.js
const mongoose = require('mongoose');
const ComponentSchema = new mongoose.Schema({
  commessaId: { type: mongoose.Schema.Types.ObjectId, required: true },
  commessaName: { type: String, required: true },
  description: { type: String },
  notes: { type: String },
  barcode: { type: String },
  status: { type: String, required: true },
  allowedStatuses: [{ type: String }],
  history: [
    {
      from: String,
      to: String,
      date: { type: Date, default: Date.now },
      note: { type: String, default: '' },
      user: { type: String, default: '' },
      note: { type: String, default: '' },
      // opzionale: DDT associato alla singola transizione (es. ARR o SPEDITO)
      ddt: {
        number: { type: String },
        date: { type: Date },
      }
    }
  ],
  level: { type: String },
  crit: { type: String },
  bom_text: { type: String },
  oda_text: { type: String },
  qty_u: { type: Number },
  uta_u: { type: String },
  qty_t: { type: Number },
  uta_t: { type: String },
  trattamenti: [{ type: String }],
  // DDT associati al componente (opzionali). Ogni oggetto può contenere metadati e files.
  ddt: [
    {
      number: { type: String },
      date: { type: Date },
      files: [
        {
          filename: String,
          path: String,
          mimetype: String,
          size: Number,
          uploadedBy: String,
          uploadedAt: { type: Date, default: Date.now }
        }
      ],
      note: { type: String, default: '' },
      createdBy: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  verificato: { type: Boolean, default: false },
  cancellato: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model('Component', ComponentSchema);


// models/User.js
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, default: '' },
  profilo: { type: String, default: 'UFF' },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('User', UserSchema);

// models/WorkStatus.js
const WorkStatusSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  profili: { type: [String], default: [] },
  note: { type: String, default: '' }
});
module.exports = mongoose.model('WorkStatus', WorkStatusSchema);
```

/* end insertion */

---

## 7) Requisiti funzionali (alto livello)

Checklist:
- [ ] Login / autenticazione
- [ ] Pagine disponibili e descrizione
- [ ] Funzionalità di ricerca

Dettaglio dei requisiti richiesti

1) Login (fase 0)
  - L'utente fa login con username/password su `/login`.
  - Se login OK: backend risponde con access token (JWT) e refresh token via cookie httpOnly.
  - Frontend: salva `authToken` in `localStorage` e `loggedIn=true`; axios interceptor aggiunge `Authorization: Bearer <token>` a tutte le richieste.
  - In caso di 401 l'interceptor pulisce localStorage e reindirizza al login.

2) Pagine web disponibili (route e comportamento)
  - `/` Home: dashboard iniziale (MainPage / Mini-statistiche)
  - `/commesse` Lista Commesse: tabella/ricerca commesse, avanzamento calcolato dalle componenti
  - `/commesse/:id` Dettaglio Commessa: lista componenti della commessa, editing inline, aggiunta componente (form o modal), upload documenti, storico cambi stato, change-state modal
  - `/reporting` Reporting: dashboard di grafici (distribuzione stati, tipi trattamento, avanzamento per commessa, attività giornaliera, criticità, tempo medio per stato)
  - `/configurazioni/*` Configurazioni: gestione utenti, gestione stati
  - `/manuale` Manuale utente

### UX — Menu e navigazione

Questa sezione descrive la struttura del menu principale dell'app e le pagine correlate, come dovranno apparire e comportarsi nell'interfaccia utente.

- Posizione e layout
  - Menu principale: sidebar a sinistra (collapsabile) con logo in alto e footer con utente e logout.
  - Header: barra superiore con `QuickSearch`, pulsante collapse sidebar, eventuali shortcut (nuovo componente, import/export) e icona notifiche.
  - Mobile: menu collapsabile via hamburger che mostra le stesse voci ordinate verticalmente.

- Ordine e voci del menu (desktop, top-level)
  1. Lavorazioni in corso — dashboard riepilogativa e accesso rapido alle azioni principali
  2. Commesse
     - Lista Commesse (/commesse)
     - (navigazione secondaria) Dettaglio Commessa (/commesse/:id)
  3. Configurazioni
     - Utenti (/configurazioni/utenti)
  4 - Reporting
  5 Manuale

- Comportamenti UX per ogni voce
  - Lavorazioni in corso: mostra widget sintetici, grafici rapidi e link veloci a ciascun componente in lavorazione (vista a card), con filtri per selezionare. 
  - Commesse → Lista: ricerca, filtri (per stato, commessa, trattamento), pulsanti per import/export Excel e per creare nuova commessa.
  - Commesse → Dettaglio: tab centrale con tabella componenti (inline edit), area per quick-actions (cambio stato, upload file se previsto), cronologia e note commessa.
  - Reporting (fase 2) dashboard con più grafici (stati, tempo medio, criticità, trend giornalieri) e filtri per intervallo temporale / commessa.
  - Configurazioni → Gestione Stati: tabella editabile degli stati (vedi sezione "Stati di lavoro"); le modifiche influenzano le dropdown di stato in Dettaglio Commessa.
  - Manuale: pagine statiche con documentazione e guida all'uso.

- Dettagli UX addizionali
  - Stato attivo: la voce corrente del menu evidenziata; breadcrumb nella header per il contesto (es. Commesse / Dettaglio / Component X).
  - Azioni rapide: pulsante contestuale che mostra le azioni più usate nella pagina (es. "Nuovo componente", "Cambia stato"), visibile nella header o nella pagina dettaglio.
  - Permessi: le voci/azioni visibili dipendono dal `profilo` dell'utente (vedi `WorkStatus.profili` e controllo ruoli backend).


3) Funzionalità di search avanzate (fase 2)
  - `QuickSearch` (Header): cerca localmente tra `commesse` salvate in `localStorage` e remotamente tra `/components` (GET /components) filtrando per nome.
  - Risultati misti (commessa / componente), clic su risultato naviga a dettaglio commessa o commessa con highlight del componente.
  - Suggerimenti: almeno 2 caratteri per avviare ricerca, risultati limitati (es. 10).

---

## 7) Contract rapido e casi limite

- Contract API `POST /components`
  - Input: form-data o json con campi obbligatori (vedi sopra)
  - Output: 201 + componente creato, oppure 400 con `missing` array
  - Error modes: missing fields -> 400; una validazione robusta sul client previene chiamate incomplete

- Edge cases da considerare
  - token mancante / invalid -> 401, frontend deve redirectare
  - upload file con stesso nome -> backend implementa versioning (version field)
  - date/history mancante -> reporting deve tollerare history vuota

---

## 9) Elenco pagine `.jsx` da sviluppare (layout, icone, API, comportamento)

Qui elenco le pagine React principali presenti in `component-tracker/frontend/src` e una breve specifica implementativa per ciascuna: layout, componenti AntD suggeriti, icone, API usate e comportamento utente.

- `LoginPage.jsx`
  - File: `component-tracker/frontend/src/LoginPage.jsx`
  - Layout: form centrale su card (AntD `Form`, `Input`, `Button`), possibilità di reset password link.
  - Icone: `UserOutlined`, `LockOutlined`, `LoginOutlined`.
  - API: `POST /login` (axios singleton in `src/api.js`). Salva token in `localStorage`, setta header Authorization tramite interceptor.
  - Comportamento: valida campi client-side, mostra error toast (AntD `message.error`) e redirect a `/` su successo.

- `MainPage.jsx` / `Home.jsx` (Dashboard)
  - File: `component-tracker/frontend/src/MainPage.jsx` e `Home.jsx` (MainPage funge da container, Home mostra widget)
  - Layout: AntD `Layout` con `Row`/`Col` per widget; card per metriche (tot componenti per stato, componenti in lavorazione, ultime attività).
  - Icone: `DashboardOutlined`, `BellOutlined`, `FileSearchOutlined`.
  - API: `GET /components?filter=...` (per calcoli aggregati), eventuali endpoint custom per summary (o calcolare lato frontend dai dati `/components`).
  - Comportamento: filtri rapidi, link rapidi a Dettaglio Commessa e lista componenti; refresh periodico opzionale.

- `ListaCommesse.jsx` / `CommesseTable.jsx`
  - File: `component-tracker/frontend/src/ListaCommesse.jsx`, `CommesseTable.jsx` (CommesseTable è componente riutilizzabile per la tabella)
  - Layout: AntD `Table` con paginazione, colonne: codice, nome, n. componenti, avanzamento (%), azioni (apri, export, import).
  - Icone: `SearchOutlined`, `PlusOutlined`, `ImportOutlined`, `ExportOutlined`, `EyeOutlined`.
  - API: `GET /commesse` (lista), `POST /commesse`, `DELETE /commesse/:id`, `GET /commesse/:id` per dettaglio.
  - Comportamento: ricerca e filtri (stato, trattamento), pulsante per import Excel (`POST /components/import-excel`), export (`GET /components/export-excel`), creazione commessa via Modal (AntD `Modal` + `Form`).

- `DettaglioCommessa.jsx`
  - File: `component-tracker/frontend/src/DettaglioCommessa.jsx`
  - Layout: layout a tab (AntD `Tabs`) con tab principali: `Componenti` (tabella), `Cronologia` (timeline), `Note` (textarea), `Files/DDT`.
  - Componenti: AntD `Table` per componenti con inline-edit (editable cells), `Modal` per cambio stato, `Upload` per file e DDT.
  - Icone: `FileTextOutlined`, `HistoryOutlined`, `UploadOutlined`, `DownloadOutlined`, `BarcodeOutlined`.
  - API: `GET /commesse/:id`, `GET /components?commessaId=:id`, `POST /components` (create), `PUT /components/:id` (update), `POST /changestatus` (o `PUT /components/:id`), upload DDT via multipart to `PUT /components/:id` with `ddtFile`/fields or dedicated `POST /components/:id/ddt` if implemented.
  - Comportamento: mostra lista componenti, supporta selezione multipla per bulk actions (cambia stato, esporta), pulsante nuovo componente apre Modal con form; change-state modal permette selezionare tra `allowedStatuses` ricevuti dal backend e, se lo stato è `4:<tratt>:ARR` o `6`, offre upload DDT (file + numero/data).

- `GestioneStati.jsx` / `Configurazioni.jsx`
  - File: `component-tracker/frontend/src/GestioneStati.jsx`, `Configurazioni.jsx` (Configurazioni raggruppa gestione utenti e stati)
  - Layout: AntD `Table` editabile per `WorkStatus`, con possibilità di riordinare (`order`) e abilitare/disabilitare (`active`).
  - Icone: `SettingOutlined`, `EditOutlined`, `PlusOutlined`, `DeleteOutlined`.
  - API: `GET /getstati`, `POST /getstati` (salva lista), eventualmente `PUT /getstati/:id` se si normalizza come resource.
  - Comportamento: drag/reorder opzionale o editing numerico di `order`; validazioni per codici unici; preview rapido degli stati usati nel Dettaglio Commessa.

- `GestioneUtenti.jsx`
  - File: `component-tracker/frontend/src/GestioneUtenti.jsx`
  - Layout: AntD `Table` con colonne: username, profilo, email, azioni; `Modal` per creare/aggiornare utente (password opzionale per reset).
  - Icone: `TeamOutlined`, `UserAddOutlined`, `DeleteOutlined`.
  - API: `GET /users`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id` (se esposti dal backend).
  - Comportamento: gestione permessi via campo `profilo`; limitare azioni in UI basate sul `profilo` dell'utente loggato.

- `Reporting.jsx`
  - File: `component-tracker/frontend/src/Reporting.jsx`
  - Layout: dashboard con più chart (Recharts): pie (distribuzione stati), bar (trattamenti), line (trend), heatmap o tabella sintetica.
  - Icone: `BarChartOutlined`, `PieChartOutlined`.
  - API: `GET /components` + aggregazioni lato frontend oppure endpoint dedicati (consigliato: `GET /reporting/summary` se il backend fornisce).
  - Comportamento: filtri per range temporale e commessa; export immagini o CSV per report.

- `App.jsx` / `main.jsx` (shell applicativa)
  - File: `component-tracker/frontend/src/App.jsx`, `main.jsx`
  - Layout: AntD `Layout` con `Sider` (sidebar nav), `Header` (quicksearch + user menu), `Content` wrapper; importa `antd/dist/reset.css` e `index.css` (Tailwind + overrides).
  - Icone: `MenuFoldOutlined` / `MenuUnfoldOutlined`, `LogoutOutlined`, `SearchOutlined`.
  - API: nessuna API diretta ma monta `axios` interceptor dal `src/api.js` per gestione auth, error handling e refresh token flow.
  - Comportamento: route protection (redirect a `/login` se non autenticato), global error handling, layout responsive (sidebar collapsible), QuickSearch invoca `GET /components`.

- Utility components (riutilizzabili)
  - `CommesseTable.jsx` (tabella riutilizzabile), `BarcodeWithText.jsx` (render statico barcode), `api.js` (axios singleton), piccoli widget per metriche.
  - Usare AntD components per coerenza visiva e Tailwind per utilità come spacing e responsive helpers.

Note tecniche comuni
- Styling: seguire le regole R-STY-001..R-STY-006: AntD per componenti, Tailwind per utilities.
- File upload: usare AntD `Upload` in modalità `beforeUpload` che costruisce `FormData` con i campi `ddtFile`, `ddtNumber`, `ddtDate`, invia a `PUT /components/:id` o endpoint dedicato.
- AllowedStatuses: la UI mostra `allowedStatuses` ricevuto dal componente backend e può presentare una subset "consigliata" (es. next states) ma invierà sempre il valore scelto al backend per validazione.
- Permessi: disabilitare pulsanti/azioni basate sul `profilo` e sulle regole in `WorkStatus.profili`.

## 99) Next steps consigliati per il bootstrap del nuovo progetto

1. Creare repository skeleton (frontend + backend) con gli stessi percorsi e package.json minimi.
2. Implementare i modelli Mongoose (Commessa, Component, Documento, WorkStatus, User) copiando i campi chiave qui sopra.
3. Implementare endpoint auth JWT e middleware auth (replicare interceptor axios sul frontend).
4. Implementare seed iniziale per `WorkStatus` e un utente di default (come fa il server.js attuale).
5. Creare componenti frontend: Login, ListaCommesse, DettaglioCommessa (tabella con inline edit), Reporting.
