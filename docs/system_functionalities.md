# Sistema Omega Components Tracker - Analisi Funzionalità

## 📖 Panoramica del Sistema

**Omega Components Tracker** è un sistema di gestione e tracciamento di componenti industriali progettato per monitorare il ciclo di vita di produzione e trattamento di componenti attraverso diverse fasi operative.

### Architettura Tecnica
- **Backend**: Node.js + Express.js + MongoDB (Mongoose ODM)
- **Frontend**: React + Vite + Ant Design
- **Autenticazione**: JWT (Access Token + Refresh Token con cookie HttpOnly)
- **Database**: MongoDB con collezioni per Utenti, Commesse, Componenti, Stati, Notifiche
- **File Storage**: Sistema locale + Azure File Share (opzionale)

---

## 🔐 Sistema di Autenticazione e Autorizzazione

### Funzionalità di Login
Il sistema implementa un'autenticazione JWT con refresh token per garantire sicurezza e usabilità.

**Endpoints Autenticazione:**
- `POST /auth/login` - Login utente
- `POST /auth/refresh` - Rinnovo access token
- `POST /auth/logout` - Logout e revoca token

**Flusso di Autenticazione:**
1. L'utente inserisce username/password nella pagina di login
2. Il server verifica le credenziali e genera:
   - **Access Token** (JWT, durata 15 minuti) - inviato al client
   - **Refresh Token** (JWT, durata 180 giorni) - salvato in cookie HttpOnly
3. Il frontend salva l'access token in localStorage
4. Ogni richiesta API include l'header `Authorization: Bearer <access_token>`
5. In caso di token scaduto (401), l'interceptor axios richiama automaticamente `/auth/refresh`
6. Al logout, il refresh token viene revocato e i cookies puliti

**Profili Utente:**
- **ADMIN**: Accesso completo, gestione utenti
- **UFF**: Utente ufficio, accesso alle funzionalità operative
- **Personalizzato**: Altri profili definibili

### Credenziali Demo
- Username: `d` 
- Password: `d`

---

## 👥 Gestione Utenti (Solo Amministratori)

### Funzionalità CRUD Utenti
Disponibile solo per utenti con profilo ADMIN.

**Endpoints Utenti:**
- `GET /api/utenti` - Lista tutti gli utenti
- `POST /api/utenti` - Crea nuovo utente
- `PUT /api/utenti/:id` - Aggiorna utente esistente
- `DELETE /api/utenti/:id` - Elimina utente

**Campi Utente:**
- `username` (unico, obbligatorio)
- `email` (opzionale)
- `profilo` (default: 'UFF')
- `password` (hash bcrypt, obbligatorio alla creazione)

**Validazioni:**
- Username deve essere unico
- Gli admin non possono cancellare se stessi
- Password hashata con bcrypt (salt rounds: 10)

---

## 📋 Gestione Commesse

### Funzionalità Commesse
Le **Commesse** rappresentano ordini/progetti che contengono più componenti da processare.

**Endpoints Commesse:**
- `GET /api/commesse` - Lista tutte le commesse
- `GET /api/commesse/:id` - Dettaglio commessa specifica
- `POST /api/commesse` - Crea nuova commessa
- `PUT /api/commesse/:id` - Aggiorna commessa
- `DELETE /api/commesse/:id` - Elimina commessa

**Struttura Commessa:**
```javascript
{
  _id: ObjectId,
  code: "string", // Codice univoco (es. "ORD-001")
  name: "string", // Nome descrittivo
  notes: "string", // Note opzionali
  createdAt: Date
}
```

**Funzionalità Speciali:**
- **Import Excel**: Caricamento di file Excel per creare commessa + componenti automaticamente
- **Export Excel**: Esportazione dati commessa e componenti associati
- **Vincoli**: Il codice commessa deve essere univoco

---

## 🔧 Gestione Componenti

### Sistema di Tracciamento Componenti
I **Componenti** sono gli elementi tracciati attraverso le fasi di produzione e trattamento.

**Endpoints Componenti:**
- `GET /api/components` - Lista componenti (con paginazione e filtri)
- `GET /api/components/:id` - Dettaglio componente
- `GET /api/components/commessa/:commessaId` - Componenti di una commessa
- `POST /api/components` - Crea nuovo componente
- `PUT /api/components/:id` - Aggiorna componente
- `DELETE /api/components/:id` - Soft delete componente

