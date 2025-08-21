# Architettura di Sistema - Omega Components Tracker

## Panoramica Generale

Omega Components Tracker è un sistema di tracciamento del ciclo di vita dei componenti manifatturieri progettato per gestire commesse, componenti e flussi di lavorazione. Il sistema è implementato come una **Single Page Application (SPA)** con architettura **client-server moderna** che separa completamente frontend e backend.

### Caratteristiche Architetturali Principali

- **Architettura**: Microservizi containerizzati con separazione frontend/backend
- **Database**: MongoDB come database documentale principale
- **Autenticazione**: JWT-based con refresh token per sicurezza
- **Deploy**: CI/CD automatizzato con Docker e AWS ECR
- **Scalabilità**: Containerizzazione completa con reverse proxy
- **File Storage**: Azure File Share per gestione documenti

---

## Architettura a Livello Alto

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Utenti Web    │    │   Utenti Mobile │    │  API Esterne    │
│   (Browser)     │    │   (Futuro)      │    │  (Integrazioni) │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                   ┌─────────────▼─────────────┐
                   │     Traefik Proxy         │
                   │   (SSL/Load Balancer)     │
                   └─────────────┬─────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
          ┌─────────▼───────┐        ┌───────▼────────┐
          │ Frontend (SPA)  │        │ Backend API    │
          │ React + Vite    │        │ Node.js + Exp. │
          │ Ant Design      │        │ JWT Auth       │
          └─────────────────┘        └───────┬────────┘
                                             │
                              ┌─────────────▼─────────────┐
                              │     Livello Dati          │
                              │                           │
                    ┌─────────▼─────────┐   ┌─────────────▼──────────┐
                    │    MongoDB        │   │   Azure File Share     │
                    │  (Dati Business)  │   │  (Files & Documenti)   │
                    └───────────────────┘   └────────────────────────┘
