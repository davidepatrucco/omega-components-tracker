# Strategia CI/CD e gestione ambienti

Questo documento descrive una strategia operativa e replicabile per la gestione degli ambienti (dev/stage/prod) e per le pipeline CI/CD usando GitHub Actions (può essere adattata a GitLab CI / Jenkins).

## Specifiche tecniche (architettura)

### Frontend
- Framework: React 19
- Bundler / dev server: Vite (vite)
- UI: Ant Design v5
- Charts: Recharts
- Date handling: dayjs
- HTTP client: axios (singleton con interceptors in `src/api.js`)
- Router: react-router-dom v6
- Barcode / QR libs: `@zxing/browser`, `react-barcode`, `react-qr-barcode-scanner`, `zbar.wasm` (usate su pagine barcode)
- Styling: Tailwind present in devDependencies ma UI principale usa Antd + `index.css`

### Requisito di styling (Ant Design + Tailwind)

Obiettivo: definire uno standard unico per lo styling dell'app in modo da garantire coerenza, manutentibilità e rapido sviluppo.

Requisiti:

- R-STY-001: La libreria principale per i componenti UI deve essere Ant Design (forms, table, modal, layout, notifiche). Tutti i componenti complessi devono preferire l'implementazione AntD piuttosto che essere riscritti con utility CSS.
- R-STY-002: Tailwind CSS è autorizzato e supportato esclusivamente come sistema di utility per layout rapidi, spacing, responsive helpers e stili di utilità non coperti direttamente da AntD.
- R-STY-003: Le modifiche visive ripetute o complesse devono essere centralizzate in classi riutilizzabili (Tailwind o classi in `src/index.css`), evitando lo scatter di stili inline dove possibile.
- R-STY-004: L'ordine di importazione consigliato è: 1) import di reset/theme di AntD, 2) `src/index.css` (Tailwind + override). Questo permette agli override locali di prevalere sul reset di AntD quando necessario.
- R-STY-005: Per le variabili di tema condivise (colori, spazi, radius) definire un unico punto di verità: preferibilmente AntD tokens o CSS variables esposte in `index.css` e mappate in Tailwind config se necessario.
- R-STY-006: Il codice UI deve prevedere una breve guida di stile (es. 5 regole) nel repository (README o docs) che indichi quando preferire AntD vs Tailwind e come nominare classi/utility.

Criteri di accettazione:

- Tutte le nuove pagine usano AntD per componenti base (table, forms, modal) e Tailwind per utilities.
- Non più del 10% degli elementi visivi principali usa stili inline; gli elementi riutilizzabili devono avere classi dedicate.
- Un esempio pratico (Header o Mobile Nav) deve essere rifattorizzato usando Tailwind classes e AntD components per dimostrare il pattern.

### Backend
- Runtime: Node.js
- Framework: Express
- DB: MongoDB via Mongoose
- File upload: multer (salva file in folder `upload/`)
- Auth: JWT (jsonwebtoken), refresh token via httpOnly cookie
- Password hashing: bcryptjs
- Utilities: cookie-parser, cors, dotenv
- Email: nodemailer (configurabile via env)
- Excel import/export: xlsx

- Project scripts
   - Root `package.json` orchestrates: `npm run dev` → concurrently avvia backend e frontend
   - Backend: `component-tracker/backend` script `dev` → `node server.js`
   - Frontend: `component-tracker/frontend` script `dev` → `vite`

- Environment variables (usate dal progetto)
   - Backend: MONGO_URI, PORT, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, JWT_SECRET, JWT_REFRESH_SECRET, LOG_LEVEL
   - Frontend: VITE_API_URL (opzionale)


## Checklist rapida
- [ ] Branching: `feature/*`, `develop` (staging), `main` (produzione)
- [ ] Deploy automatico su staging (merge su `develop`)
- [ ] Deploy produzione solo manuale (tag `v*` o `workflow_dispatch` con approvazione)
- [ ] Secrets in GitHub Environments (MONGO_URI_STAGE, MONGO_URI_PROD, DOCKER_* ecc.)
- [ ] Backup DB prima di deploy in produzione
- [ ] Migrations versionate ed eseguite automaticamente in pipeline
- [ ] Health checks / smoke tests post-deploy
- [ ] Rollback applicativo tramite immagine/tag precedente

---

## Branching e regole operative
- feature/<nome>: sviluppo feature, PR verso `develop`.
- develop: ambiente di staging; merge su `develop` abilita deploy su staging.
- main: ambiente produzione; merge su `main` solo tramite PR approvata o tramite creazione di tag `vX.Y.Z`.
- Proteggi `main` e `develop` con branch protection rules: CI green, code review obbligatoria.