**Struttura Componente:**
```javascript
{
  _id: ObjectId,
  commessaId: ObjectId, // Riferimento alla commessa
  commessaCode: "string", // Codice commessa (denormalizzato)
  commessaName: "string", // Nome commessa (denormalizzato)
  descrizioneComponente: "string", // Nome/descrizione del componente
  barcode: "string", // Codice a barre univoco
  status: "string", // Stato corrente del workflow
  allowedStatuses: ["string"], // Stati consentiti per le transizioni
  trattamenti: ["string"], // Lista trattamenti da eseguire
  history: [HistoryEntry], // Cronologia cambi stato
  cancellato: boolean, // Soft delete flag
  verificato: boolean, // Flag verifica qualità
  // Campi tecnici opzionali:
  level: "string",
  crit: "string", 
  bom_text: "string",
  oda_text: "string",
  qty_u: Number,
  uta_u: "string",
  qty_t: Number,
  uta_t: "string",
  componentNotes: "string"
}
```

### Sistema di Stati (Workflow)

**Stati Base del Workflow:**
1. **'1' - Nuovo**: Componente appena creato
2. **'2' - Produzione Interna**: In produzione interna
3. **'2-ext' - Produzione Esterna**: In produzione presso fornitori esterni
4. **'3' - Costruito**: Produzione completata
5. **'4' - In trattamento**: Stati dinamici per trattamenti specifici
6. **'5' - Pronto per consegna**: Pronto per la spedizione
7. **'6' - Spedito**: Consegnato al cliente

**Stati di Trattamento Dinamici:**
Il sistema supporta trattamenti personalizzati con sotto-stati:
- Formato: `4:<NOME_TRATTAMENTO>:<FASE>`
- Fasi possibili:
  - `PREP` - In preparazione per il trattamento
  - `IN` - In trattamento presso fornitore
  - `ARR` - Arrivato da trattamento

**Esempi di Stati di Trattamento:**
- `4:nichelatura:PREP` - "In preparazione nichelatura"
- `4:nichelatura:IN` - "In trattamento nichelatura"  
- `4:nichelatura:ARR` - "Arrivato da nichelatura"
- `4:verniciatura:PREP` - "In preparazione verniciatura"

**Transizione Automatica:**
Quando tutti i trattamenti di un componente raggiungono lo stato `ARR`, il sistema automaticamente transiziona il componente allo stato `5 - Pronto per consegna`.

**Trattamenti Supportati** (esempi dal codice):
- nichelatura, marcatura, affettatura
- zincatura, verniciatura, assemblaggio  
- sabbiatura, anodizzazione, controllo qualità, packaging

---

## 📊 Sistema di Cambi Stato

### Gestione Transizioni di Stato
Il sistema traccia ogni cambio di stato con cronologia dettagliata.

**Endpoint Cambio Stato:**
- `POST /api/changestatus` - Cambia stato di un componente

**Payload Cambio Stato:**
```javascript
{
  componentId: "ObjectId",
  newStatus: "string", // Nuovo stato
  note: "string", // Note opzionali
  user: "string", // Utente che effettua il cambio
  // Per stati ARR e SPEDITO:
  ddtNumber: "string", // Numero DDT (opzionale)
  ddtDate: "Date" // Data DDT (opzionale)
}
```

**Cronologia Cambi Stato:**
Ogni transizione viene registrata nell'array `history` del componente:
```javascript
{
  from: "stato_precedente",
  to: "nuovo_stato", 
  date: Date,
  user: "username",
  note: "note_opzionali",
  ddt: { // Solo per ARR e SPEDITO
    number: "DDT-123",
    date: Date
  }
}
```

**Validazioni:**
- Lo stato di destinazione deve essere presente in `allowedStatuses`
- Alcune transizioni richiedono informazioni DDT
- Il sistema impedisce transizioni non consentite

---

## 📈 Sistema di Reporting e Statistiche

### Dashboard Statistiche Operative
Il sistema fornisce metriche in tempo reale per monitorare l'andamento operativo.

**Endpoint Statistiche:**
- `GET /api/stats` - Statistiche generali dashboard

**Metriche Disponibili:**
1. **In Lavorazione**: Numero di componenti non ancora spediti (status ≠ '6')
2. **Da Spedire**: Componenti pronti per la consegna (status = '5')
3. **Non Verificati**: Percentuale di componenti non verificati sui non spediti
4. **Spediti Oggi**: Componenti spediti nella giornata corrente
5. **Distribuzione per Stato**: Conteggio componenti per ogni stato
6. **Trattamenti Attivi**: Analisi dei trattamenti in corso
7. **Performance per Commessa**: Avanzamento per ogni commessa