```

---

## Frontend - React SPA

### Stack Tecnologico

| Componente | Tecnologia | Versione | Ruolo |
|------------|-----------|----------|--------|
| **Framework** | React | 18.2.0 | Base SPA |
| **Build Tool** | Vite | 5.1.5 | Bundling e Dev Server |
| **UI Framework** | Ant Design | 5.8.6 | Componenti UI |
| **Styling** | Tailwind CSS | Implicitamente configurato | Utility CSS |
| **HTTP Client** | Axios | 1.4.0 | API Communication |
| **Routing** | React Router DOM | 6.14.1 | Navigation |
| **State Management** | React Context | Built-in | Auth & Global State |

### Struttura del Frontend

```
omega-app/frontend/
├── src/
│   ├── components/         # Componenti riutilizzabili
│   ├── pages/             # Pagine dell'applicazione
│   │   ├── LoginPage.jsx  # Autenticazione
│   │   ├── Commesse.jsx   # Gestione commesse
│   │   ├── DettaglioCommessa.jsx  # Dettaglio singola commessa
│   │   ├── Lavorazioni.jsx        # Tracciamento componenti
│   │   ├── GestioneUtenti.jsx     # Admin users
│   │   ├── Notifiche.jsx          # Sistema notifiche
│   │   └── ViewFiles.jsx          # Visualizzazione documenti
│   ├── AuthContext.jsx    # Context per autenticazione
│   ├── api.js            # Configurazione client HTTP
│   ├── App.jsx           # Root component
│   └── main.jsx          # Entry point
├── Dockerfile            # Container configuration
└── vite.config.js        # Build configuration
```

### Funzionalità Chiave

1. **Autenticazione e Autorizzazione**
   - Login con username/password
   - JWT token storage in localStorage
   - Refresh token automatico via HTTP-only cookies
   - Context globale per stato autenticazione

2. **Gestione Commesse**
   - Creazione, modifica, eliminazione commesse
   - Vista lista e dettaglio
   - Codici univoci e validazione

3. **Tracciamento Componenti**
   - Visualizzazione ciclo di vita componenti
   - Cambio stato con storico
   - Upload documenti e DDT
   - Barcode generation/scanning

4. **Interfaccia Amministrativa**
   - Gestione utenti e profili
   - Configurazione stati sistema
   - Dashboard statistiche

---

## Backend - Node.js API

### Stack Tecnologico

| Componente | Tecnologia | Versione | Ruolo |
|------------|-----------|----------|--------|
| **Runtime** | Node.js | LTS | Server Environment |
| **Framework** | Express | 4.18.2 | Web Framework |
| **Database** | MongoDB | via Mongoose 7.0.0 | Data Persistence |
| **Authentication** | JWT | jsonwebtoken 9.0.2 | Token Management |
| **Password** | bcryptjs | 2.4.3 | Password Hashing |
| **File Upload** | Multer | 1.4.5-lts.1 | File Handling |
| **File Storage** | Azure File Share | @azure/storage-file-share 12.28.0 | Cloud Storage |
| **Excel** | xlsx | 0.18.5 | Import/Export |

### Struttura del Backend

```
omega-app/backend/
├── models/                 # Data Models (Mongoose)
│   ├── User.js            # Utenti e profili
│   ├── Commessa.js        # Commesse/ordini
│   ├── Component.js       # Componenti tracciati
│   ├── WorkStatus.js      # Stati configurabili
│   ├── Notification.js    # Sistema notifiche
│   └── RefreshToken.js    # Token management
├── routes/                # API Endpoints
│   ├── auth.js           # Autenticazione (/auth/*)
│   ├── commesse.js       # Gestione commesse (/commesse/*)
│   ├── components.js     # Gestione componenti (/components/*)
│   ├── changestatus.js   # Cambio stato (/changestatus)
│   ├── files.js          # File management (/files/*)
│   ├── stats.js          # Statistiche (/stats/*)
│   ├── utenti.js         # Gestione utenti (/utenti/*)
│   └── notifications.js  # Notifiche (/notifications/*)
├── middleware/            # Middleware Express
│   └── auth.js           # JWT verification
├── utils/                # Utility functions
│   └── statusUtils.js    # Logica stati condivisa
├── tests/                # Test suite
├── upload/               # Temporary upload directory
└── server.js             # Application entry point
```

### API Endpoints Principali

#### Autenticazione (`/auth/*`)
- `POST /auth/login` - Login utente
- `POST /auth/register` - Registrazione
- `GET /auth/verify-token` - Verifica token
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout

#### Commesse (`/commesse/*`)
- `GET /commesse` - Lista commesse
- `POST /commesse` - Crea commessa
- `GET /commesse/:id` - Dettaglio commessa
- `PUT /commesse/:id` - Aggiorna commessa
- `DELETE /commesse/:id` - Elimina commessa

#### Componenti (`/components/*`)
- `GET /components` - Lista componenti (con paginazione)
- `POST /components` - Crea componente
- `GET /components/:id` - Dettaglio componente
- `PUT /components/:id` - Aggiorna componente
- `DELETE /components/:id` - Soft delete componente
- `POST /components/import-excel` - Import Excel
- `GET /components/export-excel` - Export Excel
- `POST /components/send-report` - Invio report email

#### Gestione Stati
- `POST /changestatus` - Cambio stato con storico
- `GET /getstati` - Lista stati configurabili
- `POST /getstati` - Aggiorna configurazione stati

---

## Database - Modello Dati

### MongoDB Collections

#### Users
```javascript
{
  _id: ObjectId,
  username: String (unique),
  password: String (bcrypt hashed),
  email: String,
  profilo: String (default: 'UFF'), // UFF, ADMIN
  createdAt: Date
}
```

#### Commesse (Work Orders)
```javascript
{
  _id: ObjectId,
  code: String (unique),
  name: String,
  notes: String,
  createdAt: Date
}
```

#### Components (Core Entity)
```javascript
{
  _id: ObjectId,
  commessaId: ObjectId (ref: Commessa),
  commessaCode: String,
  commessaName: String,
  commessaNotes: String,
  commessaCreatedAt: Date,
  
  // Component data
  componentNotes: String,
  level: String,
  crit: String,
  bom_text: String,
  oda_text: String,
  qty_u: Number,
  uta_u: String,
  qty_t: Number,
  uta_t: String,
  trattamenti: [String],      // Array trattamenti (es: ["ZINCATURA", "VERNICIATURA"])
  descrizioneComponente: String,
  barcode: String,
  
  // Workflow state
  status: String,             // Stato corrente
  allowedStatuses: [String],  // Stati consentiti (auto-generati)
  
  // History tracking
  history: [{
    from: String,
    to: String,
    date: Date,
    note: String,
    user: String,
    ddt: {                   // DDT per singola transizione
      number: String,
      date: Date
    }
  }],
  
  // Document management
  ddt: [{                    // DDT associati al componente
    number: String,
    date: Date,
    files: [{
      filename: String,
      path: String,
      mimetype: String,
      size: Number,
      uploadedBy: String,
      uploadedAt: Date
    }],
    note: String,
    createdBy: String,
    createdAt: Date
  }],
  
  // Flags
  verificato: Boolean,
  cancellato: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### WorkStatus
```javascript
{
  _id: ObjectId,
  code: String (unique),
  label: String,
  order: Number,
  active: Boolean,
  profili: [String],    // Profili autorizzati
  note: String
}
```

### Sistema Stati Avanzato

Il sistema implementa una **state machine configurabile** per il tracking del ciclo di vita:

#### Stati Base
- `1` - Nuovo
- `2` - Produzione Interna 
- `2-ext` - Produzione Esterna
- `3` - Costruito
- `4` - In trattamento
- `5` - Pronto per consegna
- `6` - Spedito

#### Stati Trattamento Dinamici
Formato: `4:<NOME_TRATTAMENTO>:<FASE>`

Fasi disponibili:
- `PREP` - In preparazione
- `IN` - In trattamento
- `ARR` - Arrivato da trattamento

Esempi:
- `4:ZINCATURA:PREP` - Zincatura in preparazione
- `4:ZINCATURA:IN` - In zincatura
- `4:ZINCATURA:ARR` - Arrivato da zincatura

#### Logica Automatica
- **Auto-transizione**: Quando tutti i trattamenti sono `ARR`, il componente passa automaticamente a "Pronto per consegna"
- **Stati Consentiti**: Calcolati dinamicamente in base ai trattamenti definiti
- **Validazione**: Impedisce transizioni non valide

---

## Livello di Storage

### MongoDB Database
- **Scopo**: Persistence di tutti i dati business
- **Deployment**: Istanza MongoDB dedicata
- **Backup**: Automatico pre-deploy in produzione
- **Indici**: Ottimizzati per query frequenti

### Azure File Share
- **Scopo**: Storage files e documenti allegati
- **Integrazione**: SDK @azure/storage-file-share
- **Organizzazione**: Struttura gerarchica per componente/DDT
- **Sicurezza**: Accesso via Azure Storage Account keys

---

## Infrastructure & Deployment

### Containerizzazione

#### Frontend Container
```dockerfile
# Multi-stage build
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

#### Backend Container
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["node", "server.js"]
```

### Reverse Proxy - Traefik

Configurazione production con:
- **SSL/TLS**: Let's Encrypt automatico
- **Load Balancing**: Multi-container support
- **Service Discovery**: Docker labels
- **Headers**: CORS e security headers

### CI/CD Pipeline (GitHub Actions)

```yaml
Trigger: Push su main/staging
Steps:
1. Checkout codice
2. AWS ECR Login
3. Docker Build & Push (Frontend/Backend)
4. SSH su AWS Lightsail
5. Docker Compose Pull & Up
6. Health Checks
```

**Branching Strategy:**
- `main` → Produzione
- `staging` → Staging environment  
- `feature/*` → Development

### Environment Management

| Environment | Branch | Deployment | URL |
|-------------|---------|------------|-----|
| **Development** | `feature/*` | Locale | `localhost:5173` |
| **Staging** | `staging` | Auto su push | `staging.domain.com` |
| **Production** | `main` | Auto su push | `tracker.omega.intellitude.com` |

---

## Sicurezza

### Autenticazione & Autorizzazione
- **JWT Access Token**: Short-lived (es. 15 min)
- **Refresh Token**: HTTP-only cookie, long-lived
- **Password Hashing**: bcrypt con salt rounds appropriati
- **Profili**: `UFF` (standard), `ADMIN` (amministrativo)

### CORS Policy
```javascript
allowedOrigins: [
  'http://localhost:5173',    // Dev
  'http://localhost:5174',    // Dev alternative
  process.env.FRONTEND_ORIGIN_STAGE,   // Staging
  process.env.FRONTEND_ORIGIN_PROD     // Production
]
```

### File Upload Security
- **Validazione MIME**: Controllo tipo file
- **Size Limits**: Configurabili via Multer
- **Sanitizzazione**: Path e filename
- **Storage Isolato**: Azure File Share separato

---

## Shared Logic

### StatusConfig Module (`/shared/statusConfig.js`)

Modulo **isomorfico** che funziona sia nel frontend che nel backend:

```javascript
// Export ES6 per frontend
export const BASE_STATUSES = { ... }
export function buildAllowedStatuses(component) { ... }

// Export CommonJS per backend
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BASE_STATUSES, buildAllowedStatuses, ... }
}
```

**Vantaggi:**
- **DRY Principle**: Logica business centralizzata
- **Consistency**: Stessi algoritmi client/server
- **Maintainability**: Single source of truth

---

## Integrazioni Esterne

### Azure Storage
- **Account**: Configurato via environment variables
- **Autenticazione**: Account keys
- **Struttura**: File organizzati per componente e DDT

### Email Service (Futuro)
- **Provider**: Da implementare (SendGrid, AWS SES)
- **Uso**: Report automatici, notifiche

### Excel Import/Export
- **Libreria**: xlsx.js
- **Formato**: Supporto .xlsx e .xls
- **Validazione**: Schema-based import

---

## Monitoring & Observability

### Logs
- **Backend**: Console.log strutturato
- **Frontend**: Browser console + error boundaries
- **Infrastructure**: Docker logs

### Health Checks
- **Backend**: Endpoint `/health`
- **Database**: Connection monitoring
- **Files**: Azure storage availability

### Metriche (Da Implementare)
- **Performance**: Response times
- **Business**: Componenti processati, stati transizioni
- **Errors**: Error rates e categorizzazione

---

## Flussi di Dati Principali

### 1. Autenticazione
```
User → Frontend → POST /auth/login → Backend → MongoDB → JWT Response → Frontend → Context Update
```

### 2. Gestione Componenti
```
User → Frontend → POST /components → Backend → Status Calculation → MongoDB Save → Response
```

### 3. Cambio Stato
```
User → Frontend → POST /changestatus → Backend → Validation → History Update → Auto-Transition → MongoDB → Response
```

### 4. Upload Files
```
User → Frontend → Multipart Upload → Backend → Multer → Azure File Share → DB Metadata → Response
```

### 5. Import Excel
```
User → Frontend → File Upload → Backend → XLSX Parse → Commessa Create → Components Bulk Insert → Response
```

---

## Testing Strategy

### Backend Testing
- **Framework**: Jest 29.0.0
- **Database**: MongoDB Memory Server
- **Coverage**: API endpoints, models, auth
- **Types**: Unit, Integration, End-to-End

### Current Test Files:
```
tests/
├── auth.test.js         # JWT, login, refresh
├── admin-auth.test.js   # Admin authorization
├── utenti.test.js       # User management
├── edgecases.test.js    # Edge cases, pagination
├── stats.test.js        # Statistics endpoints
└── resources.test.js    # Resource management
```

### Issues Identificate:
- **ES Modules**: Incompatibilità shared/statusConfig.js
- **Network**: MongoDB download fails nei test
- **Dependencies**: Vulnerabilità NPM

---

## Conclusioni Architetturali

### Punti di Forza
1. **Separazione Netta**: Frontend/Backend disaccoppiati
2. **Scalabilità**: Containerizzazione completa
3. **Modernità**: Stack tecnologico aggiornato
4. **Automazione**: CI/CD completo
5. **Flessibilità**: Sistema stati configurabile

### Caratteristiche Uniche
1. **State Machine Avanzata**: Sistema stati con auto-transizioni
2. **Shared Logic**: Codice isomorfico frontend/backend
3. **Multi-Environment**: Staging/Production separati
4. **Document Management**: Integrazione Azure File Share
5. **Excel Integration**: Import/Export bidirezionale

Il sistema rappresenta un'architettura moderna e scalabile per il tracking manifatturiero, con particolare attenzione alla user experience e alla maintainability del codice.