## File di ambiente e gestione secrets
- Non committare file `.env` contenenti segreti.
- Mantieni file di esempio `.env.example` con chiavi (senza valori).
- Usa GitHub Environments per `staging` e `production` e salva i secrets lì:
  - `MONGO_URI_STAGE`, `MONGO_URI_PROD`
  - `DOCKER_REGISTRY`, `DOCKER_USERNAME`, `DOCKER_PASSWORD`
  - `SSH_DEPLOY_KEY` (se deploy via SSH), `JWT_SECRET`, `SMTP_*`
- Imposta protezioni sugli Environments (required reviewers per production).

### Nota pratica: gestione di `VITE_API_URL` (frontend → backend)

Breve sintesi: Vite incorpora solo le variabili di ambiente che iniziano con `VITE_` durante la fase di build; la variabile `VITE_API_URL` è il modo raccomandato per settare l'endpoint API usato dal bundle frontend.

Per ambiente:
- Sviluppo locale: lascia `VITE_API_URL` non impostata (o impostala a `/`) e usa il Vite proxy per inoltrare le chiamate al backend (axios.baseURL = `/`).
- Staging: nella job CI per staging fornisci `VITE_API_URL` (es. `https://api-staging.example.com`) al momento della build.
- Produzione: fornisci `VITE_API_URL` (es. `https://api.example.com`) nella job di release; il valore viene incorporato nel bundle di produzione.

Opzioni tecniche:
- Build-time (raccomandato per semplicità): la CI setta `VITE_API_URL` prima di `npm run build`. Vantaggi: semplice, deterministico. Svantaggi: per cambiare endpoint serve rebuild.
- Runtime config (più flessibile): servire un piccolo file JSON `/config.json` o uno snippet JS generato dal server che contiene `apiBaseUrl`; il frontend legge questo file all'avvio e configura axios. Vantaggi: cambiare endpoint senza rebuild; Svantaggi: aggiunge bootstrapping code.

Esempio pratico (snippet GitHub Actions - build-time)

```yaml
# step nella job che builda il frontend
- name: Build frontend
   env:
      VITE_API_URL: ${{ secrets.API_STAGE_URL }} # o API_PROD_URL per produzione
   run: |
      cd component-tracker/frontend
      npm ci
      npm run build
      # publish artifacts / build image
```

Note operative:
- Non committare `.env.*` contenenti segreti: preferisci i GitHub Secrets per `API_STAGE_URL` / `API_PROD_URL`.
- Se il frontend è servito dallo stesso backend (stesso dominio), puoi usare `VITE_API_URL='/'` per evitare CORS.
- Assicurati che il backend abbia CORS configurato correttamente se frontend e backend sono su domini diversi.