**Esempi di Calcoli:**
- Percentuale di verifica = (Componenti non verificati / Totale non spediti) × 100
- Spediti oggi = Componenti con transizione a stato '6' nelle ultime 24h
- Avanzamento commessa = (Componenti spediti / Totale componenti) × 100

---

## 🔔 Sistema di Notifiche

### Gestione Notifiche di Sistema
Il sistema gestisce notifiche per eventi importanti e promemoria.

**Endpoints Notifiche:**
- `GET /api/notifications` - Lista notifiche per l'utente
- `POST /api/notifications` - Crea nuova notifica
- `PUT /api/notifications/:id/read` - Marca notifica come letta

**Tipi di Notifiche:**
- **Info**: Informazioni generali
- **Warning**: Avvisi (es. ritardi, scadenze)
- **Error**: Errori critici
- **Success**: Conferme operazioni completate

**Struttura Notifica:**
```javascript
{
  _id: ObjectId,
  userId: ObjectId, // Destinatario (null = broadcast)
  type: "info|warning|error|success",
  title: "string",
  message: "string", 
  read: boolean,
  createdAt: Date,
  // Metadati opzionali:
  componentId: ObjectId,
  commessaId: ObjectId,
  relatedAction: "string"
}
```

---

## 📁 Gestione File e Documenti

### Sistema di Upload e Gestione File
Il sistema supporta l'upload di documenti associati ai componenti.

**Endpoints File:**
- `POST /api/files/upload` - Upload file multipart
- `GET /api/files/:id` - Download file
- `DELETE /api/files/:id` - Eliminazione file

**Tipologie di File Supportate:**
- Documenti tecnici (PDF, DOC, DOCX)
- Immagini (JPG, PNG, GIF)
- Fogli di calcolo (XLS, XLSX)
- Disegni CAD (DWG, DXF)

**Integrazione con Azure File Share:**
- Storage locale per sviluppo
- Azure File Share per produzione
- Gestione automatica backup e sincronizzazione

**Metadati File:**
```javascript
{
  filename: "nome_originale.pdf",
  path: "percorso/storage",
  mimetype: "application/pdf", 
  size: 1024,
  uploadedBy: "username",
  uploadedAt: Date,
  componentId: ObjectId // File associato al componente
}
```

---

## 🔍 Funzionalità di Ricerca e Filtri

### Sistema di Ricerca Avanzata
Il sistema offre potenti funzionalità di ricerca e filtri.

**Filtri Componenti:**
- **Ricerca Testuale**: Per nome componente, codice commessa, barcode
- **Filtro per Commessa**: Visualizza solo componenti di una commessa specifica
- **Filtro per Stato**: Filtra per stato corrente del workflow
- **Filtro per Trattamento**: Componenti con specifici trattamenti
- **Filtro per Data**: Range di date creazione/modifica
- **Filtro Verificato**: Solo componenti verificati/non verificati

**Paginazione:**
- Dimensione pagina configurabile (default: 25 elementi)
- Supporto navigazione pagine
- Conteggio totale risultati

**Ricerca Commesse:**
- Per codice commessa
- Per nome commessa  
- Per data di creazione
- Per stato di avanzamento

---

## 🔄 Import/Export Dati

### Gestione Dati Excel
Il sistema supporta import/export massivi tramite file Excel.

**Import Excel:**
- `POST /api/components/import-excel` - Import file Excel
- Crea automaticamente commessa + componenti
- Parsing automatico colonne standard
- Validazione dati in real-time
- Report errori import

**Export Excel:**
- `GET /api/components/export-excel` - Export dati componenti
- Filtri applicabili all'export
- Formato Excel standard con metadati
- Include cronologia cambi stato

**Formato Excel Standard:**
```
Colonne supportate:
- Codice Commessa, Nome Commessa, Note Commessa
- Descrizione Componente, Barcode, Stato
- Livello, Criticità, BOM Text, ODA Text
- Quantità Unitaria, UTA Unitaria
- Quantità Totale, UTA Totale
- Trattamenti (separati da virgola/punto e virgola)
```

---

## 🖥️ Interfaccia Utente (Frontend)

### Pagine Principali del Sistema

**1. Dashboard Home (`/`)**
- Statistiche operative in tempo reale
- Widget riassuntivi per area funzionale
- Accesso rapido alle funzioni più usate
- Notifiche importanti

**2. Lista Commesse (`/commesse`)**
- Tabella completa commesse con ricerca
- Filtri per stato, data, avanzamento
- Pulsanti per import/export Excel
- Azione "Crea Nuova Commessa"

**3. Dettaglio Commessa (`/commesse/:id`)**
- Informazioni commessa (nome, codice, note)
- Tabella componenti associati con editing inline
- Area per quick-actions (cambio stato massivo, upload file)
- Cronologia e note commessa
- Statistiche avanzamento

**4. Lavorazioni in Corso (`/lavorazioni`)**
- Vista componenti attualmente in lavorazione
- Filtri per stato, trattamento, scadenze
- Vista a card per componenti prioritari
- Azioni rapide cambio stato

**5. Gestione Utenti (`/configurazioni/utenti`) - Solo Admin**
- CRUD completo utenti
- Gestione profili e permessi
- Reset password
- Storico accessi

**6. Reporting (`/reporting`)**
- Dashboard grafici avanzati
- Distribuzione stati con chart
- Performance per commessa
- Trend giornalieri e settimanali
- Export report personalizzati

**7. Manuale Utente (`/manuale`)**
- Documentazione integrata
- Guide passo-passo
- FAQ e troubleshooting

### Caratteristiche UX

**Navigazione:**
- Menu laterale con evidenziazione stato attivo
- Breadcrumb per contesto navigazione
- Ricerca globale in header

**Azioni Rapide:**
- Pulsanti contestuali per azioni frequenti
- Toolbar flottante in pagine dettaglio
- Shortcuts da tastiera

**Responsive Design:**
- Ottimizzato per desktop (primario)
- Supporto tablet e mobile
- Layout adattivo con Ant Design

**Gestione Errori:**
- Messaggi informativi per operazioni
- Validazione real-time form
- Fallback per errori di rete

---

## 🛡️ Sicurezza e Validazioni

### Misure di Sicurezza Implementate

**Autenticazione e Autorizzazione:**
- JWT con refresh token rotation
- Cookie HttpOnly per refresh token
- Middleware di autenticazione su tutte le API protette
- Controllo profili per operazioni sensibili

**Validazione Dati:**
- Validazione server-side su tutti gli input
- Sanitizzazione dati per prevenire injection
- Controlli integrità referenziale
- Validazione formato file upload

**Protezione CORS:**
- Configurazione CORS restrittiva
- Whitelist domini consentiti
- Headers di sicurezza appropriati

**Password Security:**
- Hash bcrypt con salt automatico
- Politiche password configurabili
- Protezione contro brute force (implementabile)

---

## 🔧 Configurazione e Deployment

### Variabili di Ambiente

**Backend (.env):**
```
NODE_ENV=production|development
PORT=4000
MONGO_URI=mongodb://localhost:27017/omega
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
FRONTEND_ORIGIN_STAGE=http://localhost:5173
FRONTEND_ORIGIN_PROD=https://your-domain.com
AZURE_STORAGE_CONNECTION_STRING=...
```

**Frontend (.env):**
```
VITE_API_URL=http://localhost:4000
```

### Struttura Deployment

**Sviluppo:**
- Backend: `npm run dev` (nodemon)
- Frontend: `npm run dev` (Vite dev server)
- Database: MongoDB locale

**Produzione:**
- Backend: Docker container + PM2
- Frontend: Build statico servito via CDN/nginx
- Database: MongoDB Atlas o server dedicato
- File Storage: Azure File Share

---

## 🧪 Testing e Qualità

### Strategia di Testing Attuale

**Unit Tests (Jest):**
- Test modelli Mongoose
- Test utility functions
- Test middleware autenticazione
- Test API endpoints con mock database

**Integration Tests:**
- Test end-to-end API workflows
- Test import/export Excel
- Test cambio stato con validazioni

**Copertura Test:**
- Routes: auth, utenti, commesse, components, stats
- Models: validazioni e business logic
- Utils: statusUtils, jwt helpers

### Test Infrastructure

**Configurazione:**
- Jest come test runner
- MongoDB Memory Server per test isolation
- Supertest per HTTP requests
- Mock per dipendenze esterne

**Ambiente Test:**
- Database in-memory per ogni test suite
- Cleanup automatico tra test
- Fixtures per dati di test
- Assert dettagliati per debugging

---

## 📋 Checklist Funzionalità Complete