## Pipeline GitHub Actions (alto livello)
1. CI (on: `push`, `pull_request` su feature/*, develop, main)
   - checkout, setup-node, cache, npm install
   - lint, unit tests, build (frontend/backend)
   - pubblica artifacts (build) in caso di successo
2. Build & Publish images (on: `push` a develop/main o manual)
   - build docker images (frontend + backend) e tag con SHA
   - push images al registry
3. Deploy su Staging (on: `push` a `develop`)
   - pull image sul server staging (o aggiornamento k8s)
   - eseguire migrations in modalità controllata
   - eseguire smoke tests (health checks)
   - notifica (Slack/Teams)
4. Deploy in Produzione (manual / tag)
   - trigger: `workflow_dispatch` o push di tag `v*` su `main`
   - prerequisiti: approvazione richiesta (environment protection)
   - step PRE: creare snapshot backup DB (mongodump / cloud snapshot)
   - step: eseguire build/pull image, mettere servizio in maintenance (opz.), applicare migrations, deploy
   - POST: eseguire smoke tests; se falliscono → rollback automatico all'immagine precedente

## Backup e migrations
- Backup: script automatico che crea snapshot prima del deploy in produzione e lo archivia (S3 o storage equivalente).
- Migrations: versionare gli script di migrazione (es. migrate-mongo, umzug, o script custom con collection `migrations`). Eseguire migration step *prima* del cutover del traffico.

## Health checks e smoke tests
- Implementare `GET /health` che verifica connettività a MongoDB e dipendenze critiche.
- Pipeline esegue smoke tests dopo deploy (check /health, check endpoint essenziali).
- Richiedere un periodo di osservazione (es. 5-10 minuti) prima di dichiarare il deploy stabile.

## Rollback
- App rollback (raccomandato): riportare l'immagine/tag precedente e riavviare servizio.
- DB rollback: operazione delicata — preferire ripristino da backup solo se strettamente necessario; documentare procedura e approvazioni richieste.
- Automatizzare rollback applicativo nella pipeline (pull tag precedente e deploy) se smoke tests falliscono.

## Opzioni di deploy (scegliere in base all'infrastruttura)
- Docker Compose su VPS
  - semplice: CI build immagini → push registry → server `docker-compose pull && docker-compose up -d`
  - usare SSH deploy (GitHub Action `appleboy/ssh-action` o simili)
- Kubernetes (Helm)
  - supporta rolling updates, readiness/liveness probes, canary/blue-green rollout
- Managed (Heroku, Render, Vercel) per frontend e container registry per backend

## Naming e convenzioni per i tag/images
- Image tag: `registry/org/app:sha-<short>` e `registry/org/app:release-vX.Y.Z`
- Mantieni gli ultimi N tag nel registry e pulisci i più vecchi automaticamente

## Sicurezza e scansioni
- Usare Dependabot / GitHub security alerts.
- Eseguire container scanning (trivy/snyk) nel workflow di build.

## Esempio: flusso di deploy in produzione (sintesi)
1. Crea tag `v1.2.0` su `main` (release)
2. Trigger production workflow (richiede approval)
3. Workflow: crea DB backup → build/pull images → esegui migrations → deploy → smoke tests
4. Se OK → notifica e chiudi release; se KO → rollback automatico e alert

## Criteri di accettazione
- Deploy su staging automatico entro 5 minuti dal merge su `develop`.
- Deploy in produzione eseguito solo con approvazione e backup pre-deploy.
- Possibilità di rollback applicativo automatizzato in < 10 minuti.

## Da generare.
- A) file example GitHub Actions: `ci.yml`, `build_publish.yml`, `deploy_staging.yml`, `deploy_prod.yml`.
- B) script `backup.sh` e `deploy.sh` per server Docker Compose.
- C) template `docker-compose.prod.yml` e `docker-compose.staging.yml`.

 
## Istruzioni rapide per bootstrap / run

Queste istruzioni servono per avviare il progetto in locale (sviluppo) e con Docker (ambiente integrato). Sono intenzionalmente concise; per dettagli estendi la sezione in un README dedicato.

Prerequisiti
- Node.js 18+ e npm (o pnpm/yarn) installati
- MongoDB in esecuzione localmente (o usare un URI Mongo remoto)
- (opz.) Docker & docker-compose se si vuole usare il stack containerizzato

Avvio rapido in locale (dev)
- Dal root del progetto:
   - Installa dipendenze root (opzionale se non necessarie): `npm ci` nella root
   - Avvia backend e frontend in parallelo tramite lo script centrale:
      - `npm run dev` (avvia concurrently backend e frontend)

Se vuoi avviare i servizi separatamente:
- Backend:
   - cd component-tracker/backend
   - npm ci
   - COPIA `.env.example` → `.env` e configura `MONGO_URI`, `PORT`, `JWT_SECRET` etc.
   - npm run dev
- Frontend (dev):
   - cd component-tracker/frontend
   - npm ci
   - (opzionale) se usi Vite proxy lascia `VITE_API_URL` vuoto o `/`
   - npm run dev

Avvio con Docker Compose (stack integrato)
- Usa il file `infra/docker-compose.yml` (o `docker/docker-compose.yml` se presente)
- Esempio:
   - COPIA `.env.example` → `.env` nella root e popola le variabili richieste (MONGO_URI, JWT_SECRET...)
   - docker compose -f infra/docker-compose.yml up --build

Build produzione (frontend) — nota su `VITE_API_URL`
- Il valore di `VITE_API_URL` viene incorporato al momento del build. In CI impostare:
   - env VITE_API_URL=https://api.stage.example.com npm run build (nel job che esegue la build del frontend)
- Esempio locale per testare la build:
   - cd component-tracker/frontend
   - VITE_API_URL=http://localhost:4000 npm ci
   - VITE_API_URL=http://localhost:4000 npm run build

Note utili
- Se frontend e backend sono serviti dallo stesso dominio, impostare `VITE_API_URL='/'` elimina problemi CORS.
- Per cambiare l'endpoint API in runtime senza rebuild, considera l'approccio runtime-config (`/config.json`) descritto sopra.
- Prima di eseguire deploy in produzione assicurarsi che i secrets siano configurati nel GitHub Environment appropriato e che la pipeline esegua backup DB e migrations.