### ✅ Funzionalità Implementate

**Autenticazione:**
- [x] Login/logout con JWT
- [x] Refresh token con rotation
- [x] Middleware autenticazione
- [x] Gestione profili utente

**Gestione Utenti:**
- [x] CRUD completo utenti (solo admin)
- [x] Validazione username univoco
- [x] Hash password bcrypt
- [x] Prevenzione auto-cancellazione admin

**Gestione Commesse:**
- [x] CRUD commesse
- [x] Validazione codice univoco
- [x] Import/export Excel
- [x] Associazione componenti

**Gestione Componenti:**
- [x] CRUD componenti con soft delete
- [x] Sistema stati con workflow
- [x] Cronologia cambi stato
- [x] Trattamenti dinamici
- [x] Transizioni automatiche
- [x] Ricerca e filtri avanzati
- [x] Paginazione

**Sistema Stati:**
- [x] Stati base e trattamenti
- [x] Validazione transizioni
- [x] Auto-transizione "Pronto per consegna"
- [x] Cronologia dettagliata
- [x] Metadati DDT

**Reporting:**
- [x] Statistiche dashboard
- [x] Metriche operative
- [x] Distribuzione stati
- [x] Performance commesse

**File Management:**
- [x] Upload multipart
- [x] Associazione file-componenti
- [x] Metadati file
- [x] Integrazione Azure (opzionale)

**Notifiche:**
- [x] Sistema notifiche utente
- [x] Tipologie notifiche
- [x] Gestione lettura/non lettura

**Frontend UI:**
- [x] Layout responsive Ant Design
- [x] Pagine principali implementate
- [x] Login page con design moderno
- [x] Dashboard statistiche
- [x] Liste e dettagli componenti/commesse
- [x] Gestione utenti (admin)
- [x] Sistema navigazione

### 🔄 Funzionalità Parziali o Estendibili

**Reporting Avanzato:**
- [ ] Grafici interattivi più dettagliati
- [ ] Export report personalizzati
- [ ] Dashboard filtrabili per periodo

**Notifiche Avanzate:**
- [ ] Notifiche push real-time
- [ ] Email notifications
- [ ] Notifiche per scadenze automatiche

**Funzionalità Aggiuntive:**
- [ ] API rate limiting
- [ ] Audit log dettagliato
- [ ] Backup automatico dati
- [ ] Integrazione ERP esterni

---

## 🎯 Casi d'Uso Principali

### Scenario 1: Creazione e Tracciamento Commessa Completa

1. **Admin crea nuova commessa**
   - Login come admin
   - Naviga a `/commesse`
   - Crea commessa "ORD-2024-001" con nome "Progetto Alpha"

2. **Import componenti da Excel**
   - Upload file Excel con 50 componenti
   - Sistema crea automaticamente tutti i componenti con stato '1 - Nuovo'
   - Assegna trattamenti: verniciatura, assemblaggio

3. **Avvio produzione**
   - Operatore seleziona componenti e cambia stato a '2 - Produzione Interna'
   - Sistema registra cronologia con timestamp e utente

4. **Gestione trattamenti**
   - Completata produzione: stato '3 - Costruito'
   - Invio a verniciatura: '4:verniciatura:PREP' → '4:verniciatura:IN'
   - Rientro da verniciatura: '4:verniciatura:ARR'
   - Invio assemblaggio: '4:assemblaggio:PREP' → '4:assemblaggio:IN' → '4:assemblaggio:ARR'
   - Sistema auto-transizione a '5 - Pronto per consegna'

5. **Spedizione e chiusura**
   - Operatore aggiunge DDT e cambia stato a '6 - Spedito'
   - Sistema aggiorna statistiche in tempo reale

### Scenario 2: Monitoraggio e Reporting Operativo

1. **Check mattutino dashboard**
   - Manager accede alla home
   - Visualizza: 120 in lavorazione, 25 da spedire, 15% non verificati
   - Identifica colli di bottiglia

2. **Analisi dettagliata**
   - Naviga al reporting
   - Filtra per ultime 2 settimane
   - Analizza trend spedizioni e tempi medi per stato

3. **Azioni correttive**
   - Identifica componenti in ritardo su trattamenti
   - Controlla DDT mancanti
   - Coordina priorità con team operativo

---

Questo documento rappresenta un'analisi completa e self-explanatory del sistema Omega Components Tracker, fornendo tutte le informazioni necessarie per comprendere, utilizzare e estendere il sistema